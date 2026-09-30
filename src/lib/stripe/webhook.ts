import type Stripe from "stripe";

// Lógica do webhook Stripe, separada do route handler para ser testável sem
// rede nem base de dados: tudo o que tem efeitos (Supabase, API Stripe,
// Brevo, logs) entra por `DependenciasWebhook`. Só imports de tipos — os
// testes correm com `node --test` sem o bundler do Next.js.
//
// Regra de acesso:
// - Concede "assinatura" só com pagamento confirmado: checkout pago (ou
//   no_payment_required, cupão de 100%), checkout.session.async_payment_succeeded
//   (SEPA e outros métodos assíncronos) ou invoice.paid.
// - customer.subscription.updated nunca concede — só sincroniza o estado e
//   degrada quando a subscrição termina (canceled, unpaid, incomplete_expired).
// - Falhas de cobrança (invoice.payment_failed / payment_action_required) não
//   mexem no acesso: o Stripe ainda está a tentar recuperar o pagamento; se
//   desistir, a subscrição passa a unpaid/canceled e é aí que se degrada.
// - Degradar é sempre "assinatura" → "avulso", nunca "nenhum", e só se o
//   cliente não tiver outra subscrição ativa. Nunca se apaga nada.
// - Uma compra de raiz (sem conta ainda) não tem user_access para atualizar:
//   é /criar-conta que liga o pagamento à conta nova, depois de confirmar ele
//   próprio o payment_status junto do Stripe.

export type Plano = "avulso" | "assinatura";
export type EstadoPagamento =
  | "concluido"
  | "pendente"
  | "falhado"
  | "reembolsado"
  | "assinatura_cancelada";
export type EstadoCobranca = "pago" | "falhado" | "acao_necessaria";

export type DadosPagamento = {
  stripe_session_id: string;
  // Só presente quando é conhecido (upgrade). Omitido, nunca null — um
  // upsert com null apagava a ligação já gravada por /criar-conta.
  user_id?: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  email: string;
  plano: Plano;
  valor_total_centimos: number | null;
  moeda: string;
  codigo_desconto: string | null;
  upgrade_de_avulso: boolean;
  estado: EstadoPagamento;
};

export type SnapshotSubscricao = {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  price_id: string | null;
  status: Stripe.Subscription.Status;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
};

export type AlvoAcesso = { userId?: string | null; customerId?: string | null };

export type LinhaLog = {
  evento: string;
  event_id: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  resultado: string;
  /** Só o código do erro — a mensagem pode trazer dados das linhas. */
  erro_codigo?: string;
};

export interface DependenciasWebhook {
  /** true se o evento é novo e fica reclamado; false se já foi (ou está a ser) processado. */
  reclamarEvento(eventId: string, tipo: string): Promise<boolean>;
  concluirEvento(eventId: string): Promise<void>;
  /** Liberta a reclamação depois de uma falha, para o reenvio do Stripe ser processado. */
  libertarEvento(eventId: string): Promise<void>;

  obterEstadoPagamento(sessionId: string): Promise<EstadoPagamento | null>;
  gravarPagamento(dados: DadosPagamento): Promise<void>;
  marcarPagamentosDaSubscricao(subscriptionId: string, estado: EstadoPagamento): Promise<void>;

  obterSubscricaoStripe(subscriptionId: string): Promise<SnapshotSubscricao>;
  /** Grava o estado se for mais recente do que o guardado; devolve false se era antigo. */
  gravarSubscricao(
    snapshot: SnapshotSubscricao,
    estadoEm: number,
    cobranca?: { estado: EstadoCobranca; em: string },
  ): Promise<boolean>;
  temOutraSubscricaoAtiva(customerId: string, excluirSubscriptionId: string | null): Promise<boolean>;

  /** Por userId: cria/atualiza a linha. Só por customerId: atualiza a linha existente. Devolve o nº de contas afetadas. */
  concederAssinatura(alvo: AlvoAcesso): Promise<number>;
  /** "assinatura" → "avulso" nas contas do alvo. Devolve o nº de contas afetadas. */
  degradarAssinatura(alvo: AlvoAcesso): Promise<number>;

  enviarEmailsPagamentoConfirmado(email: string, plano: Plano): Promise<void>;
  registar(linha: LinhaLog): void;
}

export type ResultadoWebhook = { status: 200 | 500; corpo: Record<string, unknown> };

