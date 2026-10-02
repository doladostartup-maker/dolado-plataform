// DoLado — processamento de documentos do Monitor de Proteção (servidor).
//
// Pipeline (docs/especificacoes/CLAUDE_API_MONITORIZACAO.md, secção 10):
//   documento pendente → orçamento → Claude (structured output) → registo do
//   custo → extração (staging) → validação de domínio → contrato (existente
//   ou novo) → valores propostos (o cliente confirma) → fatura normalizada →
//   regras F2/F4 (achados para revisão humana).
//
// Usa a service role: quem chama tem de ter validado a sessão, a posse do
// documento e a Proteção ANTES (Server Actions do portal / backoffice).
// Nunca lança para o cliente: falhas deixam o documento "pendente" (a DoLado
// trata manualmente) ou "a_rever", com aviso ao admin.

import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import { MODELO_DOCUMENTOS } from "@/lib/claude";
import { MIME_ACEITES, lerDocumentoComClaude, type MimeAceite } from "./claudeDocumentos";
import { avisosAtravessados, estadoOrcamento, lerTetoOrcamentoUsd } from "./custos";
import { chaveFornecedor } from "./contratos";
import { avaliarFatura, type FaturaHistorico } from "./regrasFaturas";
import { VERSAO_REGRA_CESSACAO, compararCessacao, textoCessacaoDivergente } from "./custoSaida";
import {
  PROMPT_FATURA,
  PROMPT_FATURA_VERSAO,
  SCHEMA_FATURA,
  SCHEMA_FATURA_VERSAO,
  validarExtracaoFatura,
  type CampoProposto,
} from "./extracaoFatura";
import {
  PROMPT_CONTRATO,
  PROMPT_CONTRATO_VERSAO,
  SCHEMA_CONTRATO,
  SCHEMA_CONTRATO_VERSAO,
  validarExtracaoContrato,
} from "./extracaoContrato";

type Admin = ReturnType<typeof createAdminClient>;

export type EstadoDocumento = "pendente" | "processado" | "a_rever" | "ilegivel";

// Valores lidos todos os meses e só informativos: aceites sem pedir
// confirmação quando a confiança é alta e não contradizem o cliente.
const ACEITES_SEM_CONFIRMACAO = new Set(["cessacao_operador_cents", "cessacao_operador_data"]);

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

async function avisarAdmin(assunto: string, texto: string) {
  try {
    await enviarEmailBrevo(
      ADMIN_EMAIL,
      `[Monitor] ${assunto}`,
      `<p>${texto}</p><p><a href="https://portal.dolado.pt/backoffice/monitor">portal.dolado.pt/backoffice/monitor</a></p>`,
    );
  } catch (erro) {
    console.error("Falha ao avisar o admin (Monitor):", erro);
  }
}

export async function gastoApiUsd(admin: Admin): Promise<number> {
  const { data } = await admin.from("uso_api_claude").select("custo_estimado_usd");
  return (data ?? []).reduce((s, l) => s + Number(l.custo_estimado_usd ?? 0), 0);
}

export function tetoOrcamentoUsd() {
  return lerTetoOrcamentoUsd(process.env.ANTHROPIC_ORCAMENTO_USD);
}

async function marcar(admin: Admin, documentoId: string, estado: EstadoDocumento, extra: Record<string, unknown> = {}) {
  await admin.from("documentos_monitor").update({ estado, ...extra }).eq("id", documentoId);
}

async function contratoParaDocumento(
  admin: Admin,
  doc: { utilizador_id: string; contrato_id: string | null },
  fornecedor: string | null,
  setor: string,
): Promise<string> {
  if (doc.contrato_id) {
    // Contrato escolhido pelo cliente: só preenche o setor se ainda faltar.
    await admin
      .from("contratos_monitorizados")
      .update({ setor })
      .eq("id", doc.contrato_id)
      .eq("setor", "nao_indicado");
    return doc.contrato_id;
  }

  const chave = chaveFornecedor(fornecedor);
  if (chave) {
    const { data: existentes } = await admin
      .from("contratos_monitorizados")
      .select("id, fornecedor, setor, created_at")
      .eq("utilizador_id", doc.utilizador_id)
      .neq("estado", "terminado")
      .order("created_at", { ascending: true });
    const igual = (existentes ?? []).find((c) => chaveFornecedor(c.fornecedor) === chave);
    if (igual) {
      if (igual.setor === "nao_indicado" && setor !== "nao_indicado") {
        await admin.from("contratos_monitorizados").update({ setor }).eq("id", igual.id);
      }
      return igual.id;
    }
  }

  const { data: novo, error } = await admin
    .from("contratos_monitorizados")
    .insert({ utilizador_id: doc.utilizador_id, setor })
    .select("id")
    .single();
  if (error || !novo) throw new Error(`Não foi possível criar o contrato: ${error?.message}`);
  return novo.id;
}

