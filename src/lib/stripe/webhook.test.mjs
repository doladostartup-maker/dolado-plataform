// Testes da lógica do webhook Stripe — `npm test` (node --test, sem
// dependências novas). As dependências são falsas e guardam o estado em
// memória (incluindo o registo de créditos por origem, com a mesma regra da
// função SQL conceder_credito_caso), para verificar o efeito real de cada
// evento no acesso e nos créditos.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, test } from "node:test";
import { aplicarCompraConfirmadaNaConta, processarEventoStripe } from "./webhook.ts";

const CUSTOMER = "cus_teste";
const SUB = "sub_teste";
const USER = "00000000-0000-4000-a000-00000000000a";
const PRECO_PROTECAO = "price_1ULUUeBtJL9VeDPfWuDk5XCo";
const PRECO_CASO_PROTECAO = "price_1UJYnPBtJL9VeDPfnQTlVwsq";

function criarEstado() {
  return {
    eventos: new Map(), // event_id → estado
    pagamentos: new Map(), // session_id → linha
    subscricoes: new Map(), // subscription_id → linha
    contas: new Map(), // user_id → linha de user_access
    creditosConcedidos: new Set(), // origens (case_credit_grants)
    creditosPorConta: new Map(), // origem → user_id (para congelar_creditos_caso)
    congelamentos: [], // case_credit_freezes
    cancelamentos: [], // subscricao_cancelamentos
    emails: [],
    logs: [],
    stripeSubscricao: null, // o que a "API Stripe" devolve
    falharCreditoUmaVez: false,
    conversoes: new Map(), // id → linha de conversoes_avulso
    refundsStripe: [], // reembolsos que existem no "Stripe"
    refundFalhaDefinitiva: false,
    refundFalhaTransitoriaUmaVez: false,
    avisosAdmin: [],
  };
}

function contaVazia() {
  return {
    subscription_plan: "none",
    subscription_status: null,
    case_credits: 0,
    stripe_customer_id: null,
    stripe_subscription_id: null,
  };
}

