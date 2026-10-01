"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { avaliarSessaoParaCriarConta } from "@/lib/stripe/criarConta";
import { aplicarCompraConfirmadaNaConta, idDe } from "@/lib/stripe/webhook";
import { criarDependenciasWebhook } from "@/lib/stripe/webhookDependencias";

async function lerSessao(sessionId: string) {
  try {
    return await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return null;
  }
}

function voltar(sessionId: string, erro: string): never {
  redirect(`/criar-conta?session_id=${encodeURIComponent(sessionId)}&erro=${encodeURIComponent(erro)}`);
}

export async function criarContaComPagamento(formData: FormData) {
  const sessionId = formData.get("session_id") as string;
  const password = formData.get("password") as string;
  const nome = formData.get("nome") as string;

  if (!sessionId) {
    redirect(`${MARKETING_SITE_URL}/#precario`);
  }

  // A sessão é sempre lida ao Stripe — o session_id do formulário só diz
  // qual procurar, nunca o que foi pago.
  const session = await lerSessao(sessionId);
  if (!session) redirect(`${MARKETING_SITE_URL}/#precario`);

  const admin = createAdminClient();
  const { data: pagamento } = await admin
    .from("stripe_payments")
    .select("user_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  const avaliacao = avaliarSessaoParaCriarConta(session, pagamento?.user_id ?? null);
  if (!avaliacao.ok) {
    if (avaliacao.motivo === "sessao_invalida") redirect(`${MARKETING_SITE_URL}/#precario`);
    redirect(`/login?info=${encodeURIComponent("Esta compra já tem uma conta associada. Inicie sessão.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: avaliacao.email,
    password,
    options: { data: { nome } },
  });

  if (error) voltar(sessionId, error.message);
  if (!data.user) voltar(sessionId, "Não foi possível criar a conta.");
  const userId = data.user.id;

  // Liga a compra à conta nova — só se ainda não estiver ligada a outra.
  // O webhook pode já ter gravado a linha (com o estado real do pagamento):
  // nesse caso só se acrescenta o user_id.
  const customerId = idDe(session.customer);
  if (pagamento) {
    const { error: erroLigar } = await admin
      .from("stripe_payments")
      .update({ user_id: userId })
      .eq("stripe_session_id", sessionId)
      .is("user_id", null);
    if (erroLigar) console.error("[criar-conta] falha ao ligar stripe_payments:", erroLigar.code);
  } else {
    const { error: erroPagamento } = await admin.from("stripe_payments").upsert(
      {
        stripe_session_id: sessionId,
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: idDe(session.subscription),
        email: avaliacao.email,
        plano: session.mode === "payment" ? "avulso" : "assinatura",
        valor_total_centimos: session.amount_total,
        moeda: session.currency ?? "eur",
        estado: avaliacao.pagamentoConfirmado ? "concluido" : "pendente",
      },
      { onConflict: "stripe_session_id", ignoreDuplicates: true },
    );
    if (erroPagamento) console.error("[criar-conta] falha ao gravar stripe_payments:", erroPagamento.code);
    // Se o webhook gravou a linha entretanto, o insert foi ignorado — liga.
    await admin
      .from("stripe_payments")
      .update({ user_id: userId })
      .eq("stripe_session_id", sessionId)
      .is("user_id", null);
  }

  // O registo de consentimento da compra (gravado antes do Checkout, sem
  // conta) passa a apontar para a conta nova. Só preenche se estiver vazio.
  const { error: erroConsentimento } = await admin
    .from("consentimentos_compra")
    .update({ user_id: userId })
    .eq("checkout_session_id", sessionId)
    .is("user_id", null);
  if (erroConsentimento) console.error("[criar-conta] falha ao ligar consentimentos_compra:", erroConsentimento.code);

  // A conta existe sempre, mesmo com o pagamento pendente — sem plano nem
  // créditos até o pagamento ser confirmado.
  const deps = criarDependenciasWebhook();
  try {
    await deps.garantirConta(userId, customerId);

    // Relê a sessão DEPOIS de ligar a compra: se o pagamento assíncrono foi
    // confirmado enquanto a conta era criada, o webhook pode não ter visto a
    // ligação — aqui já se vê o estado final. Os créditos e o plano são
    // idempotentes, por isso aplicar nos dois lados é seguro.
    const atual: Stripe.Checkout.Session = (await lerSessao(sessionId)) ?? session;
    if (atual.payment_status === "paid" || atual.payment_status === "no_payment_required") {
      await aplicarCompraConfirmadaNaConta(atual, userId, deps);
    }
  } catch (erro) {
    // A conta já foi criada; o acesso volta a ser aplicado pelo webhook
    // (invoice.paid / reenvio). Não bloqueia o cliente.
    console.error("[criar-conta] falha ao aplicar a compra:", (erro as { code?: string }).code ?? "erro");
  }

  if (data.session) {
    redirect("/portal");
  }

  redirect(
    `/login?info=${encodeURIComponent("Verifique o seu e-mail para confirmar o registo.")}`,
  );
}