async function registarPropostas(
  admin: Admin,
  contratoId: string,
  documentoId: string,
  extracaoId: string,
  origem: "fatura" | "contrato",
  propostas: CampoProposto[],
) {
  for (const p of propostas) {
    const { data: campoId, error } = await admin.rpc("monitor_campo_propor", {
      p_contrato: contratoId,
      p_campo: p.campo,
      p_valor: p.valor,
      p_origem: origem,
      p_documento: documentoId,
      p_extracao: extracaoId,
      p_pagina: p.pagina,
      p_evidencia: p.evidencia,
      p_confianca: p.confianca,
    });
    if (error) {
      console.error(`Falha ao propor ${p.campo}:`, error.message);
      continue;
    }
    if (ACEITES_SEM_CONFIRMACAO.has(p.campo) && p.confianca === "high") {
      const { data: campo } = await admin.from("contratos_campos").select("estado").eq("id", campoId).single();
      if (campo?.estado === "proposto") {
        await admin.rpc("monitor_campo_aceitar", { p_campo_id: campoId, p_por: null });
      }
    }
  }
}

// F2/F4: compara a fatura nova com o histórico e o contrato e regista as
// situações detetadas para revisão humana (nunca vão diretamente ao cliente).
// Só telecomunicações nesta fase. Idempotente: chave única por regra.
async function avaliarAchados(admin: Admin, contratoId: string, documentoId: string) {
  const [{ data: contrato }, { data: faturas }] = await Promise.all([
    admin.from("contratos_monitorizados").select("*").eq("id", contratoId).single(),
    admin
      .from("faturas_monitor")
      .select("id, documento_id, utilizador_id, data_emissao, periodo_inicio, periodo_fim, recorrente_cents, linhas, cessacao_operador_cents")
      .eq("contrato_id", contratoId),
  ]);
  if (!contrato || contrato.setor !== "telecomunicacoes") return 0;
  const atual = (faturas ?? []).find((f) => f.documento_id === documentoId);
  if (!atual) return 0;

  const historico: FaturaHistorico[] = (faturas ?? []).map((f) => ({
    id: f.id,
    dataEmissao: f.data_emissao,
    periodoInicio: f.periodo_inicio,
    periodoFim: f.periodo_fim,
    recorrenteCents: f.recorrente_cents,
    linhas: Array.isArray(f.linhas) ? f.linhas : [],
  }));

  type NovoAchado = {
    contrato_id: string;
    utilizador_id: string;
    fatura_id: string;
    tipo: string;
    versao_regra: string;
    chave_idempotencia: string;
    evidencia: Record<string, unknown>;
  };
  const novos: NovoAchado[] = avaliarFatura(atual.id, historico, { dataFimPromocao: contrato.data_fim_promocao }).map((a) => ({
    contrato_id: contratoId,
    utilizador_id: contrato.utilizador_id,
    fatura_id: atual.id,
    tipo: a.tipo,
    versao_regra: a.versaoRegra,
    chave_idempotencia: a.chave,
    evidencia: { ...a.evidencia, texto_proposto: a.textoProposto },
  }));

  const dataOperador = contrato.cessacao_operador_data ?? atual.data_emissao;
  const cessacao = compararCessacao(contrato, atual.cessacao_operador_cents, dataOperador);
  if (cessacao.resultado === "divergente") {
    novos.push({
      contrato_id: contratoId,
      utilizador_id: contrato.utilizador_id,
      fatura_id: atual.id,
      tipo: "cessacao_divergente",
      versao_regra: VERSAO_REGRA_CESSACAO,
      chave_idempotencia: `${VERSAO_REGRA_CESSACAO}:${atual.id}`,
      evidencia: {
        fatura_atual_id: atual.id,
        operador_cents: cessacao.operadorCents,
        estimativa_cents: cessacao.estimativaCents,
        diferenca_cents: cessacao.diferencaCents,
        data_valor: dataOperador,
        texto_proposto: textoCessacaoDivergente(cessacao.operadorCents, dataOperador!, cessacao.estimativaCents),
      },
    });
  }
  if (novos.length === 0) return 0;

  const { data: inseridos, error } = await admin
    .from("achados_monitor")
    .upsert(novos, { onConflict: "chave_idempotencia", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("Falha ao registar achados:", error.message);
    return 0;
  }
  const n = inseridos?.length ?? 0;
  if (n > 0) await avisarAdmin("Situações por rever", `${n} situação(ões) detetada(s) numa fatura nova (contrato ${contratoId}).`);
  return n;
}

export async function processarDocumento(documentoId: string): Promise<{ estado: EstadoDocumento; contratoId: string | null }> {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documentos_monitor")
    .select("id, utilizador_id, contrato_id, tipo, bucket, storage_path, mime_type, estado, desativado_em")
    .eq("id", documentoId)
    .single();

  if (!doc) return { estado: "a_rever", contratoId: null };
  if (doc.estado !== "pendente" || doc.desativado_em) return { estado: doc.estado as EstadoDocumento, contratoId: doc.contrato_id };

  try {
    // 1. Orçamento do piloto
    const teto = tetoOrcamentoUsd();
    const gastoAntes = await gastoApiUsd(admin);
    if (estadoOrcamento(gastoAntes, teto).bloqueado) {
      await avisarAdmin("Orçamento da Claude API atingido", `Documento ${doc.id} ficou pendente: o gasto (${gastoAntes.toFixed(2)} USD) atingiu o teto de ${teto} USD.`);
      return { estado: "pendente", contratoId: doc.contrato_id };
    }

    // 2. Ficheiro
    if (!MIME_ACEITES.includes(doc.mime_type as MimeAceite)) {
      await marcar(admin, doc.id, "a_rever");
      await avisarAdmin("Documento por rever", `Documento ${doc.id}: formato ${doc.mime_type ?? "desconhecido"} não é lido automaticamente.`);
      return { estado: "a_rever", contratoId: doc.contrato_id };
    }
    const { data: ficheiro, error: erroFicheiro } = await admin.storage.from(doc.bucket).download(doc.storage_path);
    if (erroFicheiro || !ficheiro) {
      await avisarAdmin("Documento por processar", `Documento ${doc.id}: o ficheiro não foi encontrado no Storage.`);
      return { estado: "pendente", contratoId: doc.contrato_id };
    }

    const ehContrato = doc.tipo === "contrato";
    const versao = ehContrato
      ? { schema: SCHEMA_CONTRATO_VERSAO, prompt: PROMPT_CONTRATO_VERSAO }
      : { schema: SCHEMA_FATURA_VERSAO, prompt: PROMPT_FATURA_VERSAO };

    // 3. Idempotência: a mesma leitura (modelo + schema + prompt) não se repete.
    const { data: anterior } = await admin
      .from("extracoes_documento")
      .select("id, resultado")
      .eq("documento_id", doc.id)
      .eq("modelo", MODELO_DOCUMENTOS)
      .eq("schema_versao", versao.schema)
      .eq("prompt_versao", versao.prompt)
      .eq("estado", "sucesso")
      .maybeSingle();

    let extracaoId: string;
    let bruto: unknown;

    if (anterior) {
      extracaoId = anterior.id;
      bruto = anterior.resultado;
    } else {
      const chamada = await lerDocumentoComClaude({
        conteudo: Buffer.from(await ficheiro.arrayBuffer()),
        mime: doc.mime_type as MimeAceite,
        prompt: ehContrato ? PROMPT_CONTRATO : PROMPT_FATURA,
        schema: ehContrato ? SCHEMA_CONTRATO : SCHEMA_FATURA,
        instrucao: ehContrato ? "Extrai os dados deste contrato." : "Extrai os dados desta fatura.",
      });

      if (chamada.uso) {
        await admin.from("uso_api_claude").insert({
          funcionalidade: ehContrato ? "monitor_contrato" : "monitor_fatura",
          documento_id: doc.id,
          modelo: chamada.uso.modelo,
          tokens_entrada: chamada.uso.tokensEntrada,
          tokens_saida: chamada.uso.tokensSaida,
          custo_estimado_usd: chamada.uso.custoUsd,
          latencia_ms: chamada.uso.latenciaMs,
          estado: chamada.ok ? "sucesso" : "erro",
          request_id: chamada.uso.requestId,
        });
        for (const pct of avisosAtravessados(gastoAntes, gastoAntes + chamada.uso.custoUsd, teto)) {
          await avisarAdmin(`Orçamento da Claude API a ${pct}%`, `Gasto estimado: ${(gastoAntes + chamada.uso.custoUsd).toFixed(4)} USD de ${teto} USD.`);
        }
      }

      if (!chamada.ok) {
        if (chamada.motivo === "api_nao_configurada" || chamada.motivo === "erro_api") {
          // Caminho manual, sem erro para o cliente.
          await avisarAdmin("Documento por processar", `Documento ${doc.id} ficou pendente (${chamada.motivo}).`);
          return { estado: "pendente", contratoId: doc.contrato_id };
        }
        await admin.from("extracoes_documento").insert({
          documento_id: doc.id,
          modelo: MODELO_DOCUMENTOS,
          schema_versao: versao.schema,
          prompt_versao: versao.prompt,
          estado: "invalida",
          erro: chamada.motivo,
        });
        await marcar(admin, doc.id, "a_rever");
        await avisarAdmin("Documento por rever", `Documento ${doc.id}: leitura sem resultado válido (${chamada.motivo}).`);
        return { estado: "a_rever", contratoId: doc.contrato_id };
      }

      const { data: extracao, error: erroExtracao } = await admin
        .from("extracoes_documento")
        .insert({
          documento_id: doc.id,
          modelo: MODELO_DOCUMENTOS,
          schema_versao: versao.schema,
          prompt_versao: versao.prompt,
          estado: "sucesso",
          resultado: chamada.bruto,
        })
        .select("id")
        .single();
      if (erroExtracao || !extracao) throw new Error(`Falha ao gravar a extração: ${erroExtracao?.message}`);
      extracaoId = extracao.id;
      bruto = chamada.bruto;
    }

    // 4. Validação de domínio e gravação
    if (ehContrato) {
      const v = validarExtracaoContrato(bruto);
      if (!v.ok) {
        await marcar(admin, doc.id, "a_rever");
        await avisarAdmin("Documento por rever", `Documento ${doc.id}: ${v.motivo}.`);
        return { estado: "a_rever", contratoId: doc.contrato_id };
      }
      const fornecedor = v.propostas.find((p) => p.campo === "fornecedor")?.valor as string | undefined;
      const contratoId = await contratoParaDocumento(admin, doc, fornecedor ?? null, v.setor);
      await admin.from("documentos_monitor").update({ contrato_id: contratoId }).eq("id", doc.id);
      await registarPropostas(admin, contratoId, doc.id, extracaoId, "contrato", v.propostas);
      const estado: EstadoDocumento = v.precisaRevisao ? "a_rever" : "processado";
      await marcar(admin, doc.id, estado);
      if (estado === "a_rever") await avisarAdmin("Documento por rever", `Documento ${doc.id}: ${v.avisos.join("; ") || "confiança baixa"}.`);
      return { estado, contratoId };
    }

    const v = validarExtracaoFatura(bruto, hojeLisboa());
    if (!v.ok) {
      await marcar(admin, doc.id, "a_rever");
      await avisarAdmin("Documento por rever", `Documento ${doc.id}: ${v.motivo}.`);
      return { estado: "a_rever", contratoId: doc.contrato_id };
    }
    const fornecedor = v.propostas.find((p) => p.campo === "fornecedor")?.valor as string | undefined;
    const contratoId = await contratoParaDocumento(admin, doc, fornecedor ?? null, v.setor);
    await admin.from("documentos_monitor").update({ contrato_id: contratoId, tipo: "fatura" }).eq("id", doc.id);

    const f = v.fatura;
    await admin.from("faturas_monitor").upsert(
      {
        contrato_id: contratoId,
        utilizador_id: doc.utilizador_id,
        documento_id: doc.id,
        extracao_id: extracaoId,
        data_emissao: f.dataEmissao,
        periodo_inicio: f.periodoInicio,
        periodo_fim: f.periodoFim,
        total_cents: f.totalCents,
        recorrente_cents: f.recorrenteCents,
        pontual_cents: f.pontualCents,
        descontos_cents: f.descontosCents,
        linhas: f.linhas,
        cessacao_operador_cents: f.cessacaoOperadorCents,
        data_fim_fidelizacao: f.dataFimFidelizacao,
      },
      { onConflict: "documento_id", ignoreDuplicates: true },
    );
    await registarPropostas(admin, contratoId, doc.id, extracaoId, "fatura", v.propostas);
    await avaliarAchados(admin, contratoId, doc.id);

    const estado: EstadoDocumento = v.precisaRevisao ? "a_rever" : "processado";
    await marcar(admin, doc.id, estado);
    if (estado === "a_rever") await avisarAdmin("Documento por rever", `Documento ${doc.id}: ${v.avisos.join("; ") || "confiança baixa num campo importante"}.`);
    return { estado, contratoId };
  } catch (erro) {
    console.error(`Falha ao processar o documento ${documentoId}:`, erro);
    await avisarAdmin("Documento por processar", `Documento ${documentoId}: erro inesperado no processamento.`);
    return { estado: "pendente", contratoId: doc.contrato_id };
  }
}
