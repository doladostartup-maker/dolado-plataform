import { createAdminClient } from "@/lib/supabase/admin";
import {
  montarHtmlBoasVindasPagamento,
  montarHtmlNotificacaoNovoPagamento,
} from "@/lib/email/pagamento";
import { CONTACTO_EMAIL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { planoDoPreco } from "@/lib/stripe/planos";
import {
  snapshotDeSubscricao,
  type DependenciasWebhook,
  type EstadoPagamento,
} from "@/lib/stripe/webhook";

// Implementação real das dependências do webhook (e de /criar-conta):
// Supabase com service_role (só servidor — a autenticidade vem da assinatura
// Stripe ou da sessão validada junto do Stripe, antes de chegar aqui), API
// Stripe e Brevo. Qualquer erro de escrita lança: o webhook liberta o evento
// e devolve 500 para o Stripe voltar a tentar.

async function enviarEmailBrevo(destinatario: string, assunto: string, html: string) {
  // Falha de e-mail nunca deve derrubar o webhook — o pagamento já está
  // registado; um e-mail perdido não é motivo para o Stripe reenviar o
  // evento.
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "DoLado", email: process.env.BREVO_SENDER_EMAIL },
        replyTo: { email: CONTACTO_EMAIL, name: "DoLado" },
        to: [{ email: destinatario }],
        subject: assunto,
        htmlContent: html,
      }),
    });
  } catch {
    // silencioso de propósito — ver comentário acima
  }
}

function falhar(contexto: string, erro: { code?: string } | null) {
  if (!erro) return;
  // Só o código: a mensagem do Postgres pode trazer valores das linhas.
  throw Object.assign(new Error(`${contexto} falhou`), { code: erro.code || contexto });
}

