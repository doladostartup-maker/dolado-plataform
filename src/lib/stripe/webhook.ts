import type Stripe from "stripe";

// Lógica do webhook Stripe, separada do route handler para ser testável sem
// rede nem base de dados: tudo o que tem efeitos (Supabase, API Stripe,
// Brevo, logs) entra por `DependenciasWebhook`. Só imports de tipos — os
// testes correm com `node --test` sem o bundler do Next.js.
//
// Planos (pelo price da subscrição, nunca pelos metadados):
// - Proteção: funcionalidades de proteção, sem créditos de caso.
// - Caso + Proteção: proteção + 1 crédito por ciclo pago (máx. 4).
// - Avulso (pagamento único): +1 crédito de caso, sem proteção.
//
// Regras:
// - Só pagamento confirmado dá acesso ou créditos: checkout pago (ou
//   no_payment_required, cupão de 100%), checkout.session.async_payment_succeeded
//   ou invoice.paid. Um SEPA pendente fica registado, sem nada.
// - Créditos idempotentes por origem: checkout:<session> (Avulso) e
//   invoice:<id> (Caso + Proteção) — a base de dados recusa a mesma origem
//   duas vezes (case_credit_grants).
// - customer.subscription.updated só atualiza contas que já tinham esta
//   subscrição ativada por um pagamento confirmado — nunca ativa uma nova.
// - Terminar/cancelar retira só o plano da subscrição; créditos, casos e
//   histórico ficam. Nunca se apaga nada.
// - Uma compra de raiz (sem conta ainda) fica registada; /criar-conta aplica
//   o acesso quando liga o pagamento à conta nova.
// - Conversão Avulso → assinatura (metadata.conversao_id): só depois de a
//   subscrição estar confirmada e ativa é que se reembolsa a diferença, uma
//   única vez; refund.* atualiza o estado e um reembolso falhado fica para
//   intervenção manual (nunca um segundo reembolso automático nem
//   cancelamento da assinatura).

export type Plano = "avulso" | "protecao" | "caso_protecao";
export type EstadoPagamento =
  | "concluido"
  | "pendente"
  | "falhado"
  | "reembolsado"
  | "assinatura_cancelada";
export type EstadoCobranca = "pago" | "falhado" | "acao_necessaria";

