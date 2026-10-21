import type { Traducao } from "../../dicionario.ts";
import type { parceiros as pt } from "../pt-PT/parceiros.ts";

export const parceiros: Traducao<typeof pt> = {
  pagina: {
    metadados: {
      titulo: "Partner Programme: refer clients and distribute Protection | DoLado",
      descricao:
        "Refer clients to DoLado or distribute DoLado Protection through your work. The terms of each partnership are set out in a written agreement. Propose a partnership.",
    },
    eyebrow: "Partner Programme",
    titulo: "Help the people you work with resolve consumer problems.",
    texto:
      "For professionals and companies who are close to consumers — and who want to have an answer when a bill, a contract or a purchase goes wrong. DoLado handles the problem; the partner brings DoLado to the people who need it.",
    cta: "Propose a partnership",
    verModelos: "See the ways to work with us",
    garantias: {
      titulo: "In every partnership",
      itens: [
        "DoLado handles the consumer's problem, from first contact to outcome.",
        "The partner never has access to anyone's cases, bills or contracts.",
        "The terms are set out in a written agreement before we start.",
      ],
    },
    modelosEyebrow: "Partnership models",
    modelosTitulo: "Two ways to work with us",
    modelosTexto:
      "The service is the same: DoLado handles the consumer's problem and Protection keeps an eye on bills and contract dates. Only the way it reaches the people who need it changes.",
    indicacao: {
      titulo: "Referral Partner",
      texto:
        "You recommend DoLado to your clients or introduce companies that may be interested. DoLado takes care of everything else: sign-up, billing, case handling and follow-up.",
      itens: [
        "Your own link and code to share.",
        "A commission under the terms of the partnership agreement, only once the client's payments are confirmed.",
        "You have no access to the cases, bills or contracts of the people you refer.",
        "Each commission is recorded and paid as set out in the agreement.",
      ],
    },
    distribuicao: {
      titulo: "Distribution Partner",
      texto:
        "You bring DoLado Protection to the people you work with: you buy prepaid access and give each person a code — for example, to people who have just bought a home through you.",
      itens: [
        "Prepaid access, for the agreed period.",
        "An individual code to give to each person.",
        "No automatic charge to the person receiving the benefit when the offer ends.",
        "Reports with aggregate figures only — never personal data.",
      ],
    },
    empresas: {
      texto: "Would you like to offer DoLado as a benefit to your employees or customers?",
      ligacao: "Find out about our solutions for businesses.",
    },
    sectorImobiliario: {
      texto: "Do you work in real estate?",
      ligacao: "See how you can recommend DoLado to your clients.",
    },
    passosEyebrow: "From first contact to agreement",
    passosTitulo: "How it works",
    passos: [
      { titulo: "You propose a partnership", texto: "Tell us who you are and how you would like to work with us." },
      { titulo: "We review", texto: "We reply by e-mail within 2 working days at the latest." },
      { titulo: "We agree the terms", texto: "The terms of each partnership are set out in a written agreement." },
    ],
    nota:
      "Contracts, bills and dates are context: what DoLado does is help prevent, detect and resolve the consumer's problem. Commercial terms are agreed with each partner; no earnings are guaranteed.",
  },

  imobiliario: {
    metadados: {
      titulo: "Real estate partners: recommend DoLado to your clients | DoLado",
      descricao:
        "For estate agents and agencies: recommend DoLado to people moving home and help them resolve problems with telecoms, electricity, gas and water.",
    },
    eyebrow: "Partners · Real estate",
    titulo: "Look after your clients, even after you hand over the keys.",
    texto:
      "Recommend DoLado to your clients and help them resolve problems with essential services and avoid surprises in their bills and contracts. For every new eligible customer, you receive a commission.",
    cta: "Propose a partnership",
    verComoFunciona: "How it works",
    quemSomos: {
      titulo: "What DoLado is",
      texto:
        "DoLado is a financial wellbeing company specialising in consumer support. It handles complaints with telecoms, electricity, gas and water providers, incorrect charges, cancellations and refunds — and keeps an eye on bills and contract dates to spot a problem before it grows.",
    },
    situacoesEyebrow: "After the move",
    situacoesTitulo: "When your recommendation helps",
    situacoesTexto: "Moving home affects several contracts at once. Many problems appear in those weeks.",
    situacoes: [
      {
        titulo: "The old home is still being billed",
        texto: "The client asked to cancel, but the provider keeps sending bills for the old address.",
      },
      {
        titulo: "A charge for leaving early",
        texto: "The provider asks for a fee to cancel because of the move, and the client does not know whether it is right.",
      },
      {
        titulo: "The first bill at the new home",
        texto: "The electricity, gas or water bill is much higher than expected, or based on estimated readings.",
      },
      {
        titulo: "A promotion that ends",
        texto: "Months after the move, the price goes up because a promotion ended without the client noticing.",
      },
    ],
    servicosEyebrow: "What you can recommend",
    servicosTitulo: "Any DoLado service",
    servicosTexto: "People see every service and choose the one they need. You do not have to choose for them.",
    servicos: [
      {
        titulo: "Handling a case",
        texto: "When there is already a problem: DoLado prepares the complaint, sends it and follows it up until there is an outcome.",
      },
      {
        titulo: "Protection",
        texto: "To prevent problems: DoLado keeps an eye on bills and contract dates and lets the customer know when something changes or is about to end.",
      },
      {
        titulo: "Case + Protection",
        texto: "Both together: ongoing monitoring and one case handled each month.",
      },
    ],
    verPrecario: "See services and prices",
    passosEyebrow: "The partnership",
    passosTitulo: "How it works",
    passos: [
      { titulo: "You propose a partnership", texto: "Fill in the form. We reply by e-mail within 2 working days at most." },
      { titulo: "We agree the conditions", texto: "The conditions are set out in a written agreement before you start." },
      { titulo: "You receive your link", texto: "A link and a code of your own, to share with people who need help." },
      { titulo: "You follow the results", texto: "In the partner area you see how many people came through you and the status of your commissions." },
    ],
    comissoesEyebrow: "Commissions",
    comissoesTitulo: "How they are calculated and paid",
    comissoes: [
      "You receive a commission for every new customer who subscribes to Protection or Case + Protection through your recommendation.",
      "The commission becomes eligible once the customer's first subscription has the number of paid monthly payments set out in the agreement. Free periods do not count.",
      "One commission per customer, even if they buy other services or change plan. Single Case purchases do not earn a commission.",
      "If the subscription ends early, or the payment is refunded, the commission is cancelled.",
      "DoLado approves commissions and pays by bank transfer. The amounts are set out in the partnership agreement.",
    ],
    comissoesNota:
      "The customer pays the normal price and gets no discount. When you recommend DoLado, say that you are a DoLado partner and receive a commission.",
    perguntasEyebrow: "Frequently asked questions",
    perguntasTitulo: "Before you propose a partnership",
    perguntas: [
      {
        id: "ver-casos",
        pergunta: "Will I see my clients' cases or bills?",
        resposta:
          "No. In the partner area you only see figures: how many people came through you and the status of your commissions. Never names, cases, bills or contracts.",
      },
      {
        id: "desconto",
        pergunta: "Does my client get a discount?",
        resposta: "No. People who come through your recommendation pay the normal price. The commission is paid by DoLado and is not charged to the customer.",
      },
      {
        id: "como-recomendar",
        pergunta: "How should I recommend DoLado?",
        resposta:
          "Personally, to people you know who may need it. Do not send bulk messages or use contact lists without permission, and always say that you receive a commission.",
      },
      {
        id: "conta",
        pergunta: "Do I need a DoLado account?",
        resposta: "Yes, to sign in to the partner area. The account is free and does not commit you to buying any service.",
      },
      {
        id: "quanto",
        pergunta: "How much will I receive?",
        resposta: "The amounts and conditions are set out in the partnership agreement. There is no guaranteed income: it depends on who chooses DoLado.",
      },
    ],
    ctaFinalTitulo: "Would you like to recommend DoLado to your clients?",
    ctaFinalTexto: "Tell us who you are. We reply within 2 working days at most.",
  },

  candidatura: {
    eyebrow: "Propose a partnership",
    titulo: "Tell us who you are",
    texto: "It only takes a few minutes. We reply by e-mail within 2 working days at the latest.",
    nome: "Name",
    email: "E-mail",
    empresa: "Company (optional)",
    tipo: "What kind of partnership are you looking for?",
    tipos: {
      indicacao: "Referral Partner",
      distribuicao: "Distribution Partner",
      ambos: "Both",
    },
    descricao: "Tell us a little about what you do and why you are interested",
    aceitar:
      "I have read the privacy information and agree that DoLado may use this data to review my application and contact me about it.",
    privacidade: "Privacy Policy",
    botao: "Send application",
    aEnviar: "Sending…",
    enviada: {
      titulo: "We have received your application.",
      texto: "We reply by e-mail within 2 working days at the latest.",
    },
    erros: {
      nome: "Please enter your name.",
      email: "Please enter a valid e-mail.",
      tipo: "Please choose the type of partnership.",
      descricao: "Please tell us a little more (at least 10 characters).",
      aceitar: "To continue, please agree to the processing of your application data.",
      limite: "We have already received several applications from this e-mail today. Please try again tomorrow or write to us.",
      indisponivel: "Applications are not open at the moment.",
      erro: "We could not send your application. Please try again in a few minutes.",
    },
  },

  codigo: {
    campo: "Partner code (optional)",
    resumo: "Do you have a partner code?",
    ajuda: "If a DoLado partner gave you a code, enter it here.",
    invalido: "This partner code is not valid. Please check it or leave the field empty.",
  },

  emails: {
    recebida: {
      assunto: "We have received your Partner Programme application",
      titulo: "We have received your application",
      texto: "Thank you for your interest in the DoLado Partner Programme.",
      prazo: "We will review it and reply by e-mail within 2 working days at the latest.",
    },
    aprovada: {
      assunto: "Your Partner Programme application has been approved",
      titulo: "Welcome to the Partner Programme",
      texto: "Your application has been approved.",
      codigo: (codigo: string) => `Your partner code is ${codigo}.`,
      ligacao: "You can share this link with anyone you would like to recommend DoLado to:",
      comoFunciona:
        "Anyone who arrives through your link, or enters your code when creating an account or before paying, is linked to you. You have no access to these people's cases, bills or contracts.",
      condicoes: "The commercial terms are set out in the partnership agreement. If you have any questions, reply to this e-mail.",
      distribuicao: "We will contact you to agree the Protection packages for your clients or staff.",
    },
    pagamento: {
      assunto: "We have recorded the payment of your commissions",
      titulo: "Commission payment",
      texto: (comissoes: number) =>
        comissoes === 1 ? "We have recorded the payment of 1 commission." : `We have recorded the payment of ${comissoes} commissions.`,
      valor: "Commissions (excl. VAT)",
      iva: "VAT",
      transferido: "Amount transferred",
      referencia: "Reference",
      data: "Date",
    },
    acessoArea: {
      assunto: "Your DoLado partner area",
      titulo: "Your partner area",
      texto: "You can now follow your recommendations and commissions in the partner area.",
      entrar: "Sign in with the account for this e-mail address and open “Partner area”:",
      privacidade: "For privacy, the area only shows figures: never the names, contact details, cases, bills or contracts of the people you recommended.",
    },
  },
};
