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
//   * Anterior a 14/11/2022 (confirmado com a ANACOM, decisão de 02/10/2026):
//       refidelização sem nova instalação/alteração do lacete local →
//         resultado = MIN(A, M × N × 30%);
//       restantes casos → resultado = A (sem o limite dos 50%/30%).
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

// ---------------------------------------------------------------------------
// Peças comuns (Monitor e Calculadora pública)
// ---------------------------------------------------------------------------

/** Cenário de fidelização: a regra geral (primeira fidelização ou refidelização com nova instalação) ou a refidelização sem nova instalação. */
export type CenarioFidelizacao = "geral" | "refidelizacao_sem_instalacao";

type Regime = "a_partir_de_2022_11_14" | "anterior_a_2022_11_14";

type Periodo =
  | { terminada: true; tempo: TempoFidelizacao }
  | { terminada: false; tempo: TempoFidelizacao; diasEmFalta: number; diasTotais: number; anoFidelizacao: 1 | 2; regime: Regime };

function periodoFidelizacao(dataInicio: string, D: number, hoje: string): Periodo {
  const dataFim = somarMeses(dataInicio, D);
  const decorrido = mesesEDias(dataInicio, hoje);
  if (hoje >= dataFim) {
    return { terminada: true, tempo: { dataFim, decorrido, emFalta: { meses: 0, dias: 0 }, mensalidadesEmFalta: 0 } };
  }
  // N: mensalidades do período de fidelização ainda não vencidas (a do mês
  // em curso conta como em falta). 1 <= N <= D.
  const N = D - decorrido.meses;
  return {
    terminada: false,
    tempo: { dataFim, decorrido, emFalta: mesesEDias(hoje, dataFim), mensalidadesEmFalta: N },
    // R / D em dias: 0 < R <= D.
    diasEmFalta: diasEntre(hoje, dataFim),
    diasTotais: diasEntre(dataInicio, dataFim),
    anoFidelizacao: decorrido.meses < 12 ? 1 : 2,
    regime: dataInicio < DATA_REGIME_LCE ? "anterior_a_2022_11_14" : "a_partir_de_2022_11_14",
  };
}

/** Percentagem do limite pelas mensalidades; null quando esse limite não se aplica (regime anterior, regra geral). */
function percentagemDoCenario(regime: Regime, cenario: CenarioFidelizacao, ano: 1 | 2): 50 | 30 | null {
  // Refidelização sem nova instalação: sempre 30% (nos dois regimes).
  if (cenario === "refidelizacao_sem_instalacao") return 30;
  if (regime === "anterior_a_2022_11_14") return null;
  return ano === 1 ? 50 : 30;
}

function criterioDe(A: number, B: number | null): "vantagem" | "limite" | "iguais" | "so_vantagem" {
  if (B === null) return "so_vantagem";
  return A === B ? "iguais" : A < B ? "vantagem" : "limite";
}

// ---------------------------------------------------------------------------
// Cálculo com todos os dados (usado também pelo Monitor de Proteção)
// ---------------------------------------------------------------------------

export function calcularEncargoCancelamento(dados: DadosCalculadora, hoje: string): ResultadoCalculadora {
  if (!partesData(hoje)) throw new Error("data de hoje inválida");
  const erros = validarDados(dados, hoje);
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  const D = Number(dados.duracaoMeses.trim());
  const V = lerEuros(dados.vantagem)!;
  const M = lerEuros(dados.mensalidade)!;
  const equipamento = dados.equipamento === "sim";

  const p = periodoFidelizacao(dados.dataInicio, D, hoje);
  if (p.terminada) return { ok: true, estado: "terminada", tempo: p.tempo, equipamento, resultadoCentimos: 0 };

  const A = Math.round((V * p.diasEmFalta) / p.diasTotais);
  const cenario: CenarioFidelizacao =
    dados.tipo === "refidelizacao" && dados.novaInstalacao === "nao" ? "refidelizacao_sem_instalacao" : "geral";
  const percentagemLimite = percentagemDoCenario(p.regime, cenario, p.anoFidelizacao);
  const B = percentagemLimite === null ? null : Math.round((M * p.tempo.mensalidadesEmFalta * percentagemLimite) / 100);

  return {
    ok: true,
    estado: "calculado",
    regime: p.regime,
    tempo: p.tempo,
    equipamento,
    vantagemProporcionalCentimos: A,
    limiteMensalidadesCentimos: B,
    percentagemLimite,
    anoFidelizacao: p.anoFidelizacao,
    resultadoCentimos: B === null ? A : Math.min(A, B),
    criterio: criterioDe(A, B),
  };
}

