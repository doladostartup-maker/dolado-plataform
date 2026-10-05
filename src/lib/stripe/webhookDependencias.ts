import { createAdminClient } from "@/lib/supabase/admin";
import {
  montarHtmlBoasVindasPagamento,
  montarHtmlNotificacaoNovoPagamento,
} from "@/lib/email/pagamento";
import { CONTACTO_EMAIL } from "@/lib/site";
import { agendarRascunhoIA } from "@/lib/rascunhoIA/servidor";
import type Stripe from "stripe";
import { getStripe as stripeReal } from "@/lib/stripe/client";
import { planoDoPreco } from "@/lib/stripe/planos";
import {
  idDe,
  snapshotDeSubscricao,
  subscricaoEstaAtiva,
  type ConversaoParaReembolso,
  type ConversaoNoWebhook,
  type DependenciasWebhook,
  type EstadoPagamento,
  type EstadoRetiradaAvulso,
} from "@/lib/stripe/webhook";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "thiago.pereira@dolado.pt";
const ESTADOS_REEMBOLSO_FALHADO = new Set(["failed", "canceled"]);

function escaparHtml(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Implementação real das dependências do webhook (e de /criar-conta):
// Supabase com service_role (só servidor — a autenticidade vem da assinatura
// Stripe ou da sessão validada junto do Stripe, antes de chegar aqui), API
// Stripe e Brevo. Qualquer erro de escrita lança: o webhook liberta o evento
// e devolve 500 para o Stripe voltar a tentar.

/** Envio de um e-mail transacional (Brevo). Substituível nos testes de contrato. */
export type EnviarEmail = (destinatario: string, assunto: string, html: string) => Promise<void>;

export async function enviarEmailReal(destinatario: string, assunto: string, html: string) {
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

/**
 * Só o Stripe e o envio de e-mails são substituíveis (testes de contrato com
 * a base de dados real); em produção usam-se sempre os reais.
 */
export type OpcoesDependencias = {
  stripe?: Pick<Stripe, "subscriptions" | "checkout" | "paymentIntents" | "refunds">;
  enviarEmail?: EnviarEmail;
};

export function criarDependenciasWebhook(opcoes: OpcoesDependencias = {}): DependenciasWebhook {
  const admin = createAdminClient();
  const getStripe = () => opcoes.stripe ?? stripeReal();
  const enviarEmailBrevo = opcoes.enviarEmail ?? enviarEmailReal;
  const agora = () => new Date().toISOString();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";

  async function contaDaSubscricao(subscriptionId: string) {
    const { data, error } = await admin
      .from("user_access")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .limit(1)
      .maybeSingle();
    falhar("user_access.select", error);
    return (data?.user_id as string | undefined) ?? null;
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

      // conversao_id vem da metadata do Stripe e não é coluna da tabela — ir
      // no upsert dava PGRST204 e o evento falhava (invoice.paid, updated…).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conversao_id, ...colunas } = snapshot;
      const { error } = await admin.from("stripe_subscriptions").upsert(
        { ...colunas, ...dadosCobranca, estado_em: estadoEm, updated_at: agora() },
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
          cancel_at_period_end: sub.cancel_at_period_end,
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

    async concederCreditoCaso(userId, origem, maximo, produto) {
      const { data, error } = await admin.rpc("conceder_credito_caso", {
        p_user_id: userId,
        p_origem: origem,
        p_maximo: maximo,
        ...(produto ? { p_produto: produto } : {}),
      });
      falhar("conceder_credito_caso", error);
      return data === true;
    },

    async retirarCreditoAvulso(origem, motivo) {
      const { data, error } = await admin.rpc("retirar_credito_avulso", {
        p_origem: origem,
        p_motivo: motivo,
      });
      falhar("retirar_credito_avulso", error);
      return data as EstadoRetiradaAvulso;
    },

    async avulsoDoPagamento(paymentIntentId) {
      const stripe = getStripe();
      // Só as compras únicas (Avulso e Caso Extra) são pagas em modo "payment".
      const sessoes = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      const sessao = sessoes.data[0];
      if (!sessao || sessao.mode !== "payment") return null;
      const { data, error } = await admin
        .from("stripe_payments")
        .select("plano")
        .eq("stripe_session_id", sessao.id)
        .maybeSingle();
      falhar("stripe_payments.select", error);
      if (data && data.plano !== "avulso" && data.plano !== "caso_extra") return null;

      const pagamento = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
      const cobranca = pagamento.latest_charge;
      const totalmenteReembolsado = typeof cobranca === "object" && cobranca !== null && cobranca.refunded === true;
      return { sessionId: sessao.id, totalmenteReembolsado };
    },

    async marcarPagamentoReembolsado(sessionId) {
      const { error } = await admin
        .from("stripe_payments")
        .update({ estado: "reembolsado" })
        .eq("stripe_session_id", sessionId);
      falhar("stripe_payments.update", error);
    },

    async congelarCreditosCaso(subscriptionId, em) {
      const { data, error } = await admin.rpc("congelar_creditos_caso", {
        p_subscription_id: subscriptionId,
        p_em: em,
      });
      falhar("congelar_creditos_caso", error);
      return Number(data ?? 0);
    },

    async restaurarCreditosCaso(subscriptionId, em, maximo) {
      const { data, error } = await admin.rpc("restaurar_creditos_caso", {
        p_subscription_id: subscriptionId,
        p_em: em,
        p_maximo: maximo,
      });
      falhar("restaurar_creditos_caso", error);
      return Number(data ?? 0);
    },

    async sincronizarCancelamento(subscriptionId, { agendado, fimPrevisto, plano, em }) {
      if (!agendado) {
        // Reversão: fecha o cancelamento em aberto, se houver.
        const { error } = await admin
          .from("subscricao_cancelamentos")
          .update({ revertido_em: em })
          .eq("stripe_subscription_id", subscriptionId)
          .is("revertido_em", null)
          .is("terminado_em", null);
        falhar("subscricao_cancelamentos.update", error);
        return;
      }
      const { data: aberto, error: erroLeitura } = await admin
        .from("subscricao_cancelamentos")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .is("revertido_em", null)
        .is("terminado_em", null)
        .maybeSingle();
      falhar("subscricao_cancelamentos.select", erroLeitura);
      if (aberto) {
        const { error } = await admin
          .from("subscricao_cancelamentos")
          .update({ fim_previsto_em: fimPrevisto })
          .eq("id", aberto.id);
        falhar("subscricao_cancelamentos.update", error);
        return;
      }
      // Agendado fora do portal (ex.: no Stripe Dashboard): regista sem motivo.
      const userId = await contaDaSubscricao(subscriptionId);
      if (!userId) return;
      const { error } = await admin.from("subscricao_cancelamentos").insert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        plano,
        origem: "stripe",
        pedido_em: em,
        fim_previsto_em: fimPrevisto,
      });
      // 23505: o portal registou o pedido entretanto — fica o do portal.
      if (error && error.code !== "23505") falhar("subscricao_cancelamentos.insert", error);
    },

    async registarFimSubscricao(subscriptionId, { plano, em }) {
      const { data: fechados, error } = await admin
        .from("subscricao_cancelamentos")
        .update({ terminado_em: em })
        .eq("stripe_subscription_id", subscriptionId)
        .is("revertido_em", null)
        .is("terminado_em", null)
        .select("id");
      falhar("subscricao_cancelamentos.update", error);
      if (fechados?.length) return;

      // Sem pedido em aberto: ou já está registado (evento repetido), ou
      // terminou sem pedido no portal (cancelamento imediato no Stripe,
      // falta de pagamento).
      const { data: jaTerminado, error: erroLeitura } = await admin
        .from("subscricao_cancelamentos")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .not("terminado_em", "is", null)
        .limit(1)
        .maybeSingle();
      falhar("subscricao_cancelamentos.select", erroLeitura);
      if (jaTerminado) return;
      const userId = await contaDaSubscricao(subscriptionId);
      if (!userId) return;
      const { error: erroInsert } = await admin.from("subscricao_cancelamentos").insert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        plano,
        origem: "stripe",
        terminado_em: em,
      });
      falhar("subscricao_cancelamentos.insert", erroInsert);
    },

    async obterConversao(conversaoId) {
      if (!/^[0-9a-f-]{36}$/i.test(conversaoId)) return null;
      const { data, error } = await admin
        .from("conversoes_avulso")
        .select("id, estado, checkout_session_id, stripe_payments(stripe_session_id)")
        .eq("id", conversaoId)
        .maybeSingle();
      falhar("conversoes_avulso.select", error);
      if (!data) return null;
      const pagamento = data.stripe_payments as unknown as { stripe_session_id: string } | { stripe_session_id: string }[] | null;
      const avulso = Array.isArray(pagamento) ? pagamento[0] : pagamento;
      return {
        id: data.id as string,
        estado: data.estado as ConversaoNoWebhook["estado"],
        checkout_session_id: (data.checkout_session_id as string | null) ?? null,
        avulso_session_id: avulso?.stripe_session_id ?? "",
      };
    },

    async anularConversao(conversaoId, checkoutSessionId, motivo) {
      // Atómico: só a conversão aberta deste checkout passa a anulada.
      const { error } = await admin
        .from("conversoes_avulso")
        .update({ estado: "anulada", anulada_em: agora(), anulada_motivo: motivo, updated_at: agora() })
        .eq("id", conversaoId)
        .eq("estado", "checkout_aberto")
        .eq("checkout_session_id", checkoutSessionId);
      falhar("conversoes_avulso.update", error);
    },

    async cancelarSubscricaoStripe(subscriptionId) {
      const stripe = getStripe();
      const atual = await stripe.subscriptions.retrieve(subscriptionId);
      if (atual.status === "canceled" || atual.status === "incomplete_expired") return;
      // Imediato, sem fatura final nem prorrateio: a 1.ª fatura foi 0 €.
      await stripe.subscriptions.cancel(
        subscriptionId,
        { invoice_now: false, prorate: false },
        { idempotencyKey: `conversao-anulada-${subscriptionId}` },
      );
    },

    async reclamarConversao(conversaoId, checkoutSessionId, subscriptionId) {
      const colunas =
        "id, plano_destino, estado, checkout_session_id, refund_montante_centimos, refund_id, requer_intervencao, stripe_payments(stripe_session_id)";
      type Linha = {
        id: string;
        plano_destino: "protecao" | "caso_protecao";
        estado: string;
        checkout_session_id: string | null;
        refund_montante_centimos: number;
        refund_id: string | null;
        requer_intervencao: boolean;
        stripe_payments: { stripe_session_id: string } | { stripe_session_id: string }[] | null;
      };
      const paraConversao = (l: Linha): ConversaoParaReembolso => {
        const avulso = Array.isArray(l.stripe_payments) ? l.stripe_payments[0] : l.stripe_payments;
        return {
          id: l.id,
          plano_destino: l.plano_destino,
          avulso_session_id: avulso?.stripe_session_id ?? "",
          refund_montante_centimos: l.refund_montante_centimos,
          refund_id: l.refund_id,
          requer_intervencao: l.requer_intervencao,
        };
      };

      // Atómico: só converte se ainda estiver em checkout_aberto E for este
      // o checkout em curso (um checkout antigo, substituído, não converte).
      const { data: convertida, error } = await admin
        .from("conversoes_avulso")
        .update({
          estado: "convertido",
          stripe_subscription_id: subscriptionId,
          convertido_em: agora(),
          updated_at: agora(),
        })
        .eq("id", conversaoId)
        .eq("estado", "checkout_aberto")
        .eq("checkout_session_id", checkoutSessionId)
        .select(colunas)
        .maybeSingle();
      falhar("conversoes_avulso.update", error);
      if (convertida) return paraConversao(convertida as unknown as Linha);

      // Reenvio: já convertida por este mesmo checkout → continua o passo do
      // reembolso (que é idempotente).
      const { data: atual, error: erroLeitura } = await admin
        .from("conversoes_avulso")
        .select(colunas)
        .eq("id", conversaoId)
        .maybeSingle();
      falhar("conversoes_avulso.select", erroLeitura);
      const linha = atual as unknown as Linha | null;
      if (linha && linha.estado === "convertido" && linha.checkout_session_id === checkoutSessionId) {
        return paraConversao(linha);
      }
      return null;
    },

    async criarReembolsoConversao(conversao) {
      const stripe = getStripe();
      const avulso = await stripe.checkout.sessions.retrieve(conversao.avulso_session_id);
      const paymentIntentId = idDe(avulso.payment_intent);
      if (!paymentIntentId) return { ok: false, motivo: "pagamento Avulso sem PaymentIntent" };

      // Validar antes de criar: se já existe um reembolso desta conversão
      // (ex.: criado numa tentativa anterior cuja resposta se perdeu), usa-o.
      const existentes = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
      const existente = existentes.data.find((r) => r.metadata?.conversao_id === conversao.id);
      if (existente) {
        return { ok: true, id: existente.id, status: existente.status, payment_intent_id: paymentIntentId };
      }

      try {
        // Sem "refund_application_fee"/destino: volta ao método de pagamento
        // original do Avulso.
        const refund = await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            amount: conversao.refund_montante_centimos,
            reason: "requested_by_customer",
            metadata: { conversao_id: conversao.id, plano_destino: conversao.plano_destino },
          },
          { idempotencyKey: `conversao-reembolso-${conversao.id}` },
        );
        return { ok: true, id: refund.id, status: refund.status, payment_intent_id: paymentIntentId };
      } catch (erro) {
        const tipo = (erro as { type?: string }).type;
        if (tipo === "StripeInvalidRequestError" || tipo === "StripeCardError") {
          // Definitivo (ex.: já totalmente reembolsado, montante inválido).
          return { ok: false, motivo: (erro as { code?: string }).code ?? "pedido recusado pelo Stripe" };
        }
        throw erro; // transitório: o webhook devolve 500 e o Stripe reenvia
      }
    },

    async gravarReembolsoConversao(conversaoId, reembolso) {
      const { error } = await admin
        .from("conversoes_avulso")
        .update({
          refund_id: reembolso.id,
          refund_estado: reembolso.status,
          payment_intent_id: reembolso.payment_intent_id,
          refund_atualizado_em: agora(),
          updated_at: agora(),
        })
        .eq("id", conversaoId);
      falhar("conversoes_avulso.update", error);
    },

    async marcarIntervencaoConversao(conversaoId, motivo) {
      const { error } = await admin
        .from("conversoes_avulso")
        .update({ requer_intervencao: true, intervencao_motivo: motivo, updated_at: agora() })
        .eq("id", conversaoId);
      falhar("conversoes_avulso.update", error);
    },

    async atualizarReembolso(refundId, status, conversaoId) {
      // Pelo refund_id; ou pela conversão nos metadados (refund.created pode
      // chegar antes de o refund_id ter sido gravado).
      // Os dois valores entram num filtro PostgREST: só formatos esperados.
      if (!/^re_[A-Za-z0-9]+$/.test(refundId)) return null;
      const conversaoValida = conversaoId && /^[0-9a-f-]{36}$/i.test(conversaoId) ? conversaoId : null;
      let consulta = admin.from("conversoes_avulso").select("id, refund_id, refund_estado");
      consulta = conversaoValida
        ? consulta.or(`refund_id.eq.${refundId},id.eq.${conversaoValida}`)
        : consulta.eq("refund_id", refundId);
      const { data, error } = await consulta.limit(1).maybeSingle();
      falhar("conversoes_avulso.select", error);
      if (!data) return null;
      if (data.refund_id && data.refund_id !== refundId) return null; // outro refund, não o desta conversão

      const passouAFalhado =
        ESTADOS_REEMBOLSO_FALHADO.has(status ?? "") && !ESTADOS_REEMBOLSO_FALHADO.has(data.refund_estado ?? "");
      const { error: erroUpdate } = await admin
        .from("conversoes_avulso")
        .update({ refund_id: refundId, refund_estado: status, refund_atualizado_em: agora(), updated_at: agora() })
        .eq("id", data.id);
      falhar("conversoes_avulso.update", erroUpdate);
      return { conversaoId: data.id as string, passouAFalhado };
    },

    async notificarAdmin(assunto, texto) {
      await enviarEmailBrevo(ADMIN_EMAIL, assunto, `<p>${escaparHtml(texto)}</p>`);
    },

    async ligarConsentimento(consentimentoId, { sessionId, subscriptionId, email, userId }) {
      const { data: atual, error } = await admin
        .from("consentimentos_compra")
        .select("id, checkout_session_id, stripe_payment_id, stripe_subscription_id, email, user_id, termos_versao, pediu_inicio_imediato_em")
        .eq("id", consentimentoId)
        .maybeSingle();
      falhar("consentimentos_compra.select", error);
      if (!atual) return null;
      // Registo de outra sessão: não se mexe (nem se usa para o e-mail).
      if (atual.checkout_session_id && atual.checkout_session_id !== sessionId) return null;

      const { data: pagamento, error: erroPagamento } = await admin
        .from("stripe_payments")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      falhar("stripe_payments.select", erroPagamento);

      // Só preenche o que está vazio — os campos de prova são imutáveis
      // (trigger) e um webhook repetido não muda nada.
      const ligacoes: Record<string, string> = {};
      if (!atual.checkout_session_id) ligacoes.checkout_session_id = sessionId;
      if (!atual.stripe_payment_id && pagamento?.id) ligacoes.stripe_payment_id = pagamento.id as string;
      if (!atual.stripe_subscription_id && subscriptionId) ligacoes.stripe_subscription_id = subscriptionId;
      if (!atual.email && email) ligacoes.email = email;
      if (!atual.user_id && userId) ligacoes.user_id = userId;
      if (Object.keys(ligacoes).length > 0) {
        const { error: erroUpdate } = await admin
          .from("consentimentos_compra")
          .update(ligacoes)
          .eq("id", consentimentoId);
        falhar("consentimentos_compra.update", erroUpdate);
      }
      return {
        termos_versao: atual.termos_versao as string,
        pediu_inicio_imediato: !!atual.pediu_inicio_imediato_em,
      };
    },

    async converterPedidoEmCaso(pedidoId, userId, origemAvulso) {
      const { data, error } = await admin.rpc("converter_pedido_em_caso", {
        p_pedido_id: pedidoId,
        p_user_id: userId,
        p_origem_avulso: origemAvulso,
      });
      falhar("converter_pedido_em_caso", error);
      // Sugestão do texto pela IA: depois da resposta ao Stripe, idempotente
      // (um reenvio do evento não gera outra), nunca bloqueia o webhook.
      agendarRascunhoIA(data as string | null);
      return (data as string | null) ?? null;
    },

    async registarCompraSemConta(sessionId, email, plano) {
      const { data, error } = await admin.rpc("registar_compra_sem_conta", {
        p_session_id: sessionId,
        p_email: email,
        p_plano: plano,
      });
      falhar("registar_compra_sem_conta", error);
      return data === true;
    },

    async subscricaoAtivaDaConta(userId) {
      const { data, error } = await admin
        .from("user_access")
        .select("subscription_plan, subscription_status, stripe_subscription_id")
        .eq("user_id", userId)
        .maybeSingle();
      falhar("user_access.select", error);
      if (!data?.stripe_subscription_id || data.subscription_plan === "none") return null;
      return subscricaoEstaAtiva(data.subscription_status ?? "") ? (data.stripe_subscription_id as string) : null;
    },

    async registarSubscricaoDuplicada({ novaSubscriptionId, userId, subscricaoExistenteId, sessionId, origem }) {
      const { data, error } = await admin
        .from("subscricoes_duplicadas")
        .upsert(
          {
            nova_subscription_id: novaSubscriptionId,
            user_id: userId,
            subscricao_existente_id: subscricaoExistenteId,
            stripe_session_id: sessionId,
            origem,
          },
          { onConflict: "nova_subscription_id", ignoreDuplicates: true },
        )
        .select("nova_subscription_id");
      falhar("subscricoes_duplicadas.insert", error);
      return (data?.length ?? 0) > 0;
    },

    async enviarEmailPagamentoConfirmado({ email, plano, contaExiste, sessionId, valorPagoCentimos, renovacao, consentimento }) {
      // Sem conta ligada, mas o e-mail do Checkout já tem conta: iniciar
      // sessão e associar a compra (nunca criar uma segunda conta).
      let associar = false;
      if (!contaExiste) {
        const { data, error } = await admin.rpc("conta_existe_com_email", { p_email: email });
        associar = !error && data === true;
      }
      const ligacao = contaExiste
        ? `${siteUrl}/entrar`
        : associar
          ? `${siteUrl}/associar-compra?session_id=${encodeURIComponent(sessionId)}`
          : `${siteUrl}/criar-conta?session_id=${encodeURIComponent(sessionId)}`;
      await enviarEmailBrevo(
        email,
        contaExiste
          ? "Pagamento confirmado — o seu acesso está ativo ✓"
          : associar
            ? "Pagamento confirmado — Associe esta compra à sua conta ✓"
            : "Pagamento confirmado — Falta criar a sua palavra-passe ✓",
        montarHtmlBoasVindasPagamento(plano, {
          contaExiste,
          associarCompra: associar,
          ligacao,
          valorPagoCentimos,
          renovacao,
          consentimento,
          portalUrl: siteUrl,
        }),
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
