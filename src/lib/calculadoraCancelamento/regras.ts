// DoLado — Calculadora de Cancelamento pública (02/10/2026).
//
// Ferramenta gratuita, antes da compra: estima o encargo MÁXIMO de um
// cancelamento antecipado de um contrato de telecomunicações por iniciativa
// do cliente, quando não exista motivo legal ou contratual para cancelar sem
// encargos. Não avalia esse motivo nem é um parecer jurídico. Corre só no
// browser: lógica determinística, sem IA, sem login, sem dados pessoais, sem
// gravação. Não cria conta, caso, pedido nem acesso.
//
// Variáveis:
//   V = vantagem total associada à fidelização (indicada no contrato)
//   D = duração total da fidelização
//   R = período de fidelização ainda em falta
//   M = mensalidade atual
//   N = mensalidades ainda em falta
//
// Regras:
//   * Fidelização terminada (hoje >= fim) → 0 €.
//   * Fidelização iniciada/renovada a partir de 14/11/2022:
//       A = V × R / D
//       B = M × N × 50% (1.º ano) ou 30% (2.º ano) — primeira fidelização e
//           refidelização com nova instalação/alteração do lacete local;
//       B = M × N × 30% — refidelização sem nova instalação;
//       resultado = MIN(A, B).
//   * Anterior a 14/11/2022:
//       primeira fidelização → resultado = A (sem o limite dos 50%/30%);
//       refidelização → não calculável automaticamente (o enquadramento do
//       limite de 30% nesse regime não está fechado — decisão pendente).
//   * Equipamento subsidiado: nunca entra no valor; só um aviso.
//
// R/D é calculado em dias (proporção exata do tempo em falta); N e o ano da
// fidelização em meses completos decorridos desde o início. Valores em
// cêntimos, arredondados a 2 casas no fim de cada parcela.

export const DATA_REGIME_LCE = "2022-11-14";
export const DURACAO_MAXIMA_MESES = 24;
export const MENSALIDADE_MAXIMA_CENTIMOS = 100_000; // 1000 €
export const VANTAGEM_MAXIMA_CENTIMOS = 1_000_000; // 10 000 €
const DATA_MINIMA = "2000-01-01";

export type TipoFidelizacao = "primeira" | "refidelizacao";
export type SimNao = "sim" | "nao";

export type DadosCalculadora = {
  /** AAAA-MM-DD */
  dataInicio: string;
  /** Meses, inteiro. */
  duracaoMeses: string;
  tipo: TipoFidelizacao | "";
  /** Só na refidelização. */
  novaInstalacao: SimNao | "";
  /** Euros, com vírgula ou ponto decimal. */
  mensalidade: string;
  /** Euros, com vírgula ou ponto decimal. */
  vantagem: string;
  equipamento: SimNao | "";
};

export type CampoCalculadora = keyof DadosCalculadora;

export type Duracao = { meses: number; dias: number };

export type TempoFidelizacao = {
  /** AAAA-MM-DD — fim da fidelização (início + D meses). */
  dataFim: string;
  decorrido: Duracao;
  emFalta: Duracao;
  /** N — mensalidades ainda em falta (0 se terminada). */
  mensalidadesEmFalta: number;
};

export type ResultadoCalculadora =
  | { ok: false; erros: Partial<Record<CampoCalculadora, string>> }
  | {
      ok: true;
      estado: "terminada";
      tempo: TempoFidelizacao;
      equipamento: boolean;
      resultadoCentimos: 0;
    }
  | {
      ok: true;
      estado: "nao_calculavel";
      tempo: TempoFidelizacao;
      equipamento: boolean;
      motivo: string;
    }
  | {
      ok: true;
      estado: "calculado";
      regime: "a_partir_de_2022_11_14" | "anterior_a_2022_11_14";
      tempo: TempoFidelizacao;
      equipamento: boolean;
      /** A */
      vantagemProporcionalCentimos: number;
      /** B — null quando não se aplica limite pelas mensalidades. */
      limiteMensalidadesCentimos: number | null;
      /** 50 ou 30 — null quando não se aplica limite. */
      percentagemLimite: 50 | 30 | null;
      /** Ano da fidelização em que o cancelamento ocorreria (1 ou 2). */
      anoFidelizacao: 1 | 2;
      resultadoCentimos: number;
      /** Qual das parcelas deu o resultado. */
      criterio: "vantagem" | "limite" | "iguais" | "so_vantagem";
    };

