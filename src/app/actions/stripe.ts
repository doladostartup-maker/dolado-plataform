"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterNivelAcesso, requireUser } from "@/lib/auth";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getPrecoAssinaturaId, getPrecoAvulsoId, getStripe } from "@/lib/stripe/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function iniciarCheckout(plano: "avulso" | "assinatura") {
  const stripe = getStripe();
  const precoId = plano === "avulso" ? getPrecoAvulsoId() : getPrecoAssinaturaId();

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

/**
 * Upgrade de Avulso → Assinatura, com o valor já pago creditado como saldo
 * na conta Stripe do cliente antes de abrir o checkout da assinatura — o
 * Stripe aplica o crédito automaticamente, o cliente só confirma.
 */
export async function iniciarUpgradeParaAssinatura() {
  const stripe = getStripe();
  const { supabase, user } = await requireUser();
  const nivel = await obterNivelAcesso(supabase, user.id);

  if (nivel === "assinatura") {
    redirect("/portal");
  }

  const admin = createAdminClient();

  const { data: pagamentoAvulso } = await admin
    .from("stripe_payments")
    .select("valor_total_centimos, stripe_customer_id")
    .eq("user_id", user.id)
    .eq("plano", "avulso")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pagamentoAvulso) {
    redirect("/portal?erro=upgrade-sem-pagamento");
  }

  const { stripe_customer_id: customerId, valor_total_centimos: valorCentimos } =
    pagamentoAvulso;

  // Uma compra Avulso a 0 € (cupão de 100%) pode não ter Customer Stripe
  // associado — nesse caso não há nada para creditar, e o checkout da
  // assinatura cria um Customer novo em vez de reutilizar um que não
  // existe.
  if (customerId && valorCentimos && valorCentimos > 0) {
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -valorCentimos,
      currency: "eur",
      description: "Crédito por reclamação avulsa já paga",
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(customerId ? { customer: customerId } : { customer_email: user.email }),
    line_items: [{ price: getPrecoAssinaturaId(), quantity: 1 }],
    // session_id no success_url permite ao /portal confirmar e libertar o
    // acesso de imediato, sem depender só do timing do webhook (que pode
    // chegar depois do browser voltar do Stripe).
    success_url: `${SITE_URL}/portal?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/portal`,
    // user_id vai nos metadados para o webhook conseguir ligar o acesso
    // de forma fiável, sem depender de o stripe_customer_id já bater
    // certo com o que ficou gravado no upgrade anterior.
    metadata: { plano: "assinatura", upgrade: "true", user_id: user.id },
  });

  if (!session.url) {
    redirect("/portal");
  }

  redirect(session.url);
}
