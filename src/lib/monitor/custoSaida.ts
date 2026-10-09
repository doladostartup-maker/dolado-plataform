// DoLado — Monitor do Custo de Saída (F4, telecomunicações).
//
// Código puro (sem I/O; `npm test`). Reutiliza a regra da Calculadora de
// Cancelamento pública: o cliente não volta a preencher dados que o Monitor
// já conhece. A estimativa é o encargo MÁXIMO de uma cessação antecipada por
// iniciativa do cliente quando não exista motivo para cessar sem encargos;
// não inclui equipamento subsidiado e não é parecer jurídico.
//
// Datas da fidelização (03/10/2026):
//   * A data de assinatura nunca é usada como início. Início da fidelização =
//     data_inicio (indicada de forma explícita) ou, na falta dela, a data de
//     instalação/ativação.
//   * Se o documento diz que o contrato começa na ativação e não há data de
//     ativação (nem início explícito), não se calcula: falta confirmar o início.
//   * Fim da fidelização: o indicado (documento, cliente, DoLado) ou, sem ele,
//     início + duração (origem "calculado").
//
// Mensalidades por vencer (N): sem o ciclo de faturação não se sabe se a
// mensalidade do período em curso já foi faturada. A estimativa conta-a
// (valor máximo, como na Calculadora) e o detalhe mostra também o valor sem
// ela — nunca se apresenta uma precisão que os dados não têm.

import {
  DURACAO_MAXIMA_MESES,
  calcularEncargoCancelamento,
  lerEuros,
  somarMeses,
  type DadosCalculadora,
  type ResultadoCalculadora,
} from "../calculadoraCancelamento/regras.ts";
import { formatarDataPt, formatarEurosCents } from "./contratos.ts";import type { Idioma } from "../../i18n/config.ts";
import { tMonitor } from "../../i18n/mensagens/monitor.ts";


// v2 (03/10/2026): o valor da fatura é comparado com o intervalo da
// estimativa (com e sem a mensalidade do período em curso).
export const VERSAO_REGRA_CESSACAO = "f4_cessacao_v2";

export type ContratoCustoSaida = {
  setor: string;
  data_inicio: string | null;
  data_fim_fidelizacao: string | null;
  mensalidade_cents: number | null;
  vantagem_cents: number | null;
  tipo_fidelizacao: string | null;
  nova_instalacao: string | null;
  equipamento_subsidiado: string | null;
  data_assinatura?: string | null;
  data_ativacao?: string | null;
  duracao_fidelizacao_meses?: number | null;
  inicio_na_ativacao?: string | null;
};

/** Origem do valor atual de cada campo (contratos_campos.origem), quando conhecida. */
export type OrigensCampos = Partial<Record<string, string>>;

export type DadoEmFalta =
  | "data_inicio"
  | "data_ativacao"
  | "data_fim_fidelizacao"
  | "duracao_fidelizacao_meses"
  | "mensalidade_cents"
  | "vantagem_cents"
  | "tipo_fidelizacao"
  | "nova_instalacao"
  | "equipamento_subsidiado";

// ---------------------------------------------------------------------------
// Datas da fidelização
// ---------------------------------------------------------------------------

export type OrigemData = "documento" | "cliente" | "dolado" | "calculado";

export type DatasFidelizacao = {
  assinatura: string | null;
  ativacao: string | null;
  /** Início do contrato: ativação ou, na falta dela, o início indicado. */
  inicioContrato: string | null;
  inicioFidelizacao: string | null;
  origemInicio: "data_inicio" | "data_ativacao" | null;
  duracaoMeses: number | null;
  fim: string | null;
  origemFim: OrigemData | null;
};

export type ProblemaDatas =
  /** O contrato começa na ativação e a data de ativação não é conhecida. */
  | "falta_ativacao"
  /** Só a data de assinatura é conhecida. */
  | "so_assinatura"
  /** Nenhuma data de início. */
  | "falta_inicio"
  /** Nem fim nem duração. */
  | "falta_fim_ou_duracao"
  /** Fim e duração indicados, mas não batem certo. */
  | "datas_incoerentes"
  /** Fim indicado que não corresponde a um número inteiro de meses. */
  | "duracao_nao_inteira"
  | "duracao_invalida";

function origemData(origem: string | undefined): OrigemData | null {
  if (!origem) return null;
  if (origem === "contrato" || origem === "fatura") return "documento";
  if (origem === "cliente") return "cliente";
  if (origem === "admin") return "dolado";
  if (origem === "calculado") return "calculado";
  return null;
}

