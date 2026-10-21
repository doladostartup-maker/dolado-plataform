// DoLado — facturas de electricidade e gás natural: modelo normalizado (sem
// I/O; `npm test`).
//
// A Claude API só LÊ a factura (bloco "energia" do schema fatura_v4, uma
// lista de campos — ver SCHEMA_ENERGIA); este
// módulo valida e normaliza o que foi lido, por fornecimento. Uma factura
// conjunta (electricidade + gás) dá dois fornecimentos, comparados em
// separado (comparacaoEnergia.ts). Nada daqui decide se há um problema.
//
// Unidades (inteiros, para as contas não acumularem erros):
//   * montantes em cêntimos;
//   * preços unitários em micro-euros (µ€): 0,1658 €/kWh = 165 800 µ€/kWh;
//     0,2741 €/dia = 274 100 µ€/dia;
//   * consumos em kWh e m³ com até 3 casas decimais (número).
//
// Minimização: o CPE/CUI nunca fica em claro — o servidor substitui-o pelo
// pseudónimo HMAC logo a seguir à leitura (protegerExtracao, identificacao.ts),
// com a apresentação "terminado em 12AB".

import { dataValida, ehObjeto, paraCents, textoCurto } from "./valores.ts";

export const TIPOS_FORNECIMENTO = ["eletricidade", "gas"] as const;
export type TipoFornecimento = (typeof TIPOS_FORNECIMENTO)[number];

export const PERIODOS_HORARIOS = ["simples", "vazio", "fora_vazio", "cheias", "ponta", "outro"] as const;
export type PeriodoHorario = (typeof PERIODOS_HORARIOS)[number];

export const OPCOES_HORARIAS = ["simples", "bi_horaria", "tri_horaria", "desconhecida"] as const;
export type OpcaoHoraria = Exclude<(typeof OPCOES_HORARIAS)[number], "desconhecida">;

export const TIPOS_TARIFARIO = ["fixo", "indexado", "dinamico", "desconhecido"] as const;
export type TipoTarifario = Exclude<(typeof TIPOS_TARIFARIO)[number], "desconhecido">;

export const TIPOS_LEITURA = ["real", "estimada", "mista", "desconhecida"] as const;
export type TipoLeitura = Exclude<(typeof TIPOS_LEITURA)[number], "desconhecida">;

/** Uma linha de energia activa (um período horário). */
export type ParcelaEnergia = {
  periodo: PeriodoHorario;
  kwh: number | null;
  /** Preço unitário em µ€/kWh. */
  precoMicro: number | null;
  valorCents: number | null;
};

export type ServicoAdicional = { descricao: string; valorCents: number };

export type FornecimentoEnergia = {
  tipo: TipoFornecimento;
  /** Pseudónimo do CPE/CUI (hmac:…) — nunca o valor em claro. */
  local: string | null;
  /** "terminado em 12AB" */
  localApresentacao: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  /** Dias facturados (lidos ou calculados a partir do período). */
  dias: number | null;
  /** Electricidade: potência contratada (kVA). */
  potenciaKva: number | null;
  opcaoHoraria: OpcaoHoraria | null;
  tipoTarifario: TipoTarifario | null;
  tipoLeitura: TipoLeitura | null;
  consumoKwh: number | null;
  /** Gás: consumo em m³ e factor de conversão (kWh/m³). */
  consumoM3: number | null;
  fatorConversao: number | null;
  /** Gás: escalão de consumo (texto, como na factura). */
  escalao: string | null;
  /** Electricidade: preço da potência por dia; gás: termo fixo por dia (µ€/dia). */
  termoFixoDiaMicro: number | null;
  /** Valor da potência/termo fixo no período (cêntimos). */
  termoFixoCents: number | null;
  energia: ParcelaEnergia[];
  energiaCents: number | null;
  /** Tarifas de acesso às redes cobradas em linha própria (não as incluídas no preço). */
  redesCents: number | null;
  /** IVA, IEC, contribuição audiovisual, taxas. */
  impostosCents: number | null;
  /** Descontos (valor positivo = desconto). 0 = a factura não tem descontos. */
  descontosCents: number | null;
  /** Acertos de períodos anteriores (positivo = cobrança, negativo = devolução). */
  acertosCents: number | null;
  acertoInicio: string | null;
  acertoFim: string | null;
  acertoKwh: number | null;
  servicosAdicionaisCents: number | null;
  servicosAdicionais: ServicoAdicional[];
  /** Total deste fornecimento, com impostos. */
  totalCents: number | null;
  /** Os componentes somam o total (com tolerância de arredondamento)? null = não há componentes suficientes. */
  reconciliado: boolean | null;
  avisos: string[];
};

