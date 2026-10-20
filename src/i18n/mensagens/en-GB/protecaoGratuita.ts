import type { Traducao } from "../../dicionario.ts";
import type { protecaoGratuita as pt } from "../pt-PT/protecaoGratuita.ts";

export const protecaoGratuita: Traducao<typeof pt> = {
  oferta: {
    destaque: "30 days of Protection free",
    texto:
      "Spot changes in your bills and get reminders before promotions and minimum terms end, so you can act before you overpay.",
    micro: "No bank card. No commitment.",
    cta: "Try 30 days free",
    depois: (preco: string) => `Then ${preco}/month, only if you decide to continue.`,
  },

  precario: {
    selo: "30 days free",
    preco: "€0",
    unidade: "for the first 30 days",
    depois: (preco: string) => `Then ${preco}/month, if you decide to continue`,
    garantias: ["No bank card", "No commitment", "No automatic charge at the end of the 30 days"],
    subscreverJa: (preco: string) => `Subscribe now for ${preco}/month`,
    condicao: {
      titulo: "Free Protection for 30 days",
      texto: (preco: string) =>
        `If you have never had Protection, you can try it once for 30 days, with no bank card. The period starts when you activate it and ends on its own, with no charge. To continue, you choose to subscribe to Protection for ${preco}/month; if you subscribe during the free period, the first charge is only made when it ends. It does not apply to Case + Protection or Single Case.`,
    },
  },

  ativar: {
    metadados: "Try Protection for free",
    eyebrow: "Protection · 30 days free",
    titulo: "Try Protection for 30 days",
    texto:
      "Protection checks whether your bills match the terms you signed up to: it compares each bill with the contract you add and with your previous bills, to spot price increases or charges you did not expect. It also sends reminders before promotions and minimum terms end, so you can act before a problem grows.",
    resumoTitulo: "How it works",
    resumo: {
      inicio: "It starts today, when you confirm.",
      fim: (data: string) => `It ends on ${data}.`,
      semCartao: "We do not ask for a bank card or any other payment method.",
      semCobranca: (preco: string) =>
        `At the end of the 30 days, free Protection ends with no charge. To continue, you will need to choose to subscribe for ${preco}/month.`,
      semCasos: "It does not include case handling.",
      umaVez: "It can only be used once per person.",
    },
    aceitar: " I understand that free Protection ends after 30 days with no charge.",
    botao: "Activate free Protection",
    aAtivar: "Activating…",
    semSessao: "To activate free Protection, create an account or sign in. We do not ask for a bank card.",
    criarConta: "Create account",
    iniciarSessao: "Sign in",
    irParaProtecao: "Go to Protection",
    verPlanos: "See the plans",
    subscrever: (preco: string) => `Subscribe to Protection for ${preco}/month`,
    motivos: {
      ativa: "Your free Protection is already active.",
      ja_utilizada: "Free Protection can only be used once. You can continue with Protection whenever you like.",
      ja_teve_protecao: "Free Protection is for people who have not had Protection before. You can subscribe again whenever you like.",
      protecao_ativa: "You already have Protection active in your subscription.",
      email_nao_confirmado:
        "Please confirm your e-mail first: we sent you a link when you created your account. Then come back to this page.",
      conta_invalida: "This account cannot activate free Protection.",
      indisponivel: "Free Protection is not available at the moment.",
      erro: "We could not activate free Protection. Please try again in a few minutes.",
      aceitarTermos: "To continue, please accept the Terms and Conditions.",
    },
  },

  portal: {
    titulo: "Your free Protection is active.",
    faltam: (n: number) => (n === 1 ? "1 day left." : `${n} days left.`),
    inicio: "Start",
    fim: "End",
    diasRestantes: "Days left",
    continuar: (preco: string) => `Continue with Protection for ${preco}/month.`,
    cobrancaNoFim: (data: string) => `If you subscribe now, the first charge is only made on ${data}, when the free period ends.`,
    cobrancaHoje: "If you subscribe now, the first charge is made on the day you subscribe.",
    semCobranca: "If you do nothing, free Protection ends with no charge.",
    cta: "Continue with Protection",
    terminouTitulo: "Your free Protection has ended.",
    terminou: (data: string, meses: number) =>
      `It ended on ${data}, with no charge. Your services and documents are kept for ${meses} months and become active again if you subscribe to Protection within that time.`,
    aderir: "Subscribe to Protection",
    estadoPlano: "Free Protection",
    estadoAtiva: "Active",
    valor: {
      titulo: "What Protection has done for you",
      ultimaFatura: "Last bill analysed",
      ultimaVerificacao: "Last check",
      alertas: "Active date reminders",
      proximaData: "Next relevant date",
      diferencas: "Changes identified",
      nenhuma: "None so far",
      semDocumentos:
        "You have not added any documents yet. Add a bill or a contract so that DoLado can check your current situation and keep track of the dates that matter.",
      adicionar: "Add a document",
    },
    banner: {
      titulo: "Try Protection for 30 days, with no bank card.",
      texto: "No commitment and no automatic charge at the end.",
      cta: "Try 30 days free",
    },
  },

  confirmarCompra: {
    cobrancaNoFim: (data: string) =>
      `You are on free Protection: nothing is charged now. The first charge is made on ${data}, when the free period ends. You can cancel before that date with no charge.`,
    cobrancaHoje: "You are on free Protection: as there are less than 2 days left, the first charge is made today.",
    casoProtecao: "Free Protection ends when this subscription starts.",
  },

  pagamento: {
    rotuloPrimeiraCobranca: "First charge",
    primeiraCobranca: (preco: string, data: string) => `${preco} on ${data}`,
    nota: "You subscribed during free Protection: nothing was charged now. The first charge is made at the end of the free period and then every month until you cancel.",
  },

  emails: {
    botaoPortal: "Open Protection",
    botaoDocumento: "Add a document",
    botaoAderir: "Continue with Protection",
    semCobranca: "There will be no automatic charge.",
    lembretes: "Don't want to receive these reminders?",
    lembretesLigacao: "Unsubscribe",
    d0: {
      assunto: "Your free Protection is active",
      titulo: "Your free Protection is active",
      texto: (inicio: string, fim: string) => `Your free DoLado Protection is active from ${inicio} to ${fim}.`,
      passo:
        "To get started, add a bill or a contract in the portal: we check your current situation and start sending reminders before promotions and minimum terms end.",
      condicoes: (preco: string) =>
        `We do not ask for a bank card. At the end of the 30 days, free Protection ends with no charge; it only continues if you decide to subscribe for ${preco}/month.`,
    },
    d7: {
      assunto: "Your Protection: what you can do this week",
      titulo: "Your free Protection",
      semDocumentos:
        "You have not added any documents yet. With a bill or a contract, DoLado checks your current situation and keeps track of the dates and amounts that matter.",
      comDocumentos: (n: number) =>
        `${n === 1 ? "You already have 1 document" : `You already have ${n} documents`} in Protection. You can add other services, such as electricity, gas or telecoms, so that we can keep track of more situations.`,
      fim: (fim: string) => `Your free Protection is active until ${fim}.`,
    },
    d25: {
      assunto: "5 days left on your free Protection",
      titulo: "5 days left",
      texto: (fim: string) => `Your free Protection ends on ${fim}.`,
      continuar: (preco: string) =>
        `If you would like to continue, you can subscribe to Protection for ${preco}/month in the portal. The first charge is only made when the free period ends.`,
      parar: "If you do nothing, free Protection ends with no charge.",
    },
    d29: {
      assunto: "Final reminder: your free Protection is ending",
      titulo: "Your free Protection is ending",
      texto: (fim: string) => `Your free Protection ends on ${fim}.`,
      continuar: (preco: string) =>
        `To continue, subscribe to Protection for ${preco}/month in the portal. The first charge is made on the day you subscribe.`,
      parar: (meses: number) =>
        `If you do nothing, it ends with no charge. Your services and documents are kept for ${meses} months.`,
    },
    d30: {
      assunto: "Your free Protection has ended",
      titulo: "Your free Protection has ended",
      texto: (fim: string) => `Your free Protection ended on ${fim}, with no charge.`,
      efeito: "We have stopped checking your documents and sending date reminders. No subscription has been created.",
      guardados: (meses: number) =>
        `Your services and documents are kept for ${meses} months: if you subscribe to Protection within that time, they become active again.`,
    },
  },

  faq: {
    experimentar: {
      pergunta: "Can I try Protection without paying?",
      resposta:
        "Yes. If you have never had Protection, you can try it free of charge for 30 days, once, with no bank card. The period starts when you activate it and gives you access to the Protection features. It does not include case handling.",
    },
    fim: {
      pergunta: "What happens at the end of the 30 free days?",
      resposta: (preco: string, meses: number) =>
        `Free Protection ends on its own, with no charge and without creating a subscription. To continue, you can subscribe to Protection for ${preco}/month; if you subscribe before the end, the first charge is only made when the free period ends. If you do not subscribe, your services and documents are kept for ${meses} months and become active again if you subscribe within that time.`,
    },
  },

  lembretes: {
    metadados: "Free Protection reminders",
    titulo: "Free Protection reminders",
    texto:
      "Please confirm that you no longer want to receive the optional free Protection reminders. You will still receive the notices about the start and end of the free period.",
    botao: "Unsubscribe",
    feito: "You will no longer receive these reminders.",
    invalida: "This link is not valid.",
  },
};
