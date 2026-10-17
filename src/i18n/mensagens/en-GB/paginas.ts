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
      "Choose according to your situation. Single Case is a one-off payment for one case; the subscriptions are monthly. All prices include VAT.",
    necessidades: {
      avulso: { necessidade: "I have a problem right now.", cta: "Start my case" },
      caso_protecao: { necessidade: "I have a problem and want ongoing support.", cta: "Choose Case + Protection" },
      protecao: { necessidade: "I want to keep an eye on my bills and contracts.", cta: "Get Protection" },
    },
    saberProtecao: "What is Protection?",
    condicoes: {
      eyebrow: "Payments and conditions",
      titulo: "How payments work.",
      itens: {
        casoOuSubscricao: {
          titulo: "A single case or a subscription?",
          texto: (avulso: string, casoProtecao: string) =>
            `Single Case (${avulso}) is a one-off payment to handle one case, with no renewal. Case + Protection (${casoProtecao}) is a subscription: you pay every month for as long as you keep it, get 1 case per month and have Protection. If you only have one problem and do not want a monthly payment, Single Case is the simplest option.`,
        },
        renovacao: {
          titulo: "Renewal and cancellation",
          texto:
            "Subscriptions renew automatically every month. You can cancel at any time in your account: there are no further charges and the service continues until the end of the period already paid, with no partial refund for that period.",
        },
        casoPorMes: {
          titulo: "What “1 case per month” means",
          texto: (limite: number) =>
            `With Case + Protection, you get 1 available case each time the monthly payment is confirmed, including the first. Each available case lets you ask DoLado to handle a new problem. Cases you do not use build up to ${limite}; after that, that month's renewal does not add another.`,
        },
        fimSubscricao: {
          titulo: "When the subscription ends",
          texto: (dias: number) =>
            `Cases already opened, the text sent, proofs of submission and the history remain available in your account. Protection stops and so do the reminders. Available cases from the subscription are kept for ${dias} days and can only be used again if you take out Case + Protection again within that time. Unused Single Cases and Extra Cases remain available.`,
        },
        casoExtra: {
          titulo: "Extra Case",
          texto: (preco: string, precoAvulso: string, desconto: number) =>
            `If you have Case + Protection and have used all your available cases, you can have one more case handled for ${preco} instead of ${precoAvulso} (${desconto}% off), as a one-off payment. Your subscription does not change.`,
        },
        conversao: {
          titulo: "Moving from Single Case to a subscription",
          texto: (reembolsoProtecao: string, reembolsoCasoProtecao: string) =>
            `If you bought a Single Case and have not used it yet, you can take out a subscription in your account: part of what you paid covers the first month and the rest is refunded to your original payment method (${reembolsoProtecao} for Protection, ${reembolsoCasoProtecao} for Case + Protection). If you have already used the case, joining is a new purchase.`,
        },
      },
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
  protecao: {
    metadados: {
      titulo: "Protection: keeping an eye on bills and contracts - DoLado",
      descricao:
        "With Protection, DoLado compares the bills you send us, reminds you before promotions and minimum terms end, and flags changes that are worth checking.",
    },
    eyebrow: "Protection",
    titulo: "We keep an eye on your bills and contracts and warn you in time.",
    texto:
      "Protection is for anyone who wants to avoid surprises, even without a problem right now. You send us the bills and, if you have it, the contract for the services you want us to follow. We compare each bill with the previous ones and with the contract, keep track of important dates and e-mail you when something deserves your attention.",
    aderir: "Get Protection",
    verPrecario: "See pricing",
    tresPerguntas: {
      eyebrow: "How it works",
      titulo: "Protection in three questions.",
      blocos: [
        {
          titulo: "What do we keep an eye on?",
          itens: [
            "The bills for the services you send us — for example, broadband and mobile, electricity, gas or water — compared with the previous ones.",
            "The terms of your contract, when you send it to us: monthly fee, promotions and minimum term.",
            "Important dates, such as when a promotion or the minimum term ends.",
            "For telecoms contracts, an estimate of the most you would pay if you cancelled before the minimum term ends.",
          ],
        },
        {
          titulo: "What information and reminders do you get?",
          itens: [
            "In your account, straight after the first document: what we checked, what we found and what we will keep an eye on.",
            "E-mail reminders 60 and 30 days before a promotion or minimum term ends, and on the day itself.",
            "A notice when a bill has a change that is worth checking, after a person at DoLado has reviewed it.",
            "If you wish, notices about relevant changes in the sectors you choose, such as announced price rises.",
          ],
        },
        {
          titulo: "What do you need to give us?",
          itens: [
            "One bill for each service, as a PDF or image. That is enough to get started.",
            "The contract, if you have it, so we can compare the bills with what you signed up for.",
            "If you do not have the documents to hand, the provider's name and a date, such as when the minimum term ends.",
            "The next bills as they arrive: the comparison depends on the documents you send us.",
          ],
        },
      ],
    },
    exemplos: {
      eyebrow: "Examples",
      titulo: "The kind of information you get.",
      texto: "Two fictional examples. The real texts depend on your documents and may differ.",
    },
    limites: {
      eyebrow: "To be clear",
      titulo: "What Protection is not.",
      itens: [
        "It is not insurance: it does not pay for losses or refund any amounts.",
        "It does not access your accounts with providers: we only analyse the documents and information you give us.",
        "It does not monitor in real time or catch every incorrect charge: the analysis depends on you sending us your bills and keeping them up to date.",
        "It does not renegotiate contracts or switch provider for you.",
        "It does not include handling complaints. If we find something and you want DoLado to deal with it, you can do so with Single Case or Case + Protection.",
      ],
    },
    comparar: {
      titulo: "Protection or Case + Protection?",
      protecao: (preco: string) => `<b>Protection (${preco})</b>: keeping an eye on bills and contracts. Does not include handling cases.`,
      casoProtecao: (preco: string, limite: number) =>
        `<b>Case + Protection (${preco})</b>: everything Protection includes, plus 1 case per month to deal with problems, building up to ${limite}.`,
    },
    perguntas: { eyebrow: "Frequently asked questions", titulo: "About Protection.", verTodas: "See all questions" },
    ctaFinal: {
      titulo: "Want to start keeping an eye on your bills?",
      texto: "Get Protection and upload your first bill in your account.",
      acao: "Get Protection",
    },
  },
  comoFunciona: {
    metadados: {
      titulo: "How it works - DoLado",
      descricao:
        "From problem to complaint sent, step by step: tell us what happened, DoLado prepares the complaint, only sends it with your authorisation and follows up the company's reply.",
    },
    eyebrow: "How it works",
    titulo: "From problem to complaint sent, step by step.",
    texto:
      "Tell us what happened. DoLado prepares the complaint, shows you the text and only sends it, through the right channel, once you authorise it. Then we follow up the company's reply with you.",
    tratarCaso: "Start my case",
    verSeAjuda: "See if DoLado can help",
    seuPasso: "Your step",
    dolado: "DoLado",
    passos: [
      {
        titulo: "Tell us what happened",
        texto:
          "A step-by-step form with 5 simple questions: the company, what happened, whether you have already complained and how we can reach you. If you have a bill, a contract or an e-mail, you can attach it; it is not required.",
      },
      {
        titulo: "Create your account and choose an option",
        texto:
          "Your account is where you follow your case. You choose Single Case or Case + Protection and only then pay. We start working on the case once the payment is confirmed.",
      },
      {
        titulo: "We confirm the facts with you",
        texto:
          "Within a maximum of 48 working hours, we get in touch to confirm what happened. If any information or document is missing, we ask you for it by e-mail.",
      },
      {
        titulo: "We prepare the complaint",
        texto:
          "We write a clear text: we describe the facts, set out the applicable rules where there are any and make a specific request to the company.",
      },
      {
        titulo: "You review and authorise sending",
        texto:
          "You receive the text by e-mail and in your account. Read it at your own pace and ask for changes if you want. Without your authorisation, nothing is sent.",
      },
      {
        titulo: "We send it through the right channel",
        texto:
          "For example, Portugal's Electronic Complaints Book (Livro de Reclamações Eletrónico), e-mail or the company's complaints form. The text sent and the proof of submission, where there is one, stay in your case.",
      },
      {
        titulo: "We follow up the reply",
        texto:
          "We analyse the company's reply and e-mail you. If there is a solution, you confirm with us whether the problem has been solved. If not, we prepare a new message where it makes sense, or close the case on our side with a case file and a list of bodies you can consult.",
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
        "Until you authorise it, DoLado organises the information and prepares the text. Sending the complaint (step 6) is when we act on your behalf, and it only happens once you have authorised that version of the text. Whenever there are options to choose from, we explain them to you: the decision is always yours.",
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
