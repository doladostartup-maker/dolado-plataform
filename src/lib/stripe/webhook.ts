import type Stripe from "stripe";
import { consentimentoDaMetadata } from "../consentimentoCompra.ts";
import { pedidoDaMetadata } from "../pedidoCaso.ts";

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
// - Cancelamento normal = cancel_at_period_end no Stripe: a subscrição
//   continua ativa até ao fim do período pago; customer.subscription.updated
//   sincroniza o agendamento (e a reversão) e regista-o na auditoria.
// - Fim efetivo (deleted, ou updated para canceled/incomplete_expired/unpaid)
//   retira só o plano da subscrição: a conta fica SEM subscrição (plano
//   "none") — nunca "Avulso". Casos, documentos e histórico ficam; nunca se
//   apaga nada. No Caso + Proteção, os casos disponíveis da subscrição ficam
//   congelados 90 dias (congelarCreditosCaso) e voltam se a conta tiver de
//   novo Caso + Proteção ativo nesse prazo (restaurarCreditosCaso).
//   Os alertas (fidelização, promoção, setores do aviso sectorial) ficam
//   desativados — sem envios — e conservados 6 meses; quem o faz é o
//   trigger user_access_alertas_seguir_protecao, em qualquer mudança de
//   user_access que retire (ou devolva) a Proteção, não este ficheiro.
// - Uma compra de raiz (sem conta ainda) fica registada; /criar-conta aplica
//   o acesso quando liga o pagamento à conta nova.
// - Conversão Avulso → assinatura (metadata.conversao_id): só depois de a
//   subscrição estar confirmada e ativa é que se reembolsa a diferença, uma
//   única vez; refund.* atualiza o estado e um reembolso falhado fica para
//   intervenção manual (nunca um segundo reembolso automático nem
//   cancelamento da assinatura). A elegibilidade é revalidada quando o
//   pagamento é confirmado, ANTES de aplicar a subscrição: o caso do Avulso
//   sai do saldo (retirarCreditoAvulso). Se entretanto foi usado (ou
//   reembolsado), a conversão é anulada automaticamente: sem subscrição na
//   conta, sem casos, sem reembolso, e a subscrição é cancelada no Stripe
//   (1.ª fatura a 0 € pelo cupão). Idempotente; o motivo fica em
//   conversoes_avulso.anulada_motivo. invoice.paid de uma subscrição de
//   conversão ainda por decidir (ou anulada) não aplica nada.
// - Pedido pago com um Avulso: o pedido gasta o caso DESSA compra (modo
//   vinculado), mesmo que a conta tenha casos da subscrição.
// - Avulso reembolsado na totalidade (refund.* fora de uma conversão): o
//   pagamento fica "reembolsado" (final) e o caso, se ainda estiver por
//   usar, sai do saldo. Um caso já usado não é tocado (nunca saldo negativo).
// - Consentimentos da compra (metadata.consentimento_compra_id, gravado pelo
//   servidor ANTES de criar a sessão): o webhook só completa as ligações em
//   falta (sessão, pagamento, subscrição, e-mail, conta). Nunca cria nem
//   altera o que foi aceite, e uma compra sem registo (sessões antigas) não
//   perde o acesso por isso.

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
  /** Data marcada para o cancelamento (o Stripe também a preenche com cancel_at_period_end). */
  cancel_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  /** Conversão Avulso → subscrição que criou esta subscrição (metadata), se houver. */
  conversao_id?: string | null;
};

