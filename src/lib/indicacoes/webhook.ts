import type Stripe from "stripe";
import { produtoDaCompra } from "./regras.ts";

// Programa de indicação no webhook Stripe — chamado por src/lib/stripe/webhook.ts
// depois de o acesso e o pagamento estarem gravados. Sem I/O próprio: tudo
// entra por `DependenciasIndicacoes` (src/lib/indicacoes/servidor.ts), para
// os testes correrem com `node --test`.
//
// Regras:
// - Só um pagamento confirmado conta. Pagamento pendente (SEPA) prolonga a
//   reserva do desconto; pagamento falhado devolve-o.
// - Primeira compra confirmada da conta indicada → decisão atómica e
//   idempotente na base de dados (indicacao_confirmar_compra): recompensa
//   "disponivel", "em_revisao" (mesmo cartão de quem indicou) ou rejeitada
//   (mesmo Customer Stripe, 0 €, não é a primeira compra). Um reenvio do
//   Stripe nunca cria uma segunda recompensa.
// - Desconto de quem indicou usado numa cobrança paga: checkout:<sessão>
//   (metadata indicacao_recompensa_id) ou invoice:<id> (cupão posto na
//   subscrição da Proteção). Cada cobrança usa no máximo um.
// - Reembolso integral ou disputa da primeira compra → indicação revertida e
//   desconto anulado se ainda não foi usado (já usado: aviso ao admin).

export type ResultadoConfirmacaoIndicacao = {
  resultado: string;
  recompensa_id?: string | null;
  referrer_user_id?: string | null;
};

export type ResultadoReversao = {
  resultado: string;
  reserva_origem?: string | null;
  referrer_user_id?: string | null;
};

export type DadosPrimeiraCompra = {
  referredUserId: string;
  sessionId: string;
  produto: "avulso" | "protecao" | "caso_protecao";
  valorCentimos: number | null;
  descontoCentimos: number | null;
  comDescontoIndicacao: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  paymentIntentId: string | null;
  suspeita: string | null;
};

