// DoLado — processamento de documentos do Monitor de Proteção (servidor).
//
// Pipeline (docs/especificacoes/CLAUDE_API_MONITORIZACAO.md, secção 10):
//   documento pendente → orçamento → Claude (structured output) → registo do
//   custo → extração (staging) → validação de domínio → associação ao serviço
//   (identificadores: confirmada / possível / conflito / serviço novo) →
//   fatura normalizada + comparação mensal em código (eventos; os que merecem
//   atenção vão para revisão humana) ou condições do contrato (o cliente
//   confirma). Uma fatura nunca altera condições contratuais.
//
// Usa a service role: quem chama tem de ter validado a sessão, a posse do
// documento e a Proteção ANTES (Server Actions do portal / backoffice).
// Nunca lança para o cliente: falhas deixam o documento "pendente" (a DoLado
// trata manualmente) ou "a_rever", com aviso ao admin.

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import { MODELO_DOCUMENTOS } from "@/lib/claude";
import { MIME_ACEITES, lerDocumentoComClaude, type MimeAceite } from "./claudeDocumentos";
import { avisosAtravessados, estadoOrcamento, lerTetoOrcamentoUsd } from "./custos";
import { chaveFornecedor } from "./contratos";
import { nomeComercial, type Fornecedor } from "./fornecedores";
import { emCurso, etapaDepoisDaLeitura, parado } from "./processamento";
import {
  TIPO_ACHADO,
  VERSAO_ACOMPANHAMENTO,
  compararFatura,
  fraseEvento,
  ordenarFaturas,
  resultadoFatura,
  versaoValida,
  type FaturaComparavel,
  type VersaoContrato,
} from "./acompanhamento";
import {
  escolherServico,
  lerChaveIdentificadores,
  normalizarIdentificadores,
  protegerExtracao,
  type IdentidadeServico,
  type IdentificadorLido,
  type ResultadoAssociacao,
  type TipoIdentificador,
} from "./identificacao";
import { VERSAO_REGRA_CESSACAO, compararCessacao, textoCessacaoDivergente } from "./custoSaida";
import { erroAlterarTipo, lerTipoDocumento, type ErroAlterarTipo } from "./tipoDocumento";
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
  // Sem Brevo configurada (testes locais): não há para onde enviar.
  if (!process.env.BREVO_API_KEY) {
    console.log(`[monitor] aviso ao admin (sem envio): ${assunto} — ${texto}`);
    return;
  }
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

// Validade da URL assinada entregue à Claude API para descarregar o documento.
const URL_DOCUMENTO_SEGUNDOS = 300;
const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

// Hash SHA-256, tamanho e tipo de um ficheiro do Storage, lido em streaming
// (bloco a bloco): o ficheiro nunca fica inteiro em memória. null se não
// existir ou exceder o tamanho máximo.
export async function inspecionarFicheiro(
  bucket: string,
  caminho: string,
): Promise<{ sha256: string; tamanho: number; mime: string } | null> {
  const admin = createAdminClient();
  const { data: assinado } = await admin.storage.from(bucket).createSignedUrl(caminho, 60);
  if (!assinado?.signedUrl) return null;
  const resposta = await fetch(assinado.signedUrl, { signal: AbortSignal.timeout(60_000) });
  if (!resposta.ok || !resposta.body) return null;

  const hash = createHash("sha256");
  let tamanho = 0;
  const leitor = resposta.body.getReader();
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    tamanho += value.byteLength;
    if (tamanho > TAMANHO_MAXIMO_DOCUMENTO) {
      await leitor.cancel();
      return null;
    }
    hash.update(value);
  }
  const mime = (resposta.headers.get("content-type") ?? "").split(";")[0].trim();
  return { sha256: hash.digest("hex"), tamanho, mime };
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

async function marcarEtapa(admin: Admin, documentoId: string, etapa: string, extra: Record<string, unknown> = {}) {
  await admin
    .from("documentos_monitor")
    .update({ etapa, etapa_atualizada_em: new Date().toISOString(), ...extra })
    .eq("id", documentoId);
}

// Lista de fornecedores (nome comercial ← nome legal/aliases), em memória
// durante 10 minutos: muda raramente e é lida em cada documento.
let fornecedoresCache: { lista: Fornecedor[]; lidoEm: number } | null = null;
const FORNECEDORES_VALIDADE_MS = 10 * 60 * 1000;

export async function listaFornecedores(admin: Admin = createAdminClient()): Promise<Fornecedor[]> {
  if (fornecedoresCache && Date.now() - fornecedoresCache.lidoEm < FORNECEDORES_VALIDADE_MS) return fornecedoresCache.lista;
  const { data, error } = await admin.from("fornecedores").select("id, nome_comercial, nome_legal, aliases").eq("ativo", true);
  if (error) {
    console.error("Falha ao ler os fornecedores:", error.message);
    return fornecedoresCache?.lista ?? [];
  }
  fornecedoresCache = { lista: (data ?? []) as Fornecedor[], lidoEm: Date.now() };
  return fornecedoresCache.lista;
}

/** Nome a apresentar ao cliente (comercial, se conhecido; senão o registado). */
export async function apresentarFornecedor(nome: string | null | undefined) {
  return nomeComercial(nome, await listaFornecedores());
}

// Chave dos pseudónimos do NIF e do nome do titular (identificacao.ts).
// Sem chave válida, esses dois dados são ignorados — nunca guardados em claro.
let avisoSemChave = false;
function chaveIdentificadores(): string | null {
  const chave = lerChaveIdentificadores(process.env.MONITOR_IDENTIFICADORES_CHAVE);
  if (!chave && !avisoSemChave) {
    avisoSemChave = true;
    console.error("[monitor] MONITOR_IDENTIFICADORES_CHAVE em falta ou curta: NIF e nome do titular são ignorados na associação.");
  }
  return chave;
}

/**
 * Leitura gravada, sem NIF nem nome do titular em texto. Uma leitura antiga
 * ainda em claro é protegida e regravada antes de ser usada.
 */