export type SubscricaoNaConta = {
  plano: "protecao" | "caso_protecao";
  status: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type AtualizacaoSubscricaoNaConta = {
  plano?: "none" | "protecao" | "caso_protecao";
  status?: string;
  stripe_price_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};

export type CancelamentoNaAuditoria = {
  /** true = cancelamento agendado no Stripe; false = sem cancelamento (revertido, se havia). */
  agendado: boolean;
  fimPrevisto: string | null;
  plano: "protecao" | "caso_protecao" | null;
  em: string;
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

export type ConversaoNoWebhook = {
  id: string;
  estado: "checkout_aberto" | "convertido" | "anulada";
  checkout_session_id: string | null;
  /** Checkout Session da compra Avulso original. */
  avulso_session_id: string;
};

export type EstadoRetiradaAvulso = "retirado" | "consumido" | "convertido" | "reembolsado" | "sem_credito";

export type ConsentimentoLigado = {
  termos_versao: string;
  /** Pedido expresso de início imediato registado antes do pagamento. */
  pediu_inicio_imediato: boolean;
};

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
   * Retira do saldo o caso de uma compra Avulso (origem checkout:<sessão>)
   * se ainda estiver por usar. "retirado" se saiu agora; o estado atual
   * ("consumido", "convertido", "reembolsado") se já não estava
   * disponível; "sem_credito" se a compra nunca deu crédito. Idempotente.
   */
  retirarCreditoAvulso(origem: string, motivo: "convertido" | "reembolsado"): Promise<EstadoRetiradaAvulso>;
  /**
   * Compra Avulso paga por este PaymentIntent (null se não for um Avulso)
   * e se já está totalmente reembolsada no Stripe.
   */
  avulsoDoPagamento(paymentIntentId: string): Promise<{ sessionId: string; totalmenteReembolsado: boolean } | null>;
  /** Marca o pagamento como reembolsado (estado final na base de dados). */
  marcarPagamentoReembolsado(sessionId: string): Promise<void>;
  /**
   * Fim do Caso + Proteção: congela os casos da subscrição nas contas que a
   * têm (90 dias). Idempotente por subscrição. Devolve quantos congelou.
   */
  congelarCreditosCaso(subscriptionId: string, em: string): Promise<number>;
  /**
   * Caso + Proteção ativo: restaura os casos congelados ainda no prazo nas
   * contas com esta subscrição, até ao máximo. Idempotente. Devolve quantos.
   */
  restaurarCreditosCaso(subscriptionId: string, em: string, maximo: number): Promise<number>;

  /** Auditoria: cancelamento agendado (cria se não houver) ou revertido. Idempotente. */
  sincronizarCancelamento(subscriptionId: string, dados: CancelamentoNaAuditoria): Promise<void>;
  /** Auditoria: fim efetivo da subscrição. Idempotente. */
  registarFimSubscricao(
    subscriptionId: string,
    dados: { plano: "protecao" | "caso_protecao" | null; em: string },
  ): Promise<void>;

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

  /**
   * Completa as ligações do registo de consentimento (só campos vazios;
   * idempotente). null se o registo não existir ou pertencer a outra sessão.
   */
  ligarConsentimento(
    consentimentoId: string,
    dados: { sessionId: string; subscriptionId: string | null; email: string; userId: string | null },
  ): Promise<ConsentimentoLigado | null>;

  /**
   * Pedido → caso (função SQL atómica e idempotente: gasta 1 caso
   * disponível e cria o caso). Devolve o id do caso (o existente, se já
   * tinha sido convertido) ou null se não converteu (pedido de outra conta,
   * cancelado, ou conta sem caso disponível).
   */
  converterPedidoEmCaso(pedidoId: string, userId: string, origemAvulso: string | null): Promise<string | null>;
  /** Conversão Avulso → subscrição (só o que o webhook precisa para decidir). */
  obterConversao(conversaoId: string): Promise<ConversaoNoWebhook | null>;
  /** checkout_aberto → anulada (só se for deste checkout). Idempotente. */
  anularConversao(conversaoId: string, checkoutSessionId: string, motivo: string): Promise<void>;
  /** Cancela já a subscrição no Stripe, sem fatura final. Idempotente (já cancelada = ok). */
  cancelarSubscricaoStripe(subscriptionId: string): Promise<void>;

  enviarEmailPagamentoConfirmado(dados: {
    email: string;
    plano: Plano;
    contaExiste: boolean;
    sessionId: string;
    /** Valor efetivamente pago agora (com descontos), em cêntimos. */
    valorPagoCentimos: number | null;
    /** Próxima renovação (ISO), nas subscrições, se conhecida. */
    renovacao: string | null;
    consentimento: ConsentimentoLigado | null;
  }): Promise<void>;
  registar(linha: LinhaLog): void;
}

export type ResultadoWebhook = { status: 200 | 500; corpo: Record<string, unknown> };

export const MAXIMO_CREDITOS_MENSAIS = 4;

// past_due mantém o acesso: o Stripe ainda está a tentar cobrar.
const ESTADOS_ATIVOS: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);
const ESTADOS_TERMINADOS: ReadonlySet<string> = new Set(["canceled", "unpaid", "incomplete_expired"]);
// Fim definitivo (unpaid ainda pode voltar a ativa se a dívida for paga).
const ESTADOS_FINAIS: ReadonlySet<string> = new Set(["canceled", "incomplete_expired"]);
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

