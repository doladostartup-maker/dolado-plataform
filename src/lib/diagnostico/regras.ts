// DoLado — diagnóstico gratuito sem registo: regras sem I/O.
//
// O visitante carrega uma factura ou um contrato sem conta; o servidor
// (servidor.ts) guarda o ficheiro, a IA lê-o (extracção factual, regra 1 do
// "Uso de IA") e este módulo monta o diagnóstico mostrado. Decisão de Thiago
// (22/10/2026): o diagnóstico mostra só
//   - o que foi lido no documento, com confiança alta ou média;
//   - cálculos feitos aqui, em código (dias até ao fim da fidelização ou da
//     promoção, fim calculado pela duração, soma das linhas, diferença entre
//     o total e a mensalidade);
//   - o que não foi possível confirmar.
// Nunca "pontos de atenção", irregularidades, poupanças ou conclusões
// jurídicas (regra 2: interpretação de um caso individual exige revisão
// humana). Tudo o que merecer atenção continua a passar pelo Monitor, com
// revisão humana, depois de o cliente activar a Protecção.

import type { ResultadoValidacao } from "../monitor/extracaoFatura.ts";
import type { ResultadoValidacaoContrato } from "../monitor/extracaoContrato.ts";

// ---------------------------------------------------------------------------
// Ficheiros
// ---------------------------------------------------------------------------

/** Formatos que a IA consegue ler — iguais a MIME_ACEITES (monitor/claudeDocumentos.ts). */
type MimeLegivel = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

/**
 * Formatos aceites no diagnóstico gratuito: só PDF (decisão de Thiago,
 * 22/10/2026). Validado no browser, ao preparar e ao confirmar (tipo e
 * assinatura do ficheiro).
 */
export const MIME_DIAGNOSTICO = ["application/pdf"] as const;
export type MimeDiagnostico = (typeof MIME_DIAGNOSTICO)[number];

export const EXTENSAO_DIAGNOSTICO: Record<MimeLegivel, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const TAMANHO_MAXIMO_DIAGNOSTICO = 10 * 1024 * 1024;

/** Diagnósticos por dia (todos os visitantes), por omissão. */
export const LIMITE_DIARIO_PADRAO = 100;
/** Orçamento próprio das leituras gratuitas (USD), dentro do orçamento geral. */
export const ORCAMENTO_DIAGNOSTICO_PADRAO_USD = 2;

export type ErroFicheiro = "formato" | "tamanho" | "vazio";

export function validarFicheiro(mime: string, tamanho: number): ErroFicheiro | null {
  if (!Number.isFinite(tamanho) || tamanho <= 0) return "vazio";
  if (tamanho > TAMANHO_MAXIMO_DIAGNOSTICO) return "tamanho";
  if (!(MIME_DIAGNOSTICO as readonly string[]).includes(mime)) return "formato";
  return null;
}