// Estados em que o cliente mantém o acesso. past_due fica de fora de
// ESTADOS_TERMINADOS de propósito: o Stripe ainda está a tentar cobrar.
const ESTADOS_ATIVOS: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);
const ESTADOS_TERMINADOS: ReadonlySet<string> = new Set(["canceled", "unpaid", "incomplete_expired"]);

export function idDe(valor: string | { id: string } | null | undefined): string | null {
  if (!valor) return null;
  return typeof valor === "string" ? valor : valor.id;
}

function codigoDeErro(erro: unknown) {
  const codigo = (erro as { code?: unknown } | null)?.code;
  if (typeof codigo === "string" && codigo) return codigo;
  return erro instanceof Error ? erro.name : "desconhecido";
}

export function subscricaoEstaAtiva(status: string) {
  return ESTADOS_ATIVOS.has(status);
}

function pagamentoDaSessaoConfirmado(session: Stripe.Checkout.Session) {
  // no_payment_required: cupão de 100% — válido, só sem cobrança.
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

function paraIso(segundos: number | null | undefined) {
  return segundos ? new Date(segundos * 1000).toISOString() : null;
}

export function snapshotDeSubscricao(sub: Stripe.Subscription): SnapshotSubscricao {
  // Desde a API 2025-03-31 o período está nos itens, não na subscrição.
  const item = sub.items?.data?.[0];
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: idDe(sub.customer) ?? "",
    price_id: item?.price?.id ?? null,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_start: paraIso(item?.current_period_start),
    current_period_end: paraIso(item?.current_period_end),
  };
}

function subscricaoDaFatura(invoice: Stripe.Invoice) {
  // Desde a API 2025-03-31 a subscrição está em parent.subscription_details.
  return idDe(invoice.parent?.subscription_details?.subscription);
}

type DadosSessao = {
  plano: Plano;
  email: string;
  userId: string | null;
  ehUpgrade: boolean;
  customerId: string | null;
  subscriptionId: string | null;
};

/** null = sessão que não é deste fluxo (sem plano/e-mail) ou incoerente. */
function lerSessao(session: Stripe.Checkout.Session): DadosSessao | null | "incoerente" {
  const plano = session.metadata?.plano;
  const email = session.customer_details?.email;
  if ((plano !== "avulso" && plano !== "assinatura") || !email) return null;

  // O modo da sessão tem de bater com o plano — um metadata "assinatura"
  // numa sessão de pagamento único não pode dar acesso de assinante.
  const modoEsperado = plano === "avulso" ? "payment" : "subscription";
  if (session.mode !== modoEsperado) return "incoerente";

  return {
    plano,
    email,
    userId: session.metadata?.user_id ?? null,
    ehUpgrade: session.metadata?.upgrade === "true",
    customerId: idDe(session.customer),
    subscriptionId: idDe(session.subscription),
  };
}

function dadosPagamento(
  session: Stripe.Checkout.Session,
  s: DadosSessao,
  estado: EstadoPagamento,
): DadosPagamento {
  const cupao = session.discounts?.[0]?.coupon;
  return {
    stripe_session_id: session.id,
    ...(s.userId ? { user_id: s.userId } : {}),
    stripe_customer_id: s.customerId,
    stripe_subscription_id: s.subscriptionId,
    email: s.email,
    plano: s.plano,
    valor_total_centimos: session.amount_total,
    moeda: session.currency ?? "eur",
    codigo_desconto: idDe(cupao),
    upgrade_de_avulso: s.ehUpgrade,
    estado,
  };
}

/**
 * Pagamento confirmado. Ordem pensada para um reenvio depois de uma falha:
 * primeiro o acesso (idempotente), depois o pagamento como "concluido" e só
 * no fim os e-mails — se algo falhar antes, o pagamento ainda não está
 * concluído e o reenvio repete tudo; se já estava, não repete os e-mails.
 */
async function confirmarCompra(
  session: Stripe.Checkout.Session,
  s: DadosSessao,
  estadoAnterior: EstadoPagamento | null,
  deps: DependenciasWebhook,
) {
  // Upgrade de um cliente com conta: sobe já o nível. Uma compra de raiz
  // ainda não tem conta — /criar-conta liga o acesso quando for criada.
  if (s.plano === "assinatura" && s.ehUpgrade && s.userId) {
    await deps.concederAssinatura({ userId: s.userId, customerId: s.customerId });
  }
  await deps.gravarPagamento(dadosPagamento(session, s, "concluido"));
  if (estadoAnterior !== "concluido") {
    await deps.enviarEmailsPagamentoConfirmado(s.email, s.plano);
  }
  return estadoAnterior === "concluido" ? "ja_confirmado" : "pagamento_confirmado";
}