async function leituraProtegida(admin: Admin, extracao: { id: string; resultado: unknown }): Promise<unknown> {
  const { resultado, alterado } = protegerExtracao(extracao.resultado, chaveIdentificadores());
  if (alterado) {
    const { error } = await admin.from("extracoes_documento").update({ resultado }).eq("id", extracao.id);
    if (error) console.error(`[monitor] falha ao proteger a leitura ${extracao.id}:`, error.message);
  }
  return resultado;
}

// Mesmo fornecedor apesar de nome legal vs. comercial ("Vodafone Portugal,
// Comunicações Pessoais, S.A." e "Vodafone").
function chaveComercial(nome: string | null | undefined, lista: Fornecedor[]) {
  return chaveFornecedor(nomeComercial(nome, lista)) || null;
}

// ---------------------------------------------------------------------------
// Leitura validada de um documento (a partir da extração gravada — sem IA)
// ---------------------------------------------------------------------------

type ValidacaoFaturaOk = Extract<ReturnType<typeof validarExtracaoFatura>, { ok: true }>;
type ValidacaoContratoOk = Extract<ReturnType<typeof validarExtracaoContrato>, { ok: true }>;

export type LeituraDocumento =
  | { tipo: "fatura"; setor: string; fornecedor: string | null; identificacao: IdentificadorLido[]; v: ValidacaoFaturaOk }
  | { tipo: "contrato"; setor: string; fornecedor: string | null; identificacao: IdentificadorLido[]; v: ValidacaoContratoOk };

function validarLeitura(tipo: "fatura" | "contrato", bruto: unknown): { ok: true; leitura: LeituraDocumento } | { ok: false; motivo: string } {
  if (tipo === "contrato") {
    const v = validarExtracaoContrato(bruto);
    if (!v.ok) return { ok: false, motivo: v.motivo };
    return { ok: true, leitura: { tipo, setor: v.setor, fornecedor: v.fornecedor, identificacao: v.identificacao, v } };
  }
  const v = validarExtracaoFatura(bruto, hojeLisboa());
  if (!v.ok) return { ok: false, motivo: v.motivo };
  return { ok: true, leitura: { tipo, setor: v.setor, fornecedor: v.fornecedor, identificacao: v.identificacao, v } };
}

// ---------------------------------------------------------------------------
// A que serviço pertence o documento?
// ---------------------------------------------------------------------------

async function identidadesServicos(admin: Admin, utilizadorId: string, fornecedores: Fornecedor[]): Promise<IdentidadeServico[]> {
  const { data: servicos } = await admin
    .from("contratos_monitorizados")
    .select("id, fornecedor")
    .eq("utilizador_id", utilizadorId)
    .is("desativado_em", null)
    .neq("estado", "terminado")
    .order("created_at", { ascending: true });
  if (!servicos?.length) return [];
  const { data: ids } = await admin
    .from("servicos_identificadores")
    .select("contrato_id, tipo, valor_normalizado, apresentacao")
    .in("contrato_id", servicos.map((s) => s.id));
  return servicos.map((s) => ({
    id: s.id,
    fornecedorChave: chaveComercial(s.fornecedor, fornecedores),
    ids: (ids ?? [])
      .filter((i) => i.contrato_id === s.id)
      .map((i) => ({ tipo: i.tipo as TipoIdentificador, valorNormalizado: i.valor_normalizado, apresentacao: i.apresentacao })),
  }));
}

async function decidirDestino(admin: Admin, doc: { utilizador_id: string; contrato_id: string | null }, leitura: LeituraDocumento) {
  const fornecedores = await listaFornecedores(admin);
  const servicos = await identidadesServicos(admin, doc.utilizador_id, fornecedores);
  const identidade = { fornecedorChave: chaveComercial(leitura.fornecedor, fornecedores), ids: normalizarIdentificadores(leitura.identificacao, chaveIdentificadores()) };
  return escolherServico(identidade, servicos, doc.contrato_id);
}

// Novo serviço a partir de um documento. Numa fatura, o fornecedor é só
// identificação (aceite pelo sistema, origem "Lido da fatura"); num contrato
// segue as propostas normais, que o cliente confirma.
async function criarServico(admin: Admin, utilizadorId: string, leitura: LeituraDocumento, documentoId: string): Promise<string> {
  const { data: novo, error } = await admin
    .from("contratos_monitorizados")
    .insert({ utilizador_id: utilizadorId, setor: leitura.setor })
    .select("id")
    .single();
  if (error || !novo) throw new Error(`Não foi possível criar o serviço: ${error?.message}`);
  if (leitura.tipo === "fatura" && leitura.fornecedor) {
    const nome = nomeComercial(leitura.fornecedor, await listaFornecedores(admin)) ?? leitura.fornecedor;
    const { data: campoId } = await admin.rpc("monitor_campo_propor", {
      p_contrato: novo.id,
      p_campo: "fornecedor",
      p_valor: nome,
      p_origem: "fatura",
      p_documento: documentoId,
      p_evidencia: leitura.fornecedor,
      p_confianca: "high",
    });
    if (campoId) await admin.rpc("monitor_campo_aceitar", { p_campo_id: campoId, p_por: null });
  }
  return novo.id;
}

async function guardarPendente(admin: Admin, documentoId: string, servicoId: string, r: ResultadoAssociacao, tipo: "fatura" | "contrato") {
  await admin
    .from("documentos_monitor")
    .update({
      contrato_id: null,
      tipo,
      associacao_estado: r.estado === "conflito" ? "conflito" : "possivel",
      associacao_confianca: r.confianca,
      associacao_motivos: r.motivos,
      associacao_conflitos: r.conflitos,
      associacao_sugerida: servicoId,
    })
    .eq("id", documentoId);
}

type Registo = {
  documentoId: string;
  utilizadorId: string;
  servicoId: string;
  extracaoId: string;
  leitura: LeituraDocumento;
  estado: "confirmada" | "novo_servico" | "manual";
  resultado: ResultadoAssociacao | null;
  decisao: "automatica" | "associar_mesmo_assim" | "outro_servico" | "novo_servico";
  papel: "cliente" | "admin" | "sistema";
  por: string | null;
};

