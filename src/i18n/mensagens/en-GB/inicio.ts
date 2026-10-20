import type { Traducao } from "../../dicionario.ts";
import type { inicio as pt } from "../pt-PT/inicio.ts";

export const inicio: Traducao<typeof pt> = {
  metadados: {
    titulo: "Help with problems with companies - DoLado",
    descricao:
      "DoLado helps you deal with problems with companies: we prepare your complaint, only send it with your authorisation and follow up the reply. With Protection, we also keep an eye on your bills and contracts.",
  },
  hero: {
    titulo: "Got a problem with a company?",
    texto: "You shouldn't have to understand the law, write complaints and chase replies on your own.",
    destaque: "DoLado helps you sort it out.",
    tratarCaso: "Start my case",
    verSeAjuda: "See if DoLado can help",
  },
  problemas: {
    titulo: "Has any of this happened to you?",
    itens: {
      faturaAlta: "Your bill was higher than you expected.",
      promocao: "The promotion ended and the price went up.",
      fidelizacao: "You want to cancel, but you're still in a minimum term.",
      reembolso: "You're waiting for a refund that never arrives.",
      naoReconhece: "You're being charged for something you don't recognise.",
      semResposta: "You complain, but nobody sorts it out.",
    },
    fecho: "This is exactly where DoLado comes in.",
    verTodos: "See the problems we handle",
  },
  vertentes: {
    titulo1: "Help to sort out problems.",
    titulo2: "Protection to avoid surprises.",
    tratar: {
      titulo: "I have a problem",
      texto: "We handle the complaint with you.",
      cta: "Start my case",
    },
    protecao: {
      titulo: "I want to avoid surprises",
      texto: "We keep an eye on your bills, contracts and key dates, so we can warn you in time.",
      cta: "Discover Protection",
    },
  },
  comoFunciona: {
    titulo: "How it works",
    passos: [
      "Tell us what happened",
      "We prepare the complaint and show it to you before sending",
      "We send it with your authorisation and follow it up",
    ],
    verMais: "See how it works",
  },
  ferramentas: {
    titulo: "Free tools",
    itens: {
      calculadora: { titulo: "Minimum term calculator", texto: "See how much you might pay to cancel a telecoms contract." },
      simulador: { titulo: "Can DoLado help?", texto: "Find out in a few questions." },
      mudanca: { titulo: "Moving house?", texto: "See what you need to sort out." },
    },
    verTodas: "See all tools",
  },
  fundador: {
    titulo: "“I've been through this myself.”",
    texto:
      "My operator raised the price and I nearly paid the early termination charge to leave. I realised that many people pay without checking, because it isn't always clear what to do. That's why I created DoLado.",
    nome: "Thiago Pereira",
    cargo: "Founder of DoLado",
    cta: "Why I created DoLado",
  },
  ctaFinal: {
    titulo: "Got a problem?",
    acao: "Start my case",
    secundaria: "See first if we can help",
  },
};