// ---------------------------------------------------------------------------
// Schema (structured outputs): lista de campos
// ---------------------------------------------------------------------------
// A gramática compilada dos structured outputs tem limite de tamanho (a API
// recusou um schema com 79 propriedades; ver monitor.test.mjs). Por isso o
// bloco de energia não é um objecto com um campo por dado, mas uma lista de
// pares (fornecimento, campo, período horário, descrição, valor) — 5
// propriedades em vez de 30. agruparCamposEnergia() reconstrói os
// fornecimentos. Sem tipos em união: "" = em falta.

export const CAMPOS_ENERGIA = [
  "cpe_cui",
  "periodo_inicio",
  "periodo_fim",
  "dias",
  "potencia_kva",
  "opcao_horaria",
  "tipo_tarifario",
  "tipo_leitura",
  "consumo_kwh",
  "consumo_m3",
  "fator_conversao",
  "escalao",
  "termo_fixo_dia",
  "valor_termo_fixo",
  "energia_kwh",
  "energia_preco_kwh",
  "energia_valor",
  "valor_energia",
  "valor_redes",
  "valor_impostos",
  "valor_descontos",
  "valor_acertos",
  "acerto_inicio",
  "acerto_fim",
  "acerto_kwh",
  "servico_adicional",
  "total",
] as const;
export type CampoEnergia = (typeof CAMPOS_ENERGIA)[number];

export const SCHEMA_ENERGIA = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["fornecimento", "campo", "periodo", "descricao", "valor"],
    properties: {
      fornecimento: { type: "string", enum: [...TIPOS_FORNECIMENTO] },
      campo: { type: "string", enum: [...CAMPOS_ENERGIA] },
      periodo: { type: "string", enum: ["", ...PERIODOS_HORARIOS] },
      descricao: { type: "string" },
      valor: { type: "string" },
    },
  },
} as const;

export const PROMPT_ENERGIA = `
Bloco "energia" (só em facturas de electricidade ou gás natural; noutros sectores devolve []):
- Uma entrada por dado lido: {fornecimento, campo, periodo, descricao, valor}. "periodo" e "descricao" só nos campos indicados abaixo; nos outros, "". Não incluas entradas para dados que não estão na factura.
- "fornecimento": eletricidade ou gas. Numa factura conjunta, cada valor pertence só ao seu fornecimento.
- "cpe_cui": o CPE (electricidade) ou o CUI (gás) exactamente como escrito.
- "periodo_inicio"/"periodo_fim": período de consumo (AAAA-MM-DD). "dias": número de dias facturados.
- "potencia_kva": potência contratada (só electricidade). "termo_fixo_dia": preço por dia da potência (electricidade) ou do termo fixo (gás), em €/dia, com todas as casas decimais escritas. "valor_termo_fixo": valor total da potência ou do termo fixo no período.
- "opcao_horaria": simples, bi_horaria ou tri_horaria. "tipo_tarifario": fixo, indexado (preço ligado ao mercado, ex. OMIE ou MIBGAS) ou dinamico. "tipo_leitura": real, estimada ou mista. Só se a factura o indicar.
- "consumo_kwh": consumo do período em kWh, SEM os kWh de acertos de períodos anteriores. No gás, também "consumo_m3", "fator_conversao" (kWh/m³) e "escalao".
- "energia_kwh", "energia_preco_kwh" (€/kWh, todas as casas decimais escritas) e "energia_valor": uma entrada de cada por linha de energia do período, com "periodo" = simples, vazio, fora_vazio, cheias ou ponta. Não incluas acertos.
- "valor_energia": total da energia do período. "valor_redes": tarifas de acesso às redes só quando cobradas em linha própria e somadas ao total (se forem apenas informativas, incluídas no preço, não incluas).
- "valor_impostos": soma de IVA, IEC, contribuição audiovisual e taxas. "valor_descontos": soma dos descontos como valor positivo; "0" se a factura não tiver descontos.
- "valor_acertos": soma dos acertos de períodos anteriores (positivo se for cobrança, negativo se for devolução), com "acerto_inicio", "acerto_fim" e "acerto_kwh" quando indicados; "0" se não houver acertos.
- "servico_adicional": uma entrada por seguro, assistência, manutenção ou outro serviço que não é energia, com o nome em "descricao" e o valor em "valor".
- "total": total deste fornecimento com impostos.`;

