"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";

export async function criarContaComPagamento(formData: FormData) {
  const sessionId = formData.get("session_id") as string;
  const password = formData.get("password") as string;
  const nome = formData.get("nome") as string;

  if (!sessionId) {
    redirect(`${MARKETING_SITE_URL}/#precario`);
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const email = session.customer_details?.email;
  const plano = session.metadata?.plano as "avulso" | "assinatura" | undefined;

  // "no_payment_required" acontece quando um cupão de 100% zera o total —
  // é um pagamento válido, só sem cobrança real.
  if (
    !email ||
    !plano ||
    !["paid", "no_payment_required"].includes(session.payment_status)
  ) {
    redirect(`/criar-conta?session_id=${sessionId}&erro=${encodeURIComponent("Pagamento não confirmado.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome } },
  });

  if (error) {
    redirect(
      `/criar-conta?session_id=${sessionId}&erro=${encodeURIComponent(error.message)}`,
    );
  }

  if (!data.user) {
    redirect(
      `/criar-conta?session_id=${sessionId}&erro=${encodeURIComponent("Não foi possível criar a conta.")}`,
    );
  }

  // Não depender do webhook já ter inserido a linha em stripe_payments —
  // a entrega do webhook pode demorar mais do que o browser a chegar aqui
  // vindo do success_url. Fazemos upsert com os dados que já temos da
  // própria sessão Stripe; se o webhook inserir depois, o conflito em
  // stripe_session_id é inofensivo (a linha já está correcta).
  const admin = createAdminClient();
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  const { error: erroPagamento } = await admin.from("stripe_payments").upsert(
    {
      stripe_session_id: sessionId,
      user_id: data.user.id,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      email,
      plano,
      valor_total_centimos: session.amount_total,
      moeda: session.currency ?? "eur",
    },
    { onConflict: "stripe_session_id" },
  );
  if (erroPagamento) {
    console.error("[criar-conta] falha ao gravar stripe_payments:", erroPagamento);
  }

  const { error: erroAcesso } = await admin.from("user_access").upsert(
    {
      user_id: data.user.id,
      nivel_acesso: plano,
      stripe_customer_id: customerId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (erroAcesso) {
    console.error("[criar-conta] falha ao gravar user_access:", erroAcesso);
  }

  if (data.session) {
    redirect("/portal");
  }

  redirect(
    `/login?info=${encodeURIComponent("Verifique o seu e-mail para confirmar o registo.")}`,
  );
}