/**
 * Regista um documento num serviço (associação já decidida). Uma fatura
 * repetida (mesmo número, ou mesmo período e total) não cria outro mês.
 */
async function registarNoServico(admin: Admin, a: Registo): Promise<{ repetido: boolean }> {
  const { leitura } = a;

  if (leitura.tipo === "fatura") {
    const f = leitura.v.fatura;
    let repetida = null;
    if (f.numeroFatura) {
      ({ data: repetida } = await admin
        .from("faturas_monitor")
        .select("id")
        .eq("contrato_id", a.servicoId)
        .eq("numero_fatura", f.numeroFatura)
        .neq("documento_id", a.documentoId)
        .maybeSingle());
    } else if (f.periodoInicio && f.periodoFim && f.totalCents != null) {
      ({ data: repetida } = await admin
        .from("faturas_monitor")
        .select("id")
        .eq("contrato_id", a.servicoId)
        .eq("periodo_inicio", f.periodoInicio)
        .eq("periodo_fim", f.periodoFim)
        .eq("total_cents", f.totalCents)
        .neq("documento_id", a.documentoId)
        .limit(1)
        .maybeSingle());
    }
    if (repetida) {
      await admin.from("documentos_monitor").update({ contrato_id: a.servicoId, associacao_sugerida: null }).eq("id", a.documentoId);
      return { repetido: true };
    }
  }

  await admin
    .from("documentos_monitor")
    .update({
      contrato_id: a.servicoId,
      tipo: leitura.tipo,
      associacao_estado: a.estado,
      associacao_confianca: a.resultado?.confianca ?? null,
      associacao_motivos: a.resultado?.motivos ?? [],
      associacao_conflitos: a.resultado?.conflitos ?? [],
      associacao_sugerida: null,
    })
    .eq("id", a.documentoId);

  // Identificadores: ficam no serviço para associar os próximos documentos.
  const ids = normalizarIdentificadores(leitura.identificacao, chaveIdentificadores());
  if (ids.length) {
    await admin.from("servicos_identificadores").upsert(
      ids.map((i) => ({
        contrato_id: a.servicoId,
        utilizador_id: a.utilizadorId,
        tipo: i.tipo,
        valor_normalizado: i.valorNormalizado,
        apresentacao: i.apresentacao,
        origem: leitura.tipo,
        documento_id: a.documentoId,
      })),
      { onConflict: "contrato_id,tipo,valor_normalizado", ignoreDuplicates: true },
    );
  }

  await admin.from("associacoes_documento").insert({
    documento_id: a.documentoId,
    utilizador_id: a.utilizadorId,
    contrato_id: a.servicoId,
    decisao: a.decisao,
    estado_associacao: a.estado,
    motivos: a.resultado?.motivos ?? [],
    conflitos: a.resultado?.conflitos ?? [],
    decidido_por: a.por,
    papel: a.papel,
  });

  await admin.from("contratos_monitorizados").update({ setor: leitura.setor }).eq("id", a.servicoId).eq("setor", "nao_indicado");

  if (leitura.tipo === "contrato") {
    await registarPropostas(admin, a.servicoId, a.documentoId, a.extracaoId, "contrato", leitura.v.propostas);
    return { repetido: false };
  }

  const f = leitura.v.fatura;
  const { data: fatura } = await admin
    .from("faturas_monitor")
    .upsert(
      {
        contrato_id: a.servicoId,
        utilizador_id: a.utilizadorId,
        documento_id: a.documentoId,
        extracao_id: a.extracaoId,
        numero_fatura: f.numeroFatura,
        mensalidade_lida_cents: f.mensalidadeLidaCents,
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
      { onConflict: "documento_id" },
    )
    .select("id")
    .single();

  // Nível 2: o que a fatura diz expressamente sobre a fidelização ou o valor
  // de cessação só é proposto quando o serviço não tem esse dado de outra
  // fonte (contrato, cliente, DoLado, cálculo). Uma fatura nunca compete com
  // o contrato: a diferença passa a evento para revisão.
  const { data: atuais } = await admin
    .from("contratos_campos")
    .select("campo, origem")
    .eq("contrato_id", a.servicoId)
    .eq("estado", "atual");
  const deOutraFonte = new Set((atuais ?? []).filter((c) => c.origem !== "fatura").map((c) => c.campo as string));
  await registarPropostas(
    admin,
    a.servicoId,
    a.documentoId,
    a.extracaoId,
    "fatura",
    leitura.v.propostas.filter((p) => !deOutraFonte.has(p.campo)),
  );

  if (fatura) await avaliarCessacao(admin, a.servicoId, fatura.id);
  await recalcularAcompanhamento(admin, a.servicoId);
  return { repetido: false };
}

async function registarPropostas(
  admin: Admin,
  contratoId: string,
  documentoId: string,
  extracaoId: string,
  origem: "fatura" | "contrato",
  propostas: CampoProposto[],
) {
  // Fornecedor: o cliente vê o nome comercial; o texto do documento fica na
  // evidência (proveniência).
  const fornecedores = await listaFornecedores(admin);
  const normalizadas = propostas.map((p) =>
    p.campo === "fornecedor" && typeof p.valor === "string" ? { ...p, valor: nomeComercial(p.valor, fornecedores) ?? p.valor } : p,
  );

  // Em paralelo: cada proposta é uma função SQL curta (a base de dados põe
  // em série as que tocam no mesmo contrato).
  await Promise.all(
    normalizadas.map(async (p) => {
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
        return;
      }
      if (ACEITES_SEM_CONFIRMACAO.has(p.campo) && p.confianca === "high") {
        const { data: campo } = await admin.from("contratos_campos").select("estado").eq("id", campoId).single();
        if (campo?.estado === "proposto") {
          await admin.rpc("monitor_campo_aceitar", { p_campo_id: campoId, p_por: null });
        }
      }
    }),
  );
}