function criarDependencias(estado) {
  return {
    async reclamarEvento(id) {
      if (estado.eventos.has(id)) return false;
      estado.eventos.set(id, "processando");
      return true;
    },
    async concluirEvento(id) {
      estado.eventos.set(id, "processado");
    },
    async libertarEvento(id) {
      if (estado.eventos.get(id) === "processando") estado.eventos.delete(id);
    },
    async obterEstadoPagamento(sessionId) {
      return estado.pagamentos.get(sessionId)?.estado ?? null;
    },
    async utilizadorDoPagamento(sessionId) {
      return estado.pagamentos.get(sessionId)?.user_id ?? null;
    },
    async gravarPagamento(dados) {
      estado.pagamentos.set(dados.stripe_session_id, { ...estado.pagamentos.get(dados.stripe_session_id), ...dados });
    },
    async marcarPagamentosDaSubscricao(subId, novoEstado) {
      for (const p of estado.pagamentos.values()) if (p.stripe_subscription_id === subId) p.estado = novoEstado;
    },
    async obterSubscricaoStripe(subId) {
      assert.equal(subId, estado.stripeSubscricao.stripe_subscription_id);
      return estado.stripeSubscricao;
    },
    async gravarSubscricao(snapshot, estadoEm, cobranca) {
      const atual = estado.subscricoes.get(snapshot.stripe_subscription_id);
      const cob = cobranca ? { ultimo_pagamento_estado: cobranca.estado } : {};
      if (atual && estadoEm < atual.estado_em) {
        Object.assign(atual, cob);
        return false;
      }
      estado.subscricoes.set(snapshot.stripe_subscription_id, { ...atual, ...snapshot, ...cob, estado_em: estadoEm });
      return true;
    },
    planoDoPreco(priceId) {
      if (priceId === PRECO_PROTECAO) return "protecao";
      if (priceId === PRECO_CASO_PROTECAO) return "caso_protecao";
      return null;
    },
    async contasDoCustomer(customerId) {
      return [...estado.contas.entries()].filter(([, c]) => c.stripe_customer_id === customerId).map(([id]) => id);
    },
    async aplicarSubscricaoNaConta(userId, sub) {
      estado.contas.set(userId, {
        ...(estado.contas.get(userId) ?? contaVazia()),
        subscription_plan: sub.plano,
        subscription_status: sub.status,
        stripe_subscription_id: sub.stripe_subscription_id,
        stripe_customer_id: sub.stripe_customer_id,
        stripe_price_id: sub.stripe_price_id,
        cancel_at_period_end: sub.cancel_at_period_end,
      });
    },
    async atualizarSubscricaoNasContas(subId, dados) {
      let n = 0;
      for (const c of estado.contas.values()) {
        if (c.stripe_subscription_id !== subId) continue;
        if (dados.plano) c.subscription_plan = dados.plano;
        if (dados.status) c.subscription_status = dados.status;
        if (dados.cancel_at_period_end !== undefined) c.cancel_at_period_end = dados.cancel_at_period_end;
        if (dados.current_period_end !== undefined) c.current_period_end = dados.current_period_end;
        n++;
      }
      return n;
    },
    async garantirConta(userId, customerId) {
      const c = estado.contas.get(userId) ?? contaVazia();
      if (!c.stripe_customer_id) c.stripe_customer_id = customerId;
      estado.contas.set(userId, c);
    },
    async concederCreditoCaso(userId, origem, maximo) {
      if (estado.falharCreditoUmaVez) {
        estado.falharCreditoUmaVez = false;
        throw Object.assign(new Error("falha simulada"), { code: "08006" });
      }
      if (estado.creditosConcedidos.has(origem)) return false;
      estado.creditosConcedidos.add(origem);
      estado.creditosPorConta.set(origem, userId);
      const c = estado.contas.get(userId);
      c.case_credits = maximo == null ? c.case_credits + 1 : Math.max(c.case_credits, Math.min(c.case_credits + 1, maximo));
      return true;
    },
    // Mesmas regras que as funções SQL congelar_/restaurar_creditos_caso.
    async congelarCreditosCaso(subId, em) {
      let total = 0;
      for (const [userId, c] of estado.contas) {
        if (c.stripe_subscription_id !== subId) continue;
        if (estado.congelamentos.some((f) => f.sub === subId && f.user_id === userId && !f.restaurado_em)) continue;
        const avulso = [...estado.creditosPorConta].filter(([o, u]) => u === userId && o.startsWith("checkout:")).length;
        const quantidade = Math.max(c.case_credits - avulso, 0);
        const expira = new Date(new Date(em).getTime() + 90 * DIA_MS).toISOString();
        estado.congelamentos.push({ user_id: userId, sub: subId, quantidade, congelado_em: em, expira_em: expira, restaurado_em: null });
        c.case_credits -= quantidade;
        total += quantidade;
      }
      return total;
    },
    async restaurarCreditosCaso(subId, em, maximo) {
      let total = 0;
      for (const [userId, c] of estado.contas) {
        if (c.stripe_subscription_id !== subId || c.subscription_plan !== "caso_protecao") continue;
        if (!["active", "trialing", "past_due"].includes(c.subscription_status)) continue;
        const validos = estado.congelamentos.filter((f) => f.user_id === userId && !f.restaurado_em && f.expira_em > em);
        if (validos.length === 0) continue;
        const soma = validos.reduce((a, f) => a + f.quantidade, 0);
        for (const f of validos) f.restaurado_em = em;
        const novo = Math.max(c.case_credits, Math.min(c.case_credits + soma, maximo));
        total += novo - c.case_credits;
        c.case_credits = novo;
      }
      return total;
    },
    async sincronizarCancelamento(subId, { agendado, fimPrevisto, plano, em }) {
      const aberto = estado.cancelamentos.find((x) => x.sub === subId && !x.revertido_em && !x.terminado_em);
      if (!agendado) {
        if (aberto) aberto.revertido_em = em;
        return;
      }
      if (aberto) {
        aberto.fim_previsto_em = fimPrevisto;
        return;
      }
      estado.cancelamentos.push({ sub: subId, plano, origem: "stripe", pedido_em: em, fim_previsto_em: fimPrevisto, revertido_em: null, terminado_em: null });
    },
    async registarFimSubscricao(subId, { plano, em }) {
      const abertos = estado.cancelamentos.filter((x) => x.sub === subId && !x.revertido_em && !x.terminado_em);
      if (abertos.length) {
        for (const x of abertos) x.terminado_em = em;
        return;
      }
      if (estado.cancelamentos.some((x) => x.sub === subId && x.terminado_em)) return;
      estado.cancelamentos.push({ sub: subId, plano, origem: "stripe", pedido_em: null, revertido_em: null, terminado_em: em });
    },
    async reclamarConversao(id, checkoutSessionId, subscriptionId) {
      const c = estado.conversoes.get(id);
      if (!c || c.checkout_session_id !== checkoutSessionId) return null;
      if (c.estado === "checkout_aberto") {
        c.estado = "convertido";
        c.stripe_subscription_id = subscriptionId;
      }
      return c.estado === "convertido" ? { ...c } : null;
    },
    async criarReembolsoConversao(conv) {
      const existente = estado.refundsStripe.find((r) => r.conversao_id === conv.id);
      if (existente) return { ok: true, id: existente.id, status: existente.status, payment_intent_id: "pi_avulso" };
      if (estado.refundFalhaTransitoriaUmaVez) {
        estado.refundFalhaTransitoriaUmaVez = false;
        throw Object.assign(new Error("Stripe indisponível"), { code: "api_connection_error" });
      }
      if (estado.refundFalhaDefinitiva) return { ok: false, motivo: "charge_already_refunded" };
      const refund = { id: `re_${estado.refundsStripe.length + 1}`, amount: conv.refund_montante_centimos, conversao_id: conv.id, status: "pending" };
      estado.refundsStripe.push(refund);
      return { ok: true, id: refund.id, status: refund.status, payment_intent_id: "pi_avulso" };
    },
    async gravarReembolsoConversao(id, r) {
      Object.assign(estado.conversoes.get(id), { refund_id: r.id, refund_estado: r.status, payment_intent_id: r.payment_intent_id });
    },
    async marcarIntervencaoConversao(id, motivo) {
      Object.assign(estado.conversoes.get(id), { requer_intervencao: true, intervencao_motivo: motivo });
    },
    async atualizarReembolso(refundId, status, conversaoId) {
      const c = [...estado.conversoes.values()].find((x) => x.refund_id === refundId || x.id === conversaoId);
      if (!c || (c.refund_id && c.refund_id !== refundId)) return null;
      const falhados = ["failed", "canceled"];
      const passouAFalhado = falhados.includes(status) && !falhados.includes(c.refund_estado);
      Object.assign(c, { refund_id: refundId, refund_estado: status });
      return { conversaoId: c.id, passouAFalhado };
    },
    async notificarAdmin(assunto, texto) {
      estado.avisosAdmin.push({ assunto, texto });
    },
    async enviarEmailPagamentoConfirmado(dados) {
      estado.emails.push(dados);
    },
    registar(linha) {
      estado.logs.push(linha);
    },
  };
}

