import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import {
  escolherAvulsoParaConversao,
  sessoesAvulsoDisponiveis,
  type ConversaoExistente,
  type CreditoConcedido,
  type PagamentoAvulso,
  type PlanoDestino,
} from "@/lib/stripe/conversao";
import { planoDoPreco } from "@/lib/stripe/planos";
import { subscricaoEstaAtiva } from "@/lib/stripe/webhook";
import { criarDependenciasWebhook, enviarEmailReal, type OpcoesDependencias } from "@/lib/stripe/webhookDependencias";
import type { ContaAutenticada, DependenciasAssociacao, ResultadoReclamacao } from "@/lib/compra/associacao";
import type { PlanoSubscricaoAtiva } from "@/lib/compra/decisao";
import type { CompraPendente, DependenciasLembretes } from "@/lib/compra/lembretes";
import { idiomaDoEmailPagamento } from "@/lib/idiomaConta";
import { IDIOMA_PADRAO } from "@/i18n/config";

// Implementações reais (Supabase service_role + Stripe) da decisão de
// compra, da associação de compras e dos lembretes. Só código de servidor:
// quem chama tem de ter validado a sessão antes (ver cada função).

/** Customer Stripe já associado à conta (se houver), para nunca criar outro. */
export async function customerDaConta(userId: string) {
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

/** Subscrições ativas (active/trialing/past_due) no Stripe para este Customer, pelo plano do price. */
export async function subscricoesAtivasDoCustomer(customerId: string | null): Promise<PlanoSubscricaoAtiva[]> {
  if (!customerId) return [];
  const lista = await getStripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return lista.data
    .filter((s) => subscricaoEstaAtiva(s.status))
    .map((s) => planoDoPreco(s.items?.data?.[0]?.price?.id ?? null));
}

/** Dependências reais da associação. A conta vem SEMPRE da sessão do pedido. */
export function dependenciasAssociacao(
  contaAutenticada: () => Promise<ContaAutenticada | null>,
  opcoes: OpcoesDependencias = {},
): DependenciasAssociacao {
  const admin = createAdminClient();
  return {
    contaAutenticada,
    async lerSessaoStripe(sessionId) {
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
      const stripe = opcoes.stripe ?? getStripe();
      return (await stripe.checkout.sessions.retrieve(sessionId).catch(() => null)) as Stripe.Checkout.Session | null;
    },
    async reclamar({ sessionId, userId, customerId, subscriptionId, subscricaoExistente }) {
      const { data, error } = await admin.rpc("reclamar_compra_sem_conta", {
        p_session_id: sessionId,
        p_user_id: userId,
        p_customer_id: customerId,
        p_subscription_id: subscriptionId,
        p_subscricao_existente: subscricaoExistente,
      });
      if (error) throw Object.assign(new Error("reclamar_compra_sem_conta falhou"), { code: error.code });
      return data as ResultadoReclamacao;
    },
    webhook: criarDependenciasWebhook(opcoes),
  };
}

export async function contaExisteComEmail(email: string) {
  const { data, error } = await createAdminClient().rpc("conta_existe_com_email", { p_email: email });
  if (error) throw Object.assign(new Error("conta_existe_com_email falhou"), { code: error.code });
  return data === true;
}

export function dependenciasLembretes(opcoes: Pick<OpcoesDependencias, "enviarEmail" | "stripe"> = {}): DependenciasLembretes {
  const admin = createAdminClient();
  const webhook = criarDependenciasWebhook(opcoes);
  return {
    async pendentes(agora) {
      const { data, error } = await admin.rpc("compras_sem_conta_pendentes", { p_agora: agora.toISOString() });
      if (error) throw Object.assign(new Error("compras_sem_conta_pendentes falhou"), { code: error.code });
      return (data ?? []) as CompraPendente[];
    },
    async reservar(sessionId, marco, agora) {
      const { data, error } = await admin.rpc("reservar_lembrete_compra", {
        p_session_id: sessionId,
        p_marco: marco,
        p_agora: agora.toISOString(),
      });
      if (error) throw Object.assign(new Error("reservar_lembrete_compra falhou"), { code: error.code });
      return data === true;
    },
    contaExisteComEmail,
    enviarEmail: opcoes.enviarEmail ?? enviarEmailReal,
    // Só leitura da sessão (o locale foi posto ao abrir o Checkout em /en).
    async idiomaDaCompra(sessionId) {
      try {
        const sessao = await (opcoes.stripe ?? getStripe()).checkout.sessions.retrieve(sessionId);
        return idiomaDoEmailPagamento(null, sessao.locale);
      } catch {
        return IDIOMA_PADRAO;
      }
    },
    notificarAdmin: (assunto, texto) => webhook.notificarAdmin(assunto, texto),
  };
}

/** O que um Avulso por usar cobriria na adesão a este plano (igual ao painel do portal). */
export async function ofertaConversaoDaConta(userId: string, plano: PlanoDestino) {
  const admin = createAdminClient();
  const [{ data: pagamentos }, { data: conversoes }, { data: creditos }] = await Promise.all([
    admin
      .from("stripe_payments")
      .select("id, stripe_session_id, user_id, plano, estado, valor_total_centimos, created_at")
      .eq("user_id", userId)
      .eq("plano", "avulso"),
    admin.from("conversoes_avulso").select("id, stripe_payment_id, estado, checkout_session_id").eq("user_id", userId),
    admin.from("case_credit_grants").select("origem, estado").eq("user_id", userId).eq("estado", "disponivel"),
  ]);
  const escolha = escolherAvulsoParaConversao(
    (pagamentos ?? []) as PagamentoAvulso[],
    (conversoes ?? []) as ConversaoExistente[],
    userId,
    plano,
    sessoesAvulsoDisponiveis((creditos ?? []) as CreditoConcedido[]),
  );
  return escolha ? { mensalidade: escolha.calculo.mensalidade, reembolso: escolha.calculo.reembolso } : null;
}