// ---------------------------------------------------------------------------
// Calculadora pública (14/10/2026): "Não sei" nunca é um beco sem saída
// ---------------------------------------------------------------------------
//
// O consumidor nem sempre conhece a vantagem associada à fidelização nem o
// tipo de fidelização. Sem esses dados não se inventa um valor exato:
//   * Calcula-se cada cenário ainda possível com as respostas dadas
//     (regra geral / refidelização sem nova instalação).
//   * Sem a vantagem (V), cada cenário só tem o limite pelas mensalidades (B):
//     o encargo é no máximo B e poderá ser inferior (MIN(A, B) com A por
//     conhecer).
//   * O valor apresentado é o MAIOR dos cenários possíveis — nunca se
//     subestima o limite.
//   * O resultado só é "completo" quando todos os cenários possíveis dão o
//     mesmo valor com a vantagem conhecida. Caso contrário é "parcial"
//     ("Limite calculado: até X"), com a lista do que falta.
//   * Regime anterior a 14/11/2022, regra geral, sem a vantagem: não há
//     limite calculável (o encargo é só a vantagem proporcional) →
//     "sem_limite", com a explicação do que falta.

export type SimNaoNaoSei = "sim" | "nao" | "nao_sei";
export type ConheceVantagem = "sim" | "nao_sei" | "ajuda";

export type DadosCalculadoraPublica = {
  /** AAAA-MM-DD */
  dataInicio: string;
  /** Meses, inteiro. */
  duracaoMeses: string;
  /** "Esta fidelização começou quando contratou este serviço pela primeira vez?" */
  primeiraVez: SimNaoNaoSei | "";
  /** Só quando primeiraVez = "nao". */
  novaInstalacao: SimNaoNaoSei | "";
  /** Euros, com vírgula ou ponto decimal. */
  mensalidade: string;
  /** "ajuda" com o valor preenchido conta como conhecido. */
  conheceVantagem: ConheceVantagem | "";
  /** Euros; só usado com conheceVantagem "sim" ou "ajuda". */
  vantagem: string;
  equipamento: SimNao | "";
  /** Opcional: encargo indicado pela operadora (fatura, contrato, resposta). */
  valorOperador: string;
};

export type CampoCalculadoraPublica = keyof DadosCalculadoraPublica;

export type DadoEmFaltaCalculadora = "vantagem" | "tipo";

export type LimiteCenario = { cenario: CenarioFidelizacao; percentagem: 50 | 30; centimos: number };

/** Diferença tolerada face ao operador: 2 € ou 5% do limite, o que for maior (como no Monitor). */
const TOLERANCIA_CENTIMOS = 200;
const TOLERANCIA_PCT = 5;

export type ComparacaoOperador = {
  resultado: "superior" | "proximo" | "inferior";
  operadorCentimos: number;
  limiteCentimos: number;
};

export type ResultadoCalculadoraPublica =
  | { ok: false; erros: Partial<Record<CampoCalculadoraPublica, string>> }
  | {
      ok: true;
      estado: "terminada";
      completo: true;
      tempo: TempoFidelizacao;
      equipamento: boolean;
      resultadoCentimos: 0;
      operador: ComparacaoOperador | null;
    }
  | {
      ok: true;
      estado: "calculado";
      /** true: valor máximo estimado. false: só um limite ("até X"), o valor aplicável poderá ser inferior. */
      completo: boolean;
      faltam: DadoEmFaltaCalculadora[];
      regime: Regime;
      tempo: TempoFidelizacao;
      equipamento: boolean;
      anoFidelizacao: 1 | 2;
      /** A — null quando a vantagem não é conhecida. */
      vantagemProporcionalCentimos: number | null;
      /** B de cada cenário possível que tem limite pelas mensalidades (sem repetir percentagens). */
      limitesMensalidades: LimiteCenario[];
      /** Só nos cenários do regime anterior em que conta apenas a vantagem. */
      cenarioSoVantagem: boolean;
      /** Completo: o valor máximo estimado. Parcial: o limite ("até"). */
      resultadoCentimos: number;
      /** Só no resultado completo. */
      criterio: "vantagem" | "limite" | "iguais" | "so_vantagem" | null;
      operador: ComparacaoOperador | null;
    }
  | {
      ok: true;
      estado: "sem_limite";
      completo: false;
      faltam: DadoEmFaltaCalculadora[];
      regime: "anterior_a_2022_11_14";
      tempo: TempoFidelizacao;
      equipamento: boolean;
    };