/** Cancelamento agendado (pelo portal ou no Stripe Dashboard), ainda por acontecer. */
export function cancelamentoAgendado(snapshot: Pick<SnapshotSubscricao, "status" | "cancel_at_period_end" | "cancel_at">) {
  if (ESTADOS_TERMINADOS.has(snapshot.status)) return false;
  return snapshot.cancel_at_period_end || !!snapshot.cancel_at;
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
    cancel_at: paraIso(sub.cancel_at),
    current_period_start: paraIso(item?.current_period_start),
    current_period_end: paraIso(item?.current_period_end),
    conversao_id: sub.metadata?.conversao_id ?? null,
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
    cancel_at_period_end: cancelamentoAgendado(snapshot),
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
  em: string = new Date().toISOString(),
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
  if (plano === "caso_protecao") {
    // Nova subscrição dentro dos 90 dias: os casos congelados voltam.
    await deps.restaurarCreditosCaso(subscriptionId, em, MAXIMO_CREDITOS_MENSAIS);
  }
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
  await deps.marcarIntervencaoConversao(conversao.id, `o Stripe recusou o reembolso (${reembolso.motivo})`);
  await deps.notificarAdmin(
    "Reembolso de conversão falhou — DoLado",
    `O reembolso da conversão ${conversao.id} não foi criado (${reembolso.motivo}). A assinatura continua ativa. Resolver manualmente no Stripe.`,
  );
}

/** Liga o registo de consentimento desta sessão (se houver). Idempotente. */
async function ligarConsentimentoDaSessao(
  session: Stripe.Checkout.Session,
  s: DadosSessao,
  contas: string[],
  deps: DependenciasWebhook,
) {
  const consentimentoId = consentimentoDaMetadata(session.metadata);
  if (!consentimentoId) return null;
  return deps.ligarConsentimento(consentimentoId, {
    sessionId: session.id,
    subscriptionId: s.subscriptionId,
    email: s.email,
    userId: contas[0] ?? null,
  });
}

/**
 * Pagamento confirmado. Ordem pensada para um reenvio depois de uma falha:
 * primeiro o acesso e os créditos (idempotentes), depois o pagamento como
 * "concluido" e só no fim o e-mail — se algo falhar antes, o pagamento ainda
 * não está concluído e o reenvio repete tudo; se já estava, não repete o
 * e-mail.
 */
/**
 * Revalida uma conversão Avulso → subscrição quando o pagamento é
 * confirmado, ANTES de aplicar a subscrição. "anulada" = não aplicar nada.
 *
 * Só decide se a conversão é deste checkout e ainda está aberta, com a
 * subscrição ativa no Stripe. Nesse caso retira o caso do Avulso do saldo
 * (atómico); se o Avulso já não estiver disponível — usado entretanto ou
 * reembolsado —, anula a conversão. Reenvios: "convertido" segue (o Avulso
 * já saiu do saldo nesta conversão), "anulada" continua anulada.
 */
