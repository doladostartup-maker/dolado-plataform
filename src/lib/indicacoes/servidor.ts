import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe as stripeReal } from "@/lib/stripe/client";
import { planoDoPreco } from "@/lib/stripe/planos";
import {
  CHECKOUT_COM_RECOMPENSA_MINUTOS,
  COOKIE_INDICACAO,
  CUPAO_INDICACAO_NOVO_CLIENTE,
  CUPAO_INDICACAO_RECOMPENSA,
  INDICACAO_JANELA_DIAS,
  RESERVA_CHECKOUT_MINUTOS,
  camposDescontoCheckout,
  cupaoConforme,
  escolherDescontoCheckout,
  faturaComCupao,
  gerarCodigo,
  indicacoesAtivas,
  subscricaoAceitaRecompensa,
  urlIndicacao,
  visitaDoCookie,
  type ContextoDescontoCheckout,
  type TipoDescontoIndicacao,
} from "./regras";
import type { DependenciasIndicacoes } from "./webhook";

// Programa de indicação no servidor: código da conta, visitas, atribuição,
// desconto no Checkout e as dependências do webhook. Usa a service role —
// quem chama já validou a sessão (o userId vem sempre da sessão, nunca do
// browser) ou a assinatura do Stripe. Regras em ./regras.ts; decisões
// atómicas nas funções indicacao_* da base de dados.

type Admin = ReturnType<typeof createAdminClient>;

function falhar(contexto: string, erro: { code?: string } | null) {
  if (!erro) return;
  // Só o código: a mensagem do Postgres pode trazer valores das linhas.
  throw Object.assign(new Error(`${contexto} falhou`), { code: erro.code || contexto });
}

const agoraIso = () => new Date().toISOString();

/** Descontos de quem indicou que podem ser usados agora (disponíveis ou com reserva de checkout expirada). */
async function contarRecompensasUsaveis(admin: Admin, userId: string) {
  const { count, error } = await admin
    .from("indicacoes_recompensas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("expira_em", agoraIso())
    .or(`estado.eq.disponivel,and(estado.eq.reservada,reserva_expira_em.lt.${agoraIso()})`);
  falhar("indicacoes_recompensas.count", error);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Código e visitas
// ---------------------------------------------------------------------------

/** Código da conta (criado na primeira vez; nunca muda). */
export async function codigoDaConta(userId: string): Promise<string> {
  const admin = createAdminClient();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data, error } = await admin.from("indicacoes_codigos").select("codigo").eq("user_id", userId).maybeSingle();
    falhar("indicacoes_codigos.select", error);
    if (data?.codigo) return data.codigo as string;
    const { error: erroInsert } = await admin
      .from("indicacoes_codigos")
      .insert({ user_id: userId, codigo: gerarCodigo(randomBytes(8)) });
    // 23505: código repetido (tenta outro) ou a conta já tem código (lê-o).
    if (erroInsert && erroInsert.code !== "23505") falhar("indicacoes_codigos.insert", erroInsert);
  }
  throw Object.assign(new Error("indicacoes_codigos: sem código"), { code: "indicacoes_codigo" });
}

/**
 * Visita pelo link, chamada só pelo endpoint que confirmou consentimento de
 * marketing. Reutiliza a visita do cookie se for do mesmo código (um
 * recarregamento não conta duas vezes). null = código inexistente.
 */
export async function registarVisita(codigo: string, visitaAtual: string | null): Promise<string | null> {
  const admin = createAdminClient();
  if (visitaAtual) {
    const { data } = await admin.from("indicacoes_visitas").select("id, codigo").eq("id", visitaAtual).maybeSingle();
    if (data?.codigo === codigo) return data.id as string;
  }
  const { data, error } = await admin.from("indicacoes_visitas").insert({ codigo }).select("id").maybeSingle();
  // 23503: código inexistente (chave estrangeira) — sem visita, sem cookie.
  if (error?.code === "23503") return null;
  falhar("indicacoes_visitas.insert", error);
  return (data?.id as string | undefined) ?? null;
}

/**
 * Atribui a conta à visita guardada neste browser (se houver). A base de
 * dados decide e recusa: auto-indicação, conta já cliente, visita com mais de
 * 30 dias, conta já atribuída (a primeira atribuição nunca muda).
 */