// ---------------------------------------------------------------------------
// Datas (AAAA-MM-DD, aritmética em UTC — sem horas nem fusos)
// ---------------------------------------------------------------------------

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIA_MS = 86_400_000;

function partesData(iso: string): [number, number, number] | null {
  const m = RE_DATA.exec(iso);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(a, mes - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== d) return null;
  return [a, mes, d];
}

function paraMs(iso: string) {
  const [a, m, d] = partesData(iso)!;
  return Date.UTC(a, m - 1, d);
}

function deMs(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Soma meses; o dia fica limitado ao último dia do mês de chegada (31/01 + 1 mês = 28/02). */
export function somarMeses(iso: string, meses: number) {
  const [a, m, d] = partesData(iso)!;
  const total = a * 12 + (m - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = total % 12;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return deMs(Date.UTC(ano, mes, Math.min(d, ultimoDia)));
}

function diasEntre(de: string, ate: string) {
  return Math.round((paraMs(ate) - paraMs(de)) / DIA_MS);
}

/** Meses completos e dias restantes entre duas datas (de <= ate). */
export function mesesEDias(de: string, ate: string): Duracao {
  let meses = 0;
  while (somarMeses(de, meses + 1) <= ate) meses += 1;
  return { meses, dias: diasEntre(somarMeses(de, meses), ate) };
}

/** Data de hoje em Portugal continental (AAAA-MM-DD). */
export function hojeEmLisboa(agora: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

// ---------------------------------------------------------------------------
// Valores
// ---------------------------------------------------------------------------

/** "29,99" / "29.99" / "30" → cêntimos; null se não for um valor válido (até 2 casas). */
export function lerEuros(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const [inteiros, decimais = ""] = limpo.split(".");
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0"));
}

const FORMATO_EUROS = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function formatarEuros(centimos: number) {
  return FORMATO_EUROS.format(centimos / 100);
}

// ---------------------------------------------------------------------------
// Validação e cálculo
// ---------------------------------------------------------------------------

export function validarDados(dados: DadosCalculadora, hoje: string): Partial<Record<CampoCalculadora, string>> {
  const erros: Partial<Record<CampoCalculadora, string>> = {};

  if (!partesData(dados.dataInicio)) {
    erros.dataInicio = "Indique uma data válida.";
  } else if (dados.dataInicio > hoje) {
    erros.dataInicio = "A data de início não pode ser no futuro.";
  } else if (dados.dataInicio < DATA_MINIMA) {
    erros.dataInicio = "Indique uma data a partir de 2000.";
  }

  const duracao = dados.duracaoMeses.trim();
  if (!/^\d+$/.test(duracao) || Number(duracao) < 1) {
    erros.duracaoMeses = "Indique a duração em meses (número inteiro positivo).";
  } else if (Number(duracao) > DURACAO_MAXIMA_MESES) {
    erros.duracaoMeses = `A duração não pode ser superior a ${DURACAO_MAXIMA_MESES} meses.`;
  }

  if (dados.tipo !== "primeira" && dados.tipo !== "refidelizacao") {
    erros.tipo = "Escolha uma opção.";
  } else if (dados.tipo === "refidelizacao" && dados.novaInstalacao !== "sim" && dados.novaInstalacao !== "nao") {
    erros.novaInstalacao = "Escolha uma opção.";
  }

  const mensalidade = lerEuros(dados.mensalidade);
  if (mensalidade === null) {
    erros.mensalidade = "Indique um valor em euros, sem valores negativos (ex.: 29,99).";
  } else if (mensalidade > MENSALIDADE_MAXIMA_CENTIMOS) {
    erros.mensalidade = "Confirme o valor: a mensalidade parece demasiado alta.";
  }

  const vantagem = lerEuros(dados.vantagem);
  if (vantagem === null) {
    erros.vantagem = "Indique um valor em euros, sem valores negativos (ex.: 120,00).";
  } else if (vantagem > VANTAGEM_MAXIMA_CENTIMOS) {
    erros.vantagem = "Confirme o valor: a vantagem parece demasiado alta.";
  }

  if (dados.equipamento !== "sim" && dados.equipamento !== "nao") {
    erros.equipamento = "Escolha uma opção.";
  }

  return erros;
}

export function calcularEncargoCancelamento(dados: DadosCalculadora, hoje: string): ResultadoCalculadora {
  if (!partesData(hoje)) throw new Error("data de hoje inválida");
  const erros = validarDados(dados, hoje);
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  const D = Number(dados.duracaoMeses.trim());
  const V = lerEuros(dados.vantagem)!;
  const M = lerEuros(dados.mensalidade)!;
  const equipamento = dados.equipamento === "sim";

  const dataFim = somarMeses(dados.dataInicio, D);
  const decorrido = mesesEDias(dados.dataInicio, hoje);

  if (hoje >= dataFim) {
    return {
      ok: true,
      estado: "terminada",
      tempo: { dataFim, decorrido, emFalta: { meses: 0, dias: 0 }, mensalidadesEmFalta: 0 },
      equipamento,
      resultadoCentimos: 0,
    };
  }

  const emFalta = mesesEDias(hoje, dataFim);
  // N: mensalidades do período de fidelização ainda não vencidas (a do mês
  // em curso conta como em falta). 1 <= N <= D.
  const N = D - decorrido.meses;
  const tempo: TempoFidelizacao = { dataFim, decorrido, emFalta, mensalidadesEmFalta: N };

  // R / D em dias: 0 < R <= D.
  const diasEmFalta = diasEntre(hoje, dataFim);
  const diasTotais = diasEntre(dados.dataInicio, dataFim);
  const A = Math.round((V * diasEmFalta) / diasTotais);
  const anoFidelizacao: 1 | 2 = decorrido.meses < 12 ? 1 : 2;

  if (dados.dataInicio < DATA_REGIME_LCE) {
    if (dados.tipo === "refidelizacao") {
      return {
        ok: true,
        estado: "nao_calculavel",
        tempo,
        equipamento,
        motivo:
          "Numa refidelização iniciada antes de 14 de novembro de 2022, o limite aplicável ao encargo depende de condições que esta calculadora não consegue confirmar automaticamente.",
      };
    }
    return {
      ok: true,
      estado: "calculado",
      regime: "anterior_a_2022_11_14",
      tempo,
      equipamento,
      vantagemProporcionalCentimos: A,
      limiteMensalidadesCentimos: null,
      percentagemLimite: null,
      anoFidelizacao,
      resultadoCentimos: A,
      criterio: "so_vantagem",
    };
  }

  const reiniciaPrazos = dados.tipo === "primeira" || dados.novaInstalacao === "sim";
  const percentagemLimite: 50 | 30 = reiniciaPrazos && anoFidelizacao === 1 ? 50 : 30;
  const B = Math.round((M * N * percentagemLimite) / 100);
  const resultado = Math.min(A, B);

  return {
    ok: true,
    estado: "calculado",
    regime: "a_partir_de_2022_11_14",
    tempo,
    equipamento,
    vantagemProporcionalCentimos: A,
    limiteMensalidadesCentimos: B,
    percentagemLimite,
    anoFidelizacao,
    resultadoCentimos: resultado,
    criterio: A === B ? "iguais" : A < B ? "vantagem" : "limite",
  };
}

/** Pré-preenchimento de "Tratar o meu caso" (valores das listas de src/lib/pedidoCaso.ts). */
export const PRE_PREENCHIMENTO_TRATAR_CASO = {
  setor: "Telecomunicações",
  problema: "Fidelização ou penalização",
} as const;
