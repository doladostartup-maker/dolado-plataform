"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterNivelAcesso, requireUser } from "@/lib/auth";
import { getPrecoAssinaturaId, getPrecoAvulsoId, getStripe } from "@/lib/stripe/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function iniciarCheckout(plano: "avulso" | "assinatura") {
  const stripe = getStripe();
  const precoId = plano === "avulso" ? getPrecoAvulsoId() : getPrecoAssinaturaId();

  const session = await stripe.checkout.sessions.create({
    mode: plano === "avulso" ? "payment" : "subscription",
    line_items: [{ price: precoId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${SITE_URL}/criar-conta?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/#precario`,
    metadata: { plano },
  });

  if (!session.url) {
    redirect("/#precario");
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

  if (!pagamentoAvulso?.stripe_customer_id) {
    redirect("/portal?erro=upgrade-sem-pagamento");
  }

  const { stripe_customer_id: customerId, valor_total_centimos: valorCentimos } =
    pagamentoAvulso;

  if (valorCentimos && valorCentimos > 0) {
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -valorCentimos,
      currency: "eur",
      description: "Crédito por reclamação avulsa já paga",
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPrecoAssinaturaId(), quantity: 1 }],
    success_url: `${SITE_URL}/portal?upgraded=true`,
    cancel_url: `${SITE_URL}/portal`,
    metadata: { plano: "assinatura", upgrade: "true" },
  });

  if (!session.url) {
    redirect("/portal");
  }

  redirect(session.url);
}