export interface DependenciasIndicacoes {
  /** Quem indicou esta conta, se a primeira compra ainda não foi decidida. */
  indicacaoPorDecidir(userId: string): Promise<{ referrerUserId: string } | null>;
  /** PaymentIntent da compra (pagamento único ou 1.ª fatura da subscrição), para reembolsos e disputas. */
  paymentIntentDaCompra(session: Stripe.Checkout.Session): Promise<string | null>;
  /**
   * Sinal forte de auto-indicação que não chega para recusar sozinho
   * (ex.: o cartão desta compra é o mesmo de quem indicou). Motivo ou null.
   * Nunca por IP.
   */
  sinalAutoIndicacao(dados: { referrerUserId: string; paymentIntentId: string | null }): Promise<string | null>;
  confirmarCompra(dados: DadosPrimeiraCompra): Promise<ResultadoConfirmacaoIndicacao>;
  usarRecompensa(recompensaId: string, userId: string, usadaOrigem: string, descontoCentimos: number | null): Promise<string>;
  /** Reserva → nova origem e prazo (null = sem prazo). */
  atualizarReserva(recompensaId: string, origem: string, expiraEm: string | null): Promise<boolean>;
  libertarReserva(origem: string): Promise<number>;
  reverterCompra(sessionId: string | null, paymentIntentId: string | null, motivo: string): Promise<ResultadoReversao>;
  pagamentoTotalmenteReembolsado(paymentIntentId: string): Promise<boolean>;
  /** Desconto de quem indicou aplicado nesta fatura paga (reserva subscricao:<id> + cupão na fatura). */
  recompensaDaFatura(
    invoiceId: string,
    subscriptionId: string,
  ): Promise<{ recompensaId: string; userId: string; descontoCentimos: number | null } | null>;
  /** Põe o próximo desconto disponível na próxima mensalidade da Proteção da conta (se elegível). */
  aplicarRecompensaNaSubscricao(userId: string): Promise<string>;
  /** Retira o desconto de indicação da subscrição (reserva anulada). */
  removerRecompensaDaSubscricao(subscriptionId: string): Promise<void>;
  notificarAdmin(assunto: string, texto: string): Promise<void>;
  registar(linha: { evento: string; resultado: string; erro_codigo?: string }): void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Desconto de quem indicou reservado para este Checkout (metadata definida pelo servidor). */
export function recompensaDaMetadata(metadata: Record<string, string> | null | undefined) {
  const id = metadata?.indicacao_recompensa_id;
  return id && UUID.test(id) ? id : null;
}

const USO_ANOMALO: ReadonlySet<string> = new Set(["anulada", "em_revisao", "usada_noutra", "inexistente", "cobranca_ja_com_desconto"]);

function codigo(erro: unknown) {
  const c = (erro as { code?: unknown } | null)?.code;
  return typeof c === "string" && c ? c : erro instanceof Error ? erro.name : "desconhecido";
}

/** Passo do Stripe que não pode fazer falhar o webhook: fica registado e é retomado na fatura seguinte. */
async function semFalhar(deps: DependenciasIndicacoes, evento: string, passo: () => Promise<string>) {
  try {
    deps.registar({ evento, resultado: await passo() });
  } catch (erro) {
    deps.registar({ evento, resultado: "erro", erro_codigo: codigo(erro) });
  }
}

async function usar(
  deps: DependenciasIndicacoes,
  recompensaId: string,
  userId: string,
  origem: string,
  desconto: number | null,
) {
  const r = await deps.usarRecompensa(recompensaId, userId, origem, desconto);
  deps.registar({ evento: "indicacao_recompensa_usada", resultado: r });
  if (USO_ANOMALO.has(r)) {
    await deps.notificarAdmin(
      "Desconto de indicação por rever — DoLado",
      `A cobrança ${origem} foi paga com o desconto de indicação ${recompensaId}, mas o desconto não pôde ser marcado como usado (${r}). Verificar no backoffice.`,
    );
  }
  return r;
}

/**
 * Compra confirmada e paga (checkout.session.completed pago ou pagamento
 * assíncrono confirmado), já aplicada à conta. Idempotente.
 */
export async function indicacaoAoConfirmarPagamento(
  session: Stripe.Checkout.Session,
  userId: string | null,
  planoSubscricao: string | null,
  deps: DependenciasIndicacoes,
) {
  if (!userId) return "sem_conta";

  const recompensaId = recompensaDaMetadata(session.metadata);
  if (recompensaId) {
    await usar(deps, recompensaId, userId, `checkout:${session.id}`, session.total_details?.amount_discount ?? null);
  }

  const pendente = await deps.indicacaoPorDecidir(userId);
  if (!pendente) return recompensaId ? "recompensa_usada" : "sem_indicacao";

  const produto = produtoDaCompra(session.mode, session.metadata?.plano, planoSubscricao);
  if (!produto) return "produto_sem_indicacao";

  const paymentIntentId = await deps.paymentIntentDaCompra(session);
  const suspeita = await deps.sinalAutoIndicacao({ referrerUserId: pendente.referrerUserId, paymentIntentId });
  const r = await deps.confirmarCompra({
    referredUserId: userId,
    sessionId: session.id,
    produto,
    valorCentimos: session.amount_total ?? null,
    descontoCentimos: session.total_details?.amount_discount ?? null,
    comDescontoIndicacao: session.metadata?.indicacao_desconto === "novo_cliente",
    customerId: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
    subscriptionId: typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null),
    paymentIntentId,
    suspeita,
  });
  deps.registar({ evento: "indicacao_primeira_compra", resultado: r.resultado });

  if (r.resultado === "recompensa_em_revisao") {
    await deps.notificarAdmin(
      "Indicação por rever — DoLado",
      `A primeira compra ${session.id} de uma conta indicada tem um sinal de possível auto-indicação (${suspeita}). O desconto de quem indicou ficou em revisão: aprovar ou recusar em /backoffice/indicacoes.`,
    );
  }
  if (r.resultado === "recompensa_disponivel" && r.referrer_user_id) {
    const referrer = r.referrer_user_id;
    await semFalhar(deps, "indicacao_aplicar_subscricao", () => deps.aplicarRecompensaNaSubscricao(referrer));
  }
  return r.resultado;
}

