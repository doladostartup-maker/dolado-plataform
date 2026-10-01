import type Stripe from "stripe";

// Conversão de um Avulso pago na 1.ª mensalidade de uma assinatura, com
// reembolso parcial da diferença. Sem efeitos, para ser testável com
// `node --test` (quem fala com o Stripe e a Supabase é app/actions/stripe.ts
// e o webhook).
//
//   Avulso 14,99 € → Proteção 4,99 €:        1.ª fatura 0 €, reembolso 10,00 €
//   Avulso 14,99 € → Caso + Proteção 7,99 €: 1.ª fatura 0 €, reembolso  7,00 €
//
// Sem Customer Balance e sem saldo para meses seguintes: a 1.ª fatura leva
// um cupão de 100% "once" (só essa fatura) e a diferença é devolvida ao
// método de pagamento original por um Refund do PaymentIntent do Avulso.
// Os casos incluídos/créditos de caso são outra coisa e não entram aqui.

export type PlanoDestino = "protecao" | "caso_protecao";

export const VALOR_MENSALIDADE_CENTIMOS: Record<PlanoDestino, number> = {
  protecao: 499,
  caso_protecao: 799,
};

export const NOME_PLANO: Record<PlanoDestino, string> = {
  protecao: "Proteção",
  caso_protecao: "Caso + Proteção",
};

/** Cupão Stripe da 1.ª mensalidade coberta pelo Avulso: 100%, só uma fatura. */
export const CUPAO_CONVERSAO = {
  id: "dolado-conversao-avulso-1-mes",
  percent_off: 100,
  duration: "once",
  name: "Primeiro mês coberto pelo pagamento Avulso",
} as const;

export type CalculoConversao = {
  valorAvulso: number;
  mensalidade: number;
  reembolso: number;
};

/**
 * O que o Avulso cobre e o que é devolvido. null se o valor pago não chegar
 * para cobrir a 1.ª mensalidade (ex.: Avulso pago com cupão) — nunca se
 * devolve mais do que foi pago.
 */
export function calcularConversao(valorAvulsoPago: number | null, plano: PlanoDestino): CalculoConversao | null {
  const mensalidade = VALOR_MENSALIDADE_CENTIMOS[plano];
  if (!valorAvulsoPago || valorAvulsoPago < mensalidade) return null;
  return { valorAvulso: valorAvulsoPago, mensalidade, reembolso: valorAvulsoPago - mensalidade };
}

export type PagamentoAvulso = {
  id: string;
  stripe_session_id: string;
  user_id: string | null;
  plano: string;
  estado: string;
  valor_total_centimos: number | null;
  created_at: string;
};

export type ConversaoExistente = {
  id: string;
  stripe_payment_id: string;
  estado: string;
  checkout_session_id: string | null;
};

/** Linha de case_credit_grants (só o que interessa à conversão). */
export type CreditoConcedido = { origem: string; estado: string | null };

/**
 * Sessões de checkout dos Avulsos cujo caso ainda está por usar
 * (case_credit_grants.estado = "disponivel"). Um Avulso usado, convertido
 * ou reembolsado não está aqui.
 */
export function sessoesAvulsoDisponiveis(creditos: CreditoConcedido[]): Set<string> {
  return new Set(
    creditos
      .filter((c) => c.estado === "disponivel" && c.origem.startsWith("checkout:"))
      .map((c) => c.origem.slice("checkout:".length)),
  );
}

/**
 * Compra Avulso elegível para conversão: da própria conta, paga
 * (concluido), não reembolsada, ainda não convertida e com o caso ainda
 * por usar (decisão de 01/10/2026: um Avulso já usado não é convertido nem
 * dá reembolso parcial — a adesão é uma compra normal). Uma conversão em
 * "checkout_aberto" (Checkout abandonado) não conta — continua elegível.
 */
export function escolherAvulsoParaConversao(
  pagamentos: PagamentoAvulso[],
  conversoes: ConversaoExistente[],
  userId: string,
  plano: PlanoDestino,
  avulsosDisponiveis: ReadonlySet<string>,
): { pagamento: PagamentoAvulso; calculo: CalculoConversao; conversao: ConversaoExistente | null } | null {
  const convertidos = new Set(conversoes.filter((c) => c.estado === "convertido").map((c) => c.stripe_payment_id));
  const elegiveis = pagamentos
    .filter(
      (p) =>
        p.user_id === userId &&
        p.plano === "avulso" &&
        p.estado === "concluido" &&
        !convertidos.has(p.id) &&
        avulsosDisponiveis.has(p.stripe_session_id) &&
        calcularConversao(p.valor_total_centimos, plano) !== null,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const pagamento = elegiveis[0];
  if (!pagamento) return null;
  return {
    pagamento,
    calculo: calcularConversao(pagamento.valor_total_centimos, plano)!,
    conversao: conversoes.find((c) => c.stripe_payment_id === pagamento.id) ?? null,
  };
}

/**
 * Parâmetros do Checkout de upgrade com conversão. payment_method_collection
 * "always": a 1.ª fatura é 0 €, mas o cliente tem de deixar um método de
 * pagamento válido para as renovações — "if_required" deixava-o sair sem.
 */
export function parametrosCheckoutConversao({
  precoId,
  cliente,
  conversaoId,
  userId,
  plano,
  siteUrl,
  metadataExtra = {},
  successUrl,
  cancelUrl,
}: {
  precoId: string;
  cliente: { customer: string } | { customer_email: string | undefined };
  conversaoId: string;
  userId: string;
  plano: PlanoDestino;
  siteUrl: string;
  /** Ex.: consentimento_compra_id — vai para a sessão e para a subscrição. */
  metadataExtra?: Record<string, string>;
  /** Regresso do Checkout (por omissão, o painel do portal). */
  successUrl?: string;
  cancelUrl?: string;
}): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    ...metadataExtra,
    plano: "assinatura",
    upgrade: "true",
    user_id: userId,
    conversao_id: conversaoId,
    plano_destino: plano,
  };
  return {
    mode: "subscription",
    ...cliente,
    line_items: [{ price: precoId, quantity: 1 }],
    // Só a 1.ª fatura: o cupão é "once". Não se pode juntar a
    // allow_promotion_codes.
    discounts: [{ coupon: CUPAO_CONVERSAO.id }],
    payment_method_collection: "always",
    success_url: successUrl ?? `${siteUrl}/portal?upgraded=true`,
    cancel_url: cancelUrl ?? `${siteUrl}/portal`,
    metadata,
    subscription_data: { metadata },
  };
}

const ESTADO_REEMBOLSO: Record<string, string> = {
  pending: "pendente",
  requires_action: "requer ação",
  succeeded: "concluído",
  failed: "falhado",
  canceled: "cancelado",
};

/** Estado de um Refund do Stripe em português (o valor original se for desconhecido). */
export function estadoReembolsoPt(estado: string | null) {
  if (!estado) return null;
  return ESTADO_REEMBOLSO[estado] ?? estado;
}

export function formatarEuros(centimos: number) {
  return `${(centimos / 100).toFixed(2).replace(".", ",")} €`;
}

/** Texto mostrado ao cliente depois da conversão (sem falar em saldo ou crédito futuro). */
export function mensagemConversao(plano: PlanoDestino, mensalidade: number, reembolso: number) {
  const base = `Utilizámos ${formatarEuros(mensalidade)} do valor do seu pagamento Avulso para cobrir o primeiro mês do plano ${NOME_PLANO[plano]}.`;
  return reembolso > 0
    ? `${base} Os restantes ${formatarEuros(reembolso)} serão reembolsados para o método de pagamento original.`
    : base;
}