// F4: valor de cessação indicado na fatura × estimativa a partir do
// contrato (telecomunicações). Regra e achado próprios, com revisão humana.
async function avaliarCessacao(admin: Admin, contratoId: string, faturaId: string) {
  const [{ data: contrato }, { data: atual }, { data: camposAtuais }] = await Promise.all([
    admin.from("contratos_monitorizados").select("*").eq("id", contratoId).single(),
    admin.from("faturas_monitor").select("id, data_emissao, cessacao_operador_cents").eq("id", faturaId).single(),
    admin.from("contratos_campos").select("campo, origem").eq("contrato_id", contratoId).eq("estado", "atual"),
  ]);
  if (!contrato || !atual || contrato.setor !== "telecomunicacoes") return;
  const dataOperador = contrato.cessacao_operador_data ?? atual.data_emissao;
  const origens = Object.fromEntries((camposAtuais ?? []).map((c) => [c.campo as string, c.origem as string]));
  const cessacao = compararCessacao(contrato, atual.cessacao_operador_cents, dataOperador, origens);
  if (cessacao.resultado !== "divergente") return;
  const { data: inseridos } = await admin
    .from("achados_monitor")
    .upsert(
      {
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
      },
      { onConflict: "chave_idempotencia", ignoreDuplicates: true },
    )
    .select("id");
  if (inseridos?.length) await avisarAdmin("Situação por rever", `Valor de cessação divergente numa fatura nova (serviço ${contratoId}).`);
}

// ---------------------------------------------------------------------------
// Comparação de todas as faturas do serviço (sem IA)
// ---------------------------------------------------------------------------
// Cada fatura é comparada com as anteriores e com a versão do contrato válida
// no seu período. Os eventos anteriores ficam substituídos (nunca apagados);
// os "atencao" geram achados para revisão humana — o cliente só os vê
// depois de comunicados. Corre depois de cada fatura nova, de cada
// associação e quando as condições do contrato mudam (comparação retroativa).

export async function recalcularAcompanhamento(admin: Admin, servicoId: string): Promise<{ faturas: number; novosAchados: number }> {
  const [{ data: faturas }, { data: versoes }, { count: antes }] = await Promise.all([
    admin
      .from("faturas_monitor")
      .select("id, data_emissao, periodo_inicio, periodo_fim, total_cents, mensalidade_lida_cents, recorrente_cents, linhas, data_fim_fidelizacao")
      .eq("contrato_id", servicoId),
    admin
      .from("contratos_versoes")
      .select("id, valido_desde, valido_ate, mensalidade_cents, desconto_cents, descricao_promocao, promocao_inicio, promocao_fim, data_fim_fidelizacao")
      .eq("contrato_id", servicoId),
    admin.from("achados_monitor").select("id", { count: "exact", head: true }).eq("contrato_id", servicoId).eq("estado", "detetado"),
  ]);

  const lista: FaturaComparavel[] = (faturas ?? []).map((f) => ({
    id: f.id,
    dataEmissao: f.data_emissao,
    periodoInicio: f.periodo_inicio,
    periodoFim: f.periodo_fim,
    totalCents: f.total_cents,
    mensalidadeLidaCents: f.mensalidade_lida_cents,
    recorrenteCents: f.recorrente_cents,
    linhas: Array.isArray(f.linhas) ? f.linhas : [],
    dataFimFidelizacao: f.data_fim_fidelizacao,
  }));
  const vs: VersaoContrato[] = (versoes ?? []).map((v) => ({
    id: v.id,
    validoDesde: v.valido_desde,
    validoAte: v.valido_ate,
    mensalidadeCents: v.mensalidade_cents,
    descontoCents: v.desconto_cents,
    descricaoPromocao: v.descricao_promocao,
    promocaoInicio: v.promocao_inicio,
    promocaoFim: v.promocao_fim,
    dataFimFidelizacao: v.data_fim_fidelizacao,
  }));

  const ordenadas = ordenarFaturas(lista);
  for (let i = 0; i < ordenadas.length; i++) {
    const atual = ordenadas[i];
    const eventos = compararFatura(atual, ordenadas.slice(0, i), versaoValida(vs, atual));
    const { error } = await admin.rpc("monitor_eventos_substituir", {
      p_contrato: servicoId,
      p_fatura: atual.id,
      p_eventos: eventos.map((e) => ({
        tipo: e.tipo,
        base: e.base,
        severidade: e.severidade,
        periodo: e.periodo,
        montante_cents: e.montanteCents,
        dados: e.dados,
        confianca: "alta",
        versao_regra: VERSAO_ACOMPANHAMENTO,
        chave: e.chave,
        contrato_versao_id: e.contratoVersaoId,
        achado:
          e.severidade === "atencao" && TIPO_ACHADO[e.tipo]
            ? {
                tipo: TIPO_ACHADO[e.tipo],
                versao_regra: VERSAO_ACOMPANHAMENTO,
                evidencia: { ...e.dados, fatura_atual_id: atual.id, base: e.base, texto_proposto: fraseEvento(e) },
              }
            : null,
      })),
      p_resultado: resultadoFatura(eventos),
    });
    if (error) console.error(`[monitor] falha ao gravar eventos da fatura ${atual.id}:`, error.message);
  }

  const { count: depois } = await admin
    .from("achados_monitor")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", servicoId)
    .eq("estado", "detetado");
  const novos = Math.max(0, (depois ?? 0) - (antes ?? 0));
  if (novos > 0) await avisarAdmin("Situações por rever", `${novos} situação(ões) detetada(s) nas faturas do serviço ${servicoId}.`);
  return { faturas: ordenadas.length, novosAchados: novos };
}

/** Comparação retroativa em segundo plano (nunca lança). */
export async function recalcularAcompanhamentoEmSegundoPlano(servicoId: string) {
  try {
    await recalcularAcompanhamento(createAdminClient(), servicoId);
  } catch (erro) {
    console.error(`[monitor] falha na reanálise do serviço ${servicoId}:`, erro);
  }
}

export type MotivoPendente =
  | "orcamento_atingido"
  | "formato_nao_lido"
  | "ficheiro_nao_encontrado"
  | "api_nao_configurada"
  | "erro_api"
  | "recusa"
  | "resposta_invalida"
  | "validacao"
  | "erro_inesperado";