type Tratamento = { resultado: string; customer_id?: string | null; subscription_id?: string | null };

async function tratarCheckoutConcluido(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const session = event.data.object as Stripe.Checkout.Session;
  const s = lerSessao(session);
  if (s === null) return { resultado: "ignorado_sem_plano" };
  if (s === "incoerente") return { resultado: "ignorado_modo_incoerente", customer_id: idDe(session.customer) };
  const ids = { customer_id: s.customerId, subscription_id: s.subscriptionId };

  const estadoAtual = await deps.obterEstadoPagamento(session.id);

  if (!pagamentoDaSessaoConfirmado(session)) {
    // Pagamento assíncrono (ex.: SEPA) ainda por confirmar: regista, sem
    // acesso nem e-mail de confirmação. Não recua um estado final que já
    // tenha chegado por outro evento entregue fora de ordem.
    await deps.gravarPagamento(dadosPagamento(session, s, estadoAtual ?? "pendente"));
    return { resultado: "pagamento_pendente", ...ids };
  }

  return { resultado: await confirmarCompra(session, s, estadoAtual, deps), ...ids };
}

async function tratarPagamentoAssincronoConfirmado(
  event: Stripe.Event,
  deps: DependenciasWebhook,
): Promise<Tratamento> {
  const session = event.data.object as Stripe.Checkout.Session;
  const s = lerSessao(session);
  if (s === null) return { resultado: "ignorado_sem_plano" };
  if (s === "incoerente") return { resultado: "ignorado_modo_incoerente", customer_id: idDe(session.customer) };
  const ids = { customer_id: s.customerId, subscription_id: s.subscriptionId };

  if (session.payment_status !== "paid") {
    return { resultado: "ignorado_nao_pago", ...ids };
  }

  const estadoAtual = await deps.obterEstadoPagamento(session.id);
  return { resultado: await confirmarCompra(session, s, estadoAtual, deps), ...ids };
}

async function tratarPagamentoAssincronoFalhado(
  event: Stripe.Event,
  deps: DependenciasWebhook,
): Promise<Tratamento> {
  const session = event.data.object as Stripe.Checkout.Session;
  const s = lerSessao(session);
  if (s === null) return { resultado: "ignorado_sem_plano" };
  if (s === "incoerente") return { resultado: "ignorado_modo_incoerente", customer_id: idDe(session.customer) };
  const ids = { customer_id: s.customerId, subscription_id: s.subscriptionId };

  await deps.gravarPagamento(dadosPagamento(session, s, "falhado"));

  // Se algum caminho deu acesso provisório (ex.: a página de regresso do
  // upgrade), retira-o — a não ser que haja outra subscrição ativa.
  if (s.plano === "assinatura" && (s.userId || s.customerId)) {
    const outraAtiva = s.customerId
      ? await deps.temOutraSubscricaoAtiva(s.customerId, s.subscriptionId)
      : false;
    if (!outraAtiva) {
      const afetadas = await deps.degradarAssinatura({ userId: s.userId, customerId: s.customerId });
      if (afetadas > 0) return { resultado: "pagamento_falhado_acesso_retirado", ...ids };
    }
  }
  return { resultado: "pagamento_falhado", ...ids };
}

async function tratarFatura(
  event: Stripe.Event,
  deps: DependenciasWebhook,
  cobranca: EstadoCobranca,
): Promise<Tratamento> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = subscricaoDaFatura(invoice);
  const customerId = idDe(invoice.customer);
  if (!subscriptionId) return { resultado: "ignorado_sem_subscricao", customer_id: customerId };
  const ids = { customer_id: customerId, subscription_id: subscriptionId };

  // Estado atual lido ao Stripe (não do payload): a fatura não traz o
  // status nem o período da subscrição, e os eventos podem chegar fora de
  // ordem.
  const snapshot = await deps.obterSubscricaoStripe(subscriptionId);
  await deps.gravarSubscricao(snapshot, event.created, { estado: cobranca, em: paraIso(event.created)! });

  if (cobranca !== "pago") {
    // Sem mexer no acesso — o Stripe continua a tentar cobrar; se desistir,
    // customer.subscription.updated/deleted trata da degradação.
    return { resultado: cobranca === "falhado" ? "cobranca_falhada" : "acao_necessaria", ...ids };
  }

  if (!subscricaoEstaAtiva(snapshot.status)) {
    return { resultado: "pago_subscricao_inativa", ...ids };
  }
  const contas = customerId ? await deps.concederAssinatura({ customerId }) : 0;
  return { resultado: contas > 0 ? "acesso_garantido" : "pago_sem_conta_ligada", ...ids };
}

