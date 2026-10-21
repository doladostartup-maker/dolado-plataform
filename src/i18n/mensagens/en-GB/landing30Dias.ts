import type { Traducao } from "../../dicionario.ts";
import type { landing30Dias as pt } from "../pt-PT/landing30Dias.ts";

export const landing30Dias: Traducao<typeof pt> = {
  metadados: {
    titulo: "30 days of Protection free",
    descricao:
      "Avoid surprises on your bills: reminders before promotions end and a check of every new bill. 30 days of Protection free, with no bank card.",
  },
  cabecalho: {
    iniciarSessao: "Sign in",
  },
  topo: {
    eyebrow: "DoLado Protection · 30 days free",
    titulo: "Avoid surprises on your bills.",
    texto:
      "DoLado helps you keep track of your contracts and bills, spot the dates that matter and know when to act, so nothing catches you off guard.",
    oferta: "Try DoLado Protection free for 30 days.",
    cta: "Start my 30 days free",
    condicoes: (preco: string) => [
      "No bank card and no automatic charge.",
      `At the end, you only continue if you want to: ${preco}/month.`,
      "Complaint handling is not included.",
    ],
  },
  exemplos: {
    titulo: "What Protection does for you",
    texto: "Two simple examples. The amounts and dates are fictitious.",
    ficticio: "Fictitious example",
    promocao: {
      titulo: "A promotion ending",
      servico: "Internet and TV",
      mensalidade: "Current monthly fee",
      fim: "Promotion ends",
      avisoRotulo: "E-mail reminder",
      aviso:
        "Your promotion ends in 30 days. It is worth checking the contract terms before you start paying more.",
      explicacao:
        "Once the date is recorded, we send you an e-mail 60 and 30 days before the promotion ends, and on the day itself. You have time to decide what to do.",
    },
    factura: {
      titulo: "A change on a bill",
      servico: "Internet and TV",
      anterior: "Previous bill",
      actual: "Current bill",
      diferenca: "Difference",
      nota: "Reviewed by a person at DoLado before we send you the alert.",
      explicacao:
        "We compare each new bill with the contract and with previous bills. If an amount goes up with no explanation, we show you the difference in the portal and by e-mail.",
    },
  },
  passos: {
    titulo: "Getting started is simple",
    itens: [
      {
        titulo: "Create your account",
        texto: "Activate free Protection for 30 days. We do not ask for a bank card.",
      },
      {
        titulo: "Add a bill or a contract",
        texto: "Upload a PDF or a photo. If you do not have the document to hand, you can enter the service details manually.",
      },
      {
        titulo: "See what matters",
        texto:
          "In the portal, you see the details we identified, what we checked and the next date to keep in mind. The result appears right after your first document.",
      },
    ],
  },
  fundador: {
    eyebrow: "Who is behind DoLado",
    citacao:
      "I created DoLado because too many people are caught out by changes on their bills and by terms they did not know about when they signed up for a service. I want to help consumers have more information and more control over their contracts.",
    nome: "Thiago Pereira",
    cargo: "Founder of DoLado",
    fotografia: "Thiago Pereira, founder of DoLado",
    conhecer: "Learn more about DoLado",
  },
  condicoes: {
    titulo: "The terms, with no small print",
    itens: (preco: string) => [
      "30 days of free Protection, from the day you activate it.",
      "We do not ask for a bank card or any other payment method.",
      "At the end of the 30 days, free Protection ends on its own, with no charge.",
      `To continue, you sign up for Protection at ${preco}/month (VAT included). Only if you decide to.`,
      "It can only be used once per person, by those who have not had Protection before.",
      "It does not include complaint handling, which has its own options.",
    ],
    completas: "See the full terms",
  },
  perguntas: {
    titulo: "Frequently asked questions",
    itens: (preco: string, meses: number) => [
      {
        id: "recebo",
        pergunta: "What do I get during the 30 free days?",
        resposta:
          "You have access to Protection: you add bills and contracts, DoLado checks your current situation, sends you e-mail reminders before promotions and minimum terms end, and compares each new bill with the contract and with previous ones. Complaint handling is not included.",
      },
      {
        id: "cartao",
        pergunta: "Do I need to give a bank card?",
        resposta: "No. Free Protection does not ask for a bank card or any other payment method.",
      },
      {
        id: "fim",
        pergunta: "What happens when the 30 days end?",
        resposta: `Free Protection ends on its own, with no charge and without creating a subscription. If you want to continue, you sign up for Protection at ${preco}/month: if you sign up before the end, the first charge is made on the day the free period would have ended (if fewer than 2 days remain, it is made on the day you sign up). If you do not sign up, your services and documents are kept for ${meses} months.`,
      },
      {
        id: "documentos",
        pergunta: "How do I add my bills and contracts?",
        resposta:
          "In the portal, in the “Protection” area, upload the document as a PDF or a photo (JPG, PNG or WebP, up to 10 MB). DoLado reads the dates and amounts, and you confirm the contract details before they are used. If you do not have the document, you can enter the service details manually.",
      },
      {
        id: "cancelar",
        pergunta: "Can I cancel or stop using the service?",
        resposta:
          "Yes. During the 30 days there is nothing to cancel: if you do nothing, free Protection ends with no charge. If you sign up later, you can cancel the subscription in the portal at any time; you keep Protection until the end of the period already paid.",
      },
    ],
  },
  final: {
    titulo: "Start your 30 free days today.",
    texto: "Create your account in a few minutes. No bank card.",
  },
  barra: {
    cta: "Start the 30 days free",
  },
};
