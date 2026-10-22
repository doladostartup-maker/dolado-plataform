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
      titulo: "I need help sorting out a problem",
      texto: "We prepare the complaint with you, only send it with your authorisation and follow up the company's reply.",
      cta: "Start my case",
    },
    protecao: {
      titulo: "I want to keep track of my bills and contracts",
      texto:
        "With Protection, we compare the bills you send us, keep an eye on key dates and let you know in time. Protection on its own does not include handling complaints.",
      cta: "Discover Protection",
    },
  },
  beneficio: {
    titulo: "More control over your spending. More peace of mind every day.",
    paragrafos: [
      "An unexpected charge, a deadline that slipped by or a refund that never arrives can weigh on your budget and take up far too much time.",
      "DoLado keeps track of your bills and contracts and helps sort out consumer problems, so you know what is happening and can act in time.",
    ],
    nota: "Tracking bills and contracts is part of Protection. Complaints are handled with Single Case or Case + Protection.",
    verPrecario: "Compare the options",
  },
  empresas: {
    eyebrow: "For businesses",
    titulo: "Financial wellbeing for your team.",
    texto:
      "Your company can offer DoLado to employees or customers. Each person deals with their case directly with us, and the company does not see individual cases.",
    cta: "Find out about the solution for businesses",
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
  diagnostico: {
    hero: {
      titulo: "Understand what you are paying.",
      tituloSegundo: "And what needs your attention.",
      texto: "We help you understand your bills and contracts, spot what needs attention and know what to do next.",
      cartaoTexto: "We show you the amounts, dates and conditions written in the document.",
      problemaTitulo: "Already have a problem to sort out?",
      problemaTexto: "We prepare the complaint with you and follow the company's reply.",
      problema: "Start my case",
      exemplo: {
        rotulo:
          "Illustrative example of checking a €62.49 bill: a €39.99 monthly fee, additional services, extra calls and a late payment fee, and what Protection keeps an eye on in the following bills.",
        etiqueta: "Illustrative example",
        documento: "Telecoms bill",
        gratuito: "In the free check",
        resumo: [
          { rotulo: "Total due", valor: "€62.49" },
          { rotulo: "Monthly fee", valor: "€39.99" },
        ],
        diferenca: "This bill is €22.50 more than the monthly fee.",
        diferencaNota: "We show you where the difference comes from.",
        linhasTitulo: "Where the total comes from",
        linhas: [
          { descricao: "Package monthly fee", valor: "€39.99", pontual: false },
          { descricao: "Additional services", valor: "€12.00", pontual: false },
          { descricao: "Extra calls and data", valor: "€8.50", pontual: true },
          { descricao: "Late payment fee", valor: "€2.00", pontual: true },
        ],
        habitual: "every month",
        pontual: "this time only",
        soma: "The lines add up to the bill total.",
        calculo: "4 months left until the end of the minimum term.",
        protecao: "With Protection",
        protecaoTitulo: "You don't have to do these checks on your own.",
        protecaoTexto: "We compare each bill you send us with the previous ones and with your contract.",
        protecaoPontos: [
          "A new charge that repeats (like the additional services in this example, if they appear for the first time), an increase or a possible duplicate charge is reviewed by a person at DoLado before we tell you.",
          "We remind you 60 and 30 days before your minimum term and promotions end.",
        ],
        cta: "Find out about Protection",
      },
    },
    situacoesTitulo: "Situations where DoLado can help",
    comoFunciona: {
      titulo: "It's easy to have someone on your side.",
      texto: "Start for free. Find out what needs your attention. And, if you like, stay protected.",
      passo: "Step",
      gratuito: "Free",
      exemplo: "Illustrative example",
      carregar: {
        titulo: "Upload a bill or contract.",
        texto: "No sign-ups or complicated forms. Just choose a PDF to get started.",
        rotulo: "Illustrative example: the file bill.pdf has been received, with no account, no e-mail and no card.",
        ficheiro: "bill.pdf",
        detalhe: "PDF · 2 pages",
        estado: "Document received",
        sem: ["No account", "No e-mail", "No card"],
      },
      descobrir: {
        titulo: "Find out what might be slipping past you.",
        texto:
          "DoLado reads your bill, shows where the total comes from, separates what you pay every month from what was charged just this once and works out the dates that matter.",
        rotulo:
          "Illustrative example of the result of checking a €54.30 bill: a €42.00 monthly fee, €12.30 more than the monthly fee, explained by equipment rental and calls to special numbers; the promotion ends in 2 months.",
        documento: "Telecoms bill",
        resumo: [
          { rotulo: "Total due", valor: "€54.30" },
          { rotulo: "Monthly fee", valor: "€42.00" },
        ],
        diferenca: "€12.30 more than the monthly fee.",
        linhas: [
          { descricao: "Package monthly fee", valor: "€42.00", pontual: false },
          { descricao: "Equipment rental", valor: "€4.50", pontual: false },
          { descricao: "Calls to special numbers", valor: "€7.80", pontual: true },
        ],
        habitual: "every month",
        pontual: "this time only",
        soma: "The lines add up to the total.",
        data: "The promotion ends in 2 months.",
        nota: "We only show what is in the document and the sums worked out from those amounts. We draw no conclusions about the company.",
      },
      acompanhar: {
        titulo: "You don't have to check everything on your own.",
        texto:
          "With DoLado Protection, your bills and contracts are followed continuously, with checks and alerts about situations that matter.",
        etiqueta: "With Protection",
        nota: "We compare each bill you send us with the previous ones and with your contract. Anything that needs attention is reviewed by a person at DoLado before we tell you.",
        rotulo:
          "Illustrative example of what Protection sends you: a reminder 30 days before the promotion ends, a monthly fee rising from €42.00 to €47.00 reviewed by a person at DoLado, and the monthly summary.",
        avisos: [
          { titulo: "30 days until your promotion ends.", meta: "Date reminder · also at 60 days and on the day itself" },
          { titulo: "Your monthly fee went from €42.00 to €47.00.", meta: "Compared with the previous bill · reviewed by a person at DoLado" },
          { titulo: "Your monthly summary: 2 bills followed.", meta: "Monthly e-mail with the next important date" },
        ],
        cta: "Find out about Protection",
      },
    },
    analisa: {
      titulo: "What we read in your document",
      setores: "Bills and contracts for telecoms, electricity, gas and water.",
      itens: [
        "How much you are paying and what you are being charged for.",
        "When the minimum term or the promotion ends.",
        "The contract terms: monthly price, length and benefits.",
        "What we couldn't confirm in the document.",
      ],
    },
    protecao: {
      titulo: "With Protection, we keep an eye on things for you",
      itens: [
        { titulo: "We let you know in time", texto: "60 and 30 days before your minimum term and promotions end, and on the day itself." },
        {
          titulo: "We compare your bills",
          texto: "Each new bill is compared with the previous ones. Anything that needs attention is reviewed by a person at DoLado before we tell you.",
        },
        { titulo: "A summary every month", texto: "An e-mail with what we kept an eye on and the next important date." },
      ],
      cta: "Find out about Protection",
    },
    reclamacoes: {
      titulo: "Need help with a problem?",
      texto: "We prepare the complaint with you, only send it with your authorisation and follow up the company's reply.",
      nota: "Complaints are handled with Single Case or Case + Protection. They are not included in Protection on its own.",
      cta: "Start my case",
    },
    oferta: {
      titulo: "Try Protection for 30 days",
    },
    confianca: {
      titulo: "No small print",
      itens: [
        "You can see the result without creating an account and without a bank card.",
        "When we find something in a bill, a person at DoLado reviews it before we tell you.",
        "We never send anything to a company without your authorisation.",
      ],
      ligacao: "How we work",
    },
    perguntas: {
      titulo: "Frequently asked questions",
      itens: [
        {
          id: "registo",
          pergunta: "Do I need an account to check a document?",
          resposta:
            "No. You can upload the bill or the contract and see the result straight away. You only create an account if you want to save the result or continue with Protection.",
        },
        {
          id: "documento",
          pergunta: "What happens to my document?",
          resposta:
            "It is stored in a private space and read by an artificial intelligence system only to show you the result. If you don't create an account, it is deleted after 7 days.",
        },
        {
          id: "gratuito",
          pergunta: "Is the check really free?",
          resposta: "Yes, and we don't ask for a bank card. You can also try Protection for 30 days at no cost.",
        },
        {
          id: "parecer",
          pergunta: "Is the result legal advice?",
          resposta:
            "No. We show you what the document says and do simple calculations, such as the days left until the minimum term ends. If you have a problem, we can help you deal with it.",
        },
        {
          id: "documentos",
          pergunta: "Which documents can I check?",
          resposta: "Bills and contracts for telecoms, electricity, gas and water, as a PDF.",
        },
      ],
      todas: "See all questions",
    },
    ctaFinal: {
      titulo: "See what your bill says",
    },
  },
};
