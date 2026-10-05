import type { PlanoSubscricao } from "@/lib/acesso";
import { CASO_EXTRA, PLANOS, type PlanoId } from "@/lib/planos";

// Os três preços oficiais Stripe. As variáveis de ambiente mantêm-se como
// fonte principal (permitem trocar de preço sem mudar código); sem elas,
// valem os Price IDs oficiais de src/lib/planos.ts.
export const PRECO_PROTECAO_ID =
  process.env.STRIPE_PRICE_PROTECAO_ID || PLANOS.protecao.stripePriceId;
export const PRECO_CASO_PROTECAO_ID =
  process.env.STRIPE_PRICE_ASSINATURA_ID || PLANOS.caso_protecao.stripePriceId;
export const PRECO_AVULSO_ID =
  process.env.STRIPE_PRICE_AVULSO_ID || PLANOS.avulso.stripePriceId;

/**
 * Caso Extra (11,99 €, pagamento único). Sem Price ID configurado (variável
 * ou src/lib/planos.ts), a oferta não aparece e o servidor recusa o checkout —
 * nunca se cobra o Avulso no lugar dele.
 */
export const PRECO_CASO_EXTRA_ID = process.env.STRIPE_PRICE_CASO_EXTRA_ID || CASO_EXTRA.stripePriceId;

export function casoExtraConfigurado() {
  return PRECO_CASO_EXTRA_ID.startsWith("price_");
}

/** Price ID do plano — só no servidor; o browser envia apenas o PlanoId. */
export function precoDoPlano(plano: PlanoId): string {
  if (plano === "protecao") return PRECO_PROTECAO_ID;
  if (plano === "caso_protecao") return PRECO_CASO_PROTECAO_ID;
  return PRECO_AVULSO_ID;
}

/** Plano de subscrição correspondente a um price. null = price desconhecido. */
export function planoDoPreco(priceId: string | null | undefined): Exclude<PlanoSubscricao, "none"> | null {
  if (priceId === PRECO_PROTECAO_ID) return "protecao";
  if (priceId === PRECO_CASO_PROTECAO_ID) return "caso_protecao";
  return null;
}