/** Assinatura do formato (primeiros bytes): o tipo indicado pelo browser não chega. */
export function formatoPelaAssinatura(bytes: Uint8Array): MimeLegivel | null {
  const comeca = (...b: number[]) => b.every((v, i) => bytes[i] === v);
  if (comeca(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (comeca(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (comeca(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (comeca(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

export function lerInteiroPositivo(valor: string | undefined, padrao: number): number {
  const n = Number((valor ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

export function diagnosticoAtivo(valor: string | undefined = process.env.DIAGNOSTICO_GRATUITO_ATIVO): boolean {
  return valor === "1";
}

// ---------------------------------------------------------------------------
// Sessão anónima (cookie funcional dolado_diagnostico)
// ---------------------------------------------------------------------------
// Valor: "<sessão>.<segredo>" — sessão = UUID aleatório do browser, segredo =
// 32 bytes aleatórios em hex. Na base de dados só fica o SHA-256 do segredo
// de cada diagnóstico (diagnosticos_gratuitos.token_hash). Necessário para o
// serviço pedido (mostrar o resultado a quem carregou o documento): não
// identifica a pessoa e não serve para medição.

export const COOKIE_DIAGNOSTICO = "dolado_diagnostico";
export const VALIDADE_DIAGNOSTICO_DIAS = 7;
export const VALIDADE_COOKIE_S = VALIDADE_DIAGNOSTICO_DIAS * 24 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SEGREDO = /^[0-9a-f]{64}$/;

export type SessaoDiagnostico = { sessaoId: string; segredo: string };

export function lerCookieSessao(valor: string | undefined | null): SessaoDiagnostico | null {
  if (!valor) return null;
  const [sessaoId, segredo, ...resto] = valor.split(".");
  if (resto.length || !UUID.test(sessaoId ?? "") || !SEGREDO.test(segredo ?? "")) return null;
  return { sessaoId, segredo };
}

export function valorCookieSessao(s: SessaoDiagnostico): string {
  return `${s.sessaoId}.${s.segredo}`;
}

/** Só contas de cliente ficam com diagnósticos (nunca o administrador). */
export function podeFicarComDiagnostico(role: string | null | undefined): boolean {
  return role === "cliente";
}

/**
 * Domínio do cookie: partilhado entre dolado.pt (homepage, onde o ficheiro é
 * escolhido) e portal.dolado.pt (resultado e conta). Fora de produção, o
 * cookie fica no próprio anfitrião.
 */
export function dominioCookieDiagnostico(host: string): string | undefined {
  const h = host.split(":")[0].toLowerCase();
  return h === "dolado.pt" || h.endsWith(".dolado.pt") ? ".dolado.pt" : undefined;
}

// ---------------------------------------------------------------------------
// Origem (só atribuição; nunca dados pessoais nem conteúdo do documento)
// ---------------------------------------------------------------------------

export const CANAIS = ["google", "instagram", "facebook", "direto", "referencia", "campanha", "parceiro", "outro"] as const;
export type Canal = (typeof CANAIS)[number];

const UTM = /^[a-z0-9_.\-]{1,100}$/;

export function normalizarUtm(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim().toLowerCase();
  return UTM.test(v) ? v : null;
}

/** Caminho da página de entrada, sem parâmetros (nunca o URL completo). */
export function normalizarPagina(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const caminho = valor.split(/[?#]/)[0].trim();
  return /^\/[a-z0-9\-/]{0,199}$/i.test(caminho) ? caminho.toLowerCase() : null;
}

function anfitriao(referrer: unknown): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Canal a partir dos UTM e do anfitrião de origem (nunca o URL completo).
 * Pagos (cpc, paid…) contam como "campanha", exceto nas redes onde o próprio
 * canal identifica melhor a origem; `utm_medium=parceiro` ou um código de
 * parceiro conta como "parceiro".
 */
export function canalDeOrigem(o: { utmSource?: string | null; utmMedium?: string | null; referrer?: string | null; parceiro?: boolean }): Canal {
  if (o.parceiro) return "parceiro";
  const fonte = o.utmSource ?? "";
  const meio = o.utmMedium ?? "";
  if (/parceir|partner|afiliad/.test(meio) || /parceir|partner/.test(fonte)) return "parceiro";
  if (/^(ig|instagram)/.test(fonte)) return "instagram";
  if (/^(fb|facebook|meta)/.test(fonte)) return "facebook";
  if (/^google/.test(fonte)) return /cpc|ppc|paid|ads/.test(meio) ? "campanha" : "google";
  if (/cpc|ppc|paid|ads|display/.test(meio)) return "campanha";
  if (fonte) return "outro";

  const host = anfitriao(o.referrer);
  if (!host || host === "dolado.pt" || host.endsWith(".dolado.pt")) return "direto";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host) || host === "l.facebook.com" || host === "lm.facebook.com") return "facebook";
  return "referencia";
}

/** Telemóvel ou computador, pelo User-Agent (só esta categoria é guardada). */
export function dispositivoDe(userAgent: string | null | undefined): "movel" | "computador" | null {
  if (!userAgent) return null;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "movel" : "computador";
}

// ---------------------------------------------------------------------------
// O diagnóstico
// ---------------------------------------------------------------------------

export const DIAGNOSTICO_VERSAO = "diagnostico_v2";

export type TipoValor = "euros" | "data" | "texto" | "meses" | "simnao";

/** Valor lido no documento (confiança alta ou média). */
export type Facto = { chave: string; tipo: TipoValor; valor: string | number; pagina: number | null };

/** Valor calculado aqui, em código, a partir dos factos. */
export type Calculo =
  | { chave: "dias_fim_fidelizacao" | "dias_fim_promocao"; data: string; dias: number }
  | { chave: "fidelizacao_terminada" | "promocao_terminada"; data: string }
  | { chave: "fim_fidelizacao_pela_duracao"; data: string; inicio: string; meses: number }
  | { chave: "soma_linhas"; somaCents: number; totalCents: number; coincide: boolean }
  /** Total − mensalidade, ambos lidos na mesma factura (positivo = a factura tem mais do que a mensalidade). */
  | { chave: "diferenca_mensalidade"; totalCents: number; mensalidadeCents: number; diferencaCents: number };

export type LinhaDiagnostico = { descricao: string; valorCents: number; recorrente: boolean | null };

export type Diagnostico = {
  versao: string;
  tipo: "fatura" | "contrato";
  setor: string;
  fornecedor: string | null;
  factos: Facto[];
  linhas: LinhaDiagnostico[];
  calculos: Calculo[];
  /** Informação importante que não foi possível confirmar no documento. */
  porConfirmar: string[];
};

const MAX_LINHAS = 15;
const TOLERANCIA_SOMA_CENTS = 2;

export function diasEntre(deIso: string, ateIso: string): number {
  const d = Date.UTC(+ateIso.slice(0, 4), +ateIso.slice(5, 7) - 1, +ateIso.slice(8, 10));
  const h = Date.UTC(+deIso.slice(0, 4), +deIso.slice(5, 7) - 1, +deIso.slice(8, 10));
  return Math.round((d - h) / 86_400_000);
}

/** Fim da fidelização = início + N meses − 1 dia (mesma convenção do Monitor). */
export function fimPelaDuracao(inicio: string, meses: number): string {
  const d = new Date(`${inicio}T00:00:00Z`);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function calculoData(tipo: "fidelizacao" | "promocao", data: string, hoje: string): Calculo {
  const dias = diasEntre(hoje, data);
  if (dias < 0) return { chave: tipo === "fidelizacao" ? "fidelizacao_terminada" : "promocao_terminada", data };
  return { chave: tipo === "fidelizacao" ? "dias_fim_fidelizacao" : "dias_fim_promocao", data, dias };
}

type FaturaValida = Extract<ResultadoValidacao, { ok: true }>;
type ContratoValido = Extract<ResultadoValidacaoContrato, { ok: true }>;

export function diagnosticoDaFatura(v: FaturaValida, hoje: string): Diagnostico {
  const f = v.fatura;
  const factos: Facto[] = [];
  const porConfirmar: string[] = [];
  const pagina = (campo: string) => v.propostas.find((p) => p.campo === campo)?.pagina ?? null;
  const juntar = (chave: string, tipo: TipoValor, valor: string | number | null, p: number | null = null) => {
    if (valor !== null && valor !== "") factos.push({ chave, tipo, valor, pagina: p });
  };

  juntar("data_emissao", "data", f.dataEmissao);
  juntar("periodo_inicio", "data", f.periodoInicio);
  juntar("periodo_fim", "data", f.periodoFim);
  juntar("total", "euros", f.totalCents);
  juntar("mensalidade", "euros", f.mensalidadeLidaCents);
  if (f.descontosCents) juntar("descontos", "euros", f.descontosCents);
  juntar("data_fim_fidelizacao", "data", f.dataFimFidelizacao, pagina("data_fim_fidelizacao"));
  juntar("cessacao", "euros", f.cessacaoOperadorCents, pagina("cessacao_operador_cents"));

  if (!v.fornecedor) porConfirmar.push("fornecedor");
  if (f.totalCents === null) porConfirmar.push("total");
  if (!f.periodoInicio || !f.periodoFim) porConfirmar.push("periodo");
  if (v.setor === "telecomunicacoes" && !f.dataFimFidelizacao) porConfirmar.push("fidelizacao");

  const calculos: Calculo[] = [];
  if (f.dataFimFidelizacao) calculos.push(calculoData("fidelizacao", f.dataFimFidelizacao, hoje));
  if (f.totalCents !== null && f.linhas.length) {
    const somaCents = f.linhas.reduce((s, l) => s + l.valorCents, 0);
    calculos.push({ chave: "soma_linhas", somaCents, totalCents: f.totalCents, coincide: Math.abs(somaCents - f.totalCents) <= TOLERANCIA_SOMA_CENTS });
  }
  // Só uma conta entre dois valores lidos: uma diferença não é, por si só,
  // um ponto de atenção (consumos, serviços, acertos, impostos).
  if (f.totalCents !== null && f.mensalidadeLidaCents !== null) {
    const diferencaCents = f.totalCents - f.mensalidadeLidaCents;
    if (Math.abs(diferencaCents) > TOLERANCIA_SOMA_CENTS) {
      calculos.push({ chave: "diferenca_mensalidade", totalCents: f.totalCents, mensalidadeCents: f.mensalidadeLidaCents, diferencaCents });
    }
  }

  return {
    versao: DIAGNOSTICO_VERSAO,
    tipo: "fatura",
    setor: v.setor,
    fornecedor: v.fornecedor,
    factos,
    linhas: f.linhas.slice(0, MAX_LINHAS).map((l) => ({ descricao: l.descricao, valorCents: l.valorCents, recorrente: l.recorrente })),
    calculos,
    porConfirmar,
  };
}

const TIPO_CAMPO_CONTRATO: Record<string, TipoValor> = {
  data_assinatura: "data",
  data_ativacao: "data",
  inicio_na_ativacao: "simnao",
  data_inicio: "data",
  duracao_fidelizacao_meses: "meses",
  data_fim_fidelizacao: "data",
  data_fim_promocao: "data",
  descricao_promocao: "texto",
  mensalidade_cents: "euros",
  vantagem_cents: "euros",
  desconto_promocao_cents: "euros",
  data_inicio_promocao: "data",
  servicos_incluidos: "texto",
};

export function diagnosticoDoContrato(v: ContratoValido, hoje: string): Diagnostico {
  const factos: Facto[] = v.propostas
    .filter((p) => p.campo in TIPO_CAMPO_CONTRATO)
    .map((p) => ({ chave: p.campo, tipo: TIPO_CAMPO_CONTRATO[p.campo], valor: p.valor, pagina: p.pagina }));
  const valor = (campo: string) => v.propostas.find((p) => p.campo === campo)?.valor;

  const calculos: Calculo[] = [];
  const porConfirmar: string[] = [];
  let fimFidelizacao = valor("data_fim_fidelizacao") as string | undefined;

  // Fim pela duração só com início factual (nunca a data de assinatura) e
  // quando o documento não indica o fim.
  const inicio = (valor("data_inicio") ?? valor("data_ativacao")) as string | undefined;
  const meses = valor("duracao_fidelizacao_meses") as number | undefined;
  if (!fimFidelizacao && inicio && meses) {
    fimFidelizacao = fimPelaDuracao(inicio, meses);
    calculos.push({ chave: "fim_fidelizacao_pela_duracao", data: fimFidelizacao, inicio, meses });
  }
  if (fimFidelizacao) calculos.push(calculoData("fidelizacao", fimFidelizacao, hoje));
  const fimPromocao = valor("data_fim_promocao") as string | undefined;
  if (fimPromocao) calculos.push(calculoData("promocao", fimPromocao, hoje));

  if (!v.fornecedor) porConfirmar.push("fornecedor");
  if (valor("mensalidade_cents") === undefined) porConfirmar.push("mensalidade");
  if (!fimFidelizacao) {
    porConfirmar.push(valor("inicio_na_ativacao") === "sim" && !valor("data_ativacao") ? "data_ativacao" : "fidelizacao");
  }

  return { versao: DIAGNOSTICO_VERSAO, tipo: "contrato", setor: v.setor, fornecedor: v.fornecedor, factos, linhas: [], calculos, porConfirmar };
}

/** Leitura defensiva do jsonb gravado (versões futuras ou dados antigos). */
export function lerDiagnostico(valor: unknown): Diagnostico | null {
  if (!valor || typeof valor !== "object") return null;
  const d = valor as Partial<Diagnostico>;
  if (d.tipo !== "fatura" && d.tipo !== "contrato") return null;
  if (!Array.isArray(d.factos) || !Array.isArray(d.calculos) || !Array.isArray(d.porConfirmar)) return null;
  return {
    versao: String(d.versao ?? ""),
    tipo: d.tipo,
    setor: String(d.setor ?? "nao_indicado"),
    fornecedor: typeof d.fornecedor === "string" ? d.fornecedor : null,
    factos: d.factos,
    linhas: Array.isArray(d.linhas) ? d.linhas : [],
    calculos: d.calculos,
    porConfirmar: d.porConfirmar,
  };
}
