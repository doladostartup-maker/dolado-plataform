import type { Traducao } from "../../dicionario.ts";
import type { inicio as pt } from "../pt-PT/inicio.ts";

export const inicio: Traducao<typeof pt> = {
  metadados: {
    titulo: "Help with problems with companies - DoLado",
    descricao:
      "DoLado helps you deal with problems with companies: we prepare your complaint, only send it with your authorisation and follow up the reply. With Protection, we also keep an eye on your bills and contracts.",
  },
  hero: {
    eyebrow: "On your side with companies",
    titulo1: "Got a problem",
    titulo2: "with a company?",
    titulo3: "DoLado helps you deal with it.",
    texto:
      "Tell us what happened. We prepare the complaint, show you the text to review and authorise, send it through the right channel and follow up the company's reply. We cannot guarantee the outcome, but you will not be dealing with it alone.",
    tratarCaso: "Start my case",
    verSeAjuda: "See if DoLado can help",
    explicacaoBotoes:
      "“Start my case” opens a step-by-step form that takes about 5 minutes, and you only pay at the end. If you are still unsure, start with 4 quick questions, with no account or e-mail.",
    garantias: ["You review the text before it is sent", "Nothing is sent without your authorisation", "You see the price before paying"],
    resposta: "Once your case is opened, we will contact you within a maximum of 2 working days.",
  },
  problemas: {
    eyebrow: "Common situations",
    titulo: "Do any of these sound familiar?",
    texto: "Choose the one closest to yours and see how DoLado can help.",
    itens: {
      cobrancaCancelamento: {
        pergunta: "Still being charged after cancelling?",
        texto: "Broadband, TV, mobile or another service you have already asked to end.",
      },
      faturaLuz: {
        pergunta: "Your electricity bill went up and you don't know why?",
        texto: "There may be an explanation, but it is worth checking the readings and the amounts.",
      },
      reembolso: {
        pergunta: "Returned something and the refund never arrived?",
        texto: "The shop accepted the return, but the money has still not come through.",
      },
      fidelizacao: {
        pergunta: "Want to cancel your contract but unsure about the minimum term?",
        texto: "For telecoms contracts, estimate for free how much you may have to pay to cancel.",
      },
      servicoNaoPedido: {
        pergunta: "Paying for a service you never asked for?",
        texto: "An amount on your bill you don't recognise, or a service you never took out.",
      },
      semResposta: {
        pergunta: "Already complained and still no useful reply?",
        texto: "Answer 4 questions to see if DoLado can help you take the next step.",
      },
    },
    saberMais: "See how we can help",
    verTodos: "See all the problems we deal with",
  },
  servicos: {
    eyebrow: "Two ways we help",
    titulo: "Got a problem now, or want to avoid surprises?",
    tratar: {
      titulo: "Deal with a problem you already have",
      texto: "For a charge, a cancellation, a refund or anything else that has already happened.",
      itens: [
        "You tell us what happened, in your own words",
        "We prepare the complaint and show it to you before it is sent",
        "We send it with your authorisation and follow up the reply",
      ],
      cta: "Start my case",
    },
    protecao: {
      titulo: "Keep an eye on bills and contracts",
      texto: "For anyone who wants to be warned in time, even without a problem right now. You do not need to open a case.",
      itens: [
        "We compare the bills you send us with the previous ones",
        "We remind you before a promotion or minimum term ends",
        "We flag changes that are worth checking",
      ],
      cta: "Find out about Protection",
    },
    nota:
      "DoLado provides administrative support: we organise the information, prepare the complaint and follow up the reply. We are not a law firm and we do not guarantee the outcome, which depends on the company.",
  },
  comoFunciona: {
    eyebrow: "How it works",
    titulo: "Four steps, from start to finish.",
    passos: [
      {
        titulo: "Tell us what happened",
        texto: "Answer 5 simple questions. Documents are optional: if anything is missing, we will ask you for it later.",
      },
      {
        titulo: "We prepare the complaint",
        texto: "We confirm the facts with you and write a clear text, with a specific request to the company.",
      },
      {
        titulo: "You review and authorise",
        texto: "Read the text at your own pace and ask for changes if you want. We only send it once you authorise it.",
      },
      {
        titulo: "We send it and follow up",
        texto: "We send it through the right channel and e-mail you when there is news or when we need you.",
      },
    ],
    verTodos: "See the process in detail",
  },
  precos: {
    eyebrow: "Prices",
    titulo: "What it costs.",
    texto: "Prices include VAT. You always see the amount before paying.",
    planos: {
      avulso: { necessidade: "I have a problem now", detalhe: "Handles 1 case. No subscription." },
      caso_protecao: {
        necessidade: "I have a problem and want ongoing support",
        detalhe: "1 case per month, plus Protection.",
      },
      protecao: {
        necessidade: "I want to keep an eye on my bills and contracts",
        detalhe: "Bills and dates. Does not include handling cases.",
      },
    },
    verPrecario: "See prices and conditions",
    conhecerProtecao: "What is Protection?",
  },
  ferramentas: {
    eyebrow: "Free tools",
    titulo: "Not sure yet whether there is a problem?",
    texto: "Before you sign up for anything, you can use these tools for free to understand your situation better.",
    semConta: "No account and no e-mail. The result appears straight away on screen.",
    verTodas: "See all the free tools",
  },
  origem: {
    titulo: "On the consumer's side.",
    texto: "DoLado exists to help consumers deal with problems with companies and to notice in time what could become a problem.",
    saberMais: "Find out more about us",
  },
  perguntas: {
    eyebrow: "Frequently asked questions",
    titulo: "Practical questions before you start.",
    verTodas: "See all the questions",
  },
  ctaFinal: {
    eyebrow: "Still not sure where to start?",
    titulo: "First, see if DoLado can help.",
    texto: "Just 4 quick questions, free and with no account. At the end, we show you the next step.",
    acao: "See if DoLado can help",
  },
};