export type ResultadoProcessamento = {
  estado: EstadoDocumento;
  contratoId: string | null;
  /** Porque não ficou processado (só para o admin). */
  motivo?: MotivoPendente;
  detalhe?: string;
  /** Duração da chamada à Claude API (ms), quando houve. */
  lerMs?: number;
  /** A mesma fatura já estava registada no serviço (número, ou período e total). */
  repetido?: boolean;
};

export async function processarDocumento(documentoId: string): Promise<ResultadoProcessamento> {
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
      return { estado: "pendente", contratoId: doc.contrato_id, motivo: "orcamento_atingido" };
    }

    // 2. Ficheiro
    if (!MIME_ACEITES.includes(doc.mime_type as MimeAceite)) {
      await marcar(admin, doc.id, "a_rever");
      await avisarAdmin("Documento por rever", `Documento ${doc.id}: formato ${doc.mime_type ?? "desconhecido"} não é lido automaticamente.`);
      return { estado: "a_rever", contratoId: doc.contrato_id, motivo: "formato_nao_lido" };
    }
    const { data: assinado, error: erroFicheiro } = await admin.storage
      .from(doc.bucket)
      .createSignedUrl(doc.storage_path, URL_DOCUMENTO_SEGUNDOS);
    if (erroFicheiro || !assinado?.signedUrl) {
      await avisarAdmin("Documento por processar", `Documento ${doc.id}: o ficheiro não foi encontrado no Storage.`);
      return { estado: "pendente", contratoId: doc.contrato_id, motivo: "ficheiro_nao_encontrado" };
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
    let lerMs: number | undefined;

    if (anterior) {
      extracaoId = anterior.id;
      bruto = await leituraProtegida(admin, anterior);
      await marcarEtapa(admin, doc.id, "a_registar");
    } else {
      await marcarEtapa(admin, doc.id, "a_ler");
      const inicioLeitura = Date.now();
      const chamada = await lerDocumentoComClaude({
        url: assinado.signedUrl,
        mime: doc.mime_type as MimeAceite,
        prompt: ehContrato ? PROMPT_CONTRATO : PROMPT_FATURA,
        schema: ehContrato ? SCHEMA_CONTRATO : SCHEMA_FATURA,
        instrucao: ehContrato ? "Extrai os dados deste contrato." : "Extrai os dados desta fatura.",
      });
      lerMs = Date.now() - inicioLeitura;
      await marcarEtapa(admin, doc.id, "a_registar");

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
          await avisarAdmin("Documento por processar", `Documento ${doc.id} ficou pendente (${chamada.motivo}${chamada.detalhe ? `: ${chamada.detalhe}` : ""}).`);
          return { estado: "pendente", contratoId: doc.contrato_id, motivo: chamada.motivo, detalhe: chamada.detalhe, lerMs };
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
        return { estado: "a_rever", contratoId: doc.contrato_id, motivo: chamada.motivo };
      }

      // O NIF e o nome do titular nunca são gravados em texto (pseudónimo).
      const protegido = protegerExtracao(chamada.bruto, chaveIdentificadores()).resultado;
      const { data: extracao, error: erroExtracao } = await admin
        .from("extracoes_documento")
        .insert({
          documento_id: doc.id,
          modelo: MODELO_DOCUMENTOS,
          schema_versao: versao.schema,
          prompt_versao: versao.prompt,
          estado: "sucesso",
          resultado: protegido,
        })
        .select("id")
        .single();
      if (erroExtracao || !extracao) throw new Error(`Falha ao gravar a extração: ${erroExtracao?.message}`);
      extracaoId = extracao.id;
      bruto = protegido;
    }

    // 4. Validação de domínio, associação ao serviço e registo
    const validada = validarLeitura(ehContrato ? "contrato" : "fatura", bruto);
    if (!validada.ok) {
      await marcar(admin, doc.id, "a_rever");
      await avisarAdmin("Documento por rever", `Documento ${doc.id}: ${validada.motivo}.`);
      return { estado: "a_rever", contratoId: doc.contrato_id, motivo: "validacao", detalhe: validada.motivo };
    }
    const leitura = validada.leitura;
    const estado: EstadoDocumento = leitura.v.precisaRevisao ? "a_rever" : "processado";
    const destino = await decidirDestino(admin, doc, leitura);

    if (destino.acao === "perguntar") {
      // Identificação não confirmada: nada é registado no serviço até o
      // cliente decidir (associar, serviço novo, outro serviço, cancelar).
      await guardarPendente(admin, doc.id, destino.servicoId, destino.resultado, leitura.tipo);
      await marcar(admin, doc.id, estado);
      return { estado, contratoId: null, lerMs };
    }

    const servicoId = destino.acao === "associar" ? destino.servicoId : await criarServico(admin, doc.utilizador_id, leitura, doc.id);
    const { repetido } = await registarNoServico(admin, {
      documentoId: doc.id,
      utilizadorId: doc.utilizador_id,
      servicoId,
      extracaoId,
      leitura,
      estado: destino.acao === "associar" ? "confirmada" : "novo_servico",
      resultado: destino.resultado,
      decisao: "automatica",
      papel: "sistema",
      por: null,
    });
    await marcar(admin, doc.id, estado);
    if (estado === "a_rever" && !repetido) {
      await avisarAdmin("Documento por rever", `Documento ${doc.id}: ${leitura.v.avisos.join("; ") || "confiança baixa num campo importante"}.`);
    }
    return { estado, contratoId: servicoId, lerMs, repetido };
  } catch (erro) {
    const detalhe = (erro instanceof Error ? erro.message : String(erro)).slice(0, 300);
    console.error(`Falha ao processar o documento ${documentoId}:`, erro);
    await avisarAdmin("Documento por processar", `Documento ${documentoId}: erro inesperado no processamento (${detalhe}).`);
    return { estado: "pendente", contratoId: doc.contrato_id, motivo: "erro_inesperado", detalhe };
  }
}