/** Apresentação do resultado: só "completo" pode usar "Valor máximo estimado". */
export function apresentacaoResultado(r: Exclude<ResultadoCalculadoraPublica, { ok: false }>): "terminada" | "completo" | "parcial" | "sem_limite" {
  if (r.estado === "terminada") return "terminada";
  if (r.estado === "sem_limite") return "sem_limite";
  return r.completo ? "completo" : "parcial";
}

export function vantagemConhecida(dados: Pick<DadosCalculadoraPublica, "conheceVantagem" | "vantagem">) {
  return dados.conheceVantagem === "sim" || (dados.conheceVantagem === "ajuda" && dados.vantagem.trim() !== "");
}

/** Cenários ainda possíveis com as respostas sobre o tipo de fidelização. */
export function cenariosPossiveis(dados: Pick<DadosCalculadoraPublica, "primeiraVez" | "novaInstalacao">): CenarioFidelizacao[] {
  if (dados.primeiraVez === "sim") return ["geral"];
  if (dados.primeiraVez === "nao" && dados.novaInstalacao === "sim") return ["geral"];
  if (dados.primeiraVez === "nao" && dados.novaInstalacao === "nao") return ["refidelizacao_sem_instalacao"];
  return ["geral", "refidelizacao_sem_instalacao"];
}

export const ERRO_VANTAGEM_AJUDA = "Indique o valor ou escolha “Não encontro este valor”.";

export function validarDadosPublicos(dados: DadosCalculadoraPublica, hoje: string): Partial<Record<CampoCalculadoraPublica, string>> {
  // Datas, duração, mensalidade e equipamento: as validações de sempre.
  const comuns = validarDados(
    {
      dataInicio: dados.dataInicio,
      duracaoMeses: dados.duracaoMeses,
      tipo: "primeira",
      novaInstalacao: "",
      mensalidade: dados.mensalidade,
      vantagem: "0",
      equipamento: dados.equipamento,
    },
    hoje,
  );
  const erros: Partial<Record<CampoCalculadoraPublica, string>> = {
    dataInicio: comuns.dataInicio,
    duracaoMeses: comuns.duracaoMeses,
    mensalidade: comuns.mensalidade,
    equipamento: comuns.equipamento,
  };

  const opcoes: string[] = ["sim", "nao", "nao_sei"];
  if (!opcoes.includes(dados.primeiraVez)) {
    erros.primeiraVez = "Escolha uma opção.";
  } else if (dados.primeiraVez === "nao" && !opcoes.includes(dados.novaInstalacao)) {
    erros.novaInstalacao = "Escolha uma opção.";
  }

  if (dados.conheceVantagem !== "sim" && dados.conheceVantagem !== "nao_sei" && dados.conheceVantagem !== "ajuda") {
    erros.conheceVantagem = "Escolha uma opção.";
  } else if (dados.conheceVantagem === "ajuda" && dados.vantagem.trim() === "") {
    erros.vantagem = ERRO_VANTAGEM_AJUDA;
  } else if (vantagemConhecida(dados)) {
    const vantagem = lerEuros(dados.vantagem);
    if (vantagem === null) erros.vantagem = "Indique um valor em euros, sem valores negativos (ex.: 120,00).";
    else if (vantagem > VANTAGEM_MAXIMA_CENTIMOS) erros.vantagem = "Confirme o valor: a vantagem parece demasiado alta.";
  }

  if (dados.valorOperador.trim() !== "") {
    const operador = lerEuros(dados.valorOperador);
    if (operador === null) erros.valorOperador = "Indique um valor em euros, sem valores negativos (ex.: 125,00).";
    else if (operador > VANTAGEM_MAXIMA_CENTIMOS) erros.valorOperador = "Confirme o valor: o valor indicado parece demasiado alto.";
  }

  for (const k of Object.keys(erros) as CampoCalculadoraPublica[]) if (!erros[k]) delete erros[k];
  return erros;
}