const DIA_MS = 24 * 3600 * 1000;
let n = 0;
function evento(type, object, created = 1_700_000_000 + n) {
  n++;
  return { id: `evt_${n}`, type, created, data: { object } };
}

function sessaoAvulso(extra = {}) {
  return {
    id: "cs_avulso",
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    customer: CUSTOMER,
    subscription: null,
    invoice: null,
    customer_details: { email: "cliente@teste.invalid" },
    amount_total: 1499,
    currency: "eur",
    discounts: [],
    metadata: { plano: "avulso" },
    ...extra,
  };
}

function sessaoSubscricao(extra = {}) {
  return {
    ...sessaoAvulso(),
    id: "cs_sub",
    mode: "subscription",
    subscription: SUB,
    invoice: "in_primeira",
    amount_total: 799,
    metadata: { plano: "assinatura", user_id: USER },
    ...extra,
  };
}

function snapshot(status, price = PRECO_CASO_PROTECAO) {
  return {
    stripe_subscription_id: SUB,
    stripe_customer_id: CUSTOMER,
    price_id: price,
    status,
    cancel_at_period_end: false,
    cancel_at: null,
    current_period_start: "2023-11-14T22:13:20.000Z",
    current_period_end: "2023-12-14T22:13:20.000Z",
  };
}

function subscricao(status, price = PRECO_CASO_PROTECAO, extra = {}) {
  return {
    id: SUB,
    object: "subscription",
    customer: CUSTOMER,
    status,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: price }, current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }] },
    ...extra,
  };
}

function fatura(id, billing_reason = "subscription_cycle", extra = {}) {
  return {
    id,
    object: "invoice",
    customer: CUSTOMER,
    billing_reason,
    parent: { type: "subscription_details", subscription_details: { subscription: SUB } },
    ...extra,
  };
}

let estado;
let deps;
const conta = () => estado.contas.get(USER);
const ultimoLog = () => estado.logs.at(-1);

beforeEach(() => {
  estado = criarEstado();
  deps = criarDependencias(estado);
});

function comConta(extra = {}) {
  estado.contas.set(USER, { ...contaVazia(), stripe_customer_id: CUSTOMER, ...extra });
}

describe("subscrição paga de imediato (cartão)", () => {
  test("checkout concluído e pago: ativa Caso + Proteção e credita o primeiro ciclo", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    const r = await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao()), deps);
    assert.equal(r.status, 200);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().subscription_status, "active");
    assert.equal(conta().case_credits, 1);
    assert.equal(estado.pagamentos.get("cs_sub").estado, "concluido");
    assert.equal(estado.emails.length, 1);
    assert.equal(estado.emails[0].contaExiste, true);
  });

  test("invoice.paid da mesma primeira fatura não credita outra vez", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao()), deps);
    await processarEventoStripe(evento("invoice.paid", fatura("in_primeira", "subscription_create")), deps);
    assert.equal(conta().case_credits, 1);
  });

  test("Proteção: ativa proteção, sem créditos de caso", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao()), deps);
    await processarEventoStripe(evento("invoice.paid", fatura("in_2", "subscription_cycle")), deps);
    assert.equal(conta().subscription_plan, "protecao");
    assert.equal(conta().case_credits, 0);
  });

  test("price desconhecido: não ativa nenhum plano", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active", "price_outro");
    await processarEventoStripe(evento("invoice.paid", fatura("in_x")), deps);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(ultimoLog().resultado, "pago_preco_desconhecido");
  });
});

