import type { PlanoSubscricao } from "@/lib/acesso";

// Os três preços oficiais Stripe. As variáveis de ambiente mantêm-se como
// fonte principal (permitem trocar para os preços live sem mudar código);
// os valores fixos são os preços oficiais atuais, usados quando a variável
// não está definida (é o caso de STRIPE_PRICE_PROTECAO_ID hoje).
export const PRECO_PROTECAO_ID =
  process.env.STRIPE_PRICE_PROTECAO_ID || "price_1ULUUeBtJL9VeDPfWuDk5XCo";
export const PRECO_CASO_PROTECAO_ID =
  process.env.STRIPE_PRICE_ASSINATURA_ID || "price_1UJYnPBtJL9VeDPfnQTlVwsq";
export const PRECO_AVULSO_ID =
  process.env.STRIPE_PRICE_AVULSO_ID || "price_1UJYwzBtJL9VeDPfrAiguI1Z";

/** Plano de subscrição correspondente a um price. null = price desconhecido. */
export function planoDoPreco(priceId: string | null | undefined): Exclude<PlanoSubscricao, "none"> | null {
  if (priceId === PRECO_PROTECAO_ID) return "protecao";
  if (priceId === PRECO_CASO_PROTECAO_ID) return "caso_protecao";
  return null;
}
