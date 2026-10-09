import type { Traducao } from "../../dicionario.ts";
import type { subscricao as pt } from "../pt-PT/subscricao.ts";

export const subscricao: Traducao<typeof pt> = {
  estados: {
    active: "Active",
    trialing: "Active",
    past_due: "Payment overdue",
    incomplete: "Payment being confirmed",
    unpaid: "Suspended for non-payment",
    paused: "Suspended",
  },
  cancelamentoAgendado: "Cancellation scheduled",
  reembolso: {
    efetuado: { titulo: "Refund made", texto: "The refund has been processed to your original payment method." },
    verificar: {
      titulo: "We are checking your refund",
      texto: "There was a problem processing the refund. You don't need to do anything right now.",
    },
    emProcessamento: { titulo: "Refund in progress", texto: "The refund has been started to your original payment method." },
  },
  cobranca: {
    vitalicio: (quanto: string) => `${quanto} for life`,
    proximaCobranca: (quanto: string) => `${quanto} on the next payment`,
    ate: (quanto: string, data: string) => `${quanto} until ${data}`,
    semCobrancaVitalicio: (valor: string) => `${valor} — no charge expected, 100% lifetime discount active`,
    semCobranca: (valor: string) => `${valor} — no charge expected`,
    desconto: "Discount",
    descontos: "Discounts",
    proxima: "Next payment",
    depoisDesconto: "After the discount",
    depoisValor: (preco: string, data: string) => `${preco}/month from ${data}`,
  },
  conversao: (valor: string, plano: string) =>
    `We used ${valor} of your Single Case payment to cover the first month of the ${plano} plan.`,
  conversaoReembolso: (valor: string) => ` The remaining ${valor} will be refunded to your original payment method.`,
  pagina: {
    titulo: "Subscription",
    descricao: "Your plan, the next renewal and your available cases.",
    erros: {
      indisponivel: "We couldn't find an active subscription that can be changed. Please refresh the page.",
      falha: "We couldn't complete your request. Please try again in a few minutes.",
    },
    planoAtual: "Current plan",
    estado: "Subscription status",
    precoPlano: "Plan price",
    precoMes: (preco: string, iva: string) => `${preco}/month (${iva})`,
    proximaRenovacao: "Next renewal",
    terminaEm: "Protection ends on",
    subscricao: "Subscription",
    semSubscricao: "No active subscription",
    casosDisponiveis: "Available cases",
    canceladaTitulo: "Cancellation scheduled",
    cancelada: (data: string) => `Your Protection stays active until ${data}. After that date there will be no further charges.`,
    mantidaTitulo: "Subscription kept",
    mantida: (data: string) => `The cancellation has been withdrawn. Your subscription renews as normal on ${data}.`,
    protecaoAtiva: "Protection active",
    inativa: "Inactive",
    agendadoTexto: (data: string) =>
      `<b>Cancellation scheduled.</b> Your Protection is active until ${data}. Until then, everything keeps working as normal. On that date, we stop following your contracts and sending alerts.`,
    guardados: (n: number, data: string) =>
      `You have ${n === 1 ? "1 available case saved" : `${n} available cases saved`} until ${data}. If you subscribe to Case + Protection again by that date, you get them back.`,
    verSubscricoes: "See subscriptions",
    naoApaga:
      "Cancelling your subscription doesn't delete the cases you have opened, your documents or your history — they remain available in <casos>My cases</casos>. For questions about charges, contact us at <email/>.",
    livreResolucao: (dias: number) =>
      `Cancelling is different from the right of withdrawal, which can be exercised within ${dias} days of purchase, under the conditions set out in law. <saber>Find out more about the right of withdrawal</saber>.`,
  },
  cancelar: {
    aCancelar: "Cancelling…",
    confirmar: "Confirm cancellation",
    cancelar: "Cancel subscription",
    porque: "Could you tell us why you want to cancel?",
    opcional: "Answering is optional and doesn't affect the cancellation.",
    motivos: {
      ja_nao_preciso: "I no longer need the service",
      preco: "The price doesn't suit what I'm looking for",
      pouco_uso: "I didn't use the features much",
      problema_resolvido: "My problem has been solved",
      outro: "Other reason",
    },
    comentario: "Comment (optional)",
    continuar: "Continue",
    manter: "Keep subscription",
    titulo: "Cancel your subscription?",
    ativaAte: (data: string) => `Your Protection will stay active until ${data}. `,
    ativaAteFim: "Your Protection will stay active until the end of the period you have already paid for. ",
    naoRenovada: "After that date, the subscription won't renew and there will be no further charges.",
    alertas: (meses: number) =>
      `When you cancel your subscription, we stop following your contracts and sending alerts once Protection ends. We will keep your contracts, documents and related data for ${meses} months, in case you decide to come back to DoLado. After that period, they will be deleted or anonymised.`,
    casosGuardados: (dias: number) =>
      `Your available cases are kept for ${dias} days after that date. If you subscribe to Case + Protection again within that period, you get them back.`,
    naoApagados: "The cases you have opened, your documents and your history are not deleted.",
    aGuardar: "Saving…",
  },
};
