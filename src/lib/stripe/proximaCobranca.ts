import { getStripe } from "@/lib/stripe/client";
import { descontosDaSubscricao, type DadosCobranca } from "@/lib/proximaCobranca";

// Só leitura no Stripe (subscrição + pré-visualização da próxima fatura) —
// nunca altera a cobrança. O subscriptionId vem sempre da linha user_access
// da própria conta, nunca do browser.

const TIMEOUT_MS = 8_000;

export async function obterDadosCobranca(
  subscriptionId: string,
  precoBaseCentimos: number,
  dataCobranca: string,
): Promise<DadosCobranca | null> {
  const stripe = getStripe();
  const [subscricao, preview] = await Promise.allSettled([
    stripe.subscriptions.retrieve(subscriptionId, { expand: ["discounts.source.coupon"] }, { timeout: TIMEOUT_MS }),
    stripe.invoices.createPreview({ subscription: subscriptionId }, { timeout: TIMEOUT_MS }),
  ]);

  if (subscricao.status === "rejected") {
    console.error("[proxima-cobranca] subscriptions.retrieve falhou", subscricao.reason);
    return null;
  }
  if (preview.status === "rejected") {
    // Sem pré-visualização, o valor é calculado com os descontos da subscrição.
    console.error("[proxima-cobranca] invoices.createPreview falhou", preview.reason);
  }

  return {
    precoBaseCentimos,
    dataCobranca,
    descontos: descontosDaSubscricao(subscricao.value.discounts),
    valorPrevistoStripe: preview.status === "fulfilled" ? preview.value.amount_due : null,
  };
}