describe("SEPA (pagamento assíncrono)", () => {
  test("pendente: regista, sem plano, créditos nem e-mail", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoSubscricao({ payment_status: "unpaid" })),
      deps,
    );
    assert.equal(estado.pagamentos.get("cs_sub").estado, "pendente");
    assert.equal(conta().subscription_plan, "none");
    assert.equal(conta().case_credits, 0);
    assert.equal(estado.emails.length, 0);
  });

  test("Avulso pendente não dá crédito; confirmado depois dá 1, uma única vez", async () => {
    comConta();
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoAvulso({ payment_status: "unpaid", metadata: { plano: "avulso", user_id: USER } })),
      deps,
    );
    assert.equal(conta().case_credits, 0);

    const confirmado = sessaoAvulso({ metadata: { plano: "avulso", user_id: USER } });
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", confirmado), deps);
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", confirmado), deps); // outro event.id
    assert.equal(conta().case_credits, 1);
    assert.equal(conta().subscription_plan, "none", "Avulso não dá proteção");
    assert.equal(estado.emails.length, 1);
  });

  test("confirmado depois: ativa a subscrição automaticamente", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao({ payment_status: "unpaid" })), deps);
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessaoSubscricao()), deps);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 1);
  });

  test("falhado: regista a falha, nunca dá acesso e não apaga a conta", async () => {
    comConta();
    await processarEventoStripe(
      evento("checkout.session.async_payment_failed", sessaoSubscricao({ payment_status: "unpaid" })),
      deps,
    );
    assert.equal(estado.pagamentos.get("cs_sub").estado, "falhado");
    assert.equal(conta().subscription_plan, "none");
    assert.ok(estado.contas.has(USER));
    assert.equal(estado.emails.length, 0);
  });

  test("compra de raiz confirmada antes de haver conta: e-mail com ligação para criar a conta", async () => {
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessaoAvulso()), deps);
    assert.equal(estado.emails[0].contaExiste, false);
    assert.equal(estado.emails[0].sessionId, "cs_avulso");
    assert.equal(ultimoLog().resultado, "pagamento_confirmado_sem_conta");
  });

  test("conta criada com pagamento pendente: sem acesso; o webhook ativa depois pela compra ligada", async () => {
    // /criar-conta criou a conta e ligou a compra enquanto estava pendente.
    comConta();
    estado.pagamentos.set("cs_avulso", { stripe_session_id: "cs_avulso", user_id: USER, estado: "pendente" });
    assert.equal(conta().case_credits, 0);

    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessaoAvulso()), deps);
    assert.equal(conta().case_credits, 1);
    assert.equal(estado.emails[0].contaExiste, true, "já tem conta: e-mail com ligação para iniciar sessão");
  });

  test("/criar-conta e webhook a aplicar a mesma compra: só 1 crédito", async () => {
    comConta();
    const s = sessaoAvulso();
    await aplicarCompraConfirmadaNaConta(s, USER, deps); // /criar-conta
    estado.pagamentos.set("cs_avulso", { stripe_session_id: "cs_avulso", user_id: USER, estado: "pendente" });
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", s), deps); // webhook
    assert.equal(conta().case_credits, 1);
  });
});

// Piloto Remax: os colaboradores subscrevem Caso + Proteção com o cupão
// duploprestigio26 (100%, "forever", limitado ao Caso + Proteção no Stripe).
// Faturas a 0 € têm de dar o mesmo acesso e os mesmos casos que uma paga.
describe("piloto Remax: Caso + Proteção com cupão de 100%", () => {
  const sessaoPiloto = () =>
    sessaoSubscricao({
      payment_status: "no_payment_required",
      amount_total: 0,
      discounts: [{ coupon: "duploprestigio26", promotion_code: "promo_teste" }],
    });

  test("checkout a 0 €: ativa Caso + Proteção e dá o caso do primeiro ciclo", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    const r = await processarEventoStripe(evento("checkout.session.completed", sessaoPiloto()), deps);
    assert.equal(r.status, 200);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().subscription_status, "active");
    assert.equal(conta().case_credits, 1);
    assert.equal(estado.pagamentos.get("cs_sub").estado, "concluido");
  });

  test("faturas mensais a 0 €: 1 caso por ciclo, até ao máximo de 4", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", sessaoPiloto()), deps);
    for (let i = 2; i <= 6; i++) {
      await processarEventoStripe(evento("invoice.paid", fatura(`in_${i}`, "subscription_cycle", { amount_paid: 0 })), deps);
    }
    assert.equal(conta().case_credits, 4);
    assert.equal(conta().subscription_plan, "caso_protecao");
  });
});

describe("Caso + Proteção: créditos mensais", () => {
  test("1 crédito por ciclo pago, até ao máximo de 4", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    for (let i = 1; i <= 6; i++) {
      await processarEventoStripe(evento("invoice.paid", fatura(`in_${i}`)), deps);
    }
    assert.equal(conta().case_credits, 4);
  });

  test("a mesma fatura (novo event.id) nunca credita duas vezes", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("invoice.paid", fatura("in_1")), deps);
    await processarEventoStripe(evento("invoice.paid", fatura("in_1")), deps);
    assert.equal(conta().case_credits, 1);
  });

  test("fatura de prorrateio (mudança de plano) não dá crédito", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("invoice.paid", fatura("in_pro", "subscription_update")), deps);
    assert.equal(conta().case_credits, 0);
    assert.equal(conta().subscription_plan, "caso_protecao");
  });

  test("créditos Avulso somam-se aos mensais sem limite de 4 para o Avulso", async () => {
    comConta({ case_credits: 4 });
    await aplicarCompraConfirmadaNaConta(sessaoAvulso(), USER, deps);
    assert.equal(conta().case_credits, 5);
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("invoice.paid", fatura("in_9")), deps);
    assert.equal(conta().case_credits, 5, "o crédito mensal não sobe acima do limite, mas também não retira");
  });
});

describe("invoice falhada / ação necessária", () => {
  test("invoice.payment_failed: regista, mantém o acesso (Stripe ainda a tentar)", async () => {
    comConta({ subscription_plan: "caso_protecao", subscription_status: "active", stripe_subscription_id: SUB });
    estado.stripeSubscricao = snapshot("past_due");
    await processarEventoStripe(evento("invoice.payment_failed", fatura("in_f")), deps);
    assert.equal(estado.subscricoes.get(SUB).ultimo_pagamento_estado, "falhado");
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 0);
  });

  test("invoice.payment_action_required: regista sem tratar como pago", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("incomplete");
    await processarEventoStripe(evento("invoice.payment_action_required", fatura("in_a")), deps);
    assert.equal(estado.subscricoes.get(SUB).ultimo_pagamento_estado, "acao_necessaria");
    assert.equal(conta().subscription_plan, "none");
  });
});

