import type { Traducao } from "../../dicionario.ts";
import type { inicio as pt } from "../pt-PT/inicio.ts";

export const inicio: Traducao<typeof pt> = {
  metadados: {
    titulo: "Your complaint, done properly - DoLado",
    descricao:
      "DoLado helps you deal with problems with companies: we prepare your complaint citing the applicable law, only send it with your authorisation and follow the process through. With Protection, we also help you spot changes that could turn into a problem.",
  },
  hero: {
    eyebrow: "On your side with companies",
    titulo1: "Got a problem",
    titulo2: "with a company?",
    titulo3: "DoLado deals with it for you.",
    texto:
      "Tell us what happened. We look at your situation, prepare the complaint, show you the text before it is sent and follow the process with you.",
    tratarCaso: "Start my case",
    verSeAjuda: "See if DoLado can help",
    garantias: ["Simple and secure", "With your approval", "We follow it through"],
    resposta: "We reply to your first contact within 48 working hours at the latest.",
  },
  ferramentas: {
    eyebrow: "Free tools",
    titulo: "Not sure yet whether there is a problem?",
    texto: "Before you pay for anything, you can use these free DoLado tools to understand your situation better.",
    semConta: "No account and no email needed. The result appears on screen straight away.",
    verTodas: "See all free tools",
  },
  comoFunciona: {
    eyebrow: "How it works",
    titulo: "Simple, from start to finish.",
    passos: [
      { titulo: "Tell us what happened", texto: "Explain the problem and send us the relevant documents." },
      { titulo: "We review and prepare", texto: "We organise the information and prepare the right text for your case." },
      { titulo: "You confirm before it is sent", texto: "You review exactly what will be sent and authorise it when you are happy." },
      {
        titulo: "We follow it through",
        texto: "In the portal you can see the history, the text that was sent and the proof linked to your case.",
      },
    ],
    verTodos: "See all the steps",
  },
  origem: {
    titulo: "On the consumer's side.",
    texto: "DoLado exists to help consumers resolve problems with companies and stop them from happening again.",
    saberMais: "Find out more about us",
  },
  tratamento: {
    eyebrow: "Handling your case",
    titulo1: "Found a problem?",
    titulo2: "DoLado deals with it with you.",
    texto: "We prepare the complaint, show you the text before it is sent and follow the process with you.",
    itens: [
      "Complaints to companies across many sectors",
      "Clear, well-grounded text",
      "Sent through the right channel",
      "Follow-up throughout the process",
    ],
    cta: "See prices and start my case",
    nota:
      "We don't guarantee a resolution — we guarantee that your complaint is well made and cites the right law. DoLado provides administrative support, never individual legal advice.",
  },
  protecao: {
    eyebrow: "Once the problem is solved",
    titulo: "We can keep watching out for you.",
    texto:
      "With DoLado Protection, we keep track of the relevant information you share with us and let you know when we spot something that deserves your attention.",
    itens: [
      "Relevant changes in your bills, compared month by month",
      "A promotion coming to an end",
      "Important minimum-term dates",
      "Situations that may call for a closer look",
    ],
    cta: "Discover Protection",
  },
  perguntas: {
    eyebrow: "Frequently asked questions",
    titulo: "Everything you need to know before you start.",
    verTodas: "See all questions",
  },
  ctaFinal: {
    eyebrow: "Not sure where to start?",
    titulo: "Tell us what happened.",
    texto: "If there is something we can deal with, we will show you the next step.",
    acao: "See if DoLado can help",
  },
};