/** Checkout concluído com pagamento ainda por confirmar (SEPA): a reserva deixa de expirar. */
export async function indicacaoAoPagamentoPendente(session: Stripe.Checkout.Session, deps: DependenciasIndicacoes) {
  const recompensaId = recompensaDaMetadata(session.metadata);
  if (!recompensaId) return "sem_recompensa";
  await deps.atualizarReserva(recompensaId, `checkout:${session.id}`, null);
  return "reserva_prolongada";
}

/** Pagamento assíncrono falhado: o desconto reservado volta a estar disponível. */
export async function indicacaoAoPagamentoFalhado(session: Stripe.Checkout.Session, deps: DependenciasIndicacoes) {
  if (!recompensaDaMetadata(session.metadata)) return "sem_recompensa";
  const n = await deps.libertarReserva(`checkout:${session.id}`);
  return n > 0 ? "reserva_libertada" : "sem_reserva";
}

/**
 * Fatura paga de uma subscrição ativa: marca como usado o desconto que lá
 * estava (se o cupão foi aplicado nesta fatura) e põe o seguinte, se houver.
 */
export async function indicacaoAoPagarFatura(
  invoiceId: string,
  subscriptionId: string,
  contas: string[],
  deps: DependenciasIndicacoes,
) {
  const usada = await deps.recompensaDaFatura(invoiceId, subscriptionId);
  if (usada) await usar(deps, usada.recompensaId, usada.userId, `invoice:${invoiceId}`, usada.descontoCentimos);
  for (const userId of contas) {
    await semFalhar(deps, "indicacao_aplicar_subscricao", () => deps.aplicarRecompensaNaSubscricao(userId));
  }
  return usada ? "recompensa_usada" : "sem_recompensa";
}

/** Subscrição terminada: um desconto que lá estava à espera volta a estar disponível. */
export async function indicacaoAoTerminarSubscricao(subscriptionId: string, deps: DependenciasIndicacoes) {
  const n = await deps.libertarReserva(`subscricao:${subscriptionId}`);
  return n > 0 ? "reserva_libertada" : "sem_reserva";
}

async function depoisDaReversao(r: ResultadoReversao, origem: string, deps: DependenciasIndicacoes) {
  deps.registar({ evento: "indicacao_reversao", resultado: r.resultado });
  const reserva = r.reserva_origem ?? "";
  if (reserva.startsWith("subscricao:")) {
    const sub = reserva.slice("subscricao:".length);
    await semFalhar(deps, "indicacao_remover_desconto_subscricao", async () => {
      await deps.removerRecompensaDaSubscricao(sub);
      return "removido";
    });
  }
  if (r.resultado === "revertida_recompensa_ja_usada") {
    await deps.notificarAdmin(
      "Indicação revertida com desconto já usado — DoLado",
      `A primeira compra de uma conta indicada foi ${origem}, mas o desconto de quem indicou já tinha sido usado. Nada foi cobrado de volta automaticamente — decidir manualmente.`,
    );
  }
  return r.resultado;
}

/** Reembolso (fora de uma conversão Avulso): só um reembolso integral reverte a indicação. */
export async function indicacaoAoReembolso(paymentIntentId: string, deps: DependenciasIndicacoes) {
  if (!(await deps.pagamentoTotalmenteReembolsado(paymentIntentId))) return "reembolso_parcial";
  return depoisDaReversao(await deps.reverterCompra(null, paymentIntentId, "reembolso_integral"), "reembolsada na totalidade", deps);
}

/** Disputa (chargeback) aberta: reverte a indicação, como um reembolso integral. */
export async function indicacaoAoDisputar(paymentIntentId: string, deps: DependenciasIndicacoes) {
  return depoisDaReversao(await deps.reverterCompra(null, paymentIntentId, "disputa"), "contestada (disputa)", deps);
}
