// DoLado — frases da comparação de electricidade e gás (determinísticas, sem
// IA). Textos em src/i18n/mensagens/*/monitorEnergia.ts; regras em
// comparacaoEnergia.ts.

import { LANG_HTML, type Idioma } from "../../i18n/config.ts";
import { tMonitorEnergia } from "../../i18n/mensagens/monitorEnergia.ts";
import { formatarDataPt, formatarEurosCents } from "./contratos.ts";
import { COMPONENTES_CONSUMO, separarConsumoPrecos, type Certeza, type ChaveComponente, type Decomposicao } from "./comparacaoEnergia.ts";
import type { TipoFornecimento } from "./energia.ts";

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function euros(cents: number | null | undefined, idioma: Idioma = "pt-PT"): string {
  return formatarEurosCents(cents ?? null, idioma);
}

/** "+9,80 €" / "−1,20 €" */
export function eurosComSinal(cents: number, idioma: Idioma = "pt-PT"): string {
  return `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${formatarEurosCents(Math.abs(cents), idioma)}`;
}

/** Preço unitário com 4 casas: "0,1658 €/kWh" ou "0,2741 €/dia". */
export function precoUnitario(micro: number | null, unidade: "kwh" | "dia", idioma: Idioma = "pt-PT"): string {
  if (micro === null) return "—";
  const v = new Intl.NumberFormat(LANG_HTML[idioma], { style: "currency", currency: "EUR", minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(micro / 1_000_000);
  const u = tMonitorEnergia[idioma].unidades;
  return unidade === "kwh" ? u.porKwh(v) : u.porDia(v);
}

export function quantidade(v: number | null, unidade: "kwh" | "kva", idioma: Idioma = "pt-PT"): string {
  if (v === null) return "—";
  const n = new Intl.NumberFormat(LANG_HTML[idioma], { maximumFractionDigits: 2 }).format(v);
  return tMonitorEnergia[idioma].unidades[unidade](n);
}

export function rotuloComponente(chave: ChaveComponente, tipo: TipoFornecimento, idioma: Idioma = "pt-PT"): string {
  const c = tMonitorEnergia[idioma].componentes;
  if (chave === "preco_termo_fixo") return tipo === "gas" ? c.preco_termo_fixo_gas : c.preco_termo_fixo_eletricidade;
  if (chave === "termo_fixo") return tipo === "gas" ? c.termo_fixo_gas : c.termo_fixo_eletricidade;
  return c[chave];
}

const tipoDe = (v: unknown): TipoFornecimento => (v === "gas" ? "gas" : "eletricidade");

// ---------------------------------------------------------------------------
// Explicação da diferença (portal e resumo mensal)
// ---------------------------------------------------------------------------

export type ExplicacaoEnergia = {
  tipo: TipoFornecimento;
  frase: string;
  pagouCents: number;
  anteriorCents: number;
  diferencaCents: number;
  /** Parte da diferença que vem do consumo (null quando não é possível separar). */
  doConsumoCents: number | null;
  /** Parte que vem dos preços e de outros valores. */
  dosPrecosCents: number | null;
  linhas: { rotulo: string; valor: string; cents: number }[];
  notas: string[];
  certeza: Certeza;
  certezaTexto: string;
};

/** Lê uma decomposição guardada nos dados de um evento (jsonb) — defensivo. */
export function lerDecomposicao(dados: Record<string, unknown> | null | undefined): Decomposicao | null {
  if (!dados || !Array.isArray(dados.componentes)) return null;
  const total = num(dados.totalAtualCents);
  const anterior = num(dados.totalAnteriorCents);
  const diferenca = num(dados.diferencaCents);
  if (total === null || anterior === null || diferenca === null) return null;
  return dados as unknown as Decomposicao;
}

export function explicarDecomposicao(d: Decomposicao, idioma: Idioma = "pt-PT"): ExplicacaoEnergia {
  const t = tMonitorEnergia[idioma];
  const nome = t.fornecimento[tipoDe(d.tipo)];
  const igual = Math.abs(d.diferencaCents) <= 5;
  const frase = igual
    ? t.explicacao.igual(nome)
    : d.diferencaCents > 0
      ? t.explicacao.superior(nome, euros(d.diferencaCents, idioma))
      : t.explicacao.inferior(nome, euros(-d.diferencaCents, idioma));
  const linhas = d.componentes.map((c) => ({ rotulo: rotuloComponente(c.chave, d.tipo, idioma), valor: eurosComSinal(c.cents, idioma), cents: c.cents }));
  if (d.naoExplicadoCents) {
    linhas.push({ rotulo: t.componentes.outros, valor: eurosComSinal(d.naoExplicadoCents, idioma), cents: d.naoExplicadoCents });
  }
  const notas: string[] = [];
  if (d.consumoDiaAtual !== null && d.consumoDiaAnterior !== null) {
    notas.push(t.explicacao.consumoDia(quantidade(d.consumoDiaAtual, "kwh", idioma), quantidade(d.consumoDiaAnterior, "kwh", idioma)));
  }
  if (d.diasAtual && d.diasAnterior && d.diasAtual !== d.diasAnterior) notas.push(t.explicacao.dias(String(d.diasAtual), String(d.diasAnterior)));
  if (d.estimada) notas.push(t.explicacao.estimada);
  if (!d.estruturaCompativel && d.componentes.some((c) => c.chave === "preco_medio_energia")) notas.push(t.explicacao.estruturaDiferente);
  if (d.arredondamentoCents) notas.push(t.explicacao.arredondamento(euros(Math.abs(d.arredondamentoCents), idioma)));
  if (d.naoExplicadoCents) notas.push(t.explicacao.naoExplicado(euros(Math.abs(d.naoExplicadoCents), idioma)));
  const separado = d.parcial ? null : separarConsumoPrecos(d);
  return {
    tipo: d.tipo,
    frase,
    pagouCents: d.totalAtualCents,
    anteriorCents: d.totalAnteriorCents,
    diferencaCents: d.diferencaCents,
    doConsumoCents: separado?.consumoCents ?? null,
    dosPrecosCents: separado?.outrosCents ?? null,
    linhas,
    notas,
    certeza: d.certeza,
    certezaTexto: t.certeza[d.certeza],
  };
}

// ---------------------------------------------------------------------------
// Frases dos eventos
// ---------------------------------------------------------------------------

type EventoFrase = { tipo: string; montanteCents: number | null; dados: Record<string, unknown> };

function listaPeriodos(dados: Record<string, unknown>, idioma: Idioma): string {
  const t = tMonitorEnergia[idioma];
  const periodos = Array.isArray(dados.periodos) ? (dados.periodos as Record<string, unknown>[]) : [];
  return periodos
    .map((p) =>
      t.eventos.precoPeriodo(
        t.periodos[(p.periodo as keyof typeof t.periodos) ?? "outro"] ?? String(p.periodo),
        precoUnitario(num(p.anterior), "kwh", idioma),
        precoUnitario(num(p.atual), "kwh", idioma),
      ),
    )
    .join("; ");
}

function rotuloOpcao(v: unknown, idioma: Idioma): string {
  const o = tMonitorEnergia[idioma].opcoes as Record<string, string>;
  return typeof v === "string" ? o[v] ?? v : "—";
}

/** Frase de um evento de electricidade/gás (energia_* e descontos de energia). */
export function fraseEventoEnergia(e: EventoFrase, idioma: Idioma = "pt-PT"): string {
  const t = tMonitorEnergia[idioma];
  const ev = t.eventos;
  const d = e.dados ?? {};
  const tipo = tipoDe(d.fornecimento);
  const nome = t.fornecimento[tipo];
  const doNome = t.doFornecimento[tipo];
  switch (e.tipo) {
    case "energia_variacao": {
      const dec = lerDecomposicao(d);
      if (!dec) return ev.semTotais(nome);
      const aFatura = t.aFatura(nome);
      if (Math.abs(dec.diferencaCents) <= 5) return ev.variacaoIgual(aFatura);
      const sentido = dec.diferencaCents > 0 ? ev.maisAlta : ev.maisBaixa;
      const principais = dec.componentes.slice(0, 3);
      if (principais.length === 0) return ev.variacaoSemCausas(aFatura, euros(Math.abs(dec.diferencaCents), idioma), sentido);
      const causas = principais.map((c) => ev.causa(rotuloComponente(c.chave, dec.tipo, idioma), eurosComSinal(c.cents, idioma)));
      if (dec.componentes.length > 3 || dec.naoExplicadoCents) causas.push(ev.eOutros);
      return ev.variacaoComCausas(aFatura, euros(Math.abs(dec.diferencaCents), idioma), sentido, ev.lista(causas));
    }
    case "energia_preco_alterado":
      return d.sentido === "descida" ? ev.precoDesceu(doNome, listaPeriodos(d, idioma)) : ev.precoAlterado(doNome, listaPeriodos(d, idioma), euros(e.montanteCents, idioma));
    case "energia_preco_indexado":
      return ev.precoIndexado(doNome, listaPeriodos(d, idioma));
    case "energia_termo_fixo_alterado": {
      const rotulo = rotuloComponente("preco_termo_fixo", tipo, idioma);
      const de = precoUnitario(num(d.anterior), "dia", idioma);
      const para = precoUnitario(num(d.atual), "dia", idioma);
      return d.sentido === "descida" ? ev.termoFixoDesceu(rotulo, de, para) : ev.termoFixoAlterado(rotulo, de, para, euros(e.montanteCents, idioma));
    }
    case "energia_potencia_alterada": {
      const de = quantidade(num(d.anterior), "kva", idioma);
      const para = quantidade(num(d.atual), "kva", idioma);
      return (num(d.atual) ?? 0) > (num(d.anterior) ?? 0) ? ev.potenciaSubiu(de, para) : ev.potenciaDesceu(de, para);
    }
    case "energia_tarifario_alterado":
      return ev.tarifarioAlterado(rotuloOpcao(d.anterior, idioma), rotuloOpcao(d.atual, idioma));
    case "energia_consumo_superior":
      return ev.consumoSuperior(
        nome,
        quantidade(num(d.media_atual), "kwh", idioma),
        quantidade(num(d.media_anterior), "kwh", idioma),
        d.base === "ano_anterior" ? ev.baseAnoAnterior : ev.basePeriodoAnterior,
        d.estimada === true,
      );
    case "energia_leitura_estimada":
      return d.leitura === "mista" ? ev.leituraMista(nome) : ev.leituraEstimada(nome);
    case "energia_acerto": {
      const valor = num(d.valor) ?? 0;
      const periodo = typeof d.inicio === "string" && typeof d.fim === "string" ? ev.acertoPeriodo(formatarDataPt(d.inicio), formatarDataPt(d.fim)) : "";
      return ev.acerto(nome, euros(Math.abs(valor), idioma), valor > 0, periodo);
    }
    case "energia_servico_adicional":
      return d.novo === false
        ? ev.servicoAlterado(String(d.descricao ?? ""), euros(num(d.anterior), idioma), euros(num(d.atual), idioma))
        : ev.servicoNovo(String(d.descricao ?? ""), euros(num(d.atual), idioma));
    case "energia_dados_insuficientes":
      if (d.motivo === "periodo_sobreposto") return ev.periodoSobreposto(nome);
      if (d.motivo === "sem_totais") return ev.semTotais(nome);
      return ev.semComparavel(nome);
    default:
      return "";
  }
}

/** A diferença vem só do consumo? (para o portal dizer "não há nada a fazer"). */
export function soConsumo(d: Pick<Decomposicao, "componentes">): boolean {
  return d.componentes.length > 0 && d.componentes.every((c) => COMPONENTES_CONSUMO.includes(c.chave) || c.chave === "dias" || c.chave === "impostos");
}
