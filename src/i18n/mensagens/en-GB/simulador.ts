import type { Traducao } from "../../dicionario.ts";
import type { simulador as pt } from "../pt-PT/simulador.ts";

export const simulador: Traducao<typeof pt> = {
  metadados: {
    titulo: "Eligibility Checker - DoLado",
    descricao:
      "See if DoLado can help with your case involving telecoms, energy, gas, water, purchases and refunds or gyms. 4 questions, free, no account and no email needed.",
  },
  eyebrow: "Free · no account · 4 questions",
  titulo: "See if DoLado can help with your case",
  texto:
    "Answer 4 quick questions about your situation with a telecoms, energy, gas or water company, a purchase or a gym. The result appears straight away — no email and no account needed.",
  perguntas: {
    setor: { titulo: "What type of company is the problem with?" },
    titular: {
      titulo: "Is the contract a personal one?",
      ajuda: "For example, your mobile phone, internet or home electricity.",
    },
    problema: { titulo: "What happened?" },
    momento: { titulo: "Have you already complained to the company?" },
  },
  progresso: "Checker progress",
  perguntaDe: (n: number, total: number) => `Question ${n} of ${total}`,
  voltar: "← Back",
  resultado: "Result",
  resultados: {
    positivo: {
      titulo: "Based on your answers, your case looks like the kind of situation DoLado handles.",
      texto: "Tell us what happened. DoLado organises your case, prepares the complaint and follows the process with you.",
      cta: "Start my case",
    },
    incerto: {
      titulo: "Based on your answers, we can't say for certain whether this case falls within DoLado's service.",
      texto: "If you would like to go ahead, tell us what happened in the case form. At the end, you choose the option that suits you before paying.",
      cta: "Start my case",
    },
    negativo: {
      titulo: "Based on your answers, this case may not fall within DoLado's current service.",
      texto: "",
      cta: "",
    },
  },
  motivos: {
    setor: "At the moment, DoLado only handles situations involving telecoms, energy, gas, water, purchases and refunds, and gyms.",
    empresa: "DoLado's current service is for individual consumers, not for contracts held by businesses or for professional activities.",
    resolvido: "Based on your answers, the situation seems to have already been resolved with the company.",
    titular: "It isn't clear whether the contract is personal or for a business or professional activity.",
    problema: "This type of situation isn't among those DoLado handles most often.",
  },
  responderDeNovo: "Start again",
  indicativo: "This result is only an indication and is based on the answers you gave.",
  comoFunciona: {
    eyebrow: "How it works",
    titulo: "What you need to know about the checker.",
    itens: [
      {
        titulo: "What it is for.",
        texto:
          "It helps you see whether your situation is the kind DoLado handles: problems that individual consumers have with telecoms, energy, gas and water companies, with purchases and refunds and with gyms — such as monthly price increases, incorrect charges, minimum terms, service outages or refused cancellations.",
      },
      {
        titulo: "What it isn't.",
        texto: "It isn't a legal assessment of your case or a prediction of how the complaint will turn out.",
      },
      {
        titulo: "Your answers.",
        texto: "They stay in your browser only: we don't store them or link them to you.",
      },
      {
        titulo: "If you decide to go ahead.",
        texto: "Under “Start my case” you describe what happened, create your account and choose the option that suits you. You only pay at the end.",
      },
    ],
  },
};