export function compararComOperador(operadorCentimos: number, limiteCentimos: number): ComparacaoOperador {
  const tolerancia = Math.max(TOLERANCIA_CENTIMOS, Math.round((limiteCentimos * TOLERANCIA_PCT) / 100));
  const diferenca = operadorCentimos - limiteCentimos;
  const resultado = diferenca > tolerancia ? "superior" : diferenca < -tolerancia ? "inferior" : "proximo";
  return { resultado, operadorCentimos, limiteCentimos };
}

export function estimarEncargoCancelamento(dados: DadosCalculadoraPublica, hoje: string): ResultadoCalculadoraPublica {
  if (!partesData(hoje)) throw new Error("data de hoje inválida");
  const erros = validarDadosPublicos(dados, hoje);
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  const D = Number(dados.duracaoMeses.trim());
  const M = lerEuros(dados.mensalidade)!;
  const V = vantagemConhecida(dados) ? lerEuros(dados.vantagem)! : null;
  const operadorCentimos = dados.valorOperador.trim() === "" ? null : lerEuros(dados.valorOperador)!;
  const equipamento = dados.equipamento === "sim";

  const p = periodoFidelizacao(dados.dataInicio, D, hoje);
  if (p.terminada) {
    return {
      ok: true,
      estado: "terminada",
      completo: true,
      tempo: p.tempo,
      equipamento,
      resultadoCentimos: 0,
      operador: operadorCentimos === null ? null : compararComOperador(operadorCentimos, 0),
    };
  }

  const A = V === null ? null : Math.round((V * p.diasEmFalta) / p.diasTotais);
  const N = p.tempo.mensalidadesEmFalta;
  const calculos = cenariosPossiveis(dados).map((cenario) => {
    const percentagem = percentagemDoCenario(p.regime, cenario, p.anoFidelizacao);
    const B = percentagem === null ? null : Math.round((M * N * percentagem) / 100);
    // Valor máximo do cenário; null = sem limite calculável (falta a vantagem).
    const valor = A === null ? B : B === null ? A : Math.min(A, B);
    return { cenario, percentagem, B, valor };
  });

  const faltam: DadoEmFaltaCalculadora[] = [];
  if (A === null) faltam.push("vantagem");
  const valores = calculos.map((c) => c.valor);
  // O tipo de fidelização só falta quando mudaria o resultado.
  if (new Set(valores).size > 1) faltam.push("tipo");

  if (valores.some((v) => v === null)) {
    return { ok: true, estado: "sem_limite", completo: false, faltam, regime: "anterior_a_2022_11_14", tempo: p.tempo, equipamento };
  }

  const resultado = Math.max(...(valores as number[]));
  // Sem a vantagem só é definitivo um limite de 0 € (MIN(A, 0) = 0).
  const completo = faltam.length === 0 || (resultado === 0 && !faltam.includes("tipo"));

  const limitesMensalidades: LimiteCenario[] = [];
  for (const c of calculos) {
    if (c.percentagem !== null && c.B !== null && !limitesMensalidades.some((l) => l.percentagem === c.percentagem)) {
      limitesMensalidades.push({ cenario: c.cenario, percentagem: c.percentagem, centimos: c.B });
    }
  }

  return {
    ok: true,
    estado: "calculado",
    completo,
    faltam: completo ? [] : faltam,
    regime: p.regime,
    tempo: p.tempo,
    equipamento,
    anoFidelizacao: p.anoFidelizacao,
    vantagemProporcionalCentimos: A,
    limitesMensalidades,
    cenarioSoVantagem: calculos.some((c) => c.percentagem === null),
    resultadoCentimos: resultado,
    criterio: completo && A !== null ? criterioDe(A, calculos[0].B) : null,
    operador: operadorCentimos === null ? null : compararComOperador(operadorCentimos, resultado),
  };
}

/** Pré-preenchimento de "Tratar o meu caso" (valores das listas de src/lib/pedidoCaso.ts). */
export const PRE_PREENCHIMENTO_TRATAR_CASO = {
  setor: "Telecomunicações",
  problema: "Fidelização ou penalização",
} as const;
