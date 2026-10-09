import type { Traducao } from "../../dicionario.ts";
import type { compra as pt } from "../pt-PT/compra.ts";

export const compra: Traducao<typeof pt> = {
  modal: {
    titulo: "Confirm purchase",
    precoNormal: "Standard price: ",
    noPrimeiroMes: " for the first month",
    porMes: " per month",
    pagamentoUnico: " — one-off payment",
    renovacao: "Monthly subscription that renews automatically every month until you cancel it.",
    semRenovacao: "One-off payment, no renewal.",
    conversao: (mensalidade: string) => `We use ${mensalidade} of your Single Case payment to cover the first month`,
    conversaoReembolso: (reembolso: string) => ` and refund the remaining ${reembolso} to your original payment method`,
    conversaoFim: ". From the following month, the standard plan price applies.",
    cancelar:
      "You can cancel at any time under Subscription settings in your account. Cancellation takes effect at the end of the period you have already paid for.",
    descontoSubscritor: "The subscriber discount is already included in the price and can't be combined with promotional codes.",
    naoAcumula: "The referral discount can't be combined with promotional codes.",
    prefiroCodigo: "I'd rather use a promotional code",
    semDescontoIndicacao:
      "We won't apply the referral discount to this purchase: you can enter your promotional code at the payment step.",
    usarDesconto: "Use the referral discount",
    codigoSubscricao:
      "If you have a promotional code, you can apply it at the payment step. Even with a discount or at €0, the subscription renews every month — at the plan price or on the terms of the code applied — until you cancel it.",
    codigoCompra: "If you have a promotional code, you can apply it at the payment step.",
    livreResolucao: "Right of withdrawal",
    informacaoCompleta: "Full information about the right of withdrawal",
    termos: "Terms and Conditions",
    dados: "To find out how we handle your data, please see our <privacidade>Privacy Policy</privacidade>.",
    voltar: "Back",
    aAbrir: "Opening payment…",
    continuar: "Continue to payment",
  },
  comprar: {
    metadados: "Buy — DoLado",
    eyebrow: "Pricing",
    verSubscricao: "See my subscription",
    irPortal: "Go to the portal",
    jaTemConta: "If you already have a DoLado account, sign in before buying: the purchase will be linked to your account straight away.",
    iniciarSessao: "Sign in",
    semConta: "I don't have an account yet — continue",
    criarDepois:
      "Without an account, you create one after paying. Would you rather create it now? <registo>Create account and continue</registo>. <precario>Back to pricing</precario>",
  },
  mensagens: {
    dados_invalidos: "We couldn't start the purchase. Please refresh the page and try again.",
    termos: "To go ahead, you need to accept the Terms and Conditions.",
    inicio_imediato: "To go ahead, you need to ask for the service to start immediately.",
    abrir: "We couldn't open the payment page. Please try again in a few minutes.",
    mesmaSubscricao: "You already have this subscription active.",
    outraSubscricao: "You already have an active subscription. You can see it under Subscription settings in your account.",
  },
};
