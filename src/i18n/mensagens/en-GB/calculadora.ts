import type { Traducao } from "../../dicionario.ts";
import type { calculadora as pt } from "../pt-PT/calculadora.ts";

export const calculadora: Traducao<typeof pt> = {
  metadados: {
    titulo: "Cancellation Calculator - DoLado",
    descricao:
      "Estimate the maximum charge for cancelling a telecoms contract with a minimum term early. Free, no account and no email needed.",
  },
  eyebrow: "Free · no account · telecoms",
  titulo: "Cancellation Calculator",
  texto:
    "Estimate how much you could be charged if you cancel a telecoms contract with a minimum term early. The result appears straight away — no email and no account needed.",
  notaAmbito:
    "This calculator estimates the maximum charge for an early cancellation at the customer's initiative, where there is no legal or contractual reason allowing you to cancel free of charge.",
  duracao: {
    meses: (n: number) => (n === 1 ? "1 month" : `${n} months`),
    dias: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    e: " and ",
  },
  campos: {
    dataInicio: "Minimum-term start date",
    dataInicioAjuda: "If you renewed your minimum term, enter the date the new minimum-term period started.",
    duracao: "Total length of the minimum term (months)",
    duracaoAjuda: "Usually 12 or 24 months.",
    tipo: "Is this your first minimum term or a renewal?",
    tipoAjuda:
      "Renewal: a new minimum-term period on the same contract, for example when changing tariff or accepting a new offer.",
    primeira: "First minimum term",
    refidelizacao: "Renewal",
    novaInstalacao: "When you renewed, was there a new installation or a change to the local loop?",
    novaInstalacaoAjuda: "For example, a new physical installation of the connection at your home.",
    sim: "Yes",
    nao: "No",
    mensalidade: "Current monthly price (€)",
    mensalidadeExemplo: "E.g. 29.99",
    vantagem: "Total value of the benefit linked to the minimum term (€)",
    vantagemAjuda:
      "The amount stated in the contract as the advantage or benefit for accepting the minimum term (for example, discounts or free installation).",
    vantagemExemplo: "E.g. 120.00",
    equipamento: "Did you receive subsidised equipment linked to the contract?",
    equipamentoAjuda: "For example, a mobile phone or other equipment given free or at a discount because of the minimum term.",
  },
  reveja: "Please check the highlighted fields.",
  calcular: "Calculate",
  erros: {
    "Indique uma data válida.": "Please enter a valid date.",
    "A data de início não pode ser no futuro.": "The start date cannot be in the future.",
    "Indique uma data a partir de 2000.": "Please enter a date from 2000 onwards.",
    "Indique a duração em meses (número inteiro positivo).": "Please enter the length in months (a positive whole number).",
    "Escolha uma opção.": "Please choose an option.",
    "Indique um valor em euros, sem valores negativos (ex.: 29,99).": "Please enter an amount in euros, with no negative values (e.g. 29.99).",
    "Confirme o valor: a mensalidade parece demasiado alta.": "Please check the amount: the monthly price looks too high.",
    "Indique um valor em euros, sem valores negativos (ex.: 120,00).": "Please enter an amount in euros, with no negative values (e.g. 120.00).",
    "Confirme o valor: a vantagem parece demasiado alta.": "Please check the amount: the benefit looks too high.",
  },
  resultado: {
    rotulo: "Result",
    titulo: "Maximum estimated cancellation charge:",
    terminada: (data: string) =>
      `Based on the dates you entered, the minimum term ended on ${data}: there is no minimum-term period currently running.`,
    vantagem: "Proportional benefit still to be recovered:",
    limite: (meses: number, mensalidade: string, percentagem: number) =>
      `Cap based on the remaining monthly payments (${meses} × ${mensalidade} × ${percentagem}%):`,
    aplicavel: "Amount that applies:",
    menor: ", as it is the lower of the two",
    iguais: ", as both amounts are the same",
    soVantagem:
      ". For a contract that started before 14 November 2022, only the proportional benefit applies, except for a renewal without a new installation",
    decorrido: "Time already elapsed",
    emFalta: "Minimum term remaining",
    mensalidadesEmFalta: "Monthly payments remaining (estimate)",
    fim: "End of the minimum term",
    equipamento:
      "You said you received subsidised equipment. There may be specific rules and charges related to the equipment that are not included in this amount: the result is not the total cost of cancelling.",
    tratarCaso: "Start my case",
    calcularDeNovo: "Calculate again",
    notas: [
      "This amount is an estimate and depends on the details you entered.",
      "There may be other contractual or legal conditions that this calculator does not take into account.",
      "Subsidised equipment may have its own rules, which are not included in this calculation.",
      "It isn't a legal assessment of your case.",
    ],
  },
  comoFunciona: {
    eyebrow: "How it works",
    titulo: "What you need to know about the calculator.",
    itens: [
      {
        titulo: "How the calculation works.",
        texto:
          "For contracts with a minimum term that started or was renewed on or after 14 November 2022, the charge is the lower of two amounts: the part of the benefit still to be recovered, in proportion to the minimum term remaining, and a percentage of the remaining monthly payments (50% in the first year and 30% in the second; 30% for a renewal without a new installation). For earlier contracts, it is the benefit in proportion to the time remaining and, for a renewal without a new installation, also the 30% cap on the remaining monthly payments.",
      },
      {
        titulo: "What it isn't.",
        texto:
          "It doesn't assess whether you can cancel free of charge, it doesn't include equipment charges and it isn't a legal assessment of your case.",
      },
      {
        titulo: "Your data.",
        texto: "The calculation happens only in your browser: we don't store the amounts you enter or link them to you.",
      },
      {
        titulo: "If you decide to go ahead.",
        texto: "Under “Start my case” you describe what happened, create your account and choose the option that suits you. You only pay at the end.",
      },
    ],
  },
};
