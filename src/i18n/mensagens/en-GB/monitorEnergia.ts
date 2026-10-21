import type { Traducao } from "../../dicionario.ts";
import type { monitorEnergia as pt } from "../pt-PT/monitorEnergia.ts";

type V = string;

export const monitorEnergia: Traducao<typeof pt> = {
  fornecimento: {
    eletricidade: "electricity",
    gas: "gas",
  },
  /** Com o artigo: "da electricidade" / "do gás". */
  doFornecimento: {
    eletricidade: "electricity",
    gas: "gas",
  },
  aFatura: (tipo: V) => `The ${tipo} bill`,
  componentes: {
    consumo: "Energy used",
    preco_energia: "Energy price (per kWh)",
    preco_medio_energia: "Average energy price (per kWh)",
    energia: "Energy (use and price together)",
    dias: "Number of days billed",
    preco_termo_fixo_eletricidade: "Daily price of the contracted power",
    preco_termo_fixo_gas: "Daily standing charge",
    potencia: "Change of contracted power",
    termo_fixo_eletricidade: "Contracted power",
    termo_fixo_gas: "Standing charge",
    redes: "Network access tariffs",
    impostos: "Taxes and levies",
    descontos: "Discounts",
    acertos: "Adjustments for earlier periods",
    servicos_adicionais: "Additional services",
    outros: "Other amounts we could not identify",
  },
  periodos: {
    simples: "single rate",
    vazio: "off-peak hours",
    fora_vazio: "non-off-peak hours",
    cheias: "standard hours",
    ponta: "peak hours",
    outro: "other period",
  },
  certeza: {
    alta: "Based on the amounts written on both bills.",
    media: "Based on the amounts on the bills, but with estimated or incomplete data — the figure may not be exact.",
    baixa: "Partial explanation: the bill does not have all the data needed.",
  },
  explicacao: {
    titulo: "Why the amount changed",
    pagou: "You paid",
    anterior: "Previous bill",
    diferenca: "Difference",
    superior: (tipo: V, v: V) => `The ${tipo} bill was ${v} higher than the previous one.`,
    inferior: (tipo: V, v: V) => `The ${tipo} bill was ${v} lower than the previous one.`,
    igual: (tipo: V) => `The ${tipo} bill was the same as the previous one.`,
    doConsumo: "From energy use",
    dosPrecos: "From prices and other amounts",
    arredondamento: (v: V) => `Includes ${v} of rounding.`,
    naoExplicado: (v: V) => `We could not explain ${v} with the data on the bills.`,
    consumoDia: (atual: V, anterior: V) => `Average use per day: ${atual} (before: ${anterior}).`,
    dias: (atual: V, anterior: V) => `Days billed: ${atual} (before: ${anterior}).`,
    estimada: "This bill uses estimated readings: your actual use may be different.",
    estruturaDiferente: "The way energy is counted changed (for example, from single rate to two-rate): we compared the average price per kWh.",
    proximoPasso: "Next step",
    semNada: "There is nothing you need to do. We will keep checking your next bills.",
    verSituacao: "See above the situation DoLado found on this bill.",
    comunicarLeitura: "If you can, send your meter reading to your supplier: your next bill will then be based on your actual use.",
    rever: "DoLado is checking a change on this bill before showing it to you.",
  },
  eventos: {
    variacaoComCausas: (aFatura: V, v: V, sentido: V, causas: V) => `${aFatura} was ${v} ${sentido} than the previous one: ${causas}.`,
    variacaoSemCausas: (aFatura: V, v: V, sentido: V) => `${aFatura} was ${v} ${sentido} than the previous one.`,
    variacaoIgual: (aFatura: V) => `${aFatura} was the same as the previous one.`,
    maisAlta: "higher",
    maisBaixa: "lower",
    causa: (rotulo: V, v: V) => `${rotulo.toLowerCase()} ${v}`,
    eOutros: "and other smaller amounts",
    lista: (causas: string[]) => (causas.length === 1 ? causas[0] : `${causas.slice(0, -1).join("; ")} and ${causas.at(-1)}`),
    precoAlterado: (tipo: V, periodos: V, v: V) =>
      `The ${tipo} price per kWh went up compared with the previous bill (${periodos}). With the energy used on this bill, the difference is about ${v}. Please check whether your supplier told you about this change.`,
    precoDesceu: (tipo: V, periodos: V) => `The ${tipo} price per kWh went down compared with the previous bill (${periodos}).`,
    precoPeriodo: (periodo: V, de: V, para: V) => `${periodo}: from ${de} to ${para}`,
    precoIndexado: (tipo: V, periodos: V) =>
      `The ${tipo} price per kWh changed (${periodos}). On an index-linked tariff, the price can vary from bill to bill, according to the formula in the contract.`,
    termoFixoAlterado: (rotulo: V, de: V, para: V, v: V) =>
      `The ${rotulo.toLowerCase()} went up from ${de} to ${para}. On this bill, the difference is about ${v}. Please check whether your supplier told you about this change.`,
    termoFixoDesceu: (rotulo: V, de: V, para: V) => `The ${rotulo.toLowerCase()} went down from ${de} to ${para}.`,
    potenciaSubiu: (de: V, para: V) =>
      `The contracted power changed from ${de} to ${para}. If you did not ask for this change, it is worth checking with your supplier.`,
    potenciaDesceu: (de: V, para: V) => `The contracted power changed from ${de} to ${para}.`,
    tarifarioAlterado: (de: V, para: V) =>
      `The way you are billed changed (from ${de} to ${para}). If you did not ask for this change, it is worth checking with your supplier.`,
    consumoSuperior: (tipo: V, atual: V, anterior: V, base: V, estimada: boolean) =>
      `You used more ${tipo} per day than ${base}: ${atual} per day (before: ${anterior}).${estimada ? " Please note: the use on this bill is estimated." : ""}`,
    basePeriodoAnterior: "on the previous bill",
    baseAnoAnterior: "in the same period last year",
    leituraEstimada: (tipo: V) =>
      `The ${tipo} bill uses estimated readings. If you can, send your meter reading to your supplier: the bill will then be based on your actual use.`,
    leituraMista: (tipo: V) => `The ${tipo} bill combines actual and estimated readings.`,
    acerto: (tipo: V, v: V, cobranca: boolean, periodo: V) =>
      cobranca
        ? `The ${tipo} bill includes an adjustment of ${v} for earlier periods${periodo}. Please check that the readings shown match your meter.`
        : `The ${tipo} bill includes a refund of ${v} from adjustments for earlier periods${periodo}.`,
    acertoPeriodo: (de: V, ate: V) => ` (${de} to ${ate})`,
    servicoNovo: (descricao: V, v: V) =>
      `A new additional service appeared on the bill: “${descricao}” (${v}). If you did not ask for this service, it is worth checking with your supplier.`,
    servicoAlterado: (descricao: V, de: V, para: V) => `The additional service “${descricao}” changed from ${de} to ${para}.`,
    semComparavel: (tipo: V) => `We do not yet have a previous ${tipo} bill to compare with this one.`,
    periodoSobreposto: (tipo: V) =>
      `This ${tipo} bill covers days already billed on another bill (for example, an adjustment bill): we did not compare it with the previous one.`,
    semTotais: (tipo: V) => `We could not read the total of the ${tipo} bill to compare it with the previous one.`,
  },
  unidades: {
    porKwh: (v: V) => `${v}/kWh`,
    porDia: (v: V) => `${v}/day`,
    kwh: (v: V) => `${v} kWh`,
    kva: (v: V) => `${v} kVA`,
  },
  opcoes: {
    simples: "single rate",
    bi_horaria: "two-rate",
    tri_horaria: "three-rate",
    fixo: "fixed price",
    indexado: "index-linked price",
    dinamico: "dynamic price",
  },
  servico: {
    ultimaFatura: "Latest bill",
    consumoDia: (tipo: V) => `Average use per day (${tipo})`,
    precoEnergia: (tipo: V) => `Energy price (${tipo})`,
    potencia: "Contracted power",
    termoFixo: (rotulo: V) => rotulo,
    estimada: "estimated reading",
    atentoPrecos: "Changes to the energy price, contracted power or standing charge",
    atentoConsumo: "Your energy use and meter-reading adjustments",
    atentoServicos: "Discounts and additional services on your next bills",
  },
  situacao: {
    curtoPreco: "an increase in the energy price",
    curtoTermoFixo: "an increase in the fixed daily charge",
    curtoPotencia: "a change of contracted power",
    curtoTarifario: "a change in the way you are billed",
    curtoAcerto: (v: V) => `an adjustment of ${v}`,
    curtoServico: "a new additional service",
    causas: {
      preco:
        "The energy price can change because of a price update notified by the supplier, the end of a discount or a change in regulated tariffs. It is not always a mistake, but it is worth checking.",
      acerto:
        "An adjustment happens when the supplier gets the actual meter reading and corrects what it had billed using estimates. It is worth checking the readings and the dates.",
      servico:
        "An additional service may be insurance, technical assistance or maintenance added to the contract — or a service you did not ask for.",
    },
    antes: "Before",
    agora: "Now",
    diferenca: "Difference on this bill",
  },
};