// ---------------------------------------------------------------------------
// Processamento em segundo plano (depois de o upload responder)
// ---------------------------------------------------------------------------
// O pedido do upload só grava o documento (etapa "recebido") e responde; este
// passo corre a seguir no servidor (after() da Server Action). O cliente
// acompanha a etapa pela base de dados e pode navegar entretanto.
//
//   recebido → a_verificar (hash, documento repetido?) → a_ler (Claude API)
//   → a_registar (validação e valores propostos) → concluido | falhou | repetido
//
// "falhou" só para falhas transitórias (API em baixo, limite de tempo,
// erro inesperado): o documento fica "pendente" para a DoLado e o cliente
// pode tentar de novo. Sem chave ou com o orçamento esgotado fica
// "concluido" + estado "pendente" — tratado à mão, sem erro para o cliente.
// Nunca lança.

const BUCKET_MONITOR = "documentos-monitor";

export async function processarDocumentoEmSegundoPlano(documentoId: string): Promise<void> {
  const admin = createAdminClient();
  const inicio = Date.now();
  const tempos: Record<string, number> = {};

  // Reserva: só um processamento por documento (ex.: duplo clique em
  // "Tentar novamente"). Só avança quem passa "recebido" → "a_verificar".
  const { data: reservado } = await admin
    .from("documentos_monitor")
    .update({ etapa: "a_verificar", etapa_atualizada_em: new Date().toISOString() })
    .eq("id", documentoId)
    .eq("etapa", "recebido")
    .select("id, utilizador_id, bucket, storage_path, sha256")
    .maybeSingle();
  if (!reservado) return;

  try {
    // 1. Hash (lido em streaming) e documento repetido
    if (!reservado.sha256) {
      const t = Date.now();
      const ficheiro = await inspecionarFicheiro(reservado.bucket ?? BUCKET_MONITOR, reservado.storage_path);
      tempos.verificar = Date.now() - t;
      if (!ficheiro) {
        await marcarEtapa(admin, documentoId, "falhou", { tempos_ms: { ...tempos, total: Date.now() - inicio } });
        await avisarAdmin("Documento por processar", `Documento ${documentoId}: o ficheiro não foi encontrado ou excede 10 MB.`);
        return;
      }
      const { data: repetido } = await admin
        .from("documentos_monitor")
        .select("id, contrato_id")
        .eq("utilizador_id", reservado.utilizador_id)
        .eq("sha256", ficheiro.sha256)
        .neq("id", documentoId)
        .maybeSingle();
      if (!MIME_ACEITES.includes(ficheiro.mime as MimeAceite)) {
        await admin.storage.from(reservado.bucket ?? BUCKET_MONITOR).remove([reservado.storage_path]);
        await marcar(admin, documentoId, "ilegivel");
        await marcarEtapa(admin, documentoId, "concluido", { tempos_ms: { ...tempos, total: Date.now() - inicio } });
        return;
      }
      if (repetido) {
        // O mesmo documento não é lido (nem pago) duas vezes: o ficheiro novo
        // é apagado e o cliente é levado ao contrato que já o tem.
        await admin.storage.from(reservado.bucket ?? BUCKET_MONITOR).remove([reservado.storage_path]);
        await marcarEtapa(admin, documentoId, "repetido", { contrato_id: repetido.contrato_id });
        return;
      }
      const { error } = await admin
        .from("documentos_monitor")
        .update({ sha256: ficheiro.sha256, tamanho_bytes: ficheiro.tamanho, mime_type: ficheiro.mime })
        .eq("id", documentoId);
      if (error) throw new Error(`Falha ao gravar o hash: ${error.message}`);
    }

    // 2. Leitura (Claude API) e registo dos valores
    await marcarEtapa(admin, documentoId, "a_ler");
    const t = Date.now();
    const resultado = await processarDocumento(documentoId);
    if (resultado.lerMs !== undefined) tempos.ler = resultado.lerMs;
    tempos.registar = Date.now() - t - (resultado.lerMs ?? 0);
    tempos.total = Date.now() - inicio;

    if (resultado.repetido) {
      // Mesma fatura já registada (outro ficheiro): não cria outro mês.
      await admin.storage.from(reservado.bucket ?? BUCKET_MONITOR).remove([reservado.storage_path]);
      await marcarEtapa(admin, documentoId, "repetido", { tempos_ms: tempos });
      return;
    }
    await marcarEtapa(admin, documentoId, etapaDepoisDaLeitura(resultado), { tempos_ms: tempos });
    console.log(
      JSON.stringify({ origem: "monitor_documento", documento: documentoId, estado: resultado.estado, motivo: resultado.motivo ?? null, tempos_ms: tempos }),
    );
  } catch (erro) {
    const detalhe = (erro instanceof Error ? erro.message : String(erro)).slice(0, 300);
    console.error(`Falha no processamento do documento ${documentoId}:`, detalhe);
    await marcarEtapa(admin, documentoId, "falhou", { tempos_ms: { ...tempos, total: Date.now() - inicio } }).catch(() => {});
  }
}

/**
 * "Ler de novo" no backoffice. Lê já (o admin espera pelo resultado) e deixa
 * a etapa coerente com o estado — sem isto, um documento que tinha falhado
 * ficava com a etapa "falhou" e o cliente continuava a ver "Não foi possível
 * concluir a análise" depois de a leitura ter resultado. Não lê um documento
 * repetido (o ficheiro já foi apagado) nem um que ainda está a ser lido.
 */
export async function reprocessarDocumentoAdmin(
  documentoId: string,
): Promise<ResultadoProcessamento | { estado: "em_leitura" | "repetido"; contratoId: string | null }> {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documentos_monitor")
    .select("id, etapa, etapa_atualizada_em, contrato_id")
    .eq("id", documentoId)
    .single();
  if (!doc) return { estado: "a_rever", contratoId: null };
  if (doc.etapa === "repetido") return { estado: "repetido", contratoId: doc.contrato_id };
  if (emCurso(doc.etapa) && !parado(doc.etapa, doc.etapa_atualizada_em, Date.now())) return { estado: "em_leitura", contratoId: doc.contrato_id };

  await admin
    .from("documentos_monitor")
    .update({ estado: "pendente", etapa: "a_ler", etapa_atualizada_em: new Date().toISOString() })
    .eq("id", doc.id);
  return processarDocumentoNaRevisao(doc.id);
}

