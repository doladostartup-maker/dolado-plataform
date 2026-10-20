import type { Traducao } from "../../dicionario.ts";
import type { acessoPatrocinado as pt } from "../pt-PT/acessoPatrocinado.ts";

export const acessoPatrocinado: Traducao<typeof pt> = {
  ativar: {
    metadados: "Activate your gifted Protection",
    eyebrow: "Gifted Protection",
    titulo: "Activate your gifted Protection",
    texto:
      "You have received a code from a company that partners with DoLado. With it, you have Protection at no cost for the period of the offer: DoLado compares your bills with your contract and with previous bills to spot price rises or charges you did not expect, and sends reminders before promotions and minimum terms end.",
    resumoTitulo: "How it works",
    resumo: {
      inicio: "It starts today, when you confirm the code.",
      semCartao: "We do not ask for a bank card or any other means of payment.",
      semCobranca: (preco: string) =>
        `At the end of the gifted period, Protection ends with no charge. To continue, you would have to choose to join for ${preco}/month.`,
      semCasos: "It does not include case handling.",
      privacidade: "The company that gave you the code has no access to your bills, contracts or cases.",
    },
    campoCodigo: "Offer code",
    ajudaCodigo: "It has 12 letters and numbers, for example ABCD-EFGH-JKLM.",
    aceitar:
      " I understand that the gifted Protection ends automatically at the end of the stated period, with no charge, and that it does not include case handling.",
    botao: "Activate Protection",
    aAtivar: "Activating…",
    semSessao: "To activate the code, create an account or sign in. We do not ask for a bank card.",
    criarConta: "Create an account",
    iniciarSessao: "Sign in",
    verPlanos: "See the plans",
    irParaProtecao: "Go to Protection",
    motivos: {
      ja_ativado: "This code is already active on your account.",
      demasiadas_tentativas: "Too many attempts. Please try again in an hour.",
      codigo_invalido: "This code is not valid. Please check the letters and numbers and try again.",
      codigo_expirado: "The deadline to activate this code has passed. Please contact the company that gave it to you.",
      protecao_ativa:
        "You already have Protection on your subscription, so the code has not been used. You can keep it or give it back to the company that gave it to you.",
      acesso_ativo: "You already have gifted Protection active. You can only activate another code once it ends.",
      email_nao_confirmado:
        "Please confirm your e-mail first: we sent you a link when you created your account. Then come back to this page.",
      conta_invalida: "This account cannot activate offer codes.",
      indisponivel: "Code activation is not available at the moment.",
      erro: "We could not activate the code. Please try again in a few minutes.",
      aceitarTermos: "To continue, please accept the Terms and Conditions.",
      semCodigo: "Please enter the code you received.",
    },
  },

  portal: {
    titulo: "Your gifted Protection is active.",
    oferecidaPor: (parceiro: string) => `Gifted by ${parceiro}.`,
    faltam: (n: number) => (n === 1 ? "1 day left." : `${n} days left.`),
    inicio: "Start",
    fim: "End",
    estadoPlano: "Gifted Protection",
    continuar: (preco: string) => `To continue afterwards, you can join Protection for ${preco}/month.`,
    cobrancaNoFim: (data: string) => `If you join now, the first charge is only made on ${data}, when the offer ends.`,
    cobrancaHoje: "If you join now, the first charge is made on the day you join.",
    semCobranca: "If you do nothing, your gifted Protection ends with no charge.",
    cta: "Continue with Protection",
    ativada: "Code activated. Your Protection is active.",
  },

  confirmarCompra: {
    cobrancaNoFim: (data: string) =>
      `You have gifted Protection: nothing is charged now. The first charge is made on ${data}, when the offer ends. You can cancel before that date with no charge.`,
    cobrancaHoje: "You have gifted Protection: as it ends in less than 2 days, the first charge is made today.",
    casoProtecao: "Your gifted Protection continues until it ends; Case + Protection is charged from today.",
  },

  emails: {
    botaoPortal: "Open Protection",
    botaoDocumento: "Add a document",
    botaoAderir: "Continue with Protection",
    ativacao: {
      assunto: "Your gifted Protection is active",
      titulo: "Your gifted Protection is active",
      texto: (parceiro: string, inicio: string, fim: string) =>
        `DoLado Protection, gifted by ${parceiro}, is active from ${inicio} to ${fim}.`,
      passo:
        "To get started, add a bill or a contract in the portal: we check your current situation and start sending reminders before promotions and minimum terms end.",
      condicoes:
        "We do not ask for a bank card. At the end of the gifted period, Protection ends with no charge. The company that gave you the code has no access to your bills, contracts or cases.",
    },
    d15: {
      assunto: "Your gifted Protection ends in 15 days",
      titulo: "Your gifted Protection is ending",
      texto: (fim: string) => `Your gifted Protection ends on ${fim}.`,
      continuar: (preco: string) =>
        `If you would like to continue, you can join Protection for ${preco}/month. If you join before the offer ends, the first charge is only made when it ends.`,
      parar: "If you do nothing, Protection ends with no charge.",
    },
    fim: {
      assunto: "Your gifted Protection has ended",
      titulo: "Your gifted Protection has ended",
      texto: (fim: string) => `Your gifted Protection ended on ${fim}, with no charge.`,
      efeito: "We have stopped checking your bills and sending date reminders.",
      guardados: (meses: number) =>
        `Your services and documents are kept for ${meses} months and become active again if you join Protection within that time.`,
    },
  },
};
