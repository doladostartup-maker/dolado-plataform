import type { Traducao } from "../../dicionario.ts";
import type { paginas as pt } from "../pt-PT/paginas.ts";

export const paginas: Traducao<typeof pt> = {
  precario: {
    metadados: {
      titulo: "Pricing - DoLado",
      descricao:
        "Single Case, Case + Protection or Protection: choose the help you need to deal with a problem with a company or stay protected. Prices include VAT.",
    },
    eyebrow: "Pricing",
    titulo: "What kind of help do you need?",
    texto: () =>
      "Choose according to your situation: deal with a problem now, deal with it and stay protected, or just ongoing monitoring. All prices include VAT.",
    necessidades: {
      avulso: { necessidade: "I have a problem right now.", cta: "Start my case" },
      caso_protecao: { necessidade: "I have a problem and want to stay protected.", cta: "Choose Case + Protection" },
      protecao: { necessidade: "I don't have a problem right now, but I want ongoing monitoring.", cta: "Get Protection" },
    },
    precosLancamento: "Launch prices — subject to change.",
    antesDeDecidir: {
      eyebrow: "Before you decide",
      titulo: "What you need to know.",
      reve: { titulo: "You review it before it is sent", texto: "Nothing is sent on your behalf until you have reviewed the prepared text and authorised it." },
      cancela: {
        titulo: "Cancel whenever you like",
        texto: "You can cancel your subscription at any time from your account. The service continues until the end of the period you have already paid for.",
      },
      livre: {
        titulo: "Right of withdrawal",
        texto: (dias: number) =>
          `Where the law applies, you have ${dias} days to exercise your right of withdrawal. <saber>Find out more</saber>`,
      },
    },
    perguntas: { eyebrow: "Frequently asked questions", titulo: "Plans and payments.", verTodas: "See all questions" },
    ctaFinal: {
      eyebrow: "Still not sure which to choose?",
      titulo: "First, see if DoLado can help.",
      texto: "It's free, with no account and no email needed.",
      acao: "See if DoLado can help",
    },
  },
  comoFunciona: {
    metadados: {
      titulo: "How it works - DoLado",
      descricao:
        "From problem to complaint sent, step by step: see how DoLado prepares your complaint citing the applicable law, asks for your authorisation before sending it and follows the response deadline through to the outcome.",
    },
    eyebrow: "How it works",
    titulo: "From problem to complaint sent, step by step.",
    texto:
      "DoLado prepares your complaint with the law on your side. You receive the text first, and we only submit it to the Complaints Book (Livro de Reclamações) with your explicit authorisation.",
    tratarCaso: "Start my case",
    verSeAjuda: "See if DoLado can help",
    seuPasso: "Your step",
    dolado: "DoLado",
    passos: [
      {
        titulo: "Tell us what happened",
        texto: "Describe the problem and attach your bill or contract. No endless forms — guided questions, one at a time.",
      },
      {
        titulo: "We assess the merits of your case",
        texto: "We check whether there are legal grounds and identify the legislation that applies to your sector.",
      },
      {
        titulo: "We prepare the complaint",
        texto:
          "A formal complaint, citing the applicable law and with a clear request. We show you the text we intend to submit to the Complaints Book before anything is sent.",
      },
      {
        titulo: "Review and authorise sending",
        texto: "Read the text at your own pace and explicitly confirm whether you authorise it to be sent. Without your confirmation, nothing is sent.",
      },
      {
        titulo: "We submit it to the Complaints Book",
        texto:
          "Only after your authorisation do we submit the complaint to the Complaints Book on your behalf — this is the only stage where we act directly for you.",
      },
      {
        titulo: "We track the response deadline",
        texto:
          "Telecoms: 10 working days without a substantive response. Energy and water follow each sector's own regulatory deadlines.",
      },
      {
        titulo: "We follow it to the end",
        texto:
          "We follow the next steps and any escalation until there is an outcome — a correction, a refund or a formal response from the company.",
      },
    ],
    passoAPasso: {
      eyebrow: "Step by step",
      titulo: "What happens at each step.",
      texto: "At each step, we show who acts: you or DoLado.",
    },
    autorizacao: {
      eyebrow: "With your authorisation",
      titulo: "We only act on your behalf when you authorise it.",
      texto:
        "In steps 1 to 4, we only organise the facts and cite the law — we never decide your legal strategy. Submitting the complaint to the Complaints Book (step 5) is the only action we take directly on your behalf, and only with your explicit authorisation.",
    },
    perguntas: { eyebrow: "Frequently asked questions", titulo: "Before and after sending.", verTodas: "See all questions" },
    ctaFinal: {
      titulo: "Ready to start?",
      texto: "Tell us what happened. You receive the complaint text before anything is sent.",
      acao: "Start my case",
    },
  },
  ferramentas: {
    metadados: {
      titulo: "Free tools - DoLado",
      descricao:
        "Free DoLado tools, no account needed: estimate the charge for cancelling a telecoms contract, see if DoLado can help with your case and get ready to move home.",
    },
    eyebrow: "Free tools",
    titulo: "Understand your situation before you decide.",
    texto:
      "Before you pay for any service, use these DoLado tools to get a clearer picture of what is going on and what the next step could be.",
    factos: ["Free", "No account needed", "No need to give your email"],
    ctaFinal: {
      eyebrow: "Found a problem?",
      titulo: "DoLado deals with it for you.",
      texto: "We prepare the complaint, show you the text before it is sent and follow the process with you.",
      acao: "Start my case",
    },
  },
  ajuda: {
    metadados: {
      titulo: "Frequently Asked Questions - DoLado",
      descricao:
        "Find answers about how DoLado works, consumer complaints, plans, protection and following up your case.",
    },
    eyebrow: "Frequently asked questions",
    titulo: "How can we help?",
    texto:
      "Find answers about how DoLado works, Protection, our plans, sending your complaint and what happens next.",
    pesquisar: "Search the questions",
    exemplo: "E.g. cancel, bill, authorisation",
    encontradas: (n: number) => (n === 1 ? "1 question found." : `${n} questions found.`),
    categorias: "Categories",
    semResultados: "We couldn't find any questions matching those words.",
    experimente: "Try different words or <contacto>get in touch</contacto>.",
    apoio: {
      eyebrow: "Other options",
      titulo: "Need different help?",
      contacto: {
        titulo: "Didn't find the answer?",
        texto: "Talk to us about your case, your account or anything else.",
        cta: "Contact",
      },
      privacidade: {
        titulo: "Privacy and personal data",
        texto: "How we handle your data and how to exercise your rights.",
        cta: "Privacy Policy",
      },
      reclamacoes: {
        titulo: "Complaints about DoLado",
        texto: "The Complaints Book and alternative dispute resolution bodies.",
        cta: "Dispute resolution",
      },
    },
    ctaFinal: {
      titulo: "Ready to start?",
      texto: "Tell us what happened. You receive the complaint text before anything is sent.",
      acao: "Start my case",
    },
  },
};
