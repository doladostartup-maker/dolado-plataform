"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANEXOS_MAX_POR_MENSAGEM, BUCKET_COMUNICACOES, preVerificar, verificarConteudo } from "@/lib/comunicacoes/anexos";
import { LIMITES, corpoParaApresentacao, limparTexto, normalizarNomeFicheiro } from "@/lib/comunicacoes/sanitizar";
import { avisarCliente } from "@/lib/comunicacoes/servidor";
import { pedirAnaliseIAManual, analiseIAAtiva, agendarAnaliseIA } from "@/lib/analiseResposta/servidor";
import { CANAIS_RECEBIDA, DECISOES, ehClassificacao, ehDecisao, MENSAGENS_DECISAO } from "@/lib/acompanhamento/apresentacao";
import { ESTADOS_CASO } from "@/lib/backoffice/triagem";

// Ações da equipa sobre o acompanhamento depois do envio. requireAdmin
// primeiro; só depois a service role. As regras (estados, transições,
// idempotência) estão nas funções da base de dados — aqui valida-se a forma,
// guardam-se ficheiros e enviam-se avisos. Nenhuma ação envia texto à
// empresa: novas comunicações seguem o fluxo de versões e autorização.

function voltar(casoId: string, chave: "ok" | "erro", msg: string, ancora = "comunicacoes", comunicacaoId?: string | null): never {
  revalidatePath(`/backoffice/casos/${casoId}`);
  const base = comunicacaoId ? `/backoffice/casos/${casoId}/comunicacoes/${comunicacaoId}` : `/backoffice/casos/${casoId}`;
  redirect(`${base}?acomp_${chave}=${encodeURIComponent(msg)}#${ancora}`);
}