async function degradarSeTerminada(snapshot: SnapshotSubscricao, deps: DependenciasWebhook) {
  if (!ESTADOS_TERMINADOS.has(snapshot.status)) return 0;
  if (await deps.temOutraSubscricaoAtiva(snapshot.stripe_customer_id, snapshot.stripe_subscription_id)) {
    return 0;
  }
  return deps.degradarAssinatura({ customerId: snapshot.stripe_customer_id });
}

async function tratarSubscricaoAtualizada(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const snapshot = snapshotDeSubscricao(event.data.object as Stripe.Subscription);
  const ids = { customer_id: snapshot.stripe_customer_id, subscription_id: snapshot.stripe_subscription_id };

  const aplicado = await deps.gravarSubscricao(snapshot, event.created);
  if (!aplicado) return { resultado: "ignorado_evento_antigo", ...ids };

  const afetadas = await degradarSeTerminada(snapshot, deps);
  return { resultado: afetadas > 0 ? "sincronizado_acesso_retirado" : "sincronizado", ...ids };
}

async function tratarSubscricaoEliminada(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const snapshot = snapshotDeSubscricao(event.data.object as Stripe.Subscription);
  const ids = { customer_id: snapshot.stripe_customer_id, subscription_id: snapshot.stripe_subscription_id };

  // "deleted" é final: grava sempre, mesmo que um "updated" mais recente
  // tenha chegado antes (o estado final ganha).
  await deps.gravarSubscricao({ ...snapshot, status: "canceled" }, Number.MAX_SAFE_INTEGER);
  await deps.marcarPagamentosDaSubscricao(snapshot.stripe_subscription_id, "assinatura_cancelada");

  // Ao cancelar volta a "avulso" — já pagou pelo menos uma vez — nunca a
  // "nenhum". Não apaga conta, casos nem alertas.
  const afetadas = await degradarSeTerminada({ ...snapshot, status: "canceled" }, deps);
  return { resultado: afetadas > 0 ? "cancelada_acesso_retirado" : "cancelada", ...ids };
}

const TRATAMENTOS: Record<string, (event: Stripe.Event, deps: DependenciasWebhook) => Promise<Tratamento>> = {
  "checkout.session.completed": tratarCheckoutConcluido,
  "checkout.session.async_payment_succeeded": tratarPagamentoAssincronoConfirmado,
  "checkout.session.async_payment_failed": tratarPagamentoAssincronoFalhado,
  "invoice.paid": (e, d) => tratarFatura(e, d, "pago"),
  "invoice.payment_failed": (e, d) => tratarFatura(e, d, "falhado"),
  "invoice.payment_action_required": (e, d) => tratarFatura(e, d, "acao_necessaria"),
  "customer.subscription.updated": tratarSubscricaoAtualizada,
  "customer.subscription.deleted": tratarSubscricaoEliminada,
};

export const EVENTOS_SUPORTADOS = Object.keys(TRATAMENTOS);

export async function processarEventoStripe(
  event: Stripe.Event,
  deps: DependenciasWebhook,
): Promise<ResultadoWebhook> {
  const tratar = TRATAMENTOS[event.type];
  if (!tratar) {
    // 2xx para o Stripe não reenviar — e sem gravar nada.
    deps.registar({ evento: event.type, event_id: event.id, resultado: "ignorado_sem_tratamento" });
    return { status: 200, corpo: { recebido: true } };
  }

  if (!(await deps.reclamarEvento(event.id, event.type))) {
    deps.registar({ evento: event.type, event_id: event.id, resultado: "duplicado" });
    return { status: 200, corpo: { recebido: true, duplicado: true } };
  }

  try {
    const tratamento = await tratar(event, deps);
    await deps.concluirEvento(event.id);
    deps.registar({ evento: event.type, event_id: event.id, ...tratamento });
    return { status: 200, corpo: { recebido: true } };
  } catch (erro) {
    // Liberta o evento e devolve 500: o Stripe volta a tentar mais tarde.
    // Tudo o que já foi gravado é idempotente (upserts), por isso repetir é
    // seguro.
    await deps.libertarEvento(event.id).catch(() => undefined);
    deps.registar({
      evento: event.type,
      event_id: event.id,
      resultado: "erro",
      erro_codigo: codigoDeErro(erro),
    });
    return { status: 500, corpo: { erro: "Falha ao processar o evento." } };
  }
}