describe("customer.subscription.*", () => {
  test("updated nunca ativa uma conta que não tinha esta subscrição", async () => {
    comConta();
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("active")), deps);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(ultimoLog().resultado, "sincronizado_sem_conta");
  });

  test("updated sincroniza plano e status de quem já a tem (Proteção → Caso + Proteção)", async () => {
    comConta({ subscription_plan: "protecao", subscription_status: "active", stripe_subscription_id: SUB });
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("past_due", PRECO_CASO_PROTECAO)), deps);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().subscription_status, "past_due");
  });

  test("updated para unpaid retira o plano", async () => {
    comConta({ subscription_plan: "caso_protecao", subscription_status: "past_due", stripe_subscription_id: SUB });
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("unpaid")), deps);
    assert.equal(conta().subscription_plan, "none");
  });

  test("cancelamento de Proteção retira a proteção sem apagar a conta nem o histórico", async () => {
    comConta({ subscription_plan: "protecao", subscription_status: "active", stripe_subscription_id: SUB });
    estado.pagamentos.set("cs_sub", { stripe_session_id: "cs_sub", stripe_subscription_id: SUB, estado: "concluido" });
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled", PRECO_PROTECAO)), deps);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(conta().subscription_status, "canceled");
    assert.ok(estado.contas.has(USER));
    assert.equal(estado.pagamentos.get("cs_sub").estado, "assinatura_cancelada");
  });

  test("fim do Caso + Proteção: conta sem subscrição, casos da subscrição congelados (não perdidos)", async () => {
    comConta({ subscription_plan: "caso_protecao", subscription_status: "active", stripe_subscription_id: SUB, case_credits: 3 });
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled")), deps);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(conta().case_credits, 0);
    assert.equal(estado.congelamentos.length, 1);
    assert.equal(estado.congelamentos[0].quantidade, 3);
  });

  test("cancelar uma subscrição antiga não mexe na conta que já tem outra", async () => {
    comConta({ subscription_plan: "caso_protecao", subscription_status: "active", stripe_subscription_id: "sub_nova" });
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled")), deps);
    assert.equal(conta().subscription_plan, "caso_protecao");
  });
});

describe("idempotência, eventos desconhecidos e erros", () => {
  test("o mesmo event.id só é processado uma vez (sem créditos duplicados)", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    const e = evento("invoice.paid", fatura("in_1"));
    await processarEventoStripe(e, deps);
    const r = await processarEventoStripe(e, deps);
    assert.equal(r.corpo.duplicado, true);
    assert.equal(conta().case_credits, 1);
  });

  test("evento desconhecido: 200, ignorado e sem gravar nada", async () => {
    const r = await processarEventoStripe(evento("customer.created", { id: CUSTOMER }), deps);
    assert.equal(r.status, 200);
    assert.equal(estado.eventos.size, 0);
    assert.equal(ultimoLog().resultado, "ignorado_sem_tratamento");
  });

  test("modo incoerente com o plano: ignorado, sem créditos", async () => {
    comConta();
    await processarEventoStripe(evento("checkout.session.completed", sessaoAvulso({ mode: "subscription" })), deps);
    assert.equal(conta().case_credits, 0);
    assert.equal(ultimoLog().resultado, "ignorado_modo_incoerente");
  });

  test("falha a meio: 500, liberta o evento e o reenvio credita uma vez e envia o e-mail uma vez", async () => {
    comConta();
    estado.falharCreditoUmaVez = true;
    const e = evento("checkout.session.completed", sessaoAvulso({ metadata: { plano: "avulso", user_id: USER } }));
    const r1 = await processarEventoStripe(e, deps);
    assert.equal(r1.status, 500);
    assert.equal(estado.eventos.has(e.id), false);
    assert.equal(ultimoLog().erro_codigo, "08006");
    assert.equal(estado.emails.length, 0);

    const r2 = await processarEventoStripe(e, deps);
    assert.equal(r2.status, 200);
    assert.equal(conta().case_credits, 1);
    assert.equal(estado.emails.length, 1);
  });

  test("os logs não levam e-mails nem payload", async () => {
    comConta();
    await processarEventoStripe(evento("checkout.session.completed", sessaoAvulso()), deps);
    assert.equal(JSON.stringify(estado.logs).includes("@"), false);
    assert.deepEqual(Object.keys(ultimoLog()).sort(), ["customer_id", "event_id", "evento", "resultado", "subscription_id"]);
  });

  test("não envia user_id null (não apaga a ligação feita por /criar-conta)", async () => {
    estado.pagamentos.set("cs_avulso", { stripe_session_id: "cs_avulso", user_id: USER, estado: "pendente" });
    comConta();
    await processarEventoStripe(evento("checkout.session.completed", sessaoAvulso()), deps);
    assert.equal(estado.pagamentos.get("cs_avulso").user_id, USER);
  });
});

