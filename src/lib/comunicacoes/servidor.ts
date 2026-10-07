// DoLado — dependências reais da receção de respostas (service role, API do
// Resend — só receção; os envios continuam na Brevo —, Storage) e operações
// de servidor partilhadas pelo webhook, pelo backoffice e pelo portal. Quem
// chama já validou o direito: o webhook (assinatura Svix do Resend) ou a
// sessão (requireAdmin / requireUser + posse).
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import {
  ASSUNTO_CASO_ENCERRADO_EXTERNO,
  ASSUNTO_PEDIDO_INFORMACAO,
  ASSUNTO_RESPOSTA_RECEBIDA,
  ASSUNTO_SOLUCAO_APRESENTADA,
  montarHtmlAvisoEquipa,
  montarHtmlCasoEncerradoExterno,
  montarHtmlPedidoInformacao,
  montarHtmlRespostaRecebida,
  montarHtmlSolucaoApresentada,
} from "@/lib/email/acompanhamento";
import { agendarAnaliseIA } from "@/lib/analiseResposta/servidor";
import { ANEXO_MAX_BYTES, BUCKET_COMUNICACOES } from "./anexos";
import { dominioRespostas, enderecoCompleto, gerarLocalPart } from "./endereco";
import type { AnexoResend, DepsInbound, EmailResend } from "./inbound";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";
/**
 * API do Resend (só leitura dos e-mails recebidos). RESEND_API_URL só pode
 * ser trocado fora de produção (simulação local); em produção é sempre a API
 * oficial.
 */
function apiResend() {
  const alternativa = process.env.RESEND_API_URL;
  return process.env.NODE_ENV !== "production" && alternativa ? alternativa.replace(/\/$/, "") : "https://api.resend.com";
}

function logEstruturado(evento: Record<string, unknown>) {
  // Sem endereços, assuntos nem conteúdo: só fase, resultado, motivo e ids internos.
  console.info(JSON.stringify({ origem: "inbound", ...evento }));
}