/** Reconstrói os fornecimentos a partir da lista de campos (fatura_v4). Aceita também a forma já agrupada. */
export function agruparCamposEnergia(lista: unknown): unknown[] {
  if (!Array.isArray(lista)) return [];
  if (lista.every((x) => ehObjeto(x) && "tipo" in x)) return lista; // já agrupado
  const por = new Map<string, Record<string, unknown> & { parcelas_energia: Record<string, unknown>[]; servicos_adicionais: Record<string, unknown>[] }>();
  for (const x of lista) {
    if (!ehObjeto(x) || typeof x.fornecimento !== "string" || typeof x.campo !== "string") continue;
    const tipo = x.fornecimento;
    if (!por.has(tipo)) por.set(tipo, { tipo, parcelas_energia: [], servicos_adicionais: [] });
    const f = por.get(tipo)!;
    const valor = typeof x.valor === "string" ? x.valor : "";
    if (x.campo === "energia_kwh" || x.campo === "energia_preco_kwh" || x.campo === "energia_valor") {
      const chave = { energia_kwh: "kwh", energia_preco_kwh: "preco_kwh", energia_valor: "valor" }[x.campo];
      const periodo = typeof x.periodo === "string" && x.periodo ? x.periodo : "simples";
      // Uma linha nova quando o período já tem este dado (ex.: o mesmo
      // período em duas linhas, antes e depois de uma mudança de preço).
      let parcela = [...f.parcelas_energia].reverse().find((p) => p.periodo === periodo && !(chave in p));
      if (!parcela) {
        parcela = { periodo };
        f.parcelas_energia.push(parcela);
      }
      parcela[chave] = valor;
    } else if (x.campo === "servico_adicional") {
      f.servicos_adicionais.push({ descricao: typeof x.descricao === "string" ? x.descricao : "", valor });
    } else if (!(x.campo in f)) {
      f[x.campo] = valor;
    }
  }
  return [...por.values()];
}

// ---------------------------------------------------------------------------
// Validação e normalização
// ---------------------------------------------------------------------------

/** Diferença tolerada entre os componentes e o total de um fornecimento. */
export const TOLERANCIA_RECONCILIACAO_CENTS = 10;
const MAX_FORNECIMENTOS = 4;

/** "0,1658" → 165800 (µ€). Aceita até 6 casas decimais. */
export function paraMicro(v: unknown): number | null {
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "").replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    v = Number(t);
  }
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(v * 1_000_000);
}

/** Número decimal positivo (consumos, potência, factor), com 3 casas. */
export function paraQuantidade(v: unknown): number | null {
  if (typeof v === "string") {
    let t = v.trim().replace(/\s/g, "");
    // "1.234,5" (milhares com ponto) → "1234.5"
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "");
    t = t.replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    v = Number(t);
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 1000) / 1000;
}

function inteiroPositivo(v: unknown): number | null {
  const n = paraQuantidade(v);
  return n !== null && Number.isInteger(n) && n > 0 && n <= 400 ? n : null;
}

function enumOuNull<T extends string>(v: unknown, valores: readonly string[], desconhecido: string): T | null {
  return typeof v === "string" && valores.includes(v) && v !== desconhecido ? (v as T) : null;
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000) + 1;
}


const somar = (vs: (number | null)[]) => (vs.some((v) => v === null) ? null : vs.reduce<number>((s, v) => s + (v ?? 0), 0));

/**
 * Normaliza o bloco "energia" lido. `setor` é o da factura: só electricidade e
 * gás têm este bloco (noutro sector devolve []). `totalFatura` serve de total
 * de um fornecimento único sem total próprio.
 */
