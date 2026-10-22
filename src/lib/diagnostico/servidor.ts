// DoLado — diagnóstico gratuito sem registo (servidor).
//
//   escolher ficheiro (homepage) → prepararDiagnostico (reserva + URL de
//   upload assinada, cookie da sessão) → upload directo para o Storage →
//   confirmarDiagnostico (tamanho, assinatura do formato) → after():
//   processarDiagnostico (Haiku 5.5, extracção factual) → resultado
//   (regras.ts) → /diagnostico mostra-o → conta → associarDiagnosticos →
//   Protecção → importarParaMonitor (cópia no Storage + pipeline do Monitor).
//
// Usa a service role: a sessão anónima é verificada aqui (sessão + SHA-256
// do segredo do cookie) antes de qualquer leitura ou escrita. Nunca lança
// para o visitante: falhas ficam em estado "falhou" com um motivo fixo.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODELO_DIAGNOSTICO } from "@/lib/claude";
import { lerDocumentoComClaude, type MimeAceite } from "@/lib/monitor/claudeDocumentos";
import { estadoOrcamento } from "@/lib/monitor/custos";
import { lerChaveIdentificadores, protegerExtracao } from "@/lib/monitor/identificacao";
import { leituraFatura, validarExtracaoFatura } from "@/lib/monitor/extracaoFatura";
import { PROMPT_CONTRATO, SCHEMA_CONTRATO, validarExtracaoContrato } from "@/lib/monitor/extracaoContrato";
import { gastoApiUsd, inspecionarFicheiro, tetoOrcamentoUsd } from "@/lib/monitor/servidor";
import {
  EXTENSAO_DIAGNOSTICO,
  LIMITE_DIARIO_PADRAO,
  ORCAMENTO_DIAGNOSTICO_PADRAO_USD,
  diagnosticoDaFatura,
  diagnosticoDoContrato,
  formatoPelaAssinatura,
  lerDiagnostico,
  lerInteiroPositivo,
  podeFicarComDiagnostico,
  validarFicheiro,
  type Canal,
  type Diagnostico,
  type MimeDiagnostico,
  type SessaoDiagnostico,
} from "./regras";

type Admin = ReturnType<typeof createAdminClient>;

export const BUCKET_DIAGNOSTICO = "documentos-monitor";
export const FUNCIONALIDADE_IA = "diagnostico_gratuito";

const URL_DOCUMENTO_SEGUNDOS = 300;

export function hashSegredo(segredo: string): string {
  return createHash("sha256").update(segredo).digest("hex");
}

export function novaSessao(): SessaoDiagnostico {
  return { sessaoId: randomUUID(), segredo: randomBytes(32).toString("hex") };
}

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

// ---------------------------------------------------------------------------
// 1. Reserva e URL de upload
// ---------------------------------------------------------------------------

export type Origem = {
  canal: Canal;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  paginaEntrada: string | null;
  dispositivo: "movel" | "computador" | null;
};

export type ResultadoPreparar =
  | { ok: true; id: string; caminho: string; token: string }
  | { ok: false; erro: "formato" | "tamanho" | "vazio" | "limite" | "temporario" };

export async function prepararDiagnostico(
  sessao: SessaoDiagnostico,
  ficheiro: { mime: string; tamanho: number },
  origem: Origem,
): Promise<ResultadoPreparar> {
  const erroFicheiro = validarFicheiro(ficheiro.mime, ficheiro.tamanho);
  if (erroFicheiro) return { ok: false, erro: erroFicheiro };

  const admin = createAdminClient();
  const caminho = `diagnosticos/${randomUUID()}.${EXTENSAO_DIAGNOSTICO[ficheiro.mime as MimeDiagnostico]}`;
  const { data: id, error } = await admin.rpc("diagnostico_reservar", {
    p_sessao: sessao.sessaoId,
    p_token_hash: hashSegredo(sessao.segredo),
    p_storage_path: caminho,
    p_mime: ficheiro.mime,
    p_tamanho: Math.round(ficheiro.tamanho),
    p_limite_diario: lerInteiroPositivo(process.env.DIAGNOSTICO_LIMITE_DIARIO, LIMITE_DIARIO_PADRAO),
    p_canal: origem.canal,
    p_utm_source: origem.utmSource,
    p_utm_medium: origem.utmMedium,
    p_utm_campaign: origem.utmCampaign,
    p_pagina_entrada: origem.paginaEntrada,
    p_dispositivo: origem.dispositivo,
  });
  if (error) {
    console.error("[diagnostico] falha na reserva:", error.message);
    return { ok: false, erro: "temporario" };
  }
  if (!id) return { ok: false, erro: "limite" };

  const { data: upload, error: erroUpload } = await admin.storage.from(BUCKET_DIAGNOSTICO).createSignedUploadUrl(caminho);
  if (erroUpload || !upload) {
    await admin.from("diagnosticos_gratuitos").update({ estado: "falhou", motivo_falha: "indisponivel" }).eq("id", id);
    return { ok: false, erro: "temporario" };
  }
  return { ok: true, id: id as string, caminho, token: upload.token };
}

