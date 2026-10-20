import type { Traducao } from "../../dicionario.ts";
import type { landing30Dias as pt } from "../pt-PT/landing30Dias.ts";

export const landing30Dias: Traducao<typeof pt> = {
  metadados: {
    titulo: "30 days of Protection free",
    descricao:
      "Spot unexpected increases in your bills and get reminders before promotions end. 30 days of Protection free, with no bank card and no automatic charge.",
  },
  cabecalho: {
    iniciarSessao: "Sign in",
  },
  topo: {
    eyebrow: "30 days free",
    titulo: "Has your bill gone up and you don't know why?",
    texto:
      "With DoLado, your contracts and bills are used to spot unexpected increases and see promotions ending in advance, before you overpay.",
    beneficios: [
      "Spot unexpected increases in your bills.",
      "Get reminders before promotions end.",
      "Keep track of your services in one place.",
    ],
    cta: "Activate my 30 days free",
    confianca: "No bank card. No commitment. No automatic charge.",
  },
  problemas: {
    titulo: "Have you ever received a higher bill with no explanation?",
    itens: [
      "The promotion ended and the price went up.",
      "An unexpected amount appeared on the bill.",
      "The minimum term is coming to an end and you had forgotten the date.",
    ],
    fecho: "DoLado keeps an eye on these situations for you, so you can act in time.",
  },
  comoFunciona: {
    titulo: "How does DoLado Protection work?",
    passos: [
      {
        titulo: "Add your contracts and bills",
        texto:
          "Upload a bill or a contract for the services you want us to keep an eye on. We read the dates and amounts for you, and you confirm the contract details before they are used.",
      },
      {
        titulo: "DoLado keeps an eye on it for you",
        texto:
          "We compare each new bill with the contract and with previous bills. When something needs attention, a person at DoLado reviews it before letting you know.",
      },
      {
        titulo: "Get important reminders",
        texto: "We email you 60 and 30 days before a promotion or a minimum term ends, and on the day itself.",
      },
    ],
  },
  fundador: {
    eyebrow: "Who is behind DoLado?",
    titulo: "A company created to be on the consumer's side.",
    paragrafos: [
      "I'm Thiago Pereira, founder of DoLado.",
      "I created DoLado after realising how many people are caught out by unexpected amounts on their bills, contract terms they were unaware of and information that goes unnoticed.",
      "I believe that understanding our contracts and standing up for our rights shouldn't be so complicated.",
      "That is why DoLado was born.",
    ],
    fotografia: "Thiago Pereira, founder of DoLado",
    conhecer: "Find out more about DoLado",
  },
  condicoes: {
    titulo: "Try it free for 30 days.",
    itens: (preco: string) => [
      "30 days of free Protection, counted from the day you activate it.",
      "No bank card needed.",
      "No automatic charge.",
      "The offer ends automatically after 30 days.",
      `To continue, you need to subscribe to Protection, at ${preco}/month.`,
      "It can be used only once per person, by those who have not had Protection before.",
      "Does not include handling complaints.",
    ],
    completas: "See the full terms",
    cta: "Activate my 30 days free",
  },
  perguntas: {
    titulo: "Frequently asked questions",
    itens: (preco: string) => [
      {
        id: "cartao",
        pergunta: "Do I need a bank card?",
        resposta: "No. The free activation does not require a bank card or any other means of payment.",
      },
      {
        id: "depois",
        pergunta: "Will I pay anything after the 30 days?",
        resposta:
          "No. Free Protection ends automatically, with no charge. You are only charged if you decide to subscribe to Protection.",
      },
      {
        id: "preco",
        pergunta: "How much does it cost to continue?",
        resposta: `Protection costs ${preco}/month, VAT included. If you subscribe during the free period, the first charge is only made when it ends.`,
      },
      {
        id: "reclamacao",
        pergunta: "Can I use DoLado to make a complaint?",
        resposta:
          "The free offer is for Protection only and does not include handling complaints. To handle a case, DoLado has its own options, which you can see on the pricing page.",
      },
      {
        id: "fidelizacao",
        pergunta: "Does the offer have a minimum term?",
        resposta: "No. There is no obligation to continue after the free period.",
      },
    ],
  },
  barra: {
    cta: "Activate my 30 days free",
  },
};