export function normalizarEnergia(bruto: unknown, setor: string, totalFatura: number | null): FornecimentoEnergia[] {
  if ((setor !== "eletricidade" && setor !== "gas") || !Array.isArray(bruto)) return [];
  const out: FornecimentoEnergia[] = [];
  for (const b of agruparCamposEnergia(bruto).slice(0, MAX_FORNECIMENTOS)) {
    if (!ehObjeto(b)) continue;
    const tipo = enumOuNull<TipoFornecimento>(b.tipo, TIPOS_FORNECIMENTO, "");
    if (!tipo) continue;
    const avisos: string[] = [];

    let periodoInicio = dataValida(b.periodo_inicio) ? b.periodo_inicio : null;
    let periodoFim = dataValida(b.periodo_fim) ? b.periodo_fim : null;
    if (periodoInicio && periodoFim && periodoFim < periodoInicio) {
      avisos.push("periodo_invertido");
      periodoInicio = periodoFim = null;
    }
    const diasLidos = inteiroPositivo(b.dias);
    const diasPeriodo = periodoInicio && periodoFim ? diasEntre(periodoInicio, periodoFim) : null;
    // O período na factura pode contar o último dia ou não: ±1 dia é coerente.
    if (diasLidos && diasPeriodo && Math.abs(diasLidos - diasPeriodo) > 1) avisos.push("dias_incoerentes");
    const dias = diasLidos ?? diasPeriodo;

    const energia: ParcelaEnergia[] = [];
    if (Array.isArray(b.parcelas_energia)) {
      for (const p of b.parcelas_energia) {
        if (!ehObjeto(p)) continue;
        const periodo = enumOuNull<PeriodoHorario>(p.periodo, PERIODOS_HORARIOS, "");
        if (!periodo) continue;
        const parcela: ParcelaEnergia = { periodo, kwh: paraQuantidade(p.kwh), precoMicro: paraMicro(p.preco_kwh), valorCents: paraCents(p.valor) };
        if (parcela.precoMicro !== null && (parcela.precoMicro <= 0 || parcela.precoMicro > 5_000_000)) {
          avisos.push("preco_energia_invalido");
          parcela.precoMicro = null;
        }
        if (parcela.kwh === null && parcela.valorCents === null) continue;
        energia.push(parcela);
      }
    }

    const consumoLido = paraQuantidade(b.consumo_kwh);
    const somaParcelas = energia.length && energia.every((p) => p.kwh !== null) ? energia.reduce((s, p) => s + p.kwh!, 0) : null;
    if (consumoLido !== null && somaParcelas !== null && Math.abs(consumoLido - somaParcelas) > Math.max(1, consumoLido * 0.01)) {
      avisos.push("consumo_diferente_das_parcelas");
    }
    const consumoKwh = consumoLido ?? (somaParcelas !== null ? Math.round(somaParcelas * 1000) / 1000 : null);

    const energiaLida = paraCents(b.valor_energia);
    const energiaCents = energiaLida ?? somar(energia.map((p) => p.valorCents));

    let termoFixoDiaMicro = paraMicro(b.termo_fixo_dia);
    if (termoFixoDiaMicro !== null && (termoFixoDiaMicro <= 0 || termoFixoDiaMicro > 50_000_000)) {
      avisos.push("termo_fixo_invalido");
      termoFixoDiaMicro = null;
    }
    const termoFixoLido = paraCents(b.valor_termo_fixo);
    const termoFixoCents = termoFixoLido ?? (termoFixoDiaMicro !== null && dias ? Math.round((termoFixoDiaMicro * dias) / 10_000) : null);

    const descontos = paraCents(b.valor_descontos);
    const servicosAdicionais: ServicoAdicional[] = [];
    if (Array.isArray(b.servicos_adicionais)) {
      for (const s of b.servicos_adicionais) {
        if (!ehObjeto(s)) continue;
        const descricao = textoCurto(s.descricao, 120);
        const valorCents = paraCents(s.valor);
        if (descricao && valorCents !== null) servicosAdicionais.push({ descricao, valorCents });
      }
    }
    const servicosAdicionaisCents = servicosAdicionais.length ? servicosAdicionais.reduce((s, x) => s + x.valorCents, 0) : null;

    const potencia = paraQuantidade(b.potencia_kva);
    const local = textoCurto(b.cpe_cui, 120);
    const f: FornecimentoEnergia = {
      tipo,
      local: local && local.startsWith("hmac:") ? local : null,
      localApresentacao: textoCurto(b.cpe_cui_apresentacao, 60),
      periodoInicio,
      periodoFim,
      dias,
      potenciaKva: tipo === "eletricidade" && potencia !== null && potencia > 0 && potencia <= 250 ? potencia : null,
      opcaoHoraria: enumOuNull<OpcaoHoraria>(b.opcao_horaria, OPCOES_HORARIAS, "desconhecida") ?? opcaoPelasParcelas(energia),
      tipoTarifario: enumOuNull<TipoTarifario>(b.tipo_tarifario, TIPOS_TARIFARIO, "desconhecido"),
      tipoLeitura: enumOuNull<TipoLeitura>(b.tipo_leitura, TIPOS_LEITURA, "desconhecida"),
      consumoKwh,
      consumoM3: tipo === "gas" ? paraQuantidade(b.consumo_m3) : null,
      fatorConversao: tipo === "gas" ? paraQuantidade(b.fator_conversao) : null,
      escalao: tipo === "gas" ? textoCurto(b.escalao, 40) : null,
      termoFixoDiaMicro,
      termoFixoCents,
      energia,
      energiaCents,
      redesCents: paraCents(b.valor_redes),
      impostosCents: paraCents(b.valor_impostos),
      descontosCents: descontos === null ? null : Math.abs(descontos),
      acertosCents: paraCents(b.valor_acertos),
      acertoInicio: dataValida(b.acerto_inicio) ? b.acerto_inicio : null,
      acertoFim: dataValida(b.acerto_fim) ? b.acerto_fim : null,
      acertoKwh: paraQuantidade(b.acerto_kwh),
      servicosAdicionaisCents,
      servicosAdicionais,
      totalCents: paraCents(b.total),
      reconciliado: null,
      avisos,
    };
    out.push(f);
  }
  if (out.length === 1 && out[0].totalCents === null) out[0].totalCents = totalFatura;
  for (const f of out) f.reconciliado = reconciliar(f);
  return out;
}