export async function atribuirIndicacaoDoBrowser(userId: string): Promise<string> {
  if (!indicacoesAtivas()) return "desligado";
  // O cookie é httpOnly e só é emitido pelo endpoint depois de confirmar o
  // consentimento do Cookiebot; a retirada apaga-o no domínio principal.
  const jar = await cookies();
  const visita = visitaDoCookie(jar.get(COOKIE_INDICACAO)?.value);
  if (!visita) return "sem_visita";
  const { data, error } = await createAdminClient().rpc("indicacao_atribuir", {
    p_referred: userId,
    p_visita: visita,
    p_janela_dias: INDICACAO_JANELA_DIAS,
  });
  falhar("indicacao_atribuir", error);
  return data as string;
}

/**
 * Este browser chegou por um link de indicação ainda válido (visita com
 * menos de 30 dias)? Só para avisar quem compra sem conta de que precisa de
 * conta para ativar o desconto — nunca dá desconto.
 */
export async function visitaDeIndicacaoNoBrowser(): Promise<boolean> {
  if (!indicacoesAtivas()) return false;
  const jar = await cookies();
  const visita = visitaDoCookie(jar.get(COOKIE_INDICACAO)?.value);
  if (!visita) return false;
  const { data } = await createAdminClient()
    .from("indicacoes_visitas")
    .select("criado_em")
    .eq("id", visita)
    .maybeSingle();
  return !!data && Date.parse(data.criado_em as string) > Date.now() - INDICACAO_JANELA_DIAS * 86_400_000;
}

/** Situação da conta para escolher o desconto (sem dados de terceiros). */
export async function estadoIndicacaoDaConta(userId: string) {
  const admin = createAdminClient();
  const [{ data: ind, error }, recompensas] = await Promise.all([
    admin.from("indicacoes").select("estado").eq("referred_user_id", userId).maybeSingle(),
    contarRecompensasUsaveis(admin, userId),
  ]);
  falhar("indicacoes.select", error);
  let novoClienteIndicado = ind?.estado === "registada";
  if (novoClienteIndicado) {
    // Uma compra feita por outra via (ex.: associada depois) também conta.
    const { data: jaCliente, error: erroCliente } = await admin.rpc("indicacao_conta_ja_cliente", { p_user: userId });
    falhar("indicacao_conta_ja_cliente", erroCliente);
    novoClienteIndicado = jaCliente !== true;
  }
  return { novoClienteIndicado, recompensasDisponiveis: recompensas };
}

