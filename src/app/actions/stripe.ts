"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterAcesso, requireUser } from "@/lib/auth";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import {
  CUPAO_CONVERSAO,
  escolherAvulsoParaConversao,
  parametrosCheckoutConversao,
  type ConversaoExistente,
  type PagamentoAvulso,
  type PlanoDestino,
} from "@/lib/stripe/conversao";
import { PRECO_AVULSO_ID, PRECO_CASO_PROTECAO_ID, PRECO_PROTECAO_ID } from "@/lib/stripe/planos";

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

async function garantirCupaoConversao(stripe: ReturnType<typeof getStripe>) {
  try {
    const cupao = await stripe.coupons.retrieve(CUPAO_CONVERSAO.id);
    // Nunca aplicar um cupão com outra configuração (ex.: editado à mão).
    if (cupao.percent_off !== 100 || cupao.duration !== "once" || !cupao.valid) {
      throw new Error("cupão de conversão com configuração inesperada");
    }
  } catch (erro) {
    if ((erro as { code?: string }).code !== "resource_missing") throw erro;
    await stripe.coupons.create({
      id: CUPAO_CONVERSAO.id,
      percent_off: CUPAO_CONVERSAO.percent_off,
      duration: CUPAO_CONVERSAO.duration,
      name: CUPAO_CONVERSAO.name,
    });
  }
}

/**
 * Adesão a uma assinatura por quem já tem conta. Se a conta tiver uma
 * compra Avulso elegível, a 1.ª mensalidade fica coberta por ela (cupão de
 * 100% só na 1.ª fatura) e a diferença é reembolsada — mas só depois de o
 * webhook confirmar a subscrição. Abrir o Checkout não consome nada: se o
 * cliente desistir, o Avulso continua elegível.
 */
async function iniciarAdesao(plano: PlanoDestino) {
  const stripe = getStripe();
  const { supabase, user } = await requireUser();
  const acesso = await obterAcesso(supabase, user.id);

  // Já tem uma subscrição ativa: não abre uma segunda.
  if (acesso.temProtecao) {
    redirect("/portal");
  }

  const admin = createAdminClient();
  const precoId = plano === "protecao" ? PRECO_PROTECAO_ID : PRECO_CASO_PROTECAO_ID;
  const customerId = await customerDaConta(user.id);
  const cliente = customerId ? { customer: customerId } : { customer_email: user.email };

  const [{ data: pagamentos }, { data: conversoes }] = await Promise.all([
    admin
      .from("stripe_payments")
      .select("id, stripe_session_id, user_id, plano, estado, valor_total_centimos, created_at")
      .eq("user_id", user.id)
      .eq("plano", "avulso"),
    admin
      .from("conversoes_avulso")
      .select("id, stripe_payment_id, estado, checkout_session_id")
      .eq("user_id", user.id),
  ]);
  const escolha = escolherAvulsoParaConversao(
    (pagamentos ?? []) as PagamentoAvulso[],
    (conversoes ?? []) as ConversaoExistente[],
    user.id,
    plano,
  );

  if (!escolha) {
    // Sem Avulso por converter: adesão normal, cobrada desde o 1.º mês.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...cliente,
      line_items: [{ price: precoId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/portal?upgraded=true`,
      cancel_url: `${SITE_URL}/portal`,
      metadata: { plano: "assinatura", upgrade: "false", user_id: user.id },
    });
    redirect(session.url ?? "/portal");
  }

  // Um checkout de conversão de cada vez: um anterior ainda aberto é
  // expirado, para só o novo poder converter este Avulso.
  const anteriorId = escolha.conversao?.checkout_session_id;
  if (anteriorId) {
    const anterior = await stripe.checkout.sessions.retrieve(anteriorId).catch(() => null);
    if (anterior?.status === "complete") redirect("/portal?upgraded=true"); // já concluído, o webhook trata
    if (anterior?.status === "open") await stripe.checkout.sessions.expire(anteriorId).catch(() => undefined);
  }

  await garantirCupaoConversao(stripe);

  const valores = {
    plano_destino: plano,
    valor_avulso_centimos: escolha.calculo.valorAvulso,
    valor_primeira_mensalidade_centimos: escolha.calculo.mensalidade,
    refund_montante_centimos: escolha.calculo.reembolso,
    checkout_session_id: null,
    updated_at: new Date().toISOString(),
  };
  let conversaoId: string | undefined;
  if (escolha.conversao) {
    // Só reabre se ainda não foi convertida (entretanto, noutro separador).
    const { data } = await admin
      .from("conversoes_avulso")
      .update(valores)
      .eq("id", escolha.conversao.id)
      .eq("estado", "checkout_aberto")
      .select("id")
      .maybeSingle();
    conversaoId = data?.id;
  } else {
    const { data } = await admin
      .from("conversoes_avulso")
      .insert({ ...valores, stripe_payment_id: escolha.pagamento.id, user_id: user.id })
      .select("id")
      .maybeSingle();
    conversaoId = data?.id;
  }
  if (!conversaoId) redirect("/portal?erro=conversao-indisponivel");

  const session = await stripe.checkout.sessions.create(
    parametrosCheckoutConversao({ precoId, cliente, conversaoId, userId: user.id, plano, siteUrl: SITE_URL }),
  );
  await admin
    .from("conversoes_avulso")
    .update({ checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("id", conversaoId)
    .eq("estado", "checkout_aberto");

  redirect(session.url ?? "/portal");
}

/** Adesão a Caso + Proteção (com conversão do Avulso, se houver). */
export async function iniciarUpgradeParaAssinatura() {
  await iniciarAdesao("caso_protecao");
}

/** Adesão a Proteção (com conversão do Avulso, se houver). */
export async function iniciarUpgradeParaProtecao() {
  await iniciarAdesao("protecao");
}