async function revalidarConversao(
  sessionId: string,
  conversaoId: string,
  subscriptionId: string,
  deps: DependenciasWebhook,
): Promise<"seguir" | "anulada"> {
  const conversao = await deps.obterConversao(conversaoId);
  // Checkout antigo (substituído) ou conversão desconhecida: sem conversão.
  if (!conversao || conversao.checkout_session_id !== sessionId) return "seguir";
  if (conversao.estado === "anulada") return "anulada";
  if (conversao.estado === "convertido") return "seguir";

  const snapshot = await deps.obterSubscricaoStripe(subscriptionId);
  if (!subscricaoEstaAtiva(snapshot.status)) return "seguir"; // nada é aplicado ainda

  const credito = await deps.retirarCreditoAvulso(`checkout:${conversao.avulso_session_id}`, "convertido");
  if (credito === "retirado" || credito === "convertido") return "seguir";

  await deps.anularConversao(conversao.id, sessionId, `caso do Avulso indisponível na confirmação do pagamento (${credito})`);
  return "anulada";
}

/**
 * Conversão anulada: a subscrição deste checkout não é aplicada à conta
 * (sem proteção, casos nem reembolso) e é cancelada no Stripe. O pagamento
 * fica registado como "assinatura_cancelada", sem e-mail de confirmação.
 * Tudo idempotente — um reenvio repete os mesmos passos sem efeito.
 */
async function concluirConversaoAnulada(
  session: Stripe.Checkout.Session,
  s: DadosSessao,
  contas: string[],
  subscriptionId: string,
  deps: DependenciasWebhook,
) {
  await deps.cancelarSubscricaoStripe(subscriptionId);
  await deps.gravarPagamento(dadosPagamento(session, s, "assinatura_cancelada"));
  await ligarConsentimentoDaSessao(session, s, contas, deps);
  return "conversao_anulada_avulso_indisponivel";
}

