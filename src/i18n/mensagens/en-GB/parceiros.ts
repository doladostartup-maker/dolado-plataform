import type { Traducao } from "../../dicionario.ts";
import type { parceiros as pt } from "../pt-PT/parceiros.ts";

export const parceiros: Traducao<typeof pt> = {
  pagina: {
    metadados: {
      titulo: "Partner Programme",
      descricao:
        "Become a DoLado partner: recommend DoLado to your clients or give Protection to your clients and staff, to help them prevent and resolve consumer problems.",
    },
    eyebrow: "Partner Programme",
    titulo: "Help the people you work with resolve consumer problems.",
    texto:
      "For professionals and companies who are close to consumers — and who want to have an answer when a bill, a contract or a purchase goes wrong. DoLado handles the problem; the partner brings DoLado to the people who need it.",
    cta: "Apply",
    modelosTitulo: "Two ways to work with us",
    indicacao: {
      titulo: "Referral Partner",
      texto:
        "You recommend DoLado to your clients or introduce companies that may be interested. DoLado takes care of everything else: sign-up, billing, case handling and follow-up.",
      itens: [
        "Your own link and code to share.",
        "A commission for each new eligible subscription, once the client's payments are confirmed.",
        "You have no access to the cases, bills or contracts of the people you refer.",
        "Each commission is recorded and paid by bank transfer.",
      ],
    },
    distribuicao: {
      titulo: "Distribution Partner",
      texto:
        "Your company gives DoLado Protection to its clients or staff as a benefit — for example, to people who have just bought a home, or to the whole team.",
      itens: [
        "Prepaid access, for the agreed period.",
        "An individual code to give to each person.",
        "No automatic charge to the person receiving the benefit when the offer ends.",
        "Reports with aggregate figures only — never personal data.",
      ],
    },
    passosTitulo: "How it works",
    passos: [
      { titulo: "You apply", texto: "Tell us who you are and how you would like to work with us." },
      { titulo: "We review", texto: "We reply by e-mail within 2 working days at the latest." },
      { titulo: "We agree the terms", texto: "The terms of each partnership are set out in a written agreement." },
    ],
    nota:
      "Contracts, bills and dates are context: what DoLado does is help prevent, detect and resolve the consumer's problem. Commercial terms are agreed with each partner; no earnings are guaranteed.",
  },

  candidatura: {
    titulo: "Application",
    nome: "Name",
    email: "E-mail",
    empresa: "Company (optional)",
    tipo: "What kind of partnership are you looking for?",
    tipos: {
      indicacao: "Referral Partner",
      distribuicao: "Distribution Partner",
      ambos: "Both",
    },
    descricao: "Tell us a little about what you do and why you are interested",
    aceitar:
      "I have read the privacy information and agree that DoLado may use this data to review my application and contact me about it.",
    privacidade: "Privacy Policy",
    botao: "Send application",
    aEnviar: "Sending…",
    enviada: {
      titulo: "We have received your application.",
      texto: "We reply by e-mail within 2 working days at the latest.",
    },
    erros: {
      nome: "Please enter your name.",
      email: "Please enter a valid e-mail.",
      tipo: "Please choose the type of partnership.",
      descricao: "Please tell us a little more (at least 10 characters).",
      aceitar: "To continue, please agree to the processing of your application data.",
      limite: "We have already received several applications from this e-mail today. Please try again tomorrow or write to us.",
      indisponivel: "Applications are not open at the moment.",
      erro: "We could not send your application. Please try again in a few minutes.",
    },
  },

  codigo: {
    campo: "Partner code (optional)",
    ajuda: "If a DoLado partner gave you a code, enter it here.",
    invalido: "This partner code is not valid. Please check it or leave the field empty.",
  },

  emails: {
    recebida: {
      assunto: "We have received your Partner Programme application",
      titulo: "We have received your application",
      texto: "Thank you for your interest in the DoLado Partner Programme.",
      prazo: "We will review it and reply by e-mail within 2 working days at the latest.",
    },
    aprovada: {
      assunto: "Your Partner Programme application has been approved",
      titulo: "Welcome to the Partner Programme",
      texto: "Your application has been approved.",
      codigo: (codigo: string) => `Your partner code is ${codigo}.`,
      ligacao: "You can share this link with anyone you would like to recommend DoLado to:",
      comoFunciona:
        "Anyone who arrives through your link, or enters your code when creating an account or before paying, is linked to you. You have no access to these people's cases, bills or contracts.",
      condicoes: "The commercial terms are set out in the partnership agreement. If you have any questions, reply to this e-mail.",
      distribuicao: "We will contact you to agree the Protection packages for your clients or staff.",
    },
    pagamento: {
      assunto: "We have recorded the payment of your commissions",
      titulo: "Commission payment",
      texto: (comissoes: number) =>
        comissoes === 1 ? "We have recorded the payment of 1 commission." : `We have recorded the payment of ${comissoes} commissions.`,
      valor: "Commissions (excl. VAT)",
      iva: "VAT",
      transferido: "Amount transferred",
      referencia: "Reference",
      data: "Date",
    },
  },
};