const cabecalhosResend = () => ({ Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`, accept: "application/json" });

async function obterEmailResend(id: string): ReturnType<DepsInbound["obterEmail"]> {
  if (!process.env.RESEND_API_KEY) return { ok: false, motivo: "indisponivel" };
  try {
    // html_format=cid: imagens embutidas ficam como referências (cid:), sem
    // data URIs enormes no HTML guardado.
    const r = await fetch(`${apiResend()}/emails/receiving/${encodeURIComponent(id)}?html_format=cid`, {
      headers: cabecalhosResend(),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.status === 404) return { ok: false, motivo: "nao_encontrado" };
    if (!r.ok) return { ok: false, motivo: "indisponivel" };
    return { ok: true, email: (await r.json()) as EmailResend };
  } catch {
    return { ok: false, motivo: "indisponivel" };
  }
}

async function listarAnexosResend(id: string): Promise<AnexoResend[]> {
  const r = await fetch(`${apiResend()}/emails/receiving/${encodeURIComponent(id)}/attachments?limit=100`, {
    headers: cabecalhosResend(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`resend_anexos_${r.status}`);
  const corpo = (await r.json()) as { data?: AnexoResend[] };
  return Array.isArray(corpo.data) ? corpo.data : [];
}

/** Descarga de um anexo pela URL assinada do Resend (válida 1 hora), com limite de tamanho. */
async function transferirAnexoResend(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "follow" });
  if (!r.ok || !r.body) throw new Error(`resend_anexo_${r.status}`);
  const tamanho = Number(r.headers.get("content-length"));
  if (Number.isFinite(tamanho) && tamanho > ANEXO_MAX_BYTES) return new Uint8Array(ANEXO_MAX_BYTES + 1);
  // Leitura com limite: nunca carregar para memória mais do que o máximo.
  const partes: Uint8Array[] = [];
  let total = 0;
  const leitor = r.body.getReader();
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > ANEXO_MAX_BYTES + 1) {
      await leitor.cancel();
      // Devolve um tamanho acima do limite: verificarConteudo rejeita-o como demasiado grande.
      return new Uint8Array(ANEXO_MAX_BYTES + 1);
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    bytes.set(p, o);
    o += p.length;
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Avisos

type CasoAviso = { id: string; email: string | null; empresa: string | null; utilizador_id: string | null };

async function casoParaAviso(casoId: string): Promise<CasoAviso | null> {
  const { data } = await createAdminClient().from("casos").select("id, email, empresa, utilizador_id").eq("id", casoId).maybeSingle();
  return (data as CasoAviso | null) ?? null;
}

const urlPortal = (casoId: string) => `${SITE_URL}/portal/casos/${casoId}`;
const urlBackoffice = (casoId: string) => `${SITE_URL}/backoffice/casos/${casoId}#comunicacoes`;

/** Aviso interno à equipa (uma vez por acontecimento). Nunca lança. */
export async function avisarEquipa(casoId: string, texto: string) {
  if (!process.env.BREVO_API_KEY) return logEstruturado({ fase: "aviso_equipa", resultado: "sem_envio" });
  await enviarEmailBrevo(ADMIN_EMAIL, `${texto} — DoLado`, montarHtmlAvisoEquipa({ texto, urlCaso: urlBackoffice(casoId) })).catch(() =>
    logEstruturado({ fase: "aviso_equipa", resultado: "erro" }),
  );
}

/** E-mails ao cliente nos momentos que pedem a sua atenção (sem conteúdo da resposta). Nunca lança. */
export async function avisarCliente(
  casoId: string,
  momento: "resposta_recebida" | "pedido_informacao" | "solucao_apresentada" | "caso_encerrado_externo",
) {
  const caso = await casoParaAviso(casoId);
  if (!caso?.email) return;
  if (!process.env.BREVO_API_KEY) return logEstruturado({ fase: "aviso_cliente", resultado: "sem_envio", momento });
  const args = { empresa: caso.empresa, urlCaso: urlPortal(casoId) };
  const [assunto, html] =
    momento === "resposta_recebida"
      ? [ASSUNTO_RESPOSTA_RECEBIDA, montarHtmlRespostaRecebida(args)]
      : momento === "pedido_informacao"
        ? [ASSUNTO_PEDIDO_INFORMACAO, montarHtmlPedidoInformacao(args)]
        : momento === "caso_encerrado_externo"
          ? [ASSUNTO_CASO_ENCERRADO_EXTERNO, montarHtmlCasoEncerradoExterno(args)]
          : [ASSUNTO_SOLUCAO_APRESENTADA, montarHtmlSolucaoApresentada(args)];
  await enviarEmailBrevo(caso.email, assunto, html).catch(() => logEstruturado({ fase: "aviso_cliente", resultado: "erro", momento }));
}

// ---------------------------------------------------------------------------
// Endereço do caso

/** Endereço único de respostas do caso (cria-o na primeira vez). */
export async function enderecoRespostaDoCaso(casoId: string): Promise<string | null> {
  const admin = createAdminClient();
  const ler = async () =>
    (await admin.from("casos_enderecos_resposta").select("local_part").eq("caso_id", casoId).maybeSingle()).data?.local_part as string | undefined;
  let local = await ler();
  if (!local) {
    // Colisão (2^160 combinações) ou corrida com outro pedido: lê o que ficou.
    await admin.from("casos_enderecos_resposta").insert({ caso_id: casoId, local_part: gerarLocalPart() });
    local = await ler();
  }
  return local ? enderecoCompleto(local) : null;
}

// ---------------------------------------------------------------------------
// Dependências do webhook

export function criarDependenciasInbound(): DepsInbound {
  const admin = createAdminClient();
  return {
    dominio: dominioRespostas(),
    obterEmail: obterEmailResend,
    listarAnexos: listarAnexosResend,
    transferirAnexo: transferirAnexoResend,
    agora: () => new Date(),
    log: logEstruturado,

    async casoDoEndereco(localPart) {
      const { data } = await admin
        .from("casos_enderecos_resposta")
        .select("caso_id")
        .eq("local_part", localPart)
        .is("desativado_em", null)
        .maybeSingle();
      return (data?.caso_id as string | undefined) ?? null;
    },

    async registar(casoId, dados) {
      const { data, error } = await admin.rpc("comunicacao_registar_recebida", { p_caso_id: casoId, p_dados: dados, p_admin: null });
      if (error) throw new Error(`comunicacao_registar_recebida: ${error.code ?? "erro"}`);
      return data as Awaited<ReturnType<DepsInbound["registar"]>>;
    },

    async estadoProcessamento(comunicacaoId) {
      const { data } = await admin.from("casos_comunicacoes_recebidas").select("estado_processamento").eq("id", comunicacaoId).maybeSingle();
      return (data?.estado_processamento as "recebida" | "processada" | "falhou" | undefined) ?? null;
    },

    async marcarProcessamento(comunicacaoId, estado, erro) {
      const { error } = await admin
        .from("casos_comunicacoes_recebidas")
        .update({ estado_processamento: estado, erro_processamento: estado === "falhou" ? (erro ?? "erro").slice(0, 200) : null })
        .eq("id", comunicacaoId)
        .neq("estado_processamento", "processada");
      if (error) throw new Error(`marcarProcessamento: ${error.code}`);
    },

    async quarentena({ providerMessageId, destinatarios, remetente, assunto, recebidaEm, motivo }) {
      const { error } = await admin.from("comunicacoes_nao_associadas").insert({
        provider: "resend",
        provider_message_id: providerMessageId,
        destinatarios,
        remetente,
        assunto,
        recebida_em: recebidaEm,
        motivo,
      });
      // Reenvio do mesmo e-mail: já está em quarentena.
      if (error && error.code !== "23505") throw new Error(`comunicacoes_nao_associadas: ${error.code}`);
    },

    async guardarAnexo({ comunicacaoId, indice, nome, mime, bytes, sha256 }) {
      const { data: existente } = await admin
        .from("casos_comunicacoes_anexos")
        .select("id")
        .eq("comunicacao_id", comunicacaoId)
        .eq("indice", indice)
        .maybeSingle();
      if (existente) return;
      const { data: com } = await admin.from("casos_comunicacoes_recebidas").select("caso_id").eq("id", comunicacaoId).single();
      // Caminho gerado aqui (nunca o nome enviado pelo remetente).
      const path = `${com!.caso_id}/${comunicacaoId}/${indice}-${sha256.slice(0, 16)}`;
      const { error: erroUpload } = await admin.storage.from(BUCKET_COMUNICACOES).upload(path, bytes, { contentType: mime, upsert: true });
      if (erroUpload) {
        await this.rejeitarAnexo({ comunicacaoId, indice, nome, mime, tamanho: bytes.length, motivo: "falha_transferencia" });
        return;
      }
      const { error } = await admin.from("casos_comunicacoes_anexos").insert({
        comunicacao_id: comunicacaoId,
        indice,
        nome,
        tipo_mime: mime,
        tamanho_bytes: bytes.length,
        sha256,
        storage_path: path,
        estado: "guardado",
      });
      if (error && error.code !== "23505") throw new Error(`casos_comunicacoes_anexos: ${error.code}`);
    },

    async rejeitarAnexo({ comunicacaoId, indice, nome, mime, tamanho, motivo }) {
      const { error } = await admin.from("casos_comunicacoes_anexos").insert({
        comunicacao_id: comunicacaoId,
        indice,
        nome,
        tipo_mime: mime,
        tamanho_bytes: tamanho,
        estado: "rejeitado",
        motivo_rejeicao: motivo,
      });
      if (error && error.code !== "23505") throw new Error(`casos_comunicacoes_anexos: ${error.code}`);
    },

    async marcarAnexosProcessados(comunicacaoId) {
      await admin
        .from("casos_comunicacoes_recebidas")
        .update({ anexos_processados_em: new Date().toISOString() })
        .eq("id", comunicacaoId)
        .is("anexos_processados_em", null);
    },

    async registarLog({ providerEventId, providerMessageId, resultado, motivo, casoId, comunicacaoId }) {
      await admin.from("comunicacoes_inbound_registos").insert({
        provider: "resend",
        provider_event_id: providerEventId,
        provider_message_id: providerMessageId,
        resultado,
        motivo: motivo?.slice(0, 60) ?? null,
        caso_id: casoId ?? null,
        comunicacao_id: comunicacaoId ?? null,
      });
    },

    async notificar({ casoId, transitou }) {
      await avisarEquipa(casoId, transitou ? "Nova resposta recebida num caso — por analisar" : "Nova comunicação recebida num caso — por analisar");
      if (transitou) await avisarCliente(casoId, "resposta_recebida");
    },

    agendarAnalise: agendarAnaliseIA,
  };
}