function texto(formData: FormData, campo: string, max: number) {
  return ((formData.get(campo) as string | null) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

/** Registo manual de uma resposta recebida fora do e-mail do caso (carta, telefone, Livro de Reclamações, outro endereço). */
export async function registarRespostaManual(casoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const canal = formData.get("canal");
  const corpo = texto(formData, "texto", LIMITES.corpoTexto);
  const assunto = texto(formData, "assunto", LIMITES.assunto);
  const remetente = texto(formData, "remetente", LIMITES.nome);
  const data = texto(formData, "data", 40);
  if (typeof canal !== "string" || !(canal in CANAIS_RECEBIDA)) voltar(casoId, "erro", "Escolha o canal por onde chegou a resposta.");
  if (!corpo) voltar(casoId, "erro", "Escreva o conteúdo (ou um resumo fiel) da resposta.");
  const quando = data ? new Date(data) : null;
  if (quando && (Number.isNaN(quando.getTime()) || quando.getTime() > Date.now() + 864e5)) voltar(casoId, "erro", "Data inválida.");

  const ficheiros = (formData.getAll("anexos") as File[]).filter((f) => f && f.size > 0);
  if (ficheiros.length > ANEXOS_MAX_POR_MENSAGEM) voltar(casoId, "erro", `No máximo ${ANEXOS_MAX_POR_MENSAGEM} anexos.`);
  for (const f of ficheiros) {
    const pre = preVerificar(f.type, f.size);
    if (!pre.ok) voltar(casoId, "erro", `“${f.name.slice(0, 80)}”: ${pre.motivo === "demasiado_grande" ? "tem mais de 15 MB" : "tipo de ficheiro não permitido"}.`);
  }

  const admin = createAdminClient();
  const { data: r, error } = await admin.rpc("comunicacao_registar_recebida", {
    p_caso_id: casoId,
    p_admin: user.id,
    p_dados: {
      origem: "manual",
      canal,
      remetente_nome: remetente || null,
      assunto: assunto || null,
      corpo_texto: limparTexto(corpo, LIMITES.corpoTexto).texto,
      corpo_apresentacao: corpoParaApresentacao({ texto: corpo }).texto,
      data_mensagem: quando ? quando.toISOString() : null,
      sem_anexos: ficheiros.length === 0,
    },
  });
  const resultado = r as { resultado?: string; comunicacao_id?: string; transitou?: boolean } | null;
  if (error || resultado?.resultado !== "registada" || !resultado.comunicacao_id) voltar(casoId, "erro", "Não foi possível registar a resposta.");
  const comunicacaoId = resultado.comunicacao_id;

  if (ficheiros.length) {
    for (const [indice, f] of ficheiros.entries()) {
      const pre = preVerificar(f.type, f.size);
      const bytes = new Uint8Array(await f.arrayBuffer());
      const ok = pre.ok ? verificarConteudo(pre.formato, bytes) : { ok: false as const, motivo: "tipo_nao_permitido" as const };
      const nome = normalizarNomeFicheiro(f.name, pre.ok ? pre.formato.extensao : "bin");
      if (!pre.ok || !ok.ok) {
        await admin.from("casos_comunicacoes_anexos").insert({
          comunicacao_id: comunicacaoId, indice, nome, tipo_mime: f.type.slice(0, 200) || null, tamanho_bytes: f.size, estado: "rejeitado",
          motivo_rejeicao: ok.ok ? "tipo_nao_permitido" : ok.motivo,
        });
        continue;
      }
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const path = `${casoId}/${comunicacaoId}/${indice}-${sha256.slice(0, 16)}`;
      const { error: erroUpload } = await admin.storage.from(BUCKET_COMUNICACOES).upload(path, bytes, { contentType: pre.formato.mime, upsert: true });
      await admin.from("casos_comunicacoes_anexos").insert(
        erroUpload
          ? { comunicacao_id: comunicacaoId, indice, nome, tipo_mime: pre.formato.mime, tamanho_bytes: f.size, estado: "rejeitado", motivo_rejeicao: "falha_transferencia" }
          : { comunicacao_id: comunicacaoId, indice, nome, tipo_mime: pre.formato.mime, tamanho_bytes: f.size, sha256, storage_path: path, estado: "guardado" },
      );
    }
    await admin.from("casos_comunicacoes_recebidas").update({ anexos_processados_em: new Date().toISOString() }).eq("id", comunicacaoId);
  }

  if (resultado.transitou) await avisarCliente(casoId, "resposta_recebida");
  agendarAnaliseIA(comunicacaoId);
  voltar(casoId, "ok", resultado.transitou ? "Resposta registada. O caso passou a “Resposta em análise”." : "Resposta registada para análise.", "analise", comunicacaoId);
}

/** Pedido manual (ou nova tentativa) da análise preliminar pela IA. */
export async function pedirAnaliseIA(casoId: string, comunicacaoId: string) {
  const { user } = await requireAdmin();
  if (!analiseIAAtiva()) voltar(casoId, "erro", "A análise por IA está desativada neste ambiente (ANALISE_RESPOSTA_IA_ATIVO).", "analise", comunicacaoId);
  const { data: com } = await createAdminClient().from("casos_comunicacoes_recebidas").select("caso_id").eq("id", comunicacaoId).maybeSingle();
  if (com?.caso_id !== casoId) voltar(casoId, "erro", "Comunicação inválida.");
  let id: string | null = null;
  try {
    id = await pedirAnaliseIAManual(comunicacaoId, user.id);
  } catch {
    voltar(casoId, "erro", "Não foi possível iniciar a análise.", "analise", comunicacaoId);
  }
  if (!id) voltar(casoId, "erro", "Já há uma análise em curso para esta comunicação.", "analise", comunicacaoId);
  voltar(casoId, "ok", "A gerar a análise. A página atualiza quando terminar.", "analise", comunicacaoId);
}

/**
 * Decisão depois da análise (A–E). A base de dados valida o estado, a
 * comunicação e a transição. Só depois de gravada é que o cliente é avisado
 * (pedido de informação, solução apresentada).
 */
export async function decidirAposAnalise(casoId: string, comunicacaoId: string | null, formData: FormData) {
  const { user } = await requireAdmin();
  const decisao = formData.get("decisao");
  const classificacao = formData.get("classificacao") || null;
  if (!ehDecisao(decisao)) voltar(casoId, "erro", "Escolha o próximo passo.", "decisao-analise", comunicacaoId);
  if (classificacao !== null && !ehClassificacao(classificacao)) voltar(casoId, "erro", "Classificação inválida.", "decisao-analise", comunicacaoId);
  const prazo = texto(formData, "prazo", 10);
  const analiseIa = texto(formData, "analise_ia_id", 36);

  const { data, error } = await createAdminClient().rpc("caso_decidir_analise", {
    p_caso_id: casoId,
    p_comunicacao_id: comunicacaoId,
    p_decisao: decisao,
    p_classificacao: classificacao,
    p_resumo: texto(formData, "resumo", 8000) || null,
    p_mensagem_cliente: texto(formData, "mensagem_cliente", 2000) || null,
    p_tipo_encaminhamento: texto(formData, "tipo_encaminhamento", 40) || null,
    p_pedido: texto(formData, "pedido", 2000) || null,
    p_instrucoes: texto(formData, "instrucoes", 2000) || null,
    p_prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : null,
    p_analise_ia_id: /^[0-9a-f-]{36}$/.test(analiseIa) ? analiseIa : null,
    p_admin: user.id,
  });
  const r = (data as { resultado?: string; estado?: string } | null)?.resultado;
  if (error || r !== "ok") voltar(casoId, "erro", MENSAGENS_DECISAO[r ?? ""] ?? "Não foi possível registar a decisão.", "decisao-analise", comunicacaoId);

  if (decisao === "pedir_informacao_cliente") await avisarCliente(casoId, "pedido_informacao");
  if (decisao === "resolucao_proposta") await avisarCliente(casoId, "solucao_apresentada");
  const destino = decisao === "preparar_nova_resposta" ? "texto" : "comunicacoes";
  revalidatePath(`/backoffice/casos/${casoId}`);
  redirect(`/backoffice/casos/${casoId}?acomp_ok=${encodeURIComponent(DECISOES[decisao].confirmacao)}#${destino}`);
}

/** Registo, pela equipa, da resposta do cliente à solução (ex.: confirmou por telefone). */
export async function registarConfirmacaoCliente(casoId: string, resolvido: boolean) {
  const { user } = await requireAdmin();
  const { data, error } = await createAdminClient().rpc("caso_confirmar_resolucao", {
    p_caso_id: casoId,
    p_utilizador: null,
    p_resolvido: resolvido,
    p_admin: user.id,
  });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (error || r !== "ok") voltar(casoId, "erro", "O caso já não está à espera da confirmação do cliente.", "decisao");
  voltar(casoId, "ok", resolvido ? "Registado: o problema ficou resolvido." : "Registado: o problema não ficou resolvido. O caso volta à análise.", "decisao");
}

/** Correção manual do estado (exceção, com motivo; fica auditada). */
export async function corrigirEstado(casoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const para = formData.get("para");
  const motivo = texto(formData, "motivo", 500);
  if (typeof para !== "string" || !(ESTADOS_CASO as readonly string[]).includes(para)) voltar(casoId, "erro", "Escolha o estado.", "dados");
  if (motivo.length < 5) voltar(casoId, "erro", "Indique o motivo da correção.", "dados");
  const { data, error } = await createAdminClient().rpc("caso_corrigir_estado", { p_caso_id: casoId, p_para: para, p_motivo: motivo, p_admin: user.id });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (error || (r !== "ok" && r !== "sem_alteracao")) voltar(casoId, "erro", "Não foi possível corrigir o estado.", "dados");
  voltar(casoId, "ok", r === "sem_alteracao" ? "O caso já estava nesse estado." : "Estado corrigido (fica registado no histórico).", "dados");
}
