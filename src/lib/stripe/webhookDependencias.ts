import { createAdminClient } from "@/lib/supabase/admin";
import {
  montarHtmlBoasVindasPagamento,
  montarHtmlNotificacaoNovoPagamento,
} from "@/lib/email/pagamento";
import { CONTACTO_EMAIL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import {
  snapshotDeSubscricao,
  subscricaoEstaAtiva,
  type AlvoAcesso,
  type DependenciasWebhook,
  type EstadoPagamento,
} from "@/lib/stripe/webhook";

// Implementação real das dependências do webhook: Supabase com service_role
// (só servidor — o webhook não tem sessão de utilizador; a autenticidade
// vem da assinatura Stripe, validada antes de chegar aqui), API Stripe e
// Brevo. Qualquer erro de escrita lança: o webhook liberta o evento e
// devolve 500 para o Stripe voltar a tentar.

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

  // Contas a que um alvo se refere: por user_id (upgrade, vem dos metadados
  // gravados pelo servidor) e/ou por stripe_customer_id.
  async function contasDoAlvo(alvo: AlvoAcesso) {
    const ids = new Set<string>();
    if (alvo.userId) ids.add(alvo.userId);
    if (alvo.customerId) {
      const { data, error } = await admin
        .from("user_access")
        .select("user_id")
        .eq("stripe_customer_id", alvo.customerId);
      falhar("user_access.select", error);
      for (const linha of data ?? []) ids.add(linha.user_id as string);
    }
    return [...ids];
  }

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
        {
          ...snapshot,
          ...dadosCobranca,
          estado_em: estadoEm,
          updated_at: agora(),
        },
        { onConflict: "stripe_subscription_id" },
      );
      falhar("stripe_subscriptions.upsert", error);
      return true;
    },

    async temOutraSubscricaoAtiva(customerId, excluirSubscriptionId) {
      let consulta = admin
        .from("stripe_subscriptions")
        .select("stripe_subscription_id, status")
        .eq("stripe_customer_id", customerId);
      if (excluirSubscriptionId) {
        consulta = consulta.neq("stripe_subscription_id", excluirSubscriptionId);
      }
      const { data, error } = await consulta;
      falhar("stripe_subscriptions.select", error);
      return (data ?? []).some((s) => subscricaoEstaAtiva(s.status as string));
    },

    async concederAssinatura(alvo) {
      if (alvo.userId) {
        const { error } = await admin.from("user_access").upsert(
          {
            user_id: alvo.userId,
            nivel_acesso: "assinatura",
            ...(alvo.customerId ? { stripe_customer_id: alvo.customerId } : {}),
            updated_at: agora(),
          },
          { onConflict: "user_id" },
        );
        falhar("user_access.upsert", error);
        return 1;
      }
      if (!alvo.customerId) return 0;
      const { data, error } = await admin
        .from("user_access")
        .update({ nivel_acesso: "assinatura", updated_at: agora() })
        .eq("stripe_customer_id", alvo.customerId)
        .select("user_id");
      falhar("user_access.update", error);
      return data?.length ?? 0;
    },

    async degradarAssinatura(alvo) {
      const contas = await contasDoAlvo(alvo);
      if (contas.length === 0) return 0;
      const { data, error } = await admin
        .from("user_access")
        .update({ nivel_acesso: "avulso", updated_at: agora() })
        .in("user_id", contas)
        .eq("nivel_acesso", "assinatura")
        .select("user_id");
      falhar("user_access.update", error);
      return data?.length ?? 0;
    },

    async enviarEmailsPagamentoConfirmado(email, plano) {
      await enviarEmailBrevo(
        email,
        "Pagamento confirmado — Falta criar a sua palavra-passe ✓",
        montarHtmlBoasVindasPagamento(plano),
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
