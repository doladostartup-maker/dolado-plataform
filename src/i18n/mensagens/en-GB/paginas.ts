import type { Traducao } from "../../dicionario.ts";
import type { paginas as pt } from "../pt-PT/paginas.ts";

export const paginas: Traducao<typeof pt> = {
  precario: {
    metadados: {
      titulo: "Pricing: Protection, Case + Protection and Single Case - DoLado",
      descricao:
        "Protection to keep an eye on your bills and contracts, Case + Protection to also deal with problems, or Single Case for one case with no subscription. Prices include VAT.",
    },
    eyebrow: "Pricing",
    titulo: "What kind of help do you need?",
    texto: () =>
      "Protection keeps an eye on your bills and contracts; Case + Protection adds help with problems; Single Case deals with one case, with a one-off payment. The subscriptions are monthly. All prices include VAT.",
    necessidades: {
      avulso: { necessidade: "I have a problem right now.", cta: "Start my case" },
      caso_protecao: { necessidade: "I have a problem and want ongoing support.", cta: "Choose Case + Protection" },
      protecao: { necessidade: "I want to keep an eye on my bills and contracts.", cta: "Get Protection" },
    },
    seCancelar: {
      avulso: "No subscription to cancel: the case is followed up until the process ends.",
      caso_protecao:
        "If you cancel: Protection continues until the end of the paid period. A subscription case being followed up only continues if you keep your subscription until that case is finished.",
      protecao: "If you cancel: tracking and reminders continue until the end of the paid period and then stop.",
    },
    seCancelarRotulo: "Cancellation",
    comparacao: {
      eyebrow: "Compare the options",
      titulo: "The three options side by side.",
      criterio: "What you need to know",
      linhas: {
        indicado: "Best for",
        pagamento: "Payment",
        acompanhamento: "Tracking of bills and contracts",
        casos: "Case handling",
        casoEmCurso: "Case in progress when the subscription ends",
      },
      valores: (limite: number) => ({
        avulso: {
          indicado: "Sorting out a single problem, with no subscription",
          pagamento: "One-off payment, no renewal",
          acompanhamento: "Not included",
          casos: "1 case",
          casoEmCurso: "Does not apply: a Single Case is followed up until the end",
        },
        caso_protecao: {
          indicado: "Sorting out a problem now and keeping your bills and contracts tracked",
          pagamento: "Monthly, renews automatically",
          acompanhamento: "Included",
          casos: `1 case per month, building up to ${limite}`,
          casoEmCurso:
            "You can keep your subscription until the case is finished. If you cancel, follow-up on that case ends at the end of the paid period",
        },
        protecao: {
          indicado: "Keeping track of bills and contracts, without a problem right now",
          pagamento: "Monthly, renews automatically",
          acompanhamento: "Included",
          casos: "Not included",
          casoEmCurso: "Does not apply: no cases included",
        },
      }),
      nota: "You can cancel a subscription at any time in your account, with no further charges. The full conditions are below and in the Terms.",
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
            `Cases already opened, the text sent, proofs of submission and the history remain available in your account. Protection stops and so do the reminders. If you have a subscription case being followed up, you can keep your subscription until the case is finished; if you cancel, follow-up on that case ends at the end of the paid period (Single Cases and Extra Cases are not affected). Available cases from the subscription are kept for ${dias} days and can only be used again if you take out Case + Protection again within that time. Unused Single Cases and Extra Cases remain available.`,
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
    gratuitoPago: {
      eyebrow: "Free and paid",
      titulo: "What is free and what is paid.",
      analise: {
        titulo: "Free initial check",
        texto: "Check a bill or contract with no account and no bank card. It is not a subscription or a trial period, and it does not start any payment.",
      },
      protecaoGratuita: {
        titulo: "30 days of free Protection",
        texto: "If you have never had Protection: you activate it in your account, with no bank card, and the period ends on its own, with no charge. To continue, you choose to subscribe to Protection.",
      },
      subscricao: {
        titulo: "Monthly subscription",
        texto: "Protection and Case + Protection: paid monthly, with automatic renewal. You can cancel at any time in your account.",
      },
      pontual: {
        titulo: "One-off payment",
        texto: "Single Case (and Extra Case, for Case + Protection subscribers): pay once to deal with one case, with no subscription.",
      },
      analisar: "Check a document",
    },
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
    ctaFinalAnalise: {
      eyebrow: "Still not sure which to choose?",
      titulo: "Start with a free check of your document.",
      texto: "See what your bill or contract says before you decide. No account and no bank card.",
      acao: "Check a document",
    },
  },
  protecao: {
    metadados: {
      titulo: "Protection: keeping an eye on bills and contracts - DoLado",
      descricao:
        "With Protection, DoLado compares the bills you send us, reminds you before promotions and minimum terms end, flags changes worth checking and sends a monthly summary.",
    },
    analise: {
      comecar: "Or start by checking a document for free",
      eyebrow: "Free check or Protection?",
      titulo: "The check shows you one document. Protection follows it over time.",
      gratuita: {
        titulo: "Free check",
        itens: [
          "One document at a time, with no account and no bank card.",
          "Shows the amounts, dates and terms in the document.",
          "Does not compare it with previous bills or send reminders.",
          "If you don't create an account, the document and the result are deleted after 7 days.",
        ],
      },
      protecao: {
        titulo: "Protection",
        itens: [
          "Follows your services month by month.",
          "Compares each new bill with the previous ones and with your contract.",
          "Reminds you before your minimum term and promotions end and sends a monthly summary.",
          "Anything that needs attention is reviewed by a person at DoLado before we tell you.",
        ],
      },
      encontramos: {
        titulo: "When we find something",
        texto:
          "If a person at DoLado confirms that a change needs attention, we let you know by e-mail and show you, in your account, the previous amount, the current one and the difference. You can check with the company or, if you want DoLado to deal with the problem, open a case with the Single Case or Case + Protection.",
      },
      analisar: "Check a document",
    },
    eyebrow: "Protection",
    titulo: "We keep an eye on your bills and contracts and warn you in time.",
    texto:
      "Protection is for anyone who wants to avoid surprises, even without a problem right now. You send us the bills and, if you have it, the contract for the services you want us to follow. We compare each bill with the previous ones and with the contract, keep track of important dates and let you know when something deserves your attention.",
    aderir: "Get Protection",
    verPrecario: "See pricing",
    dependeDocumentos: "The analysis depends on the documents and information you send us.",
    recebe: {
      eyebrow: "What you get",
      titulo: "What Protection gives you.",
      itens: [
        {
          titulo: "Information about changes in your bills",
          texto: "You know what has changed from one bill to the next: the monthly charge, a new charge or a promotion that no longer appears.",
          como:
            "We compare each bill you send us with the previous ones and, if you send us the contract, with the agreed terms. Straight after the first document, your account shows what we checked, what we found and what we will keep an eye on.",
        },
        {
          titulo: "Alerts about situations that need attention",
          texto: "You get an e-mail when a change is worth checking — for example, an increase the contract details don't explain or a possible duplicate charge.",
          como:
            "Someone at DoLado reviews each situation before we alert you. If you like, you can also get alerts about relevant changes in the sectors you choose, such as announced price rises.",
        },
        {
          titulo: "Reminders of important contract dates",
          texto: "You won't miss the end of a promotion or the end of a minimum term.",
          como:
            "We send reminders 60 and 30 days before and on the day itself. For telecoms contracts, we also show an estimate of the most you would pay if you cancelled before the minimum term ends.",
        },
        {
          titulo: "Monthly summary of what we followed",
          texto: "At the start of each month, you get a summary of what we followed — even when everything is in order.",
          como:
            "The summary shows the bills checked, the changes we told you about, what we are still following and the next important date.",
        },
      ],
      comoRotulo: "How it works",
    },
    resumo: {
      eyebrow: "Monthly summary",
      titulo: "Even when there is nothing to sort out, you know what we checked.",
      paragrafos: [
        "Most months bring no problems. Even so, the monthly summary shows you the work done: which bills we compared, which dates we are following and which one comes next.",
        "When something needs your attention, the summary says so too — after the situation has been reviewed by someone at DoLado.",
      ],
    },
    precisa: {
      titulo: "What do you need to give us?",
      itens: [
        "One bill for each service, as a PDF or image. That is enough to get started.",
        "The contract, if you have it, so we can compare your bills with what you signed up for.",
        "If you don't have documents to hand, the provider's name and a date, such as when the minimum term ends.",
        "Your next bills as they arrive: the comparison depends on the documents you send us.",
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
    analise: {
      metadados: {
        titulo: "How it works: free check, Protection and complaints - DoLado",
        descricao:
          "Check a bill or contract for free, keep an eye on your services with Protection and, if a problem comes up, DoLado deals with the complaint with you.",
      },
      titulo: "Start with your document. Count on us when a problem comes up.",
      texto:
        "DoLado helps you understand your bills and contracts, keeps an eye on what needs attention with Protection and, if you already have a problem with a company, prepares the complaint with you.",
      analisar: "Check a document",
      principal: {
        eyebrow: "Main route",
        titulo: "Check and stay protected.",
        texto: "To understand what you are paying and not miss the dates and changes that matter.",
        gratuito: "Free",
        comProtecao: "With Protection",
        passos: [
          {
            titulo: "Send us your document",
            texto:
              "Upload a telecoms, electricity, gas or water bill or contract as a PDF. You don't need to create an account or leave your e-mail address.",
          },
          {
            titulo: "Understand the result",
            texto:
              "We show you the amounts, dates and terms in the document: where the total comes from, what you pay every month and how long until your minimum term or promotion ends. We also tell you what we couldn't confirm.",
          },
          {
            titulo: "Stay protected",
            texto:
              "With Protection, we compare each new bill with the previous ones and with your contract, remind you 60 and 30 days before your minimum term and promotions end and send you a summary every month.",
          },
        ],
        quemFazTitulo: "What happens on its own and what depends on you",
        quemFaz: [
          "<b>Nothing to do:</b> reading the document you upload, the date reminders and the Protection monthly summary.",
          "<b>Up to you:</b> sending us the following bills as they arrive. DoLado does not access your accounts with your providers, so we can only compare the documents you send us.",
          "<b>Reviewed by a person:</b> a change that needs attention is reviewed by a person at DoLado before we tell you.",
        ],
        conhecerProtecao: "Find out about Protection",
      },
      complementar: {
        eyebrow: "Additional route",
        titulo: "Sort out a problem.",
        texto: "For when you already have a specific situation with a company. At each step, we show who acts: you or DoLado.",
      },
      ctaFinal: {
        titulo: "Where would you like to start?",
        texto: "Check a document for free or tell us about the problem you have with a company.",
      },
    },
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
          "Within a maximum of 2 working days, we get in touch to confirm what happened. If any information or document is missing, we ask you for it by e-mail.",
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
      "Get a clearer picture of minimum terms, cancellation charges and changes to your contracts before you decide. Use these DoLado tools to understand what is going on and what the next step could be.",
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
        "Answers about Protection and keeping an eye on your bills and contracts, our plans, consumer complaints and how DoLado handles your documents.",
    },
    analise: {
      texto: "Find answers about the free document check, Protection, our plans and help with sorting out a problem with a company.",
      ctaTitulo: "Where would you like to start?",
      ctaTexto: "Check a document for free or tell us about the problem you have with a company.",
      analisar: "Check a document",
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