export type DadosPagamento = {
  stripe_session_id: string;
  // Só presente quando é conhecido (compra com conta). Omitido, nunca null —
  // um upsert com null apagava a ligação já gravada por /criar-conta.
  user_id?: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  email: string;
  plano: "avulso" | "assinatura";
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

export type SubscricaoNaConta = {
  plano: "protecao" | "caso_protecao";
  status: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
};

export type AtualizacaoSubscricaoNaConta = {
  plano?: "none" | "protecao" | "caso_protecao";
  status?: string;
  stripe_price_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

export type ConversaoParaReembolso = {
  id: string;
  plano_destino: "protecao" | "caso_protecao";
  /** Checkout Session da compra Avulso original (para chegar ao PaymentIntent). */
  avulso_session_id: string;
  refund_montante_centimos: number;
  refund_id: string | null;
  requer_intervencao: boolean;
};

export type ResultadoReembolso =
  | { ok: true; id: string; status: string | null; payment_intent_id: string }
  | { ok: false; motivo: string };

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
  /** user_id já ligado a esta compra (por /criar-conta), se houver. */
  utilizadorDoPagamento(sessionId: string): Promise<string | null>;
  gravarPagamento(dados: DadosPagamento): Promise<void>;
  marcarPagamentosDaSubscricao(subscriptionId: string, estado: EstadoPagamento): Promise<void>;

  obterSubscricaoStripe(subscriptionId: string): Promise<SnapshotSubscricao>;
  /** Grava o estado se for mais recente do que o guardado; devolve false se era antigo. */
  gravarSubscricao(
    snapshot: SnapshotSubscricao,
    estadoEm: number,
    cobranca?: { estado: EstadoCobranca; em: string },
  ): Promise<boolean>;
  planoDoPreco(priceId: string | null): "protecao" | "caso_protecao" | null;

  /** Contas ligadas a este customer Stripe (user_access.stripe_customer_id). */
  contasDoCustomer(customerId: string): Promise<string[]>;
  /** Ativa/atualiza a subscrição na conta (cria a linha se não existir). */
  aplicarSubscricaoNaConta(userId: string, sub: SubscricaoNaConta): Promise<void>;
  /** Atualiza só as contas que têm esta subscrição; devolve quantas. */
  atualizarSubscricaoNasContas(subscriptionId: string, dados: AtualizacaoSubscricaoNaConta): Promise<number>;
  /** Garante a linha em user_access (sem plano) e liga o customer. */
  garantirConta(userId: string, customerId: string | null): Promise<void>;
  /** +1 crédito uma única vez por origem; maximo limita o saldo. true se creditou. */
  concederCreditoCaso(userId: string, origem: string, maximo: number | null): Promise<boolean>;

  /**
   * Marca a conversão como feita para ESTE checkout (atómico: só a 1.ª
   * chamada converte). Devolve a conversão se ficou — ou já estava —
   * convertida por este checkout; null se não pertence a este checkout.
   */
  reclamarConversao(
    conversaoId: string,
    checkoutSessionId: string,
    subscriptionId: string,
  ): Promise<ConversaoParaReembolso | null>;
  /**
   * Cria o reembolso parcial no PaymentIntent do Avulso — ou devolve o que
   * já existir para esta conversão (nunca cria um segundo). Erros
   * definitivos → { ok: false }; erros transitórios lançam.
   */
  criarReembolsoConversao(conversao: ConversaoParaReembolso): Promise<ResultadoReembolso>;
  gravarReembolsoConversao(
    conversaoId: string,
    reembolso: { id: string; status: string | null; payment_intent_id: string },
  ): Promise<void>;
  marcarIntervencaoConversao(conversaoId: string, motivo: string): Promise<void>;
  /** Atualiza o estado de um reembolso de conversão; null se o refund não for de uma conversão. */
  atualizarReembolso(
    refundId: string,
    status: string | null,
    conversaoId: string | null,
  ): Promise<{ conversaoId: string; passouAFalhado: boolean } | null>;
  notificarAdmin(assunto: string, texto: string): Promise<void>;

  enviarEmailPagamentoConfirmado(dados: {
    email: string;
    plano: Plano;
    contaExiste: boolean;
    sessionId: string;
  }): Promise<void>;
  registar(linha: LinhaLog): void;
}

export type ResultadoWebhook = { status: 200 | 500; corpo: Record<string, unknown> };

export const MAXIMO_CREDITOS_MENSAIS = 4;

// past_due mantém o acesso: o Stripe ainda está a tentar cobrar.
const ESTADOS_ATIVOS: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);
const ESTADOS_TERMINADOS: ReadonlySet<string> = new Set(["canceled", "unpaid", "incomplete_expired"]);
// Só estas faturas correspondem a um ciclo (a primeira e as renovações). Uma
// fatura de prorrateio (mudança de plano a meio do ciclo) não dá crédito.
const FATURAS_DE_CICLO: ReadonlySet<string> = new Set(["subscription_create", "subscription_cycle"]);

export function idDe(valor: string | { id?: string } | null | undefined): string | null {
  if (!valor) return null;
  return typeof valor === "string" ? valor : (valor.id ?? null);
}

export function subscricaoEstaAtiva(status: string) {
  return ESTADOS_ATIVOS.has(status);
}

function codigoDeErro(erro: unknown) {
  const codigo = (erro as { code?: unknown } | null)?.code;
  if (typeof codigo === "string" && codigo) return codigo;
  return erro instanceof Error ? erro.name : "desconhecido";
}