describe("conversão Avulso → assinatura com reembolso parcial", () => {
  function conversao(plano_destino, reembolso, extra = {}) {
    estado.conversoes.set("conv_1", {
      id: "conv_1",
      plano_destino,
      estado: "checkout_aberto",
      checkout_session_id: "cs_upgrade",
      avulso_session_id: "cs_avulso",
      refund_montante_centimos: reembolso,
      refund_id: null,
      refund_estado: null,
      requer_intervencao: false,
      ...extra,
    });
  }
  // 1.ª fatura a 0 € (cupão 100% "once"): o Checkout fica "no_payment_required".
  const sessaoUpgrade = (extra = {}) =>
    sessaoSubscricao({
      id: "cs_upgrade",
      payment_status: "no_payment_required",
      amount_total: 0,
      metadata: { plano: "assinatura", upgrade: "true", user_id: USER, conversao_id: "conv_1" },
      ...extra,
    });
  const conv = () => estado.conversoes.get("conv_1");

  test("Avulso → Proteção: subscrição confirmada, reembolso de 10,00 €, sem créditos de caso", async () => {
    comConta({ case_credits: 0 });
    conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(conta().subscription_plan, "protecao");
    assert.equal(conv().estado, "convertido");
    assert.equal(estado.refundsStripe.length, 1);
    assert.equal(estado.refundsStripe[0].amount, 1000);
    assert.equal(conv().refund_id, "re_1");
    assert.equal(conv().refund_estado, "pending", "pedido aceite ≠ dinheiro devolvido");
    assert.equal(conta().case_credits, 0);
  });

  test("Avulso → Caso + Proteção: reembolso de 7,00 €; o caso do ciclo é gerido à parte", async () => {
    comConta({ case_credits: 0 });
    conversao("caso_protecao", 700);
    estado.stripeSubscricao = snapshot("active", PRECO_CASO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe[0].amount, 700);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 1, "crédito de caso do 1.º ciclo, independente do reembolso");
  });

  test("webhook repetido (novo event.id, mesma sessão): o segundo reembolso não é criado", async () => {
    comConta();
    conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessaoUpgrade({ payment_status: "paid" })), deps);
    assert.equal(estado.refundsStripe.length, 1);
  });

  test("Checkout abandonado: sem evento de conclusão não há reembolso e o Avulso fica por converter", async () => {
    comConta();
    conversao("protecao", 1000);
    assert.equal(estado.refundsStripe.length, 0);
    assert.equal(conv().estado, "checkout_aberto");
  });

  test("checkout antigo (substituído por um novo) não converte nem reembolsa", async () => {
    comConta();
    conversao("protecao", 1000, { checkout_session_id: "cs_novo" });
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(conv().estado, "checkout_aberto");
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("o mesmo Avulso já convertido noutro checkout: recusado", async () => {
    comConta();
    conversao("protecao", 1000, { estado: "convertido", checkout_session_id: "cs_outro", refund_id: "re_antigo" });
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("subscrição ainda não ativa: não converte (reembolso só depois da adesão confirmada)", async () => {
    comConta();
    conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("incomplete", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(conv().estado, "checkout_aberto");
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("plano pago diferente do oferecido: sem reembolso, fica para intervenção", async () => {
    comConta();
    conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_CASO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe.length, 0);
    assert.equal(conv().requer_intervencao, true);
    assert.equal(estado.avisosAdmin.length, 1);
  });

  test("falha transitória do Stripe: 500 e o reenvio cria o reembolso uma única vez", async () => {
    comConta();
    conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    estado.refundFalhaTransitoriaUmaVez = true;
    const e = evento("checkout.session.completed", sessaoUpgrade());
    assert.equal((await processarEventoStripe(e, deps)).status, 500);
    assert.equal((await processarEventoStripe(e, deps)).status, 200);
    assert.equal(estado.refundsStripe.length, 1);
    assert.equal(conv().refund_id, "re_1");
  });

  test("reembolso recusado pelo Stripe: regista, marca intervenção, avisa o admin e não cancela a assinatura", async () => {
    comConta();
    conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    estado.refundFalhaDefinitiva = true;
    const r = await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(r.status, 200);
    assert.equal(conv().requer_intervencao, true);
    assert.equal(conv().intervencao_motivo, "o Stripe recusou o reembolso (charge_already_refunded)");
    assert.equal(estado.avisosAdmin.length, 1);
    assert.equal(conta().subscription_plan, "protecao");
    // Um reenvio não tenta criar outro reembolso.
    estado.refundFalhaDefinitiva = false;
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("refund.updated: o estado real do reembolso fica registado", async () => {
    conversao("protecao", 1000, { estado: "convertido", refund_id: "re_1", refund_estado: "pending" });
    await processarEventoStripe(evento("refund.updated", { id: "re_1", object: "refund", status: "succeeded", metadata: { conversao_id: "conv_1" } }), deps);
    assert.equal(conv().refund_estado, "succeeded");
    assert.equal(conv().requer_intervencao, false);
  });

  test("refund.created antes de o refund_id estar gravado: liga pela conversão nos metadados", async () => {
    conversao("protecao", 1000, { estado: "convertido" });
    await processarEventoStripe(evento("refund.created", { id: "re_9", object: "refund", status: "pending", metadata: { conversao_id: "conv_1" } }), deps);
    assert.equal(conv().refund_id, "re_9");
  });

  test("refund.failed: estado registado, intervenção possível, sem novo reembolso nem cancelamento", async () => {
    comConta({ subscription_plan: "protecao", subscription_status: "active", stripe_subscription_id: SUB });
    conversao("protecao", 1000, { estado: "convertido", refund_id: "re_1", refund_estado: "pending" });
    const r = await processarEventoStripe(evento("refund.failed", { id: "re_1", object: "refund", status: "failed", metadata: { conversao_id: "conv_1" } }), deps);
    assert.equal(r.status, 200);
    assert.equal(conv().refund_estado, "failed");
    assert.equal(conv().requer_intervencao, true);
    assert.equal(conv().intervencao_motivo, "reembolso falhado no Stripe");
    assert.equal(estado.avisosAdmin.length, 1);
    assert.equal(estado.refundsStripe.length, 0);
    assert.equal(conta().subscription_plan, "protecao");
    // refund.updated repetido com o mesmo estado não volta a avisar.
    await processarEventoStripe(evento("refund.updated", { id: "re_1", object: "refund", status: "failed", metadata: { conversao_id: "conv_1" } }), deps);
    assert.equal(estado.avisosAdmin.length, 1);
  });

  test("reembolso que não é de uma conversão (ex.: feito à mão no Stripe): ignorado", async () => {
    const r = await processarEventoStripe(evento("refund.created", { id: "re_manual", object: "refund", status: "succeeded", metadata: {} }), deps);
    assert.equal(r.status, 200);
    assert.equal(ultimoLog().resultado, "ignorado_sem_conversao");
  });
});

// ---------------------------------------------------------------------------
// Gestão de Subscrição: cancelamento no fim do período, reversão, fim
// efetivo e casos congelados 90 dias.
// ---------------------------------------------------------------------------
describe("gestão de subscrição (webhook)", () => {
  const T0 = 1_780_000_000; // segundos Unix
  const SUB_NOVA = "sub_nova";
  const ativa = (extra = {}) => ({
    subscription_plan: "caso_protecao",
    subscription_status: "active",
    stripe_subscription_id: SUB,
    case_credits: 3,
    cancel_at_period_end: false,
    ...extra,
  });
  const agendada = () =>
    subscricao("active", PRECO_CASO_PROTECAO, { cancel_at_period_end: true, cancel_at: 1_702_592_000 });
  const aberto = () => estado.cancelamentos.filter((x) => x.sub === SUB && !x.revertido_em && !x.terminado_em);

  test("1. subscrição ativa: sem cancelamento agendado", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("active"), T0), deps);
    assert.equal(conta().cancel_at_period_end, false);
    assert.equal(ultimoLog().resultado, "sincronizado");
    assert.equal(estado.cancelamentos.length, 0);
  });

  test("2/3. cancelamento agendado: plano, proteção e casos intactos até ao fim do período", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.updated", agendada(), T0), deps);
    assert.equal(ultimoLog().resultado, "sincronizado_cancelamento_agendado");
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().subscription_status, "active");
    assert.equal(conta().cancel_at_period_end, true);
    assert.equal(conta().case_credits, 3);
    assert.equal(estado.congelamentos.length, 0);
    assert.equal(aberto().length, 1);
    assert.equal(aberto()[0].fim_previsto_em, "2023-12-14T22:13:20.000Z");
  });

  test("pedido feito no portal: o webhook não duplica o registo (fica o do cliente)", async () => {
    comConta(ativa());
    estado.cancelamentos.push({ sub: SUB, origem: "cliente", motivo_codigo: "preco", revertido_em: null, terminado_em: null });
    await processarEventoStripe(evento("customer.subscription.updated", agendada(), T0), deps);
    assert.equal(estado.cancelamentos.length, 1);
    assert.equal(estado.cancelamentos[0].origem, "cliente");
  });

  test("4. reversão: o cancelamento deixa de estar agendado e fica registada a reversão", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.updated", agendada(), T0), deps);
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("active"), T0 + 60), deps);
    assert.equal(conta().cancel_at_period_end, false);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(aberto().length, 0);
    assert.ok(estado.cancelamentos[0].revertido_em);
  });

  test("5. fim efetivo: sem subscrição (não 'Avulso'), fim registado, casos congelados 90 dias", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.updated", agendada(), T0), deps);
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0 + 86_400), deps);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(conta().subscription_status, "canceled");
    assert.equal(conta().cancel_at_period_end, false);
    assert.equal(conta().case_credits, 0);
    const [f] = estado.congelamentos;
    assert.equal(f.quantidade, 3);
    assert.equal(new Date(f.expira_em) - new Date(f.congelado_em), 90 * DIA_MS);
    assert.equal(estado.cancelamentos.length, 1);
    assert.ok(estado.cancelamentos[0].terminado_em);
  });

  test("Proteção (sem casos): fim efetivo sem congelamento", async () => {
    comConta(ativa({ subscription_plan: "protecao", case_credits: 0 }));
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled", PRECO_PROTECAO), T0), deps);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(estado.congelamentos.length, 0);
  });

  test("6. depois do fim: nada reativa a subscrição terminada (sem renovação)", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0), deps);
    estado.stripeSubscricao = snapshot("canceled");
    await processarEventoStripe(evento("invoice.paid", fatura("in_depois"), T0 + 10), deps);
    assert.equal(ultimoLog().resultado, "pago_subscricao_inativa");
    assert.equal(conta().subscription_plan, "none");
    assert.equal(conta().case_credits, 0);
  });

  test("7. o fim da subscrição não apaga a conta, os pagamentos nem o histórico", async () => {
    comConta(ativa());
    estado.pagamentos.set("cs_sub", { stripe_session_id: "cs_sub", stripe_subscription_id: SUB, estado: "concluido" });
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0), deps);
    assert.ok(estado.contas.has(USER));
    assert.ok(estado.pagamentos.has("cs_sub"));
    // A única remoção que o webhook faz é libertar um evento depois de uma falha.
    const fonte = readFileSync(new URL("./webhookDependencias.ts", import.meta.url), "utf8");
    assert.equal((fonte.match(/\.delete\(\)/g) ?? []).length, 1);
    assert.match(fonte, /from\("stripe_webhook_events"\)\s*\.delete\(\)/);
    assert.equal(fonte.includes('from("casos")'), false);
  });

  test("8. congelamento: casos Avulso comprados ficam utilizáveis; só os da subscrição congelam", async () => {
    comConta(ativa({ case_credits: 0 }));
    await deps.concederCreditoCaso(USER, "checkout:cs_avulso", null); // Avulso
    await deps.concederCreditoCaso(USER, "invoice:in_1", 4);
    await deps.concederCreditoCaso(USER, "invoice:in_2", 4);
    assert.equal(conta().case_credits, 3);
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0), deps);
    assert.equal(conta().case_credits, 1);
    assert.equal(estado.congelamentos[0].quantidade, 2);
  });

  async function terminarERessubscrever(segundosDepois, price = PRECO_CASO_PROTECAO) {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0), deps);
    estado.stripeSubscricao = { ...snapshot("active", price), stripe_subscription_id: SUB_NOVA };
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoSubscricao({ id: "cs_nova", subscription: SUB_NOVA, invoice: "in_nova" }), T0 + segundosDepois),
      deps,
    );
  }

  test("9. nova subscrição Caso + Proteção dentro dos 90 dias: recupera os casos (até 4) na mesma conta", async () => {
    await terminarERessubscrever(30 * 86_400);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().stripe_subscription_id, SUB_NOVA);
    assert.equal(conta().case_credits, 4); // 3 recuperados + 1 do novo ciclo, limite 4
    assert.ok(estado.congelamentos[0].restaurado_em);
    // Reenvio da fatura: nada muda.
    await processarEventoStripe(evento("invoice.paid", { ...fatura("in_nova", "subscription_create"), parent: { subscription_details: { subscription: SUB_NOVA } } }, T0 + 30 * 86_400 + 5), deps);
    assert.equal(conta().case_credits, 4);
  });

  test("10. nova subscrição depois dos 90 dias: começa sem os casos antigos", async () => {
    await terminarERessubscrever(91 * 86_400);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 1); // só o do novo ciclo
    assert.equal(estado.congelamentos[0].restaurado_em, null);
  });

  test("regressar com Proteção não recupera os casos; mudar depois para Caso + Proteção no prazo recupera", async () => {
    await terminarERessubscrever(10 * 86_400, PRECO_PROTECAO);
    assert.equal(conta().subscription_plan, "protecao");
    assert.equal(conta().case_credits, 0);
    await processarEventoStripe(
      evento("customer.subscription.updated", { ...subscricao("active", PRECO_CASO_PROTECAO), id: SUB_NOVA }, T0 + 20 * 86_400),
      deps,
    );
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 3);
  });

  test("11. fim recebido várias vezes (updated canceled + deleted + reenvio): congela e regista uma vez", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("canceled"), T0), deps);
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0 + 1), deps);
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0 + 2), deps);
    assert.equal(estado.congelamentos.length, 1);
    assert.equal(estado.congelamentos[0].quantidade, 3);
    assert.equal(conta().case_credits, 0);
    assert.equal(estado.cancelamentos.filter((x) => x.terminado_em).length, 1);
  });

  test("12. fora de ordem: um 'updated' antigo depois do fim não reativa nem desfaz nada", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0 + 100), deps);
    await processarEventoStripe(evento("customer.subscription.updated", agendada(), T0), deps);
    assert.equal(ultimoLog().resultado, "ignorado_evento_antigo");
    assert.equal(conta().subscription_plan, "none");
    assert.equal(conta().case_credits, 0);
  });

  test("12b. fim de uma subscrição antiga depois de a conta já ter aderido a outra: não congela nada", async () => {
    comConta(ativa({ stripe_subscription_id: SUB_NOVA }));
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0), deps);
    assert.equal(estado.congelamentos.length, 0);
    assert.equal(conta().case_credits, 3);
    assert.equal(conta().subscription_plan, "caso_protecao");
  });

  test("unpaid congela; se a dívida for paga e voltar a ativa, os casos voltam", async () => {
    comConta(ativa());
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("unpaid"), T0), deps);
    assert.equal(conta().case_credits, 0);
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("active"), T0 + 10), deps);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 3);
  });

  test("13. Avulso sem subscrição: o fim de subscrições não lhe mexe nos casos", async () => {
    comConta();
    await aplicarCompraConfirmadaNaConta(sessaoAvulso(), USER, deps);
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled"), T0), deps);
    assert.equal(conta().case_credits, 1);
    assert.equal(conta().subscription_plan, "none");
    assert.equal(estado.congelamentos.length, 0);
  });
});
