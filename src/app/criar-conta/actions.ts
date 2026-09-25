"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function criarContaComPagamento(formData: FormData) {
  const sessionId = formData.get("session_id") as string;
  const password = formData.get("password") as string;
  const nome = formData.get("nome") as string;

  if (!sessionId) {
    redirect("/#precario");
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const email = session.customer_details?.email;
  const plano = session.metadata?.plano as "avulso" | "assinatura" | undefined;

  if (!email || !plano || session.payment_status !== "paid") {
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

  // A linha em stripe_payments ainda não tem user_id (foi criada pelo
  // webhook antes de a conta existir) — o cliente admin contorna a RLS
  // que, de outra forma, escondia essa linha da sessão recém-criada.
  const admin = createAdminClient();
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  await admin
    .from("stripe_payments")
    .update({ user_id: data.user.id })
    .eq("stripe_session_id", sessionId);

  await admin.from("user_access").upsert(
    {
      user_id: data.user.id,
      nivel_acesso: plano,
      stripe_customer_id: customerId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (data.session) {
    redirect("/portal");
  }

  redirect(
    `/login?info=${encodeURIComponent("Verifique o seu e-mail para confirmar o registo.")}`,
  );
}