/** Área "Indique a DoLado" do portal: só números da própria conta. */
export async function resumoIndicacaoDaConta(userId: string) {
  const admin = createAdminClient();
  const codigo = await codigoDaConta(userId);
  const { data, error } = await admin
    .from("indicacoes_recompensas")
    .select("estado, expira_em")
    .eq("user_id", userId)
    .order("expira_em", { ascending: true });
  falhar("indicacoes_recompensas.select", error);
  const linhas = (data ?? []) as { estado: string; expira_em: string | null }[];
  const agora = Date.now();
  // Disponíveis: por usar (ou à espera da próxima cobrança) e dentro da validade.
  const disponiveis = linhas.filter(
    (r) => (r.estado === "disponivel" || r.estado === "reservada") && r.expira_em && Date.parse(r.expira_em) > agora,
  );
  return {
    codigo,
    url: urlIndicacao(codigo),
    disponiveis: disponiveis.length,
    validades: disponiveis.map((r) => r.expira_em as string),
    emVerificacao: linhas.filter((r) => r.estado === "em_revisao").length,
    usados: linhas.filter((r) => r.estado === "usada").length,
    expirados: linhas.filter((r) => r.estado === "expirada").length,
    concluidas: linhas.filter((r) => r.estado !== "anulada").length,
  };
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

async function garantirCupao(stripe: Pick<Stripe, "coupons">, cupao: typeof CUPAO_INDICACAO_NOVO_CLIENTE) {
  try {
    const atual = await stripe.coupons.retrieve(cupao.id);
    if (!cupaoConforme(atual, cupao)) throw new Error("cupão de indicação com configuração inesperada");
  } catch (erro) {
    if ((erro as { code?: string }).code !== "resource_missing") throw erro;
    await stripe.coupons.create({ id: cupao.id, percent_off: cupao.percent_off, duration: cupao.duration, name: cupao.name });
  }
}

export type DescontoPreparado = {
  tipo: TipoDescontoIndicacao;
  /** Campos da Checkout Session (desconto e, com reserva, prazo da sessão). */
  parametros: Pick<Stripe.Checkout.SessionCreateParams, "discounts" | "expires_at">;
  metadata: Record<string, string>;
  /** Liga a reserva à sessão criada. */
  aposCriar(sessionId: string): Promise<void>;
  /** A sessão não foi criada: o desconto volta a estar disponível. */
  seFalhar(): Promise<void>;
};

/** Campos de desconto de um Checkout (regra em ./regras.ts). */
export function camposDesconto(d: DescontoPreparado | null): Partial<Stripe.Checkout.SessionCreateParams> {
  return camposDescontoCheckout(d?.parametros ?? null);
}

/**
 * Desconto de indicação para um Checkout com conta (no máximo um). O
 * desconto de quem indicou fica reservado para esta sessão; a sessão expira
 * antes da reserva, para o mesmo desconto nunca servir dois pagamentos.
 */
export async function prepararDescontoCheckout(
  ctx: Omit<ContextoDescontoCheckout, "novoClienteIndicado" | "recompensasDisponiveis"> & { userId: string },
): Promise<DescontoPreparado | null> {
  if (!indicacoesAtivas()) return null;
  await atribuirIndicacaoDoBrowser(ctx.userId);
  const estado = await estadoIndicacaoDaConta(ctx.userId);
  const tipo = escolherDescontoCheckout({ ...ctx, ...estado });
  if (!tipo) return null;

  const stripe = stripeReal();
  const admin = createAdminClient();
  const nada = async () => undefined;

  if (tipo === "novo_cliente") {
    await garantirCupao(stripe, CUPAO_INDICACAO_NOVO_CLIENTE);
    return {
      tipo,
      parametros: { discounts: [{ coupon: CUPAO_INDICACAO_NOVO_CLIENTE.id }] },
      metadata: { indicacao_desconto: "novo_cliente" },
      aposCriar: nada,
      seFalhar: nada,
    };
  }

  const provisoria = `checkout-pendente:${randomUUID()}`;
  const expira = new Date(Date.now() + RESERVA_CHECKOUT_MINUTOS * 60_000).toISOString();
  const { data: id, error } = await admin.rpc("indicacao_reservar_recompensa", {
    p_user: ctx.userId,
    p_origem: provisoria,
    p_expira: expira,
  });
  falhar("indicacao_reservar_recompensa", error);
  if (!id) return null;
  const libertar = async () => {
    await admin.rpc("indicacao_libertar_reserva", { p_origem: provisoria });
  };
  try {
    await garantirCupao(stripe, CUPAO_INDICACAO_RECOMPENSA);
  } catch (erro) {
    await libertar();
    throw erro;
  }
  return {
    tipo,
    parametros: {
      discounts: [{ coupon: CUPAO_INDICACAO_RECOMPENSA.id }],
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_COM_RECOMPENSA_MINUTOS * 60,
    },
    metadata: { indicacao_desconto: "recompensa", indicacao_recompensa_id: id as string },
    async aposCriar(sessionId) {
      await admin.rpc("indicacao_atualizar_reserva", { p_id: id, p_origem: `checkout:${sessionId}`, p_expira: expira });
    },
    seFalhar: libertar,
  };
}

/** Atribui (se houver visita) e devolve a situação da conta — para páginas que mostram preços. */
export async function situacaoIndicacaoNaCompra(userId: string) {
  if (!indicacoesAtivas()) return null;
  try {
    await atribuirIndicacaoDoBrowser(userId);
    return await estadoIndicacaoDaConta(userId);
  } catch {
    return null; // a página mostra o preço normal; o Checkout decide de novo
  }
}

/** O que mostrar no modal de confirmação (o servidor volta a decidir ao abrir o Checkout). */
export async function ofertaIndicacaoParaConta(
  userId: string,
  ctx: Omit<ContextoDescontoCheckout, "novoClienteIndicado" | "recompensasDisponiveis" | "prescindiu">,
) {
  if (!indicacoesAtivas()) return { desconto: null, novoClienteIndicado: false };
  await atribuirIndicacaoDoBrowser(userId);
  const estado = await estadoIndicacaoDaConta(userId);
  return {
    desconto: escolherDescontoCheckout({ ...ctx, ...estado, prescindiu: false }),
    novoClienteIndicado: estado.novoClienteIndicado,
  };
}

// ---------------------------------------------------------------------------
// Dependências do webhook
// ---------------------------------------------------------------------------

type StripeIndicacoes = Pick<
  Stripe,
  "coupons" | "subscriptions" | "invoices" | "invoicePayments" | "paymentIntents" | "customers"
>;

function idDe(valor: string | { id?: string } | null | undefined) {
  if (!valor) return null;
  return typeof valor === "string" ? valor : (valor.id ?? null);
}

function impressaoDigital(pm: Stripe.PaymentMethod | null | undefined) {
  return pm?.card?.fingerprint ?? pm?.sepa_debit?.fingerprint ?? null;
}

export function criarDependenciasIndicacoes(opcoes: {
  notificarAdmin(assunto: string, texto: string): Promise<void>;
  registar(linha: { evento: string; resultado: string; erro_codigo?: string }): void;
  stripe?: StripeIndicacoes;
}): DependenciasIndicacoes {
  const admin = createAdminClient();
  const stripe = () => opcoes.stripe ?? stripeReal();

  async function rpc<T>(nome: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(nome, args);
    falhar(nome, error);
    return data as T;
  }

  return {
    async indicacaoPorDecidir(userId) {
      const { data, error } = await admin
        .from("indicacoes")
        .select("referrer_user_id")
        .eq("referred_user_id", userId)
        .eq("estado", "registada")
        .maybeSingle();
      falhar("indicacoes.select", error);
      return data ? { referrerUserId: data.referrer_user_id as string } : null;
    },

    async paymentIntentDaCompra(session) {
      const direto = idDe(session.payment_intent);
      if (direto) return direto;
      const invoiceId = idDe(session.invoice);
      if (!invoiceId) return null;
      try {
        const pagamentos = await stripe().invoicePayments.list({ invoice: invoiceId, limit: 1 });
        return idDe(pagamentos.data[0]?.payment?.payment_intent);
      } catch {
        return null; // sem PaymentIntent: a reversão por reembolso fica para o admin
      }
    },

    async sinalAutoIndicacao({ referrerUserId, referredCustomerId, paymentIntentId }) {
      try {
        const { data: conta } = await admin
          .from("user_access")
          .select("stripe_customer_id")
          .eq("user_id", referrerUserId)
          .maybeSingle();
        const customer = conta?.stripe_customer_id as string | null | undefined;
        if (!customer) return null;
        if (referredCustomerId && referredCustomerId === customer) return "mesmo_cliente_stripe";
        if (!paymentIntentId) return null;
        const pi = await stripe().paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
        const impressao = impressaoDigital(pi.payment_method as Stripe.PaymentMethod | null);
        if (!impressao) return null;
        const meios = await stripe().customers.listPaymentMethods(customer, { limit: 100 });
        return meios.data.some((m) => impressaoDigital(m) === impressao) ? "mesmo_meio_de_pagamento" : null;
      } catch {
        return null; // nunca bloqueia nem recusa por falha na verificação
      }
    },

    async confirmarCompra(d) {
      return rpc("indicacao_confirmar_compra", {
        p_referred: d.referredUserId,
        p_session: d.sessionId,
        p_produto: d.produto,
        p_valor_centimos: d.valorCentimos,
        p_desconto_centimos: d.descontoCentimos,
        p_com_desconto_indicacao: d.comDescontoIndicacao,
        p_customer: d.customerId,
        p_subscription: d.subscriptionId,
        p_payment_intent: d.paymentIntentId,
        p_suspeita: d.suspeita,
      });
    },

    async usarRecompensa(recompensaId, userId, usadaOrigem, descontoCentimos) {
      return rpc("indicacao_usar_recompensa", {
        p_id: recompensaId,
        p_user: userId,
        p_usada_origem: usadaOrigem,
        p_desconto_centimos: descontoCentimos,
      });
    },

    async atualizarReserva(recompensaId, origem, expiraEm) {
      return rpc("indicacao_atualizar_reserva", { p_id: recompensaId, p_origem: origem, p_expira: expiraEm });
    },

    async libertarReserva(origem) {
      return rpc("indicacao_libertar_reserva", { p_origem: origem });
    },

    async reverterCompra(sessionId, paymentIntentId, motivo) {
      return rpc("indicacao_reverter_compra", { p_session: sessionId, p_payment_intent: paymentIntentId, p_motivo: motivo });
    },

    async pagamentoTotalmenteReembolsado(paymentIntentId) {
      const pi = await stripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
      const carga = pi.latest_charge as Stripe.Charge | string | null;
      return typeof carga === "object" && carga !== null && carga.refunded === true;
    },

    async recompensaDaFatura(invoiceId, subscriptionId) {
      const { data, error } = await admin
        .from("indicacoes_recompensas")
        .select("id, user_id")
        .eq("estado", "reservada")
        .eq("reserva_origem", `subscricao:${subscriptionId}`)
        .maybeSingle();
      falhar("indicacoes_recompensas.select", error);
      if (!data) return null;
      const fatura = await stripe().invoices.retrieve(invoiceId, { expand: ["discounts"] });
      if (!faturaComCupao(fatura.discounts as Parameters<typeof faturaComCupao>[0], CUPAO_INDICACAO_RECOMPENSA.id)) return null;
      const desconto = (fatura.total_discount_amounts ?? []).reduce((soma, d) => soma + (d.amount ?? 0), 0);
      return { recompensaId: data.id as string, userId: data.user_id as string, descontoCentimos: desconto || null };
    },

    async aplicarRecompensaNaSubscricao(userId) {
      if (!indicacoesAtivas()) return "desligado";
      const { data: conta, error } = await admin
        .from("user_access")
        .select("subscription_plan, subscription_status, stripe_subscription_id, cancel_at_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      falhar("user_access.select", error);
      const sub = conta?.stripe_subscription_id as string | null | undefined;
      if (!sub) return "sem_subscricao";
      const origem = `subscricao:${sub}`;

      const { data: reservada } = await admin
        .from("indicacoes_recompensas")
        .select("id")
        .eq("estado", "reservada")
        .eq("reserva_origem", origem)
        .maybeSingle();
      if (reservada) return "ja_aplicada";
      if ((await contarRecompensasUsaveis(admin, userId)) === 0) return "sem_recompensa";
      if (
        !subscricaoAceitaRecompensa({
          plano: (conta?.subscription_plan as string | null) ?? null,
          status: (conta?.subscription_status as string | null) ?? null,
          cancelamentoAgendado: conta?.cancel_at_period_end === true,
          outrosDescontos: 0,
        })
      ) {
        return "subscricao_nao_elegivel";
      }

      // Confirmado no Stripe: Proteção ativa, sem cancelamento e sem outro desconto.
      const s = await stripe().subscriptions.retrieve(sub);
      if (
        !subscricaoAceitaRecompensa({
          plano: planoDoPreco(s.items?.data?.[0]?.price?.id ?? null),
          status: s.status,
          cancelamentoAgendado: s.cancel_at_period_end || !!s.cancel_at,
          outrosDescontos: (s.discounts ?? []).length,
        })
      ) {
        return "subscricao_nao_elegivel";
      }

      await garantirCupao(stripe(), CUPAO_INDICACAO_RECOMPENSA);
      const id = await rpc<string | null>("indicacao_reservar_recompensa", { p_user: userId, p_origem: origem, p_expira: null });
      if (!id) return "sem_recompensa";
      try {
        await stripe().subscriptions.update(
          sub,
          { discounts: [{ coupon: CUPAO_INDICACAO_RECOMPENSA.id }], metadata: { indicacao_recompensa_id: id } },
          { idempotencyKey: `indicacao-recompensa-${id}-${sub}` },
        );
      } catch (erro) {
        await admin.rpc("indicacao_libertar_reserva", { p_origem: origem });
        throw erro;
      }
      return "aplicada";
    },

    async removerRecompensaDaSubscricao(subscriptionId) {
      const s = await stripe().subscriptions.retrieve(subscriptionId, { expand: ["discounts"] });
      const descontos = (s.discounts ?? []) as Array<string | Stripe.Discount>;
      const restantes = descontos.filter((d) => !faturaComCupao([d], CUPAO_INDICACAO_RECOMPENSA.id));
      if (restantes.length === descontos.length) return;
      await stripe().subscriptions.update(subscriptionId, {
        discounts: restantes.length ? restantes.map((d) => ({ discount: idDe(d)! })) : "",
      });
    },

    notificarAdmin: opcoes.notificarAdmin,
    registar(linha) {
      opcoes.registar(linha);
    },
  };
}
