"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterAcesso, requireUser } from "@/lib/auth";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { PRECO_AVULSO_ID, PRECO_CASO_PROTECAO_ID } from "@/lib/stripe/planos";
import { escolherPagamentoParaCreditoUpgrade, type PagamentoParaUpgrade } from "@/lib/stripe/upgrade";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function iniciarCheckout(plano: "avulso" | "assinatura") {
  const stripe = getStripe();
  const precoId = plano === "avulso" ? PRECO_AVULSO_ID : PRECO_CASO_PROTECAO_ID;

  const session = await stripe.checkout.sessions.create({
    mode: plano === "avulso" ? "payment" : "subscription",
    // "always" garante que existe sempre um Customer Stripe associado,
    // mesmo numa compra Avulso a 0 € por cupão de 100% — sem isto, um
    // upgrade posterior não tem onde aplicar o crédito nem a quem ligar a
    // nova assinatura (foi exactamente o que aconteceu no primeiro teste).
    ...(plano === "avulso" ? { customer_creation: "always" as const } : {}),
    line_items: [{ price: precoId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${SITE_URL}/criar-conta?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${MARKETING_SITE_URL}/#precario`,
    metadata: { plano },
  });

  if (!session.url) {
    redirect(`${MARKETING_SITE_URL}/#precario`);
  }

  redirect(session.url);
}

/** Customer Stripe já associado à conta (se houver), para não criar outro. */
async function customerDaConta(userId: string) {
  const admin = createAdminClient();
  const { data: acesso } = await admin
    .from("user_access")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (acesso?.stripe_customer_id) return acesso.stripe_customer_id as string;

  const { data: pagamento } = await admin
    .from("stripe_payments")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (pagamento?.stripe_customer_id as string | undefined) ?? null;
}

/**
 * Compra de uma reclamação Avulso por quem já tem conta (ex.: plano
 * Proteção sem créditos, ou depois de um pagamento falhado). O user_id vai
 * nos metadados — definidos aqui, no servidor — para o webhook creditar a
 * conta certa quando o pagamento for confirmado.
 */
export async function iniciarCompraAvulsoComConta() {
  const { user } = await requireUser();
  const customerId = await customerDaConta(user.id);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    ...(customerId
      ? { customer: customerId }
      : { customer_creation: "always" as const, customer_email: user.email }),
    line_items: [{ price: PRECO_AVULSO_ID, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${SITE_URL}/portal/casos/novo?pagamento=1`,
    cancel_url: `${SITE_URL}/portal/casos/novo`,
    metadata: { plano: "avulso", user_id: user.id },
  });

  redirect(session.url ?? "/portal");
}

/**
 * Subscrição Caso + Proteção por quem já tem conta. Se a conta tiver uma
 * compra Avulso elegível (ver src/lib/stripe/upgrade.ts), o valor é
 * creditado como saldo Stripe antes do checkout — uma única vez por compra.
 */
export async function iniciarUpgradeParaAssinatura() {
  const stripe = getStripe();
  const { supabase, user } = await requireUser();
  const acesso = await obterAcesso(supabase, user.id);

  // Já tem uma subscrição ativa: não abre uma segunda.
  if (acesso.temProtecao) {
    redirect("/portal");
  }

  const admin = createAdminClient();
  const { data: pagamentos } = await admin
    .from("stripe_payments")
    .select("id, user_id, plano, estado, valor_total_centimos, stripe_customer_id, credito_upgrade_em, created_at")
    .eq("user_id", user.id)
    .eq("plano", "avulso");

  const elegivel = escolherPagamentoParaCreditoUpgrade((pagamentos ?? []) as PagamentoParaUpgrade[], user.id);
  const customerId = elegivel?.stripe_customer_id ?? (await customerDaConta(user.id));

  let creditado = false;
  if (elegivel && customerId) {
    // Reserva atómica: só um pedido consegue marcar esta compra como usada.
    // Dois cliques (ou dois separadores) não geram dois créditos.
    const { data: reservado } = await admin
      .from("stripe_payments")
      .update({ credito_upgrade_em: new Date().toISOString() })
      .eq("id", elegivel.id)
      .eq("estado", "concluido")
      .is("credito_upgrade_em", null)
      .select("id")
      .maybeSingle();

    if (reservado) {
      try {
        await stripe.customers.createBalanceTransaction(
          customerId,
          {
            amount: -elegivel.valor_total_centimos!,
            currency: "eur",
            description: "Crédito por reclamação avulsa já paga",
          },
          // Mesmo que o pedido seja repetido, o Stripe só cria um crédito.
          { idempotencyKey: `credito-upgrade-${elegivel.id}` },
        );
        creditado = true;
      } catch {
        // Sem crédito no Stripe: liberta a reserva para poder tentar de novo.
        await admin.from("stripe_payments").update({ credito_upgrade_em: null }).eq("id", elegivel.id);
        redirect("/portal?erro=upgrade-falhou");
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(customerId ? { customer: customerId } : { customer_email: user.email }),
    line_items: [{ price: PRECO_CASO_PROTECAO_ID, quantity: 1 }],
    // O regresso só mostra uma mensagem — o acesso é dado pelo webhook
    // quando o pagamento for confirmado.
    success_url: `${SITE_URL}/portal?upgraded=true`,
    cancel_url: `${SITE_URL}/portal`,
    // user_id nos metadados (definidos aqui, no servidor) para o webhook
    // ligar a subscrição à conta certa.
    metadata: { plano: "assinatura", upgrade: creditado ? "true" : "false", user_id: user.id },
  });

  redirect(session.url ?? "/portal");
}
