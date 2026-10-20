import type { Traducao } from "../../dicionario.ts";
import type { marketing as pt } from "../pt-PT/marketing.ts";

export const marketing: Traducao<typeof pt> = {
  ferramentas: {
    calculadora: {
      titulo: "How much does it cost to cancel before the end of a minimum term?",
      texto:
        "For telecoms contracts: using your contract's dates and amounts, estimate the most you may have to pay to cancel before the minimum term ends.",
      cta: "Estimate what you may pay",
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
      comprovativo: "Proof available in your account",
      lema1: "Less red tape.",
      lema2: "More time for you.",
    },
    fidelizacao: {
      calculada: "Calculated from your contract details",
      encargo: "Most you may pay to cancel",
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
  exemplos: {
    etiqueta: "Fictional example",
    reclamacao: {
      titulo: "What a text prepared by DoLado looks like",
      aviso: "Fictional example: company, dates, references and amounts are made up.",
      assunto: "Subject: Monthly fee charged after cancellation",
      paragrafos: [
        "On 3 March, I asked to cancel my broadband service (customer no. 000000). The company confirmed the request by e-mail on the same day.",
        "The April and May bills still include the monthly fee of €32.90, a total of €65.80.",
        "I ask for these charges to be cancelled and for the €65.80 to be refunded to the account it was paid from.",
      ],
      nota:
        "In a real case, the text is written from the facts and documents of your case, includes the applicable rules where there are any, and is only sent once you authorise it.",
    },
    avisoPromocao: {
      titulo: "Example of a reminder",
      assunto: "The promotion on your service ends in 30 days",
      linhas: [
        { rotulo: "Service", valor: "Broadband and TV" },
        { rotulo: "Promotion ends", valor: "15/12/2026" },
        { rotulo: "Monthly fee with promotion", valor: "€29.90" },
      ],
      texto: "You still have time to check how much you will pay after this date and decide what you want to do.",
    },
    alteracaoFatura: {
      titulo: "Example of a change on a bill",
      antes: "October bill",
      agora: "November bill",
      valorAntes: "€32.90",
      valorAgora: "€39.90",
      diferenca: "Difference: +€7.00",
      texto:
        "The monthly fee went up and we found nothing in your contract details that explains the difference. It may be worth checking with the company.",
      nota: "Before we tell you, a person at DoLado reviews each situation.",
    },
    resumoMensal: {
      titulo: "Example of a monthly summary",
      assunto: "Your Protection in September",
      intro: "In September, DoLado checked 2 bills and kept 2 date alerts active. We found no change that needs your attention.",
      estado: "All being followed",
      estadoTexto:
        "Based on the documents and dates you gave us, there is nothing that needs your attention right now. We keep an eye on things for you.",
      acompanhamosTitulo: "What we followed in September",
      acompanhamos: [
        "Bill comparison — Broadband and TV and Electricity",
        "Broadband and TV — promotion ends on 15/12/2026",
        "Broadband and TV — minimum term ends on 14/03/2027",
      ],
      proximaRotulo: "Next relevant date",
      proxima: "15/12/2026 — end of the Broadband and TV promotion",
      nota: "Fictional example. The real summary is based on the documents and dates you gave us.",
    },
  },
  origem: {
    fotografia: "Thiago Pereira, founder of DoLado",
    eyebrow: "Our story",
    titulo: "“I have been through this myself.”",
    paragrafos: [
      "My telecoms provider put up the price of the service I had, and I wanted to leave. I very nearly paid the early termination fee. Then I noticed that the notice of the price rise had reached me only 28 days before the change — and that is what allowed me to get the termination fee cancelled.",
      "I realised that many people end up paying without checking. Not because they don't care, but because it is not always clear what to check, who to write to or what to do next.",
      "That is why I created DoLado: to help put each problem in writing, calmly and carefully, so that nobody has to deal with it alone.",
    ],
    assinatura: "— Thiago Pereira, founder of DoLado",
  },
};
