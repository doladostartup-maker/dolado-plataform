import type Stripe from "stripe";

// Parâmetros da Checkout Session do Caso Extra — sem efeitos, para serem
// testáveis com `node --test`. Quem cria a sessão é app/actions/stripe.ts,
// depois de validar a sessão, a posse do pedido e o direito ao Caso Extra.
//
// Regras:
// - Customer Stripe já existente da conta (nunca customer_creation nem
//   customer_email: não nasce um segundo Customer).
// - Price ID escolhido no servidor; sem códigos promocionais (o desconto de
//   subscritor já está no preço e não acumula com outros).
// - Regresso para as páginas do pedido, na área com sessão — nunca para
//   /criar-conta nem para o registo.
// - metadata.plano = "caso_extra" e user_id definidos aqui; o webhook dá 1
//   caso disponível (case_credit_grants checkout:<sessão>, produto
//   caso_extra) e converte o pedido com esse caso.

export type DadosCheckoutCasoExtra = {
  precoId: string;
  customerId: string;
  userId: string;
  subscriptionId: string;
  pedidoId: string;
  siteUrl: string;
  /** Metadata do registo de consentimento (consentimento_compra_id, produto, tipo_compra). */
  metadataConsentimento: Record<string, string>;
};

export function parametrosCheckoutCasoExtra(d: DadosCheckoutCasoExtra): Stripe.Checkout.SessionCreateParams {
  const pedido = encodeURIComponent(d.pedidoId);
  const metadata: Record<string, string> = {
    ...d.metadataConsentimento,
    plano: "caso_extra",
    tipo: "extra_case",
    user_id: d.userId,
    pedido_id: d.pedidoId,
    // Só para auditoria: a subscrição ativa quando o Caso Extra foi comprado.
    stripe_subscription_id: d.subscriptionId,
  };
  return {
    mode: "payment",
    customer: d.customerId,
    line_items: [{ price: d.precoId, quantity: 1 }],
    payment_intent_data: { metadata },
    metadata,
    success_url: `${d.siteUrl}/tratar-caso/recebido?pedido=${pedido}`,
    cancel_url: `${d.siteUrl}/tratar-caso/modalidade?pedido=${pedido}&cancelado=1`,
  };
}