async function confirmarCompra(
  session: Stripe.Checkout.Session,
  s: DadosSessao,
  estadoAnterior: EstadoPagamento | null,
  deps: DependenciasWebhook,
  em: string,
) {
  const contas = await contasDaCompra(session, s, deps);

  // Conversão de um Avulso: revalidada antes de dar qualquer direito.
  const conversaoId = session.metadata?.conversao_id;
  if (conversaoId && s.subscriptionId && contas.length > 0) {
    if ((await revalidarConversao(session.id, conversaoId, s.subscriptionId, deps)) === "anulada") {
      return concluirConversaoAnulada(session, s, contas, s.subscriptionId, deps);
    }
  }

  // Plano efetivamente aplicado a uma conta (subscrição confirmada e ativa).
  let planoAplicado: Plano | null = null;
  for (const userId of contas) {
    planoAplicado = (await aplicarCompraConfirmadaNaConta(session, userId, deps, em)) ?? planoAplicado;
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
  if (conversaoId && s.subscriptionId && contas.length > 0) {
    // Só com a subscrição ativa na conta — nunca com base apenas no price.
    if (planoAplicado) await converterAvulso(session, conversaoId, s.subscriptionId, planoAplicado, deps);
  }

  // Pedido de caso pago: passa a caso só agora, com o acesso já aplicado.
  // Antes do "concluido", para um reenvio depois de uma falha voltar a
  // tentar (a conversão é idempotente).
  const pedidoId = pedidoDaMetadata(session.metadata);
  let casoDoPedido: string | null = null;
  if (pedidoId && contas.length > 0) {
    // Pago com Avulso: o pedido gasta o caso desta compra (vinculado).
    const origemAvulso = session.mode === "payment" ? `checkout:${session.id}` : null;
    casoDoPedido = planoAplicado ? await deps.converterPedidoEmCaso(pedidoId, contas[0], origemAvulso) : null;
    if (!casoDoPedido && estadoAnterior !== "concluido") {
      await deps.notificarAdmin(
        "Pedido de caso pago por converter — DoLado",
        `O pagamento da sessão ${session.id} foi confirmado, mas o pedido ${pedidoId} não passou a caso automaticamente. O cliente pode usar o caso disponível no portal; verificar no backoffice.`,
      );
    }
  }

  await deps.gravarPagamento(dadosPagamento(session, s, "concluido"));
  const consentimento = await ligarConsentimentoDaSessao(session, s, contas, deps);
  if (estadoAnterior !== "concluido" && plano) {
    const renovacao =
      plano !== "avulso" && s.subscriptionId
        ? (await deps.obterSubscricaoStripe(s.subscriptionId)).current_period_end
        : null;
    await deps.enviarEmailPagamentoConfirmado({
      email: s.email,
      plano,
      contaExiste: contas.length > 0,
      sessionId: session.id,
      valorPagoCentimos: session.amount_total,
      renovacao,
      consentimento,
    });
  }
  if (!plano) return "confirmado_preco_desconhecido";
  if (estadoAnterior === "concluido") return "ja_confirmado";
  if (pedidoId) return casoDoPedido ? "pagamento_confirmado_caso_criado" : "pagamento_confirmado_pedido_por_converter";
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
    await ligarConsentimentoDaSessao(session, s, s.userId ? [s.userId] : [], deps);
    return { resultado: "pagamento_pendente", ...ids };
  }

  return { resultado: await confirmarCompra(session, s, estadoAtual, deps, paraIso(event.created)!), ...ids };
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
  return { resultado: await confirmarCompra(session, s, estadoAtual, deps, paraIso(event.created)!), ...ids };
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

  // Subscrição de uma conversão Avulso: só o checkout.session.completed
  // decide (revalidação). Antes disso, ou se foi anulada, não aplica nada.
  if (snapshot.conversao_id) {
    const conversao = await deps.obterConversao(snapshot.conversao_id);
    if (conversao && conversao.estado !== "convertido") {
      return { resultado: conversao.estado === "anulada" ? "pago_conversao_anulada" : "pago_aguarda_conversao", ...ids };
    }
  }

  const contas = customerId ? await deps.contasDoCustomer(customerId) : [];
  if (contas.length === 0) return { resultado: "pago_sem_conta_ligada", ...ids };

  for (const userId of contas) {
    await deps.aplicarSubscricaoNaConta(userId, dadosNaConta(snapshot, plano));
  }
  if (plano === "caso_protecao") {
    await deps.restaurarCreditosCaso(subscriptionId, paraIso(event.created)!, MAXIMO_CREDITOS_MENSAIS);
  }

  let creditou = false;
  for (const userId of contas) {
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
  const planoDoPreco = deps.planoDoPreco(snapshot.price_id);
  const plano = terminada ? "none" : planoDoPreco;
  const agendado = cancelamentoAgendado(snapshot);
  const em = paraIso(event.created)!;
  const sub = snapshot.stripe_subscription_id;

  if (terminada && planoDoPreco === "caso_protecao") {
    // Antes de mexer na conta: congela pelas contas que ainda têm esta subscrição.
    await deps.congelarCreditosCaso(sub, em);
  }
  const afetadas = await deps.atualizarSubscricaoNasContas(sub, {
    ...(plano ? { plano } : {}),
    status: snapshot.status,
    stripe_price_id: snapshot.price_id,
    current_period_start: snapshot.current_period_start,
    current_period_end: snapshot.current_period_end,
    cancel_at_period_end: agendado,
  });
  if (afetadas === 0) return { resultado: "sincronizado_sem_conta", ...ids };

  if (terminada) {
    if (ESTADOS_FINAIS.has(snapshot.status)) {
      await deps.registarFimSubscricao(sub, { plano: planoDoPreco, em });
    }
    return { resultado: "sincronizado_acesso_retirado", ...ids };
  }

  await deps.sincronizarCancelamento(sub, {
    agendado,
    fimPrevisto: snapshot.cancel_at ?? snapshot.current_period_end,
    plano: planoDoPreco,
    em,
  });
  if (planoDoPreco === "caso_protecao" && subscricaoEstaAtiva(snapshot.status)) {
    // Ex.: Proteção → Caso + Proteção dentro dos 90 dias, ou unpaid → active.
    await deps.restaurarCreditosCaso(sub, em, MAXIMO_CREDITOS_MENSAIS);
  }
  return { resultado: agendado ? "sincronizado_cancelamento_agendado" : "sincronizado", ...ids };
}

async function tratarSubscricaoEliminada(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const snapshot = snapshotDeSubscricao(event.data.object as Stripe.Subscription);
  const ids = { customer_id: snapshot.stripe_customer_id, subscription_id: snapshot.stripe_subscription_id };

  // "deleted" é final: grava sempre, mesmo que um "updated" mais recente
  // tenha chegado antes.
  await deps.gravarSubscricao({ ...snapshot, status: "canceled" }, Number.MAX_SAFE_INTEGER);
  await deps.marcarPagamentosDaSubscricao(snapshot.stripe_subscription_id, "assinatura_cancelada");

  const plano = deps.planoDoPreco(snapshot.price_id);
  const em = paraIso(event.created)!;
  // Casos do Caso + Proteção: congelados 90 dias (só nas contas que ainda
  // têm esta subscrição; idempotente).
  if (plano === "caso_protecao") {
    await deps.congelarCreditosCaso(snapshot.stripe_subscription_id, em);
  }

  // Retira só o plano desta subscrição: a conta fica sem subscrição (não
  // "Avulso"). Casos, documentos e histórico ficam; os alertas ficam
  // desativados e conservados 6 meses (trigger em user_access).
  const afetadas = await deps.atualizarSubscricaoNasContas(snapshot.stripe_subscription_id, {
    plano: "none",
    status: "canceled",
    cancel_at_period_end: false,
  });
  if (afetadas > 0) await deps.registarFimSubscricao(snapshot.stripe_subscription_id, { plano, em });
  return { resultado: afetadas > 0 ? "cancelada_acesso_retirado" : "cancelada", ...ids };
}

const ESTADOS_REEMBOLSO_FALHADO: ReadonlySet<string> = new Set(["failed", "canceled"]);

async function tratarReembolso(event: Stripe.Event, deps: DependenciasWebhook): Promise<Tratamento> {
  const refund = event.data.object as Stripe.Refund;
  const atualizado = await deps.atualizarReembolso(refund.id, refund.status ?? null, refund.metadata?.conversao_id ?? null);
  if (!atualizado) return tratarReembolsoForaDeConversao(refund, deps);

  if (atualizado.passouAFalhado && ESTADOS_REEMBOLSO_FALHADO.has(refund.status ?? "")) {
    // Nunca cria um segundo reembolso automaticamente nem cancela a
    // assinatura: marca para intervenção e avisa o admin.
    await deps.marcarIntervencaoConversao(
      atualizado.conversaoId,
      refund.status === "canceled" ? "reembolso cancelado no Stripe" : "reembolso falhado no Stripe",
    );
    await deps.notificarAdmin(
      "Reembolso de conversão falhou — DoLado",
      `O reembolso ${refund.id} (conversão ${atualizado.conversaoId}) ficou "${refund.status}". A assinatura continua ativa. Resolver manualmente no Stripe.`,
    );
    return { resultado: "reembolso_falhado_intervencao" };
  }
  return { resultado: `reembolso_${refund.status ?? "sem_estado"}` };
}

/**
 * Reembolso feito fora de uma conversão (ex.: livre resolução, decidido à
 * mão no Stripe). Só um Avulso totalmente reembolsado mexe no saldo; um
 * reembolso parcial fica para decisão manual (o caso mantém-se).
 */
async function tratarReembolsoForaDeConversao(refund: Stripe.Refund, deps: DependenciasWebhook): Promise<Tratamento> {
  const paymentIntentId = idDe(refund.payment_intent);
  if (refund.status !== "succeeded" || !paymentIntentId) return { resultado: "ignorado_sem_conversao" };
  const avulso = await deps.avulsoDoPagamento(paymentIntentId);
  if (!avulso) return { resultado: "ignorado_sem_conversao" };

  if (!avulso.totalmenteReembolsado) {
    await deps.notificarAdmin(
      "Reembolso parcial de Avulso — DoLado",
      `O pagamento Avulso ${avulso.sessionId} foi reembolsado parcialmente (${refund.id}). O caso disponível não foi retirado automaticamente — decidir manualmente.`,
    );
    return { resultado: "reembolso_parcial_avulso" };
  }

  await deps.marcarPagamentoReembolsado(avulso.sessionId);
  const credito = await deps.retirarCreditoAvulso(`checkout:${avulso.sessionId}`, "reembolsado");
  return { resultado: `reembolso_avulso_${credito}` };
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
