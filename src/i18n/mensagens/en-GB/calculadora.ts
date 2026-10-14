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
    primeiraVez: "Did this minimum term start when you first took out this service?",
    primeiraVezAjuda:
      "Answer “No” if the minimum term was renewed later on the same service, for example when you changed tariff or accepted a new offer.",
    novaInstalacao:
      "When you renewed the minimum term, was a new installation or a physical change to the service connection at your home needed?",
    novaInstalacaoAjuda: "For example, a technician visiting to install or change the connection at your home.",
    sim: "Yes",
    nao: "No",
    naoSei: "I don't know",
    mensalidade: "Current monthly price (€)",
    mensalidadeExemplo: "E.g. 29.99",
    conheceVantagem: "Do you know the total value of the benefit you received for accepting the minimum term?",
    conheceVantagemAjuda:
      "This may include, for example, discounts on the monthly price, free installation or activation, or other benefits stated in the contract.",
    ajudeMe: "Help me find it",
    vantagem: "Total value of the benefit linked to the minimum term (€)",
    vantagemExemplo: "E.g. 120.00",
    ajudaTitulo: "Where can I find this amount?",
    ajudaTexto: [
      "Check the contract summary or the contract and look for references to benefits linked to the minimum term, offers, discounts, installation, activation or other advantages given in return for the minimum term.",
      "If you have a recent bill, look for the information about the minimum term and the amount linked to ending the contract early.",
    ],
    naoEncontro: "I can't find this amount",
    naoSeiVantagem:
      "No problem: we'll work out the cap based on the monthly payments still to be paid. The result shows what is missing for a complete calculation.",
    valorOperador: "Amount stated by the provider for ending the contract early (€) — optional",
    valorOperadorAjuda:
      "If the provider has already told you how much you would have to pay (on a bill, in the contract or in a reply), enter it here so we can compare it with the calculated cap.",
    valorOperadorExemplo: "E.g. 125.00",
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
    "Indique o valor ou escolha “Não encontro este valor”.": "Please enter the amount or choose “I can't find this amount”.",
    "Indique um valor em euros, sem valores negativos (ex.: 125,00).": "Please enter an amount in euros, with no negative values (e.g. 125.00).",
    "Confirme o valor: o valor indicado parece demasiado alto.": "Please check the amount: it looks too high.",
  },
  resultado: {
    rotulo: "Result",
    seloCompleto: "Complete result",
    seloParcial: "Partial result",
    tituloCompleto: "Maximum estimated charge for ending the contract early:",
    tituloParcial: "Calculated cap: up to",
    tituloTerminada: "Charge for ending the contract early:",
    tituloSemLimite: "It isn't yet possible to calculate a cap with the details you entered.",
    terminada: (data: string) =>
      `Based on the dates you entered, the minimum term ended on ${data}: there is no minimum-term period currently running.`,
    parcialVantagem:
      "With the details you entered, this is the cap calculated from the monthly payments still to be paid. The amount that actually applies may be lower, because the part of the benefit linked to the minimum term that has not yet been recovered must also be taken into account.",
    parcialTipo:
      "The amount may vary depending on the type of minimum term. We show the highest cap among the cases possible with your answers; if the minimum term is a renewal without a new installation, the cap may be lower.",
    semLimite:
      "For a contract with a minimum term that started before 14 November 2022, the charge is, as a rule, the part of the benefit linked to the minimum term that has not yet been recovered. Without knowing that benefit, we can't give a cap.",
    semLimiteTipo:
      "If the minimum term was renewed without a new installation, a cap of 30% of the remaining monthly payments also applies — but without knowing the type of minimum term and the benefit we can't give an amount.",
    faltaTitulo: "For a complete calculation we still need:",
    falta: {
      vantagem: "the total value of the benefit linked to the minimum term",
      tipo: "to know whether this is the first minimum term for this service and, for a renewal, whether there was a new installation",
    },
    vantagem: "Proportional benefit not yet recovered:",
    limite: (meses: number, mensalidade: string, percentagem: number) =>
      `Cap based on the monthly payments (${meses} × ${mensalidade} × ${percentagem}%):`,
    cenario: {
      geral: "if it is the first minimum term or there was a new installation",
      refidelizacao_sem_instalacao: "if it is a renewal without a new installation",
    },
    aplicavel: "Lower amount taken into account:",
    menor: ", as it is the lower of the two",
    iguais: ", as both amounts are the same",
    soVantagem:
      ". For a contract that started before 14 November 2022, only the proportional benefit applies, except for a renewal without a new installation",
    operadorSuperior: (operador: string, limite: string) =>
      `The provider states ${operador}. The amount stated by the provider appears to be higher than the cap calculated with the details you gave (${limite}). This does not in itself mean the charge is wrong: there may be details or conditions this calculator does not take into account.`,
    operadorProximo: (operador: string, limite: string) =>
      `The provider states ${operador}, an amount close to the cap calculated with the details you gave (${limite}).`,
    operadorInferior: (operador: string, limite: string) =>
      `The provider states ${operador}, an amount that does not exceed the cap calculated with the details you gave (${limite}).`,
    operadorSemLimite: (operador: string) =>
      `The provider states ${operador}. Without the value of the benefit we can't compare it with a cap.`,
    ate: (valor: string) => `up to ${valor}`,
    analisar: "Ask DoLado to look into it",
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
      "A partial result is only a cap: it is not the amount you will have to pay.",
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
        titulo: "If you don't know something.",
        texto:
          "You can answer “I don't know”. We work out what we can — for example, the cap based on the remaining monthly payments — and show that the result is partial and what is missing for a complete calculation.",
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