function opcaoPelasParcelas(energia: ParcelaEnergia[]): OpcaoHoraria | null {
  const p = new Set(energia.map((x) => x.periodo));
  if (p.size === 0 || p.has("outro")) return null;
  if (p.size === 1 && p.has("simples")) return "simples";
  if (p.has("ponta") || p.has("cheias")) return "tri_horaria";
  if (p.has("vazio") && p.has("fora_vazio")) return "bi_horaria";
  return null;
}

/**
 * Componentes que somam o total do fornecimento (com tolerância)? null quando
 * faltam a energia, o termo fixo, os impostos ou o total.
 */
export function reconciliar(f: FornecimentoEnergia): boolean | null {
  if (f.totalCents === null || f.energiaCents === null || f.termoFixoCents === null || f.impostosCents === null) return null;
  const soma =
    f.energiaCents +
    f.termoFixoCents +
    (f.redesCents ?? 0) +
    f.impostosCents -
    (f.descontosCents ?? 0) +
    (f.acertosCents ?? 0) +
    (f.servicosAdicionaisCents ?? 0);
  return Math.abs(soma - f.totalCents) <= TOLERANCIA_RECONCILIACAO_CENTS;
}

/** Fornecimentos guardados em faturas_monitor.energia (jsonb) → tipo. Defensivo. */
export function lerEnergiaGuardada(v: unknown): FornecimentoEnergia[] {
  if (!Array.isArray(v)) return [];
  return v.filter((f): f is FornecimentoEnergia => ehObjeto(f) && (f.tipo === "eletricidade" || f.tipo === "gas") && Array.isArray(f.energia));
}

/** Padrão do CPE/CUI: PT + 16 dígitos + 2 letras (ex.: PT0002000012345678AB). */
export function ehCodigoLocal(valor: string): boolean {
  return /^PT\d{16}[A-Z]{2}$/.test(valor.toUpperCase().replace(/[^A-Z0-9]/g, ""));
}
