import type { Traducao } from "../../dicionario.ts";
import type { marketing as pt } from "../pt-PT/marketing.ts";

export const marketing: Traducao<typeof pt> = {
  ferramentas: {
    calculadora: {
      titulo: "How much does it cost to cancel before the end of a minimum term?",
      texto:
        "For telecoms contracts: using your contract's dates and amounts, estimate the maximum charge for cancelling early.",
      cta: "Estimate the charge for free",
    },
    simulador: {
      titulo: "Can DoLado handle my case?",
      texto: "Answer 4 questions to get an indication of whether DoLado can help with your situation.",
      cta: "See if DoLado can help",
    },
    mudanca: {
      titulo: "Moving home?",
      texto: "See what to sort out before, during and after your move: telecoms, electricity, gas and water.",
      cta: "See the Moving Guide",
    },
  },
  mockups: {
    exemplo: "Example",
    hero: {
      rotulo: "Illustrative example: a case in the DoLado portal, with the complaint text awaiting the customer's approval",
      oSeuCaso: "Your case",
      titulo: "Charged after cancelling",
      subtitulo: "Telecoms provider · Telecoms",
      textoReclamacao: "Complaint text",
      autorizar: "Authorise sending",
      pedirAlteracoes: "Request changes",
      enviada: "Complaint sent",
      comprovativo: "Proof available in the portal",
      lema1: "Less red tape.",
      lema2: "More time for you.",
    },
    fidelizacao: {
      calculada: "Calculated from your contract details",
      encargo: "Estimated maximum charge",
    },
    simulador: ["Looks like it is within scope", "To be confirmed", "May not be within scope"],
    mudanca: ["Before the move", "On moving-out day", "In your new home", "After the move"],
    caso: {
      rotulo: "Illustrative example of the stages of a case handled by DoLado",
      titulo: "A case handled by DoLado",
      etapas: [
        { titulo: "Case received", texto: "We receive your description and documents." },
        { titulo: "Review", texto: "We look at your situation." },
        { titulo: "Text prepared", texto: "We show you the text for approval." },
        { titulo: "Approval", texto: "We only send it with your authorisation." },
        { titulo: "Complaint sent", texto: "The proof of submission is kept in your case." },
        { titulo: "Follow-up", texto: "We follow the process with you." },
      ],
    },
    protecao: {
      rotulo: "Illustrative example of your protection status, with fictitious data",
      titulo: "Your protection status",
      operadora: "Telecoms provider",
      fidelizacao: "Minimum term ends on 14/03/2027",
      faturaAtual: "Current bill",
      valorFatura: "€54.90",
      promocao: "Promotion identified",
      condicoes: "Important terms identified",
      semSituacoes: "Right now we have not found anything that needs action.",
    },
  },
  origem: {
    fotografia: "Thiago Pereira, founder of DoLado",
    eyebrow: "Our story",
    titulo: "“I have been through this myself.”",
    paragrafos: [
      "I was charged an early termination fee by a telecoms provider after price rises, and only later found out I could have had other options.",
      "I realised that many people go through the same thing — not because they have no rights, but because they don't always know what those rights are or what to do.",
      "That is why I created DoLado: so that nobody loses out simply because they don't know the law, the options available or who is responsible for what.",
    ],
    assinatura: "— Thiago Pereira, founder of DoLado",
  },
};
