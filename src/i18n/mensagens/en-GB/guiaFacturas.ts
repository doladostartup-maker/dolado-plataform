import type { Traducao } from "../../dicionario.ts";
import type { guiaFacturas as pt } from "../pt-PT/guiaFacturas.ts";

// The guide itself (PDF) is only available in European Portuguese.
export const guiaFacturas: Traducao<typeof pt> = {
  metadados: {
    titulo: "Free guide: are you paying more than you should?",
    descricao:
      "A free DoLado guide with 10 things to check in your telecoms, electricity, gas and water bills and contracts. Checklist included. Written in Portuguese.",
  },
  topo: {
    eyebrow: "Free guide",
    titulo: "Are you paying more than you should?",
    subtitulo:
      "Discover 10 things to check in your bills and contracts to spot unexpected charges, understand discounts and keep track of important dates.",
    destaques: [
      "Free guide, in PDF",
      "Practical information for consumers in Portugal",
      "Simple examples",
      "Checklist included",
      "Instant download",
    ],
    capaAlt: "Cover of DoLado's guide “Are you paying more than you should?”",
    paginas: "16 pages · PDF · in Portuguese",
  },
  formulario: {
    titulo: "Get the free guide",
    rotulo: "Your email",
    botao: "Get the free guide",
    aEnviar: "Preparing your guide…",
    ajudaComunicacoes: "Optional. You don't need it to download the guide and you can withdraw this permission at any time.",
    privacidade:
      "We use your email to give you the guide and send you the link. We don't create an account. Find out more in our <privacidade>Privacy Policy</privacidade>.",
    armadilha: "Do not fill in this field",
  },
  erros: {
    email: "Please enter a valid email address (with an “@” and a domain such as “.com”).",
    limite: "We have received several requests in a row. Please wait a few minutes and try again.",
    temporario: "We couldn't complete your request right now. Please try again in a moment.",
    indisponivel: "The guide is not available at the moment.",
  },
  sucesso: {
    titulo: "Your guide is ready!",
    texto: "Thank you for your interest. You can now download DoLado's free guide.",
    botao: "Download the e-book",
    emailEnviado: "You will also receive the link by email.",
    emailRecente: "We sent you the link by email recently — you can download the guide here.",
    ingles: "The guide is written in European Portuguese.",
    protecaoTitulo: "Would you rather not keep track of all this on your own?",
    protecaoTexto:
      "With DoLado Protection, your services stay organised, each new bill is compared with the previous ones and you get reminders before promotions and minimum terms end.",
    protecaoCta: "Discover DoLado Protection",
  },
  conteudo: {
    titulo: "What's in the guide",
    itens: [
      "How to compare this month's bill with the previous one",
      "Why the amount changed: justified or worth asking about",
      "When your discounts and promotions end",
      "How to check your minimum term",
      "Services and equipment you don't use",
      "Consumption, meter readings, estimates and adjustments",
      "When and how prices can change",
      "Your current conditions compared with the ones you signed up to",
      "What to do about an unexpected charge, with a template request for clarification",
      "How to build your contracts calendar",
    ],
    ferramentas: "Plus: a checklist of the 10 checks and a contracts map to print.",
  },
  paraQuem: {
    titulo: "Who this guide is for",
    texto:
      "For anyone with telecoms, electricity, gas or water contracts who wants to understand what they are paying, notice changes in time and know what to do when something doesn't add up. No technical language and no legal knowledge needed.",
    nota: "General information, reviewed on 20 October 2026, with the official sources listed in the guide. It does not replace an assessment of your specific case.",
  },
};