export function criarDependenciasWebhook(): DependenciasWebhook {
  const admin = createAdminClient();
  const agora = () => new Date().toISOString();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";

  return {
    async reclamarEvento(eventId, tipo) {
      const { error } = await admin
        .from("stripe_webhook_events")
        .insert({ event_id: eventId, tipo });
      if (!error) return true;
      if (error.code === "23505") return false; // já reclamado (duplicado)
      falhar("stripe_webhook_events.insert", error);
      return false;
    },

    async concluirEvento(eventId) {
      const { error } = await admin
        .from("stripe_webhook_events")
        .update({ estado: "processado", processado_em: agora() })
        .eq("event_id", eventId);
      falhar("stripe_webhook_events.update", error);
    },

    async libertarEvento(eventId) {
      const { error } = await admin
        .from("stripe_webhook_events")
        .delete()
        .eq("event_id", eventId)
        .eq("estado", "processando");
      falhar("stripe_webhook_events.delete", error);
    },

    async obterEstadoPagamento(sessionId) {
      const { data, error } = await admin
        .from("stripe_payments")
        .select("estado")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      falhar("stripe_payments.select", error);
      return (data?.estado as EstadoPagamento | undefined) ?? null;
    },

    async utilizadorDoPagamento(sessionId) {
      const { data, error } = await admin
        .from("stripe_payments")
        .select("user_id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      falhar("stripe_payments.select", error);
      return (data?.user_id as string | null | undefined) ?? null;
    },

    async gravarPagamento(dados) {
      // upsert — /criar-conta também grava esta sessão, por vezes antes do
      // webhook; os dois caminhos convergem para a mesma linha. user_id só
      // vai no payload quando é conhecido, para não apagar a ligação.
      const { error } = await admin
        .from("stripe_payments")
        .upsert(dados, { onConflict: "stripe_session_id" });
      falhar("stripe_payments.upsert", error);
    },

    async marcarPagamentosDaSubscricao(subscriptionId, estado) {
      const { error } = await admin
        .from("stripe_payments")
        .update({ estado })
        .eq("stripe_subscription_id", subscriptionId);
      falhar("stripe_payments.update", error);
    },

    async obterSubscricaoStripe(subscriptionId) {
      return snapshotDeSubscricao(await getStripe().subscriptions.retrieve(subscriptionId));
    },

    async gravarSubscricao(snapshot, estadoEm, cobranca) {
      const { data: atual, error: erroLeitura } = await admin
        .from("stripe_subscriptions")
        .select("estado_em")
        .eq("stripe_subscription_id", snapshot.stripe_subscription_id)
        .maybeSingle();
      falhar("stripe_subscriptions.select", erroLeitura);

      const dadosCobranca = cobranca
        ? { ultimo_pagamento_estado: cobranca.estado, ultimo_pagamento_em: cobranca.em }
        : {};

      if (atual && estadoEm < Number(atual.estado_em)) {
        // Evento antigo: não recua o estado da subscrição, mas uma cobrança
        // continua a ficar registada.
        if (cobranca) {
          const { error } = await admin
            .from("stripe_subscriptions")
            .update({ ...dadosCobranca, updated_at: agora() })
            .eq("stripe_subscription_id", snapshot.stripe_subscription_id);
          falhar("stripe_subscriptions.update", error);
        }
        return false;
      }

      const { error } = await admin.from("stripe_subscriptions").upsert(
        { ...snapshot, ...dadosCobranca, estado_em: estadoEm, updated_at: agora() },
        { onConflict: "stripe_subscription_id" },
      );
      falhar("stripe_subscriptions.upsert", error);
      return true;
    },

    planoDoPreco,

    async contasDoCustomer(customerId) {
      const { data, error } = await admin
        .from("user_access")
        .select("user_id")
        .eq("stripe_customer_id", customerId);
      falhar("user_access.select", error);
      return (data ?? []).map((l) => l.user_id as string);
    },

    async aplicarSubscricaoNaConta(userId, sub) {
      const { error } = await admin.from("user_access").upsert(
        {
          user_id: userId,
          subscription_plan: sub.plano,
          subscription_status: sub.status,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_customer_id: sub.stripe_customer_id,
          stripe_price_id: sub.stripe_price_id,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          updated_at: agora(),
        },
        { onConflict: "user_id" },
      );
      falhar("user_access.upsert", error);
    },

    async atualizarSubscricaoNasContas(subscriptionId, dados) {
      const { plano, status, ...resto } = dados;
      const { data, error } = await admin
        .from("user_access")
        .update({
          ...(plano ? { subscription_plan: plano } : {}),
          ...(status ? { subscription_status: status } : {}),
          ...resto,
          updated_at: agora(),
        })
        .eq("stripe_subscription_id", subscriptionId)
        .select("user_id");
      falhar("user_access.update", error);
      return data?.length ?? 0;
    },

    async garantirConta(userId, customerId) {
      // Cria a linha se não existir (sem plano nem créditos); se existir,
      // só liga o customer quando ainda não tinha nenhum.
      const { error: erroInsert } = await admin
        .from("user_access")
        .upsert(
          { user_id: userId, stripe_customer_id: customerId, updated_at: agora() },
          { onConflict: "user_id", ignoreDuplicates: true },
        );
      falhar("user_access.insert", erroInsert);
      if (customerId) {
        const { error } = await admin
          .from("user_access")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", userId)
          .is("stripe_customer_id", null);
        falhar("user_access.update", error);
      }
    },

    async concederCreditoCaso(userId, origem, maximo) {
      const { data, error } = await admin.rpc("conceder_credito_caso", {
        p_user_id: userId,
        p_origem: origem,
        p_maximo: maximo,
      });
      falhar("conceder_credito_caso", error);
      return data === true;
    },

    async enviarEmailPagamentoConfirmado({ email, plano, contaExiste, sessionId }) {
      const ligacao = contaExiste
        ? `${siteUrl}/entrar`
        : `${siteUrl}/criar-conta?session_id=${encodeURIComponent(sessionId)}`;
      await enviarEmailBrevo(
        email,
        contaExiste
          ? "Pagamento confirmado — o seu acesso está ativo ✓"
          : "Pagamento confirmado — Falta criar a sua palavra-passe ✓",
        montarHtmlBoasVindasPagamento(plano, { contaExiste, ligacao }),
      );
      if (process.env.BREVO_SENDER_EMAIL) {
        await enviarEmailBrevo(
          process.env.BREVO_SENDER_EMAIL,
          "Novo pagamento — DoLado",
          montarHtmlNotificacaoNovoPagamento(email, plano),
        );
      }
    },

    registar(linha) {
      // Sem e-mails, nomes nem payload — só identificadores Stripe.
      console.log(JSON.stringify({ origem: "stripe_webhook", ...linha }));
    },
  };
}
