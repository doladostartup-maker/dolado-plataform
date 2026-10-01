"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { snapshotDeSubscricao } from "@/lib/stripe/webhook";
import {
  lerMotivo,
  manterSubscricao as manterSubscricaoLogica,
  pedirCancelamento,
  type DependenciasGestao,
} from "@/lib/gestaoSubscricao";

// A sessão dá o user_id; a subscrição é a que está na própria linha de
// user_access (gravada pelo webhook) — o browser nunca envia ids. Só depois
// disso se usa a service role.

function falhar(contexto: string, erro: { code?: string } | null) {
  if (!erro) return;
  throw Object.assign(new Error(`${contexto} falhou`), { code: erro.code || contexto });
}

function criarDependencias(): DependenciasGestao {
  const admin = createAdminClient();
  const stripe = getStripe();

  return {
    async obterConta(userId) {
      const { data, error } = await admin
        .from("user_access")
        .select(
          "subscription_plan, subscription_status, stripe_subscription_id, stripe_customer_id, cancel_at_period_end, current_period_end",
        )
        .eq("user_id", userId)
        .maybeSingle();
      falhar("user_access.select", error);
      return data;
    },

    async definirCancelamentoNoFimDoPeriodo(subscriptionId, cancelar) {
      let sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancelar });
      if (!cancelar && sub.cancel_at) {
        // Um cancel_at marcado à parte (ex.: no Dashboard) também é retirado.
        sub = await stripe.subscriptions.update(subscriptionId, { cancel_at: "" });
      }
      const snapshot = snapshotDeSubscricao(sub);
      return {
        stripe_customer_id: snapshot.stripe_customer_id,
        status: snapshot.status,
        cancel_at_period_end: snapshot.cancel_at_period_end,
        current_period_end: snapshot.cancel_at ?? snapshot.current_period_end,
      };
    },

    async gravarNaConta(userId, subscriptionId, dados) {
      const { error } = await admin
        .from("user_access")
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("stripe_subscription_id", subscriptionId);
      falhar("user_access.update", error);
    },

    async registarPedido({ userId, subscriptionId, plano, motivo, pedidoEm, fimPrevisto }) {
      const linha = {
        origem: "cliente",
        motivo_codigo: motivo.codigo,
        motivo_texto: motivo.texto,
        pedido_em: pedidoEm,
        fim_previsto_em: fimPrevisto,
      };
      const { error } = await admin
        .from("subscricao_cancelamentos")
        .insert({ ...linha, user_id: userId, stripe_subscription_id: subscriptionId, plano });
      if (!error) return;
      if (error.code !== "23505") falhar("subscricao_cancelamentos.insert", error);
      // O webhook registou o agendamento primeiro: fica com o motivo do cliente.
      const { error: erroUpdate } = await admin
        .from("subscricao_cancelamentos")
        .update(linha)
        .eq("stripe_subscription_id", subscriptionId)
        .is("revertido_em", null)
        .is("terminado_em", null);
      falhar("subscricao_cancelamentos.update", erroUpdate);
    },

    async registarReversao(subscriptionId, em) {
      const { error } = await admin
        .from("subscricao_cancelamentos")
        .update({ revertido_em: em })
        .eq("stripe_subscription_id", subscriptionId)
        .is("revertido_em", null)
        .is("terminado_em", null);
      falhar("subscricao_cancelamentos.update", error);
    },
  };
}

function registarErro(acao: string, erro: unknown) {
  // Só o código — nunca dados da conta.
  console.error(JSON.stringify({ origem: "gestao_subscricao", acao, erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
}

export async function cancelarSubscricao(formData: FormData) {
  const { user } = await requireUser();
  const motivo = lerMotivo(formData.get("motivo"), formData.get("comentario"));

  let destino = "/portal/subscricao?cancelada=1";
  try {
    const r = await pedirCancelamento(user.id, motivo, criarDependencias());
    if (!r.ok) destino = "/portal/subscricao?erro=indisponivel";
  } catch (erro) {
    registarErro("cancelar", erro);
    destino = "/portal/subscricao?erro=falha";
  }
  revalidatePath("/portal", "layout");
  redirect(destino);
}

export async function manterSubscricao() {
  const { user } = await requireUser();

  let destino = "/portal/subscricao?mantida=1";
  try {
    const r = await manterSubscricaoLogica(user.id, criarDependencias());
    if (!r.ok) destino = "/portal/subscricao?erro=indisponivel";
  } catch (erro) {
    registarErro("manter", erro);
    destino = "/portal/subscricao?erro=falha";
  }
  revalidatePath("/portal", "layout");
  redirect(destino);
}