/** Decisão manual do admin ("revisto" / "ilegível"): a leitura fica concluída. */
export async function marcarDocumentoAdmin(documentoId: string, estado: "processado" | "ilegivel") {
  const admin = createAdminClient();
  await admin
    .from("documentos_monitor")
    .update({ estado, etapa: "concluido", etapa_atualizada_em: new Date().toISOString() })
    .eq("id", documentoId)
    .or("etapa.is.null,etapa.neq.repetido");
}

/**
 * Volta a pôr na fila um documento cuja leitura falhou ou parou. Atómico:
 * só reinicia se ainda estiver nesse estado (nunca dois processamentos).
 */
export async function reiniciarProcessamento(documentoId: string, limiteParadoIso: string): Promise<boolean> {
  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const { data: falhado } = await admin
    .from("documentos_monitor")
    .update({ etapa: "recebido", etapa_atualizada_em: agora })
    .eq("id", documentoId)
    .eq("estado", "pendente")
    .eq("etapa", "falhou")
    .select("id")
    .maybeSingle();
  if (falhado) return true;
  const { data: parado } = await admin
    .from("documentos_monitor")
    .update({ etapa: "recebido", etapa_atualizada_em: agora })
    .eq("id", documentoId)
    .eq("estado", "pendente")
    .in("etapa", ["recebido", "a_verificar", "a_ler", "a_registar"])
    .lt("etapa_atualizada_em", limiteParadoIso)
    .select("id")
    .maybeSingle();
  return !!parado;
}

// ---------------------------------------------------------------------------
// Alteração do tipo de um documento (revisão da DoLado)
// ---------------------------------------------------------------------------
// O pipeline segue documentos_monitor.tipo; o revisor corrige o tipo quando o
// cliente escolheu o errado (ex.: contrato enviado como fatura). A função SQL
// põe de parte a leitura antiga e o que dela foi registado e grava a
// auditoria; depois o documento é lido de novo com o pipeline do tipo novo
// (o mesmo ficheiro, sem novo upload). Nunca chamada pela IA: só pela Server
// Action do backoffice, depois de requireAdmin().

export type ResultadoAlterarTipo =
  | { ok: true; tipoAnterior: string; processamento: ResultadoProcessamento }
  | { ok: false; erro: ErroAlterarTipo };

export async function alterarTipoDocumento(a: { documentoId: string; novoTipo: string; por: string }): Promise<ResultadoAlterarTipo> {
  const novoTipo = lerTipoDocumento(a.novoTipo);
  if (!novoTipo) return { ok: false, erro: "tipo_invalido" };
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("monitor_documento_alterar_tipo", { p_documento: a.documentoId, p_tipo: novoTipo, p_por: a.por });
  if (error) {
    const erro = erroAlterarTipo(error);
    if (erro === "erro") console.error(`[monitor] falha ao alterar o tipo do documento ${a.documentoId}:`, error.message);
    return { ok: false, erro };
  }
  const alteracao = data as { tipo_anterior: string; contrato_id: string | null; fatura_removida: boolean };

  // A fatura posta de parte deixa de contar no histórico das outras.
  if (alteracao.fatura_removida && alteracao.contrato_id) await recalcularAcompanhamento(admin, alteracao.contrato_id);

  const processamento = await processarDocumentoNaRevisao(a.documentoId);
  return { ok: true, tipoAnterior: alteracao.tipo_anterior, processamento };
}

/**
 * Leitura pedida no backoffice ("Ler de novo", alteração do tipo): o mesmo
 * pipeline do upload, a correr no próprio pedido. No fim, a etapa fica
 * concluída (ou "falhou", para o cliente poder tentar de novo) — sem isto o
 * documento ficava em "a_registar" e parecia parado no portal.
 */
export async function processarDocumentoNaRevisao(documentoId: string): Promise<ResultadoProcessamento> {
  const admin = createAdminClient();
  const r = await processarDocumento(documentoId);
  if (r.repetido) {
    // Mesma fatura já registada (como no segundo plano): o ficheiro sai e a
    // linha fica "repetido", que o backoffice deixa de contar.
    const { data: doc } = await admin.from("documentos_monitor").select("bucket, storage_path").eq("id", documentoId).maybeSingle();
    if (doc) await admin.storage.from(doc.bucket ?? BUCKET_MONITOR).remove([doc.storage_path]);
  }
  await marcarEtapa(admin, documentoId, etapaDepoisDaLeitura(r));
  return r;
}

// ---------------------------------------------------------------------------
// Decisão explícita do cliente sobre um documento por associar
// ---------------------------------------------------------------------------
// Usa a leitura já gravada (sem nova chamada à IA). Reserva o documento antes
// de registar: dois cliques não registam duas vezes. Fica sempre em
// associacoes_documento quem decidiu e o que a verificação tinha encontrado.

export type DecisaoDocumento = "associar_mesmo_assim" | "outro_servico" | "novo_servico";