export function pagamentoDaSessaoConfirmado(session: Pick<Stripe.Checkout.Session, "payment_status">) {
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

function dadosNaConta(
  snapshot: SnapshotSubscricao,
  plano: "protecao" | "caso_protecao",
): SubscricaoNaConta {
  return {
    plano,
    status: snapshot.status,
    stripe_subscription_id: snapshot.stripe_subscription_id,
    stripe_customer_id: snapshot.stripe_customer_id,
    stripe_price_id: snapshot.price_id,
    current_period_start: snapshot.current_period_start,
    current_period_end: snapshot.current_period_end,
  };
}

type DadosSessao = {
  tipo: "avulso" | "subscricao";
  email: string;
  /** Conta indicada pelo servidor ao criar o checkout (compra com sessão iniciada). */
  userId: string | null;
  ehUpgrade: boolean;
  customerId: string | null;
  subscriptionId: string | null;
};

/** null = sessão que não é deste fluxo (sem plano/e-mail) ou incoerente. */
function lerSessao(session: Stripe.Checkout.Session): DadosSessao | null | "incoerente" {
  const plano = session.metadata?.plano;
  const email = session.customer_details?.email;
  if (!plano || !email) return null;

  // O tipo vem do modo da sessão, não dos metadados — e têm de bater certo:
  // um metadata de subscrição numa sessão de pagamento único não dá acesso.
  const tipo =
    session.mode === "payment" ? "avulso" : session.mode === "subscription" ? "subscricao" : null;
  if (!tipo || (tipo === "avulso") !== (plano === "avulso")) return "incoerente";

  return {
    tipo,
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
    plano: s.tipo === "avulso" ? "avulso" : "assinatura",
    valor_total_centimos: session.amount_total,
    moeda: session.currency ?? "eur",
    codigo_desconto: idDe(cupao),
    upgrade_de_avulso: s.ehUpgrade,
    estado,
  };
}

/**
 * Aplica uma compra JÁ CONFIRMADA a uma conta: crédito Avulso, ou
 * subscrição (+ crédito do primeiro ciclo no Caso + Proteção). Idempotente
 * — usado pelo webhook e por /criar-conta, que podem correr por qualquer
 * ordem. Quem chama tem de ter confirmado o pagamento. Devolve o plano
 * aplicado (null se o price for desconhecido ou a subscrição não estiver
 * ativa).
 */
export async function aplicarCompraConfirmadaNaConta(
  session: Stripe.Checkout.Session,
  userId: string,
  deps: DependenciasWebhook,
): Promise<Plano | null> {
  await deps.garantirConta(userId, idDe(session.customer));

  if (session.mode === "payment") {
    await deps.concederCreditoCaso(userId, `checkout:${session.id}`, null);
    return "avulso";
  }

  const subscriptionId = idDe(session.subscription);
  if (!subscriptionId) return null;
  const snapshot = await deps.obterSubscricaoStripe(subscriptionId);
  const plano = deps.planoDoPreco(snapshot.price_id);
  if (!plano || !subscricaoEstaAtiva(snapshot.status)) return null;

  await deps.aplicarSubscricaoNaConta(userId, dadosNaConta(snapshot, plano));
  const invoiceId = idDe(session.invoice);
  if (plano === "caso_protecao" && invoiceId) {
    // Mesma origem que invoice.paid usa para esta fatura — só credita uma vez.
    await deps.concederCreditoCaso(userId, `invoice:${invoiceId}`, MAXIMO_CREDITOS_MENSAIS);
  }
  return plano;
}

async function contasDaCompra(session: Stripe.Checkout.Session, s: DadosSessao, deps: DependenciasWebhook) {
  if (s.userId) return [s.userId];
  const ligado = await deps.utilizadorDoPagamento(session.id);
  return ligado ? [ligado] : [];
}

/**
 * Reembolso parcial do Avulso convertido. Idempotente em três camadas:
 * reclamarConversao só converte uma vez por checkout; um refund_id já
 * gravado encerra o passo; e criarReembolsoConversao procura primeiro um
 * refund desta conversão no Stripe (e usa uma idempotency key) antes de
 * criar — um webhook repetido nunca gera um segundo reembolso.
 */
async function converterAvulso(
  session: Stripe.Checkout.Session,
  conversaoId: string,
  subscriptionId: string,
  planoAplicado: Plano | null,
  deps: DependenciasWebhook,
) {
  const conversao = await deps.reclamarConversao(conversaoId, session.id, subscriptionId);
  if (!conversao || conversao.refund_id || conversao.requer_intervencao) return;

  if (planoAplicado !== conversao.plano_destino) {
    // O plano pago não é o que foi oferecido na conversão — não reembolsa
    // às cegas; fica para decisão manual (a subscrição mantém-se).
    await deps.marcarIntervencaoConversao(conversao.id, "plano da subscrição diferente do plano de destino");
    await deps.notificarAdmin(
      "Conversão Avulso por rever — DoLado",
      `A conversão ${conversao.id} não foi reembolsada: o plano da subscrição ${subscriptionId} não corresponde ao plano de destino.`,
    );
    return;
  }

  const reembolso = await deps.criarReembolsoConversao(conversao);
  if (reembolso.ok) {
    await deps.gravarReembolsoConversao(conversao.id, reembolso);
    return;
  }
  // Erro definitivo do Stripe (ex.: pagamento já reembolsado): não tenta
  // outra vez nem cancela a assinatura — fica para intervenção manual.
  await deps.marcarIntervencaoConversao(conversao.id, reembolso.motivo);
  await deps.notificarAdmin(
    "Reembolso de conversão falhou — DoLado",
    `O reembolso da conversão ${conversao.id} não foi criado (${reembolso.motivo}). A assinatura continua ativa. Resolver manualmente no Stripe.`,
  );
}

/**
 * Pagamento confirmado. Ordem pensada para um reenvio depois de uma falha:
 * primeiro o acesso e os créditos (idempotentes), depois o pagamento como
 * "concluido" e só no fim o e-mail — se algo falhar antes, o pagamento ainda
 * não está concluído e o reenvio repete tudo; se já estava, não repete o
 * e-mail.
 */
async function confirmarCompra(
  session: Stripe.Checkout.Session,
  s: DadosSessao,
  estadoAnterior: EstadoPagamento | null,
  deps: DependenciasWebhook,
) {
  const contas = await contasDaCompra(session, s, deps);
  // Plano efetivamente aplicado a uma conta (subscrição confirmada e ativa).
  let planoAplicado: Plano | null = null;
  for (const userId of contas) {
    planoAplicado = (await aplicarCompraConfirmadaNaConta(session, userId, deps)) ?? planoAplicado;
  }
  // Nome do plano para o e-mail — pode vir só do price.
  let plano: Plano | null = planoAplicado ?? (s.tipo === "avulso" ? "avulso" : null);
  if (!plano && s.subscriptionId) {
    // Compra de raiz: ainda sem conta, mas o e-mail precisa do nome do plano.
    plano = deps.planoDoPreco((await deps.obterSubscricaoStripe(s.subscriptionId)).price_id);
  }

  // Conversão de um Avulso: só depois de a subscrição estar confirmada e
  // ativa na conta (plano aplicado acima). Antes do "concluido", para um
  // reenvio depois de uma falha voltar a tentar o reembolso.
  const conversaoId = session.metadata?.conversao_id;
  if (conversaoId && s.subscriptionId && contas.length > 0) {
    // Só com a subscrição ativa na conta — nunca com base apenas no price.
    if (planoAplicado) await converterAvulso(session, conversaoId, s.subscriptionId, planoAplicado, deps);
  }

  await deps.gravarPagamento(dadosPagamento(session, s, "concluido"));
  if (estadoAnterior !== "concluido" && plano) {
    await deps.enviarEmailPagamentoConfirmado({
      email: s.email,
      plano,
      contaExiste: contas.length > 0,
      sessionId: session.id,
    });
  }
  if (!plano) return "confirmado_preco_desconhecido";
  if (estadoAnterior === "concluido") return "ja_confirmado";
  return contas.length > 0 ? "pagamento_confirmado" : "pagamento_confirmado_sem_conta";
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
    // acesso, créditos nem e-mail. Não recua um estado final que já tenha
    // chegado por outro evento entregue fora de ordem.
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

  // Nunca dá acesso nem créditos. A conta (se existir) fica intacta e o
  // portal mostra o pagamento como falhado, com opção de pagar de novo.
  await deps.gravarPagamento(dadosPagamento(session, s, "falhado"));

  // Se esta subscrição chegou a ficar ativa numa conta, deixa de estar.
  if (s.subscriptionId) {
    const afetadas = await deps.atualizarSubscricaoNasContas(s.subscriptionId, {
      plano: "none",
      status: "incomplete_expired",
    });
    if (afetadas > 0) return { resultado: "pagamento_falhado_acesso_retirado", ...ids };
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
    // customer.subscription.updated/deleted trata do resto.
    return { resultado: cobranca === "falhado" ? "cobranca_falhada" : "acao_necessaria", ...ids };
  }

  const plano = deps.planoDoPreco(snapshot.price_id);
  if (!plano) return { resultado: "pago_preco_desconhecido", ...ids };
  if (!subscricaoEstaAtiva(snapshot.status)) return { resultado: "pago_subscricao_inativa", ...ids };

  const contas = customerId ? await deps.contasDoCustomer(customerId) : [];
  if (contas.length === 0) return { resultado: "pago_sem_conta_ligada", ...ids };

  let creditou = false;
  for (const userId of contas) {
    await deps.aplicarSubscricaoNaConta(userId, dadosNaConta(snapshot, plano));
    if (plano === "caso_protecao" && FATURAS_DE_CICLO.has(invoice.billing_reason ?? "")) {
      const novo = await deps.concederCreditoCaso(userId, `invoice:${invoice.id}`, MAXIMO_CREDITOS_MENSAIS);
      creditou = novo || creditou;
    }
  }
  return { resultado: creditou ? "acesso_e_credito" : "acesso_garantido", ...ids };
}

async function tratarSubscricaoAtualizada(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const snapshot = snapshotDeSubscricao(event.data.object as Stripe.Subscription);
  const ids = { customer_id: snapshot.stripe_customer_id, subscription_id: snapshot.stripe_subscription_id };

  const aplicado = await deps.gravarSubscricao(snapshot, event.created);
  if (!aplicado) return { resultado: "ignorado_evento_antigo", ...ids };

  // Só contas que já têm esta subscrição (ativada por um pagamento
  // confirmado) — este evento sincroniza, nunca ativa uma conta nova.
  const terminada = ESTADOS_TERMINADOS.has(snapshot.status);
  const plano = terminada ? "none" : deps.planoDoPreco(snapshot.price_id);
  const afetadas = await deps.atualizarSubscricaoNasContas(snapshot.stripe_subscription_id, {
    ...(plano ? { plano } : {}),
    status: snapshot.status,
    stripe_price_id: snapshot.price_id,
    current_period_start: snapshot.current_period_start,
    current_period_end: snapshot.current_period_end,
  });
  if (afetadas === 0) return { resultado: "sincronizado_sem_conta", ...ids };
  return { resultado: terminada ? "sincronizado_acesso_retirado" : "sincronizado", ...ids };
}

async function tratarSubscricaoEliminada(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const snapshot = snapshotDeSubscricao(event.data.object as Stripe.Subscription);
  const ids = { customer_id: snapshot.stripe_customer_id, subscription_id: snapshot.stripe_subscription_id };

  // "deleted" é final: grava sempre, mesmo que um "updated" mais recente
  // tenha chegado antes.
  await deps.gravarSubscricao({ ...snapshot, status: "canceled" }, Number.MAX_SAFE_INTEGER);
  await deps.marcarPagamentosDaSubscricao(snapshot.stripe_subscription_id, "assinatura_cancelada");

  // Retira só o plano desta subscrição. Créditos por usar, casos, histórico
  // e alertas ficam.
  const afetadas = await deps.atualizarSubscricaoNasContas(snapshot.stripe_subscription_id, {
    plano: "none",
    status: "canceled",
  });
  return { resultado: afetadas > 0 ? "cancelada_acesso_retirado" : "cancelada", ...ids };
}

const ESTADOS_REEMBOLSO_FALHADO: ReadonlySet<string> = new Set(["failed", "canceled"]);

async function tratarReembolso(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const refund = event.data.object as Stripe.Refund;
  const atualizado = await deps.atualizarReembolso(refund.id, refund.status ?? null, refund.metadata?.conversao_id ?? null);
  if (!atualizado) return { resultado: "ignorado_sem_conversao" };

  if (atualizado.passouAFalhado && ESTADOS_REEMBOLSO_FALHADO.has(refund.status ?? "")) {
    // Nunca cria um segundo reembolso automaticamente nem cancela a
    // assinatura: marca para intervenção e avisa o admin.
    await deps.marcarIntervencaoConversao(atualizado.conversaoId, `reembolso ${refund.status}`);
    await deps.notificarAdmin(
      "Reembolso de conversão falhou — DoLado",
      `O reembolso ${refund.id} (conversão ${atualizado.conversaoId}) ficou "${refund.status}". A assinatura continua ativa. Resolver manualmente no Stripe.`,
    );
    return { resultado: "reembolso_falhado_intervencao" };
  }
  return { resultado: `reembolso_${refund.status ?? "sem_estado"}` };
}

const TRATAMENTOS: Record<string, (event: Stripe.Event, deps: DependenciasWebhook) => Promise<Tratamento>> = {
  "refund.created": tratarReembolso,
  "refund.updated": tratarReembolso,
  "refund.failed": tratarReembolso,
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
    // Tudo o que já foi gravado é idempotente, por isso repetir é seguro.
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