function diaAnterior(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Duração em meses inteiros entre o início e o fim da fidelização. Aceita o
// fim no dia do aniversário ou na véspera (01/03/2025 → 28/02/2027 = 24 meses).
export function duracaoEmMeses(inicio: string, fim: string): number | null {
  for (let m = 1; m <= 60; m += 1) {
    const d = somarMeses(inicio, m);
    if (d === fim || diaAnterior(d) === fim) return m;
    if (diaAnterior(d) > fim) return null;
  }
  return null;
}

export function resolverDatasFidelizacao(
  c: ContratoCustoSaida,
  origens: OrigensCampos = {},
): { ok: true; datas: DatasFidelizacao } | { ok: false; problema: ProblemaDatas; datas: DatasFidelizacao } {
  const assinatura = c.data_assinatura ?? null;
  const ativacao = c.data_ativacao ?? null;
  let inicioIndicado = c.data_inicio;

  // Salvaguarda (dados lidos antes de 03/10/2026): um início lido do
  // documento igual à data de assinatura, num contrato que começa na
  // ativação, não é um início factual.
  if (
    inicioIndicado &&
    c.inicio_na_ativacao === "sim" &&
    inicioIndicado === assinatura &&
    origemData(origens.data_inicio) === "documento"
  ) {
    inicioIndicado = null;
  }

  const inicioFidelizacao = inicioIndicado ?? ativacao;
  const origemInicio = inicioIndicado ? "data_inicio" : ativacao ? "data_ativacao" : null;
  const fimIndicado = c.data_fim_fidelizacao && origens.data_fim_fidelizacao !== "calculado" ? c.data_fim_fidelizacao : null;
  const duracaoIndicada = c.duracao_fidelizacao_meses ?? null;

  const datas: DatasFidelizacao = {
    assinatura,
    ativacao,
    inicioContrato: ativacao ?? inicioIndicado ?? null,
    inicioFidelizacao,
    origemInicio,
    duracaoMeses: duracaoIndicada,
    fim: fimIndicado,
    origemFim: fimIndicado ? origemData(origens.data_fim_fidelizacao) ?? "cliente" : null,
  };

  if (!inicioFidelizacao) {
    const problema: ProblemaDatas =
      c.inicio_na_ativacao === "sim" ? "falta_ativacao" : assinatura ? "so_assinatura" : "falta_inicio";
    return { ok: false, problema, datas };
  }

  if (fimIndicado) {
    const meses = duracaoEmMeses(inicioFidelizacao, fimIndicado);
    if (duracaoIndicada != null && meses !== duracaoIndicada) return { ok: false, problema: "datas_incoerentes", datas };
    if (meses === null) return { ok: false, problema: "duracao_nao_inteira", datas };
    datas.duracaoMeses = meses;
  } else if (duracaoIndicada != null) {
    datas.fim = somarMeses(inicioFidelizacao, duracaoIndicada);
    datas.origemFim = "calculado";
  } else {
    return { ok: false, problema: "falta_fim_ou_duracao", datas };
  }

  if (datas.duracaoMeses! > DURACAO_MAXIMA_MESES) return { ok: false, problema: "duracao_invalida", datas };
  return { ok: true, datas };
}

// ---------------------------------------------------------------------------
// Dados para a regra da Calculadora
// ---------------------------------------------------------------------------

export type DadosParaCalculo =
  | { ok: true; dados: DadosCalculadora; datas: DatasFidelizacao }
  | { ok: false; motivo: "setor"; faltam: [] }
  | { ok: false; motivo: "faltam_dados"; faltam: DadoEmFalta[]; datas?: DatasFidelizacao }
  | { ok: false; motivo: "datas"; problema: ProblemaDatas; faltam: DadoEmFalta[]; datas: DatasFidelizacao };

function euros(cents: number) {
  return (cents / 100).toFixed(2);
}

const FALTAM_POR_PROBLEMA: Record<ProblemaDatas, DadoEmFalta[]> = {
  falta_ativacao: ["data_ativacao"],
  so_assinatura: ["data_inicio"],
  falta_inicio: ["data_inicio"],
  falta_fim_ou_duracao: ["duracao_fidelizacao_meses"],
  datas_incoerentes: [],
  duracao_nao_inteira: [],
  duracao_invalida: [],
};

export function dadosCalculoDoContrato(c: ContratoCustoSaida, origens: OrigensCampos = {}): DadosParaCalculo {
  if (c.setor !== "telecomunicacoes") return { ok: false, motivo: "setor", faltam: [] };

  const r = resolverDatasFidelizacao(c, origens);
  if (!r.ok) return { ok: false, motivo: "datas", problema: r.problema, faltam: FALTAM_POR_PROBLEMA[r.problema], datas: r.datas };

  const faltam: DadoEmFalta[] = [];
  if (c.mensalidade_cents == null) faltam.push("mensalidade_cents");
  if (c.vantagem_cents == null) faltam.push("vantagem_cents");
  if (!c.tipo_fidelizacao) faltam.push("tipo_fidelizacao");
  if (c.tipo_fidelizacao === "refidelizacao" && !c.nova_instalacao) faltam.push("nova_instalacao");
  if (!c.equipamento_subsidiado) faltam.push("equipamento_subsidiado");
  if (faltam.length) return { ok: false, motivo: "faltam_dados", faltam, datas: r.datas };

  return {
    ok: true,
    datas: r.datas,
    dados: {
      dataInicio: r.datas.inicioFidelizacao!,
      duracaoMeses: String(r.datas.duracaoMeses),
      tipo: c.tipo_fidelizacao as "primeira" | "refidelizacao",
      novaInstalacao: c.tipo_fidelizacao === "refidelizacao" ? (c.nova_instalacao as "sim" | "nao") : "",
      mensalidade: euros(c.mensalidade_cents!),
      vantagem: euros(c.vantagem_cents!),
      equipamento: c.equipamento_subsidiado as "sim" | "nao",
    },
  };
}

// ---------------------------------------------------------------------------
// Detalhe do cálculo ("Como calculámos este valor?")
// ---------------------------------------------------------------------------

export type DetalheCustoSaida =
  | { estado: "terminada"; dataFim: string }
  | {
      estado: "calculado";
      dataInicio: string;
      dataFim: string;
      duracaoMeses: number;
      tipo: "primeira" | "refidelizacao";
      anoFidelizacao: 1 | 2;
      /** Período mensal da fidelização em curso (início e último dia). */
      periodoEmCurso: { inicio: string; fim: string };
      mensalidadeCents: number;
      vantagemCents: number;
      diasEmFalta: number;
      diasTotais: number;
      /** A — parte da vantagem correspondente ao tempo em falta. */
      vantagemProporcionalCents: number;
      percentagem: 50 | 30 | null;
      /** N, contando a mensalidade do período em curso (máximo). */
      mensalidadesPorVencer: number;
      /** B com N (null quando não há limite pelas mensalidades). */
      limiteMensalidadesCents: number | null;
      criterio: "vantagem" | "limite" | "iguais" | "so_vantagem";
      /** Estimativa (máxima): MIN(A, B). */
      estimativaCents: number;
      /** Sem a mensalidade do período em curso (se já tiver sido faturada). */
      semPeriodoEmCurso: { mensalidades: number; limiteCents: number | null; estimativaCents: number };
      regime: "a_partir_de_2022_11_14" | "anterior_a_2022_11_14";
    };

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

export function detalheCustoSaida(dados: DadosCalculadora, hoje: string): DetalheCustoSaida | null {
  const r = calcularEncargoCancelamento(dados, hoje);
  if (!r.ok) return null;
  if (r.estado === "terminada") return { estado: "terminada", dataFim: r.tempo.dataFim };

  const M = lerEuros(dados.mensalidade)!;
  const V = lerEuros(dados.vantagem)!;
  const N = r.tempo.mensalidadesEmFalta;
  const nSem = Math.max(0, N - 1);
  const p = r.percentagemLimite;
  const limiteSem = p === null ? null : Math.round((M * nSem * p) / 100);
  const A = r.vantagemProporcionalCentimos;
  const inicioPeriodo = somarMeses(dados.dataInicio, r.tempo.decorrido.meses);

  return {
    estado: "calculado",
    dataInicio: dados.dataInicio,
    dataFim: r.tempo.dataFim,
    duracaoMeses: Number(dados.duracaoMeses),
    tipo: dados.tipo as "primeira" | "refidelizacao",
    anoFidelizacao: r.anoFidelizacao,
    periodoEmCurso: { inicio: inicioPeriodo, fim: diaAnterior(somarMeses(dados.dataInicio, r.tempo.decorrido.meses + 1)) },
    mensalidadeCents: M,
    vantagemCents: V,
    diasEmFalta: diasEntre(hoje, r.tempo.dataFim),
    diasTotais: diasEntre(dados.dataInicio, r.tempo.dataFim),
    vantagemProporcionalCents: A,
    percentagem: p,
    mensalidadesPorVencer: N,
    limiteMensalidadesCents: r.limiteMensalidadesCentimos,
    criterio: r.criterio,
    estimativaCents: r.resultadoCentimos,
    semPeriodoEmCurso: { mensalidades: nSem, limiteCents: limiteSem, estimativaCents: limiteSem === null ? A : Math.min(A, limiteSem) },
    regime: r.regime,
  };
}

/** "Segundo ano da fidelização inicial" — a primeira fidelização não se confunde com o 2.º ano dela. */
export function textoSituacao(d: { tipo: "primeira" | "refidelizacao"; anoFidelizacao: 1 | 2 }, idioma: Idioma = "pt-PT"): string {
  const t = tMonitor[idioma].custoSaida;
  const ano = d.anoFidelizacao === 1 ? t.primeiroAno : t.segundoAno;
  return d.tipo === "primeira" ? t.inicial(ano) : t.refidelizacao(ano);
}

// ---------------------------------------------------------------------------
// Evolução: hoje, daqui a 1 e 3 meses e no fim da fidelização
// ---------------------------------------------------------------------------

export type Estimativa = { rotulo: "hoje" | "1_mes" | "3_meses" | "fim"; data: string; cents: number };

export function evolucaoCustoSaida(dados: DadosCalculadora, hoje: string): { hoje: ResultadoCalculadora; pontos: Estimativa[] } {
  const atual = calcularEncargoCancelamento(dados, hoje);
  const pontos: Estimativa[] = [];
  if (!atual.ok || atual.estado !== "calculado") return { hoje: atual, pontos };

  pontos.push({ rotulo: "hoje", data: hoje, cents: atual.resultadoCentimos });
  for (const [rotulo, meses] of [["1_mes", 1], ["3_meses", 3]] as const) {
    const data = somarMeses(hoje, meses);
    if (data >= atual.tempo.dataFim) break;
    const r = calcularEncargoCancelamento(dados, data);
    if (r.ok && r.estado === "calculado") pontos.push({ rotulo, data, cents: r.resultadoCentimos });
  }
  pontos.push({ rotulo: "fim", data: atual.tempo.dataFim, cents: 0 });
  return { hoje: atual, pontos };
}

// ---------------------------------------------------------------------------
// Valor indicado na fatura vs. estimativa da DoLado
// ---------------------------------------------------------------------------

// Diferença tolerada: 2 € ou 5% da estimativa, o que for maior
// (arredondamentos e contagem de dias do operador).
const TOLERANCIA_CENTS = 200;
const TOLERANCIA_PCT = 5;

export type ComparacaoCessacao =
  | { resultado: "sem_dados" | "equipamento" }
  | { resultado: "proximo"; operadorCents: number; estimativaCents: number }
  | { resultado: "divergente"; operadorCents: number; estimativaCents: number; diferencaCents: number };

export function compararCessacao(
  c: ContratoCustoSaida,
  operadorCents: number | null,
  dataOperador: string | null,
  origens: OrigensCampos = {},
): ComparacaoCessacao {
  if (operadorCents == null || !dataOperador) return { resultado: "sem_dados" };
  const d = dadosCalculoDoContrato(c, origens);
  if (!d.ok) return { resultado: "sem_dados" };
  // O valor do operador pode incluir equipamento, que a estimativa não inclui.
  if (d.dados.equipamento === "sim") return { resultado: "equipamento" };
  const det = detalheCustoSaida(d.dados, dataOperador);
  if (!det) return { resultado: "sem_dados" };
  const maximo = det.estado === "terminada" ? 0 : det.estimativaCents;
  const minimo = det.estado === "terminada" ? 0 : det.semPeriodoEmCurso.estimativaCents;
  const tolerancia = Math.max(TOLERANCIA_CENTS, Math.round((maximo * TOLERANCIA_PCT) / 100));
  // Dentro do intervalo (com e sem a mensalidade do período em curso) ou
  // perto dele: não é uma divergência.
  if (operadorCents >= minimo - tolerancia && operadorCents <= maximo + tolerancia) {
    return { resultado: "proximo", operadorCents, estimativaCents: maximo };
  }
  const referencia = operadorCents > maximo ? maximo : minimo;
  return { resultado: "divergente", operadorCents, estimativaCents: referencia, diferencaCents: Math.abs(operadorCents - referencia) };
}

export function textoCessacaoDivergente(operadorCents: number, dataOperador: string, estimativaCents: number): string {
  return (
    `O valor indicado na fatura para terminar o contrato antecipadamente (${formatarEurosCents(operadorCents)}, a ${formatarDataPt(dataOperador)}) ` +
    `é diferente da estimativa da DoLado com os dados do contrato que temos registados (${formatarEurosCents(estimativaCents)}). ` +
    "A diferença merece ser verificada; outras condições do contrato podem explicar o valor."
  );
}