export async function concluirAssociacao(a: {
  documentoId: string;
  utilizadorId: string;
  decisao: DecisaoDocumento;
  servicoId?: string | null;
  papel: "cliente" | "admin";
  por: string;
}): Promise<{ ok: true; servicoId: string; repetido: boolean } | { ok: false; erro: "nao_encontrado" | "servico_invalido" | "leitura_invalida" }> {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documentos_monitor")
    .select("id, utilizador_id, tipo, bucket, storage_path, associacao_estado, associacao_sugerida, associacao_motivos, associacao_conflitos, associacao_confianca")
    .eq("id", a.documentoId)
    .eq("utilizador_id", a.utilizadorId)
    .is("contrato_id", null)
    .in("associacao_estado", ["possivel", "conflito"])
    .maybeSingle();
  if (!doc) return { ok: false, erro: "nao_encontrado" };

  let alvo: string | null = null;
  if (a.decisao === "associar_mesmo_assim") alvo = doc.associacao_sugerida;
  if (a.decisao === "outro_servico") alvo = a.servicoId ?? null;
  if (a.decisao !== "novo_servico") {
    if (!alvo) return { ok: false, erro: "servico_invalido" };
    const { data: servico } = await admin
      .from("contratos_monitorizados")
      .select("id")
      .eq("id", alvo)
      .eq("utilizador_id", a.utilizadorId)
      .is("desativado_em", null)
      .maybeSingle();
    if (!servico) return { ok: false, erro: "servico_invalido" };
  }

  const { data: extracao } = await admin
    .from("extracoes_documento")
    .select("id, resultado")
    .eq("documento_id", doc.id)
    .eq("estado", "sucesso")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const validada = extracao ? validarLeitura(doc.tipo === "contrato" ? "contrato" : "fatura", await leituraProtegida(admin, extracao)) : null;
  if (!extracao || !validada?.ok) return { ok: false, erro: "leitura_invalida" };

  // Reserva (só um pedido avança).
  const { data: reservado } = await admin
    .from("documentos_monitor")
    .update({ associacao_estado: "manual" })
    .eq("id", doc.id)
    .is("contrato_id", null)
    .in("associacao_estado", ["possivel", "conflito"])
    .select("id")
    .maybeSingle();
  if (!reservado) return { ok: false, erro: "nao_encontrado" };

  try {
    const servicoId = alvo ?? (await criarServico(admin, a.utilizadorId, validada.leitura, doc.id));
    const { repetido } = await registarNoServico(admin, {
      documentoId: doc.id,
      utilizadorId: a.utilizadorId,
      servicoId,
      extracaoId: extracao.id,
      leitura: validada.leitura,
      estado: a.decisao === "novo_servico" ? "novo_servico" : "manual",
      resultado: {
        estado: doc.associacao_estado === "conflito" ? "conflito" : "possivel",
        confianca: Number(doc.associacao_confianca ?? 0),
        motivos: Array.isArray(doc.associacao_motivos) ? doc.associacao_motivos : [],
        conflitos: Array.isArray(doc.associacao_conflitos) ? doc.associacao_conflitos : [],
      },
      decisao: a.decisao,
      papel: a.papel,
      por: a.por,
    });
    if (repetido) {
      await admin.storage.from(doc.bucket ?? BUCKET_MONITOR).remove([doc.storage_path]);
      await admin.from("documentos_monitor").update({ etapa: "repetido" }).eq("id", doc.id);
    }
    return { ok: true, servicoId, repetido };
  } catch (erro) {
    // Devolve o documento ao estado anterior para o cliente poder decidir de novo.
    console.error(`[monitor] falha ao associar o documento ${doc.id}:`, erro);
    await admin
      .from("documentos_monitor")
      .update({ associacao_estado: doc.associacao_estado, contrato_id: null })
      .eq("id", doc.id);
    throw erro;
  }
}

/** "Cancelar": o documento por associar é apagado (ficheiro primeiro). */
export async function cancelarDocumentoPorAssociar(documentoId: string, utilizadorId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documentos_monitor")
    .select("id, bucket, storage_path")
    .eq("id", documentoId)
    .eq("utilizador_id", utilizadorId)
    .is("contrato_id", null)
    .in("associacao_estado", ["possivel", "conflito"])
    .maybeSingle();
  if (!doc) return false;
  const { error } = await admin.storage.from(doc.bucket ?? BUCKET_MONITOR).remove([doc.storage_path]);
  if (error) return false;
  await admin.from("documentos_monitor").delete().eq("id", doc.id).is("contrato_id", null);
  return true;
}

/** Resposta do cliente ao resumo de uma fatura: confirmar ou indicar que os valores não estão certos. */
export async function registarRespostaFatura(faturaId: string, utilizadorId: string, acao: "confirmar" | "contestar"): Promise<boolean> {
  const admin = createAdminClient();
  const coluna = acao === "confirmar" ? "confirmada_cliente_em" : "valores_contestados_em";
  const { data } = await admin
    .from("faturas_monitor")
    .update({ [coluna]: new Date().toISOString() })
    .eq("id", faturaId)
    .eq("utilizador_id", utilizadorId)
    .is("confirmada_cliente_em", null)
    .is("valores_contestados_em", null)
    .select("id, contrato_id")
    .maybeSingle();
  if (data && acao === "contestar") {
    await avisarAdmin("Valores de fatura por rever", `O cliente indicou que os valores lidos da fatura ${data.id} (serviço ${data.contrato_id}) não estão corretos.`);
  }
  return !!data;
}

/**
 * O que lemos num documento por associar (para o cliente decidir). Só depois
 * de a página ter validado a posse; usa a leitura gravada (sem IA).
 */
export async function resumoDocumentoPorAssociar(documentoId: string, utilizadorId: string) {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documentos_monitor")
    .select("id, tipo")
    .eq("id", documentoId)
    .eq("utilizador_id", utilizadorId)
    .maybeSingle();
  if (!doc) return null;
  const { data: extracao } = await admin
    .from("extracoes_documento")
    .select("id, resultado")
    .eq("documento_id", doc.id)
    .eq("estado", "sucesso")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const validada = extracao ? validarLeitura(doc.tipo === "contrato" ? "contrato" : "fatura", await leituraProtegida(admin, extracao)) : null;
  if (!validada?.ok) return null;
  const l = validada.leitura;
  return {
    tipo: l.tipo,
    fornecedor: nomeComercial(l.fornecedor, await listaFornecedores(admin)),
    dataEmissao: l.tipo === "fatura" ? l.v.fatura.dataEmissao : null,
    periodoInicio: l.tipo === "fatura" ? l.v.fatura.periodoInicio : null,
    periodoFim: l.tipo === "fatura" ? l.v.fatura.periodoFim : null,
    totalCents: l.tipo === "fatura" ? l.v.fatura.totalCents : null,
    identificacao: normalizarIdentificadores(l.identificacao, chaveIdentificadores())
      .filter((i) => i.apresentacao)
      .map((i) => ({ tipo: i.tipo, apresentacao: i.apresentacao! })),
  };
}
