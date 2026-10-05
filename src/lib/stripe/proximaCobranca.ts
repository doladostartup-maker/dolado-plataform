import type { ResumoPlano } from "@/lib/acesso";
import { PLANOS } from "@/lib/planos";
import { descontosDaSubscricao, resumirCobranca, type DadosCobranca, type ResumoCobranca } from "@/lib/proximaCobranca";
import { getStripe } from "@/lib/stripe/client";
import type { createClient } from "@/lib/supabase/server";

// Só leitura no Stripe (subscrição + pré-visualização da próxima fatura) —
// nunca altera a cobrança. O subscriptionId vem sempre da linha user_access
// da própria conta, nunca do browser.

const TIMEOUT_MS = 8_000;

export async function obterDadosCobranca(
  subscriptionId: string,
  precoBaseCentimos: number,
  dataCobranca: string,
): Promise<DadosCobranca | null> {
  const stripe = getStripe();
  const [subscricao, preview] = await Promise.allSettled([
    stripe.subscriptions.retrieve(subscriptionId, { expand: ["discounts.source.coupon"] }, { timeout: TIMEOUT_MS }),
    stripe.invoices.createPreview({ subscription: subscriptionId }, { timeout: TIMEOUT_MS }),
  ]);

  if (subscricao.status === "rejected") {
    console.error("[proxima-cobranca] subscriptions.retrieve falhou", subscricao.reason);
    return null;
  }
  if (preview.status === "rejected") {
    // Sem pré-visualização, o valor é calculado com os descontos da subscrição.
    console.error("[proxima-cobranca] invoices.createPreview falhou", preview.reason);
  }

  return {
    precoBaseCentimos,
    dataCobranca,
    descontos: descontosDaSubscricao(subscricao.value.discounts),
    valorPrevistoStripe: preview.status === "fulfilled" ? preview.value.amount_due : null,
  };
}

/**
 * Resumo da próxima cobrança da conta da sessão, ou null se não houver
 * renovação (sem subscrição, cancelamento agendado) ou o Stripe falhar.
 */
export async function obterResumoCobranca(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  resumo: ResumoPlano,
): Promise<ResumoCobranca | null> {
  if (resumo.plano === "sem_plano" || !resumo.renovacao) return null;
  const { data: conta } = await supabase
    .from("user_access")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!conta?.stripe_subscription_id) return null;
  const dados = await obterDadosCobranca(
    conta.stripe_subscription_id,
    PLANOS[resumo.plano].precoCentimos,
    resumo.renovacao,
  );
  return dados ? resumirCobranca(dados) : null;
}
