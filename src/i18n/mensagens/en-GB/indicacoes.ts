import type { Traducao } from "../../dicionario.ts";
import type { indicacoes as pt } from "../pt-PT/indicacoes.ts";

const P = 20;

export const indicacoes: Traducao<typeof pt> = {
  textos: {
    titulo: "Recommend DoLado",
    mensagem: `${P}% for you. ${P}% for the person you recommend.`,
    apoio: `Share your link. Anyone who comes through it gets ${P}% off their first eligible purchase and, once that purchase is confirmed, you also get ${P}% off your next purchase or monthly payment.`,
    regras: `The discount for people who come through your link applies to their first Single Case purchase or their first monthly Protection payment. Your discounts are valid for 12 months and apply, one at a time, to Single Case purchases and to monthly renewals of Protection and Case + Protection. They don't apply to signing up for Case + Protection or to an Extra Case, and can't be combined with promotional codes.`,
    semConta: `You arrived through a referral link. To get the ${P}% discount, create an account or sign in before paying. If you continue without an account, you will pay without the referral discount.`,
    aposEnvio: `Know someone else who needs DoLado? Share your link: ${P}% for you and ${P}% for the person you recommend.`,
    resultadoPositivo: `We were able to help. Know someone else with a problem to sort out? Give them ${P}% off DoLado and get ${P}% yourself.`,
    casoProtecaoSemDesconto: "Case + Protection can't be combined with the referral offer.",
    textoPartilha: `Try DoLado: it helps you resolve problems with telecoms, energy, water and other companies. With this link you get ${P}% off your first eligible purchase.`,
  },
  regraCasoProtecao:
    "Case + Protection is not eligible for the 20% new-customer discount. However, a referral reward you have already earned can be used on a future monthly renewal of Case + Protection.",
  descontosDisponiveis: (n: number) =>
    n <= 0 ? "No discounts available" : n === 1 ? `1 discount of ${P}% available` : `${n} discounts of ${P}% available`,
  validade: (data: string) => `valid until ${data}`,
  descontoNaCompra: {
    novoClienteSubscricao: `Referral discount: ${P}% off your first monthly payment, applied automatically at checkout. From the following month, the standard plan price applies.`,
    novoClienteCompra: `Referral discount: ${P}% off your first purchase, applied automatically at checkout.`,
    recompensaSubscricao: `We are using 1 of your referral discounts: ${P}% off your first monthly payment. From the following month, the standard plan price applies.`,
    recompensaCompra: `We are using 1 of your referral discounts: ${P}% off this purchase.`,
  },
  area: {
    desconto: (validade: string) => `${P}% discount — ${validade}`,
    concluidas: (n: number) => (n === 1 ? "1 referral completed" : `${n} referrals completed`),
    usados: (n: number) => (n === 1 ? "1 discount already used" : `${n} discounts already used`),
    expirados: (n: number) => (n === 1 ? "1 discount expired" : `${n} discounts expired`),
    emVerificacao: (n: number) => `${n} being checked by DoLado`,
  },
  partilhar: {
    oSeuLink: "Your link",
    copiado: "Link copied",
    copiadoAnuncio: "Link copied.",
    copiar: "Copy link",
    partilhar: "Share",
  },
  pagina: {
    titulo: "Referral link — DoLado",
    h1: "Someone recommended DoLado to you",
    aguardar:
      "We will only link this visit to the referral if Cookiebot confirms that you have accepted marketing cookies. You can change your choice in the banner or continue without linking this visit.",
    aAssociar: "Recording the referral…",
    associada: "The referral has been recorded. Redirecting…",
    semConsentimento:
      "To link this visit to the referral, you need to accept marketing cookies in Cookiebot. If you don't, you can still use DoLado, but this visit won't be linked and won't give you access to the programme's discounts.",
    reverCookies: "Review cookie choices",
    erro: "We couldn't link this visit. You can continue to the site without it.",
    continuarSem: "Continue without the referral",
  },
};
