import type { Traducao } from "../../dicionario.ts";
import type { planos as pt } from "../pt-PT/planos.ts";

const LIMITE = 4;

export const planos: Traducao<typeof pt> = {
  nome: {
    protecao: "Protection",
    caso_protecao: "Case + Protection",
    avulso: "Single Case",
  },
  descricaoCurta: {
    protecao:
      "Helps you spot situations that could turn into a problem: we compare your bills to identify changes, remind you before promotions and minimum-term periods end, and alert you to relevant changes in your sector. Does not include handling cases.",
    caso_protecao: `Everything Protection includes, plus 1 case per month. Unused cases build up to a maximum of ${LIMITE}.`,
    avulso: "We handle 1 case, with no subscription. Does not include the Protection features.",
  },
  conteudo: {
    protecao: {
      resumo:
        "For people who want to spot important changes and get ahead of problems, before they lose money or the chance to act.",
      inclui: [
        "Month-by-month bill comparison, to identify changes",
        "Reminders before promotions end",
        "Reminders before minimum-term periods end",
        "Alerts about relevant changes in your sector",
      ],
      naoInclui: "Does not include handling cases.",
    },
    caso_protecao: {
      resumo: "We deal with problems when they arise and help you spot others before they cost you.",
      inclui: [
        "Everything included in Protection",
        "1 new case per month",
        `Unused cases build up to a maximum of ${LIMITE}`,
        "No waiting period",
      ],
    },
    avulso: {
      resumo: "To deal with a single problem, with a one-off payment and no subscription.",
      inclui: [
        "We handle 1 case",
        "Follow-up on that case throughout the process",
        "Access to the case history in your account",
      ],
      naoInclui: "Does not include the Protection features.",
    },
  },
  notaConversaoAvulso:
    "Bought a Single Case and not used it yet? If you later take out a subscription, part of what you paid covers the first month and the rest is refunded to your original payment method.",
  casoExtra: {
    nome: "Extra Case",
    descricaoCurta: "We handle 1 more case, with a one-off payment. Your subscription stays active and unchanged.",
    beneficio: "Subscriber benefit — 20% off",
  },
  ivaIncluido: "VAT included",
  unidadeMes: "/month",
  unidadeCaso: "/ case",
  comUnidade: (preco: string, subscricao: boolean) => (subscricao ? `${preco}/month` : `${preco} / case`),
  subscricaoMensal: "Monthly subscription",
  pagamentoUnico: "One-off payment",
  casosDisponiveis: (n: number) => (n <= 0 ? "No cases available" : n === 1 ? "1 case available" : `${n} cases available`),
  conversaoAvulso: (mensalidade: string, plano: string, reembolso: string) =>
    `If you have already bought an eligible Single Case, we use ${mensalidade} of that payment to cover the first month of the ${plano} plan and refund the remaining ${reembolso} to your original payment method.`,
  limiteAcumulados: LIMITE,
};
