import type { Traducao } from "../../dicionario.ts";
import type { areaParceiro as pt } from "../pt-PT/areaParceiro.ts";

export const areaParceiro: Traducao<typeof pt> = {
  metadados: { titulo: "Partner area | DoLado" },
  navegacao: "Partner area",
  titulo: "Partner area",
  descricao:
    "Follow your recommendations and your commissions. For privacy, we only show figures: never names, contact details, cases, bills or contracts.",
  semAcesso: {
    titulo: "This account is not linked to a partner",
    texto: (email: string) =>
      `If you are a DoLado partner and would like to follow your recommendations here, write to ${email} from this account's e-mail address.`,
  },
  estado: {
    suspenso: "The partnership is suspended. Your link and code no longer link new people; commissions already earned are still tracked.",
    encerrado: "The partnership has ended. Your link and code no longer link new people; commissions already earned are still tracked.",
  },
  ligacao: {
    titulo: "Your recommendation link",
    texto: "Share the link or the code with anyone who needs help. They can see every DoLado service and choose the one they need.",
    codigo: "Partner code",
    codigoTexto: "Anyone who does not use the link can enter this code when creating an account or before paying.",
    transparencia:
      "When you recommend DoLado, say that you are a DoLado partner and receive a commission. People who come through your recommendation pay the normal price and get no discount.",
    textoPartilha: "DoLado helps resolve problems with bills, contracts and purchases. Find out more:",
  },
  resultados: {
    titulo: "Results",
    contas: "Accounts linked to you",
    contasNota: "People who created an account through your link or with your code.",
    protecao: "Subscribed to Protection",
    casoProtecao: "Subscribed to Case + Protection",
    nota: "Counted from the first payment of a subscription. Single Case and Extra Case purchases do not earn a commission.",
  },
  comissoes: {
    titulo: "Commissions",
    porReceber: "To be paid",
    porReceberNota: "Eligible and approved commissions not yet paid.",
    quantidade: "Number",
    valor: "Amount (excl. VAT)",
    estado: "Status",
    grupos: {
      pendente: { nome: "Pending", texto: (n: number) => `Waiting to reach ${n} paid monthly payments.` },
      em_verificacao: { nome: "Under review", texto: (_n: number) => "DoLado is checking a payment." },
      elegivel: { nome: "Eligible", texto: (_n: number) => "Conditions met; awaiting approval." },
      aprovada: { nome: "Approved", texto: (_n: number) => "Will be included in the next payment." },
      paga: { nome: "Paid", texto: (_n: number) => "Already transferred." },
      anulada: {
        nome: "Cancelled",
        texto: (_n: number) => "Subscription ended early, or payment refunded or disputed.",
      },
    },
  },
  regras: {
    titulo: "How they are calculated",
    protecao: (valor: string) => `Protection: ${valor} per customer.`,
    casoProtecao: (valor: string) => `Case + Protection: ${valor} per customer.`,
    mensalidades: (n: number) =>
      `The commission becomes eligible once the customer's first subscription has ${n} paid monthly payments. Free periods and €0 payments do not count.`,
    unica: "One commission per customer, even if they buy other services or change plan.",
    iva: "Amounts exclude VAT. If you charge VAT, it is added at the applicable legal rate.",
    pagamento: (minimo: string) =>
      `DoLado approves commissions and pays by bank transfer, normally once ${minimo} has built up.`,
    acordo: "The full conditions are set out in your partnership agreement.",
  },
  oportunidades: {
    titulo: "Companies introduced",
    emCurso: "In progress",
    ganhas: "Contract signed",
    perdidas: "No contract",
  },
  pagamentos: {
    titulo: "Payments received",
    vazio: "No payments yet.",
    data: "Date",
    referencia: "Reference",
    comissoes: "Commissions",
    semIva: "Excl. VAT",
    iva: "VAT",
    transferido: "Transferred",
    documento: "Your document",
  },
  privacidade:
    "We do not show the names, e-mail addresses, cases, bills or contracts of the people you recommended. Questions about a case are handled by DoLado directly with the customer.",
};