// ---------------------------------------------------------------------------
// 2. Confirmação do upload (o browser diz que terminou; o servidor verifica)
// ---------------------------------------------------------------------------

type Linha = {
  id: string;
  estado: string;
  storage_path: string | null;
  mime_type: string | null;
};

async function daSessao(admin: Admin, sessao: SessaoDiagnostico, id: string): Promise<Linha | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await admin
    .from("diagnosticos_gratuitos")
    .select("id, estado, storage_path, mime_type")
    .eq("id", id)
    .eq("sessao_id", sessao.sessaoId)
    .eq("token_hash", hashSegredo(sessao.segredo))
    .is("dados_apagados_em", null)
    .maybeSingle();
  return (data as Linha | null) ?? null;
}

async function primeirosBytes(caminho: string): Promise<Uint8Array | null> {
  const { data } = await createAdminClient().storage.from(BUCKET_DIAGNOSTICO).createSignedUrl(caminho, 60);
  if (!data?.signedUrl) return null;
  try {
    const r = await fetch(data.signedUrl, { headers: { Range: "bytes=0-15" }, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer()).slice(0, 16);
  } catch {
    return null;
  }
}

export async function confirmarDiagnostico(sessao: SessaoDiagnostico, id: string): Promise<{ ok: boolean; erro?: "ficheiro_invalido" | "nao_encontrado" }> {
  const admin = createAdminClient();
  const linha = await daSessao(admin, sessao, id);
  if (!linha || !linha.storage_path) return { ok: false, erro: "nao_encontrado" };
  if (linha.estado !== "a_carregar") return { ok: true }; // repetido (duplo clique / recarga)

  const falhar = async () => {
    await admin.from("diagnosticos_gratuitos").update({ estado: "falhou", motivo_falha: "ficheiro_invalido" }).eq("id", id);
    await admin.storage.from(BUCKET_DIAGNOSTICO).remove([linha.storage_path!]);
    return { ok: false, erro: "ficheiro_invalido" as const };
  };

  const info = await inspecionarFicheiro(BUCKET_DIAGNOSTICO, linha.storage_path);
  if (!info || validarFicheiro(linha.mime_type ?? "", info.tamanho)) return falhar();
  const bytes = await primeirosBytes(linha.storage_path);
  if (!bytes || formatoPelaAssinatura(bytes) !== linha.mime_type) return falhar();

  const { data: reservado } = await admin
    .from("diagnosticos_gratuitos")
    .update({ estado: "a_analisar", carregado_em: new Date().toISOString(), sha256: info.sha256, tamanho_bytes: info.tamanho })
    .eq("id", id)
    .eq("estado", "a_carregar")
    .select("id")
    .maybeSingle();
  return { ok: !!reservado };
}

// ---------------------------------------------------------------------------
// 3. Leitura e diagnóstico (em segundo plano, depois da resposta)
// ---------------------------------------------------------------------------

async function falhou(admin: Admin, id: string, motivo: "ilegivel" | "nao_suportado" | "indisponivel" | "orcamento") {
  await admin.from("diagnosticos_gratuitos").update({ estado: "falhou", motivo_falha: motivo }).eq("id", id);
}

async function gastoDiagnosticosUsd(admin: Admin): Promise<number> {
  const { data } = await admin.from("uso_api_claude").select("custo_estimado_usd").eq("funcionalidade", FUNCIONALIDADE_IA);
  return (data ?? []).reduce((s, l) => s + Number(l.custo_estimado_usd ?? 0), 0);
}

type Leitura = Awaited<ReturnType<typeof lerDocumentoComClaude>>;

async function registarUso(admin: Admin, id: string, chamada: Leitura) {
  if (!chamada.uso) return;
  await admin.from("uso_api_claude").insert({
    funcionalidade: FUNCIONALIDADE_IA,
    diagnostico_id: id,
    modelo: chamada.uso.modelo,
    tokens_entrada: chamada.uso.tokensEntrada,
    tokens_saida: chamada.uso.tokensSaida,
    custo_estimado_usd: chamada.uso.custoUsd,
    latencia_ms: chamada.uso.latenciaMs,
    estado: chamada.ok ? "sucesso" : "erro",
    request_id: chamada.uso.requestId,
  });
}

export async function processarDiagnostico(id: string): Promise<void> {
  const admin = createAdminClient();
  try {
    const { data: linha } = await admin
      .from("diagnosticos_gratuitos")
      .select("id, estado, storage_path, mime_type")
      .eq("id", id)
      .maybeSingle();
    if (!linha || linha.estado !== "a_analisar" || !linha.storage_path) return;

    // Orçamento: o geral (partilhado com o Monitor) e o próprio das leituras gratuitas.
    const tetoDiagnostico = lerInteiroPositivo(process.env.ANTHROPIC_ORCAMENTO_DIAGNOSTICO_USD, ORCAMENTO_DIAGNOSTICO_PADRAO_USD);
    if (
      estadoOrcamento(await gastoApiUsd(admin), tetoOrcamentoUsd()).bloqueado ||
      estadoOrcamento(await gastoDiagnosticosUsd(admin), tetoDiagnostico).bloqueado
    ) {
      return falhou(admin, id, "orcamento");
    }

    const { data: assinado } = await admin.storage.from(BUCKET_DIAGNOSTICO).createSignedUrl(linha.storage_path, URL_DOCUMENTO_SEGUNDOS);
    if (!assinado?.signedUrl) return falhou(admin, id, "indisponivel");
    const mime = linha.mime_type as MimeAceite;
    const chave = lerChaveIdentificadores(process.env.MONITOR_IDENTIFICADORES_CHAVE);

    // Primeiro como factura (o tipo mais comum); se o modelo disser que é um
    // contrato, segunda leitura com o schema do contrato.
    const fatura = leituraFatura();
    const leituraF = await lerDocumentoComClaude({
      url: assinado.signedUrl,
      mime,
      prompt: fatura.prompt,
      schema: fatura.schema,
      instrucao: "Extrai os dados desta fatura.",
      modelo: MODELO_DIAGNOSTICO,
    });
    await registarUso(admin, id, leituraF);
    if (!leituraF.ok) return falhou(admin, id, leituraF.motivo === "recusa" || leituraF.motivo === "resposta_invalida" ? "ilegivel" : "indisponivel");

    const brutoF = protegerExtracao(leituraF.bruto, chave).resultado;
    const tipoLido = (brutoF as { tipo_documento?: unknown })?.tipo_documento;
    let diagnostico: Diagnostico | null = null;

    if (tipoLido === "fatura") {
      const v = validarExtracaoFatura(brutoF, hojeLisboa());
      if (!v.ok) return falhou(admin, id, v.motivo === "formato_invalido" ? "ilegivel" : "nao_suportado");
      diagnostico = diagnosticoDaFatura(v, hojeLisboa());
    } else if (tipoLido === "contrato") {
      const leituraC = await lerDocumentoComClaude({
        url: assinado.signedUrl,
        mime,
        prompt: PROMPT_CONTRATO,
        schema: SCHEMA_CONTRATO,
        instrucao: "Extrai os dados deste contrato.",
        modelo: MODELO_DIAGNOSTICO,
      });
      await registarUso(admin, id, leituraC);
      if (!leituraC.ok) return falhou(admin, id, leituraC.motivo === "recusa" || leituraC.motivo === "resposta_invalida" ? "ilegivel" : "indisponivel");
      const v = validarExtracaoContrato(protegerExtracao(leituraC.bruto, chave).resultado);
      if (!v.ok) return falhou(admin, id, v.motivo === "formato_invalido" ? "ilegivel" : "nao_suportado");
      diagnostico = diagnosticoDoContrato(v, hojeLisboa());
    } else {
      return falhou(admin, id, "nao_suportado");
    }

    await admin
      .from("diagnosticos_gratuitos")
      .update({
        estado: "concluido",
        analisado_em: new Date().toISOString(),
        tipo_documento: diagnostico.tipo,
        setor: ["telecomunicacoes", "eletricidade", "gas", "agua"].includes(diagnostico.setor) ? diagnostico.setor : "nao_indicado",
        resultado: diagnostico,
        modelo: MODELO_DIAGNOSTICO,
      })
      .eq("id", id)
      .eq("estado", "a_analisar");
  } catch (erro) {
    console.error(`[diagnostico] falha ao processar ${id}:`, erro instanceof Error ? erro.message : erro);
    await falhou(admin, id, "indisponivel");
  }
}

// ---------------------------------------------------------------------------
// 4. Estado e resultado (só para a sessão que carregou o documento)
// ---------------------------------------------------------------------------

export type EstadoPublico =
  | { estado: "a_carregar" | "a_analisar" }
  | { estado: "falhou"; motivo: string }
  | { estado: "concluido"; diagnostico: Diagnostico; associado: boolean; importado: boolean };

// Sem avanço há 3 minutos (processo reiniciado a meio): conta como falha
// temporária, o visitante pode tentar de novo.
const LIMITE_SEM_AVANCO_MS = 3 * 60 * 1000;

/**
 * Quem pode abrir um diagnóstico: o browser onde foi carregado (sessão
 * anónima do cookie) ou, depois de ligado a uma conta, o dono com sessão
 * iniciada — também noutro browser ou dispositivo (22/10/2026).
 */
export type DonoDiagnostico = { sessao: SessaoDiagnostico } | { contaId: string };

export async function estadoDiagnostico(dono: DonoDiagnostico, id: string): Promise<EstadoPublico | null> {
  const admin = createAdminClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  let consulta = admin
    .from("diagnosticos_gratuitos")
    .select("id, estado, motivo_falha, resultado, visualizado_em, carregado_em, conta_id, documento_monitor_id")
    .eq("id", id)
    .is("dados_apagados_em", null);
  consulta =
    "sessao" in dono
      ? consulta.eq("sessao_id", dono.sessao.sessaoId).eq("token_hash", hashSegredo(dono.sessao.segredo))
      : consulta.eq("conta_id", dono.contaId);
  const { data } = await consulta.maybeSingle();
  if (!data) return null;

  if (data.estado === "a_analisar" && data.carregado_em && Date.now() - Date.parse(data.carregado_em) > LIMITE_SEM_AVANCO_MS) {
    await falhou(admin, id, "indisponivel");
    return { estado: "falhou", motivo: "indisponivel" };
  }
  if (data.estado === "falhou") return { estado: "falhou", motivo: data.motivo_falha ?? "indisponivel" };
  if (data.estado !== "concluido") return { estado: data.estado as "a_carregar" | "a_analisar" };

  const diagnostico = lerDiagnostico(data.resultado);
  if (!diagnostico) return { estado: "falhou", motivo: "indisponivel" };
  if (!data.visualizado_em) {
    await admin.from("diagnosticos_gratuitos").update({ visualizado_em: new Date().toISOString() }).eq("id", id).is("visualizado_em", null);
  }
  return { estado: "concluido", diagnostico, associado: !!data.conta_id, importado: !!data.documento_monitor_id };
}

/** Clique em "Continuar com 30 dias grátis" ou "Guardar o meu resultado" (uma vez). */
export async function registarEscolha(sessao: SessaoDiagnostico, id: string, escolha: "protecao" | "guardar"): Promise<void> {
  const admin = createAdminClient();
  const linha = await daSessao(admin, sessao, id);
  if (!linha) return;
  const coluna = escolha === "protecao" ? "protecao_clicada_em" : "guardar_clicado_em";
  await admin.from("diagnosticos_gratuitos").update({ [coluna]: new Date().toISOString() }).eq("id", id).is(coluna, null);
}

// ---------------------------------------------------------------------------
// 5. Conta: associação e passagem para o Monitor
// ---------------------------------------------------------------------------

/**
 * Liga os diagnósticos concluídos desta sessão à conta. Devolve quantos.
 * Só contas de cliente: uma sessão de administrador aberta no mesmo browser
 * (ex.: testes da equipa) nunca fica com o diagnóstico — a ligação é
 * definitiva e impediria a conta de cliente criada a seguir de o ver.
 */
export async function associarDiagnosticos(sessao: SessaoDiagnostico, userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: conta } = await admin.from("utilizadores").select("role").eq("id", userId).maybeSingle();
  if (!podeFicarComDiagnostico(conta?.role)) return 0;
  const { data, error } = await admin.rpc("diagnostico_associar", {
    p_sessao: sessao.sessaoId,
    p_token_hash: hashSegredo(sessao.segredo),
    p_user: userId,
  });
  if (error) {
    console.error("[diagnostico] falha na associação:", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

export type DiagnosticoDaConta = { id: string; diagnostico: Diagnostico; importado: boolean };

/** Diagnósticos da conta ainda válidos (o mais recente primeiro). */
export async function diagnosticosDaConta(userId: string): Promise<DiagnosticoDaConta[]> {
  const { data } = await createAdminClient()
    .from("diagnosticos_gratuitos")
    .select("id, resultado, documento_monitor_id")
    .eq("conta_id", userId)
    .eq("estado", "concluido")
    .is("dados_apagados_em", null)
    .order("analisado_em", { ascending: false })
    .limit(10);
  return (data ?? []).flatMap((l) => {
    const diagnostico = lerDiagnostico(l.resultado);
    return diagnostico ? [{ id: l.id as string, diagnostico, importado: !!l.documento_monitor_id }] : [];
  });
}

export type ResultadoImportar = { ok: true; documentoId: string; novo: boolean } | { ok: false };

/**
 * Passa o documento do diagnóstico para o Monitor da conta (quem chama já
 * verificou a sessão e a Protecção). O ficheiro é copiado dentro do bucket:
 * o diagnóstico expira sozinho e nunca apaga o documento da Protecção.
 * Idempotente. Não inicia a leitura — quem chama decide (after()).
 */
export async function importarParaMonitor(userId: string, diagnosticoId: string): Promise<ResultadoImportar> {
  if (!/^[0-9a-f-]{36}$/i.test(diagnosticoId)) return { ok: false };
  const admin = createAdminClient();
  const { data: d } = await admin
    .from("diagnosticos_gratuitos")
    .select("id, storage_path, mime_type, tipo_documento, documento_monitor_id")
    .eq("id", diagnosticoId)
    .eq("conta_id", userId)
    .eq("estado", "concluido")
    .is("dados_apagados_em", null)
    .maybeSingle();
  if (!d || !d.storage_path) return { ok: false };
  if (d.documento_monitor_id) return { ok: true, documentoId: d.documento_monitor_id as string, novo: false };

  const destino = `${userId}/${randomUUID()}.${EXTENSAO_DIAGNOSTICO[d.mime_type as MimeDiagnostico]}`;
  const { error: erroCopia } = await admin.storage.from(BUCKET_DIAGNOSTICO).copy(d.storage_path, destino);
  if (erroCopia) return { ok: false };

  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({
      utilizador_id: userId,
      tipo: d.tipo_documento === "contrato" ? "contrato" : "fatura",
      bucket: BUCKET_DIAGNOSTICO,
      storage_path: destino,
      mime_type: d.mime_type,
      etapa: "recebido",
      etapa_atualizada_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !doc) {
    await admin.storage.from(BUCKET_DIAGNOSTICO).remove([destino]);
    return { ok: false };
  }

  // Corrida (duplo clique): só um documento fica ligado ao diagnóstico.
  const { data: ligado } = await admin
    .from("diagnosticos_gratuitos")
    .update({ documento_monitor_id: doc.id })
    .eq("id", d.id)
    .is("documento_monitor_id", null)
    .select("id")
    .maybeSingle();
  if (!ligado) {
    await admin.from("documentos_monitor").delete().eq("id", doc.id);
    await admin.storage.from(BUCKET_DIAGNOSTICO).remove([destino]);
    const { data: outro } = await admin.from("diagnosticos_gratuitos").select("documento_monitor_id").eq("id", d.id).maybeSingle();
    return outro?.documento_monitor_id ? { ok: true, documentoId: outro.documento_monitor_id as string, novo: false } : { ok: false };
  }
  return { ok: true, documentoId: doc.id as string, novo: true };
}
