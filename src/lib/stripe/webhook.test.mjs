// Testes da lógica do webhook Stripe — `npm test` (node --test, sem
// dependências novas). As dependências são falsas e guardam o estado em
// memória (incluindo o registo de créditos por origem, com a mesma regra da
// função SQL conceder_credito_caso), para verificar o efeito real de cada
// evento no acesso e nos créditos.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, test } from "node:test";
import { calcularAcesso } from "../acesso.ts";
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
    creditosPorConta: new Map(), // origem → user_id
    avulsos: new Map(), // origem checkout:<sessão> → { user_id, estado } (case_credit_grants.estado)
    stripeAvulsos: new Map(), // payment_intent → { sessionId, totalmenteReembolsado } (o que o "Stripe" diz)
    subscricoesCanceladasStripe: [], // cancelamentos pedidos ao "Stripe" (cancelarSubscricaoStripe)
    congelamentos: [], // case_credit_freezes
    cancelamentos: [], // subscricao_cancelamentos
    consentimentos: new Map(), // id → linha de consentimentos_compra
    emails: [],
    logs: [],
    stripeSubscricao: null, // o que a "API Stripe" devolve
    falharCreditoUmaVez: false,
    conversoes: new Map(), // id → linha de conversoes_avulso
    refundsStripe: [], // reembolsos que existem no "Stripe"
    refundFalhaDefinitiva: false,
    refundFalhaTransitoriaUmaVez: false,
    avisosAdmin: [],
    pedidos: new Map(), // id → linha de pedidos_caso
    casos: [], // casos criados (o trigger novo-caso dispara um e-mail por cada)
  };
}

function contaVazia() {
  return {
    subscription_plan: "none",
    subscription_status: null,
    case_credits: 0,
    avulso_credits: 0,
    stripe_customer_id: null,
    stripe_subscription_id: null,
  };
}

// Mesmas regras que a função SQL consumir_credito_caso. Normal: subscrição
// primeiro, depois o Avulso mais antigo. Vinculado (origem dada): só esse
// Avulso. Devolve null, "subscricao" ou a origem do Avulso gasto.
function consumirCredito(estado, userId, origemAvulso = null) {
  const c = estado.contas.get(userId);
  if (!c || c.case_credits <= 0) return null;
  if (origemAvulso) {
    const a = estado.avulsos.get(origemAvulso);
    if (!a || a.user_id !== userId || a.estado !== "disponivel") return null;
    a.estado = "consumido";
    c.case_credits -= 1;
    c.avulso_credits -= 1;
    return origemAvulso;
  }
  if (c.case_credits - c.avulso_credits > 0) {
    c.case_credits -= 1;
    return "subscricao";
  }
  const [origem, avulso] = [...estado.avulsos].find(([, a]) => a.user_id === userId && a.estado === "disponivel");
  avulso.estado = "consumido";
  c.case_credits -= 1;
  c.avulso_credits -= 1;
  return origem;
}

// Invariante da base de dados (check user_access_avulso_credits_check).
function verificarInvariante(estado) {
  for (const [userId, c] of estado.contas) {
    const disponiveis = [...estado.avulsos.values()].filter((a) => a.user_id === userId && a.estado === "disponivel").length;
    assert.ok(c.avulso_credits >= 0 && c.avulso_credits <= c.case_credits, "0 <= avulso_credits <= case_credits");
    assert.equal(c.avulso_credits, disponiveis, "avulso_credits = Avulsos disponíveis");
  }
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
      const atual = estado.pagamentos.get(dados.stripe_session_id);
      // Trigger stripe_payments_reembolsado_final: reembolsado é final.
      const final = atual?.estado === "reembolsado" ? { estado: "reembolsado" } : {};
      estado.pagamentos.set(dados.stripe_session_id, { ...atual, ...dados, ...final });
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
      const avulso = origem.startsWith("checkout:");
      if (avulso && estado.pagamentos.get(origem.slice("checkout:".length))?.estado === "reembolsado") return false;
      if (estado.creditosConcedidos.has(origem)) return false;
      estado.creditosConcedidos.add(origem);
      estado.creditosPorConta.set(origem, userId);
      const c = estado.contas.get(userId);
      if (avulso) {
        estado.avulsos.set(origem, { user_id: userId, estado: "disponivel" });
        c.case_credits += 1;
        c.avulso_credits += 1;
        return true;
      }
      c.case_credits = maximo == null ? c.case_credits + 1 : Math.max(c.case_credits, Math.min(c.case_credits + 1, maximo));
      return true;
    },
    // Mesmas regras que as funções SQL congelar_/restaurar_creditos_caso.
    async congelarCreditosCaso(subId, em) {
      let total = 0;
      for (const [userId, c] of estado.contas) {
        if (c.stripe_subscription_id !== subId) continue;
        if (estado.congelamentos.some((f) => f.sub === subId && f.user_id === userId && !f.restaurado_em)) continue;
        const quantidade = c.case_credits - c.avulso_credits;
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
    // Mesmas regras que a função SQL retirar_credito_avulso.
    async retirarCreditoAvulso(origem, motivo) {
      const a = estado.avulsos.get(origem);
      if (!a) return "sem_credito";
      if (a.estado !== "disponivel") return a.estado;
      a.estado = motivo;
      const c = estado.contas.get(a.user_id);
      c.case_credits -= 1;
      c.avulso_credits -= 1;
      return "retirado";
    },
    async avulsoDoPagamento(paymentIntentId) {
      return estado.stripeAvulsos.get(paymentIntentId) ?? null;
    },
    async marcarPagamentoReembolsado(sessionId) {
      const p = estado.pagamentos.get(sessionId);
      if (p) p.estado = "reembolsado";
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
    async obterConversao(id) {
      const c = estado.conversoes.get(id);
      return c ? { id: c.id, estado: c.estado, checkout_session_id: c.checkout_session_id, avulso_session_id: c.avulso_session_id } : null;
    },
    async anularConversao(id, checkoutSessionId, motivo) {
      const c = estado.conversoes.get(id);
      if (c && c.estado === "checkout_aberto" && c.checkout_session_id === checkoutSessionId) {
        Object.assign(c, { estado: "anulada", anulada_motivo: motivo });
      }
    },
    async cancelarSubscricaoStripe(subId) {
      if (!estado.subscricoesCanceladasStripe.includes(subId)) estado.subscricoesCanceladasStripe.push(subId);
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
    // Mesmas regras que webhookDependencias: só preenche ligações vazias.
    async ligarConsentimento(id, { sessionId, subscriptionId, email, userId }) {
      const c = estado.consentimentos.get(id);
      if (!c) return null;
      if (c.checkout_session_id && c.checkout_session_id !== sessionId) return null;
      c.atualizacoes = (c.atualizacoes ?? 0) + 1;
      c.checkout_session_id ??= sessionId;
      if (!c.stripe_payment_id && estado.pagamentos.has(sessionId)) c.stripe_payment_id = `pay_${sessionId}`;
      if (!c.stripe_subscription_id && subscriptionId) c.stripe_subscription_id = subscriptionId;
      c.email ??= email;
      c.user_id ??= userId;
      return { termos_versao: c.termos_versao, pediu_inicio_imediato: true };
    },
    // Mesmas regras que a função SQL converter_pedido_em_caso.
    async converterPedidoEmCaso(pedidoId, userId, origemAvulso) {
      const p = estado.pedidos.get(pedidoId);
      if (!p || p.user_id !== userId) return null;
      if (p.estado === "convertido") return p.caso_id;
      if (p.estado === "cancelado") return null;
      if (!consumirCredito(estado, userId, origemAvulso)) return null;
      const casoId = `caso_${estado.casos.length + 1}`;
      estado.casos.push({ id: casoId, utilizador_id: userId, pedido_id: pedidoId, status: "Novo" });
      Object.assign(p, { estado: "convertido", caso_id: casoId });
      return casoId;
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

afterEach(() => verificarInvariante(estado));

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
  // O Avulso da conversão foi comprado pela conta (caso ainda por usar).
  async function conversao(plano_destino, reembolso, extra = {}) {
    if (estado.contas.has(USER)) await deps.concederCreditoCaso(USER, "checkout:cs_avulso", null);
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
    await conversao("protecao", 1000);
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
    await conversao("caso_protecao", 700);
    estado.stripeSubscricao = snapshot("active", PRECO_CASO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe[0].amount, 700);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().case_credits, 1, "crédito de caso do 1.º ciclo, independente do reembolso");
  });

  test("webhook repetido (novo event.id, mesma sessão): o segundo reembolso não é criado", async () => {
    comConta();
    await conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessaoUpgrade({ payment_status: "paid" })), deps);
    assert.equal(estado.refundsStripe.length, 1);
  });

  test("Checkout abandonado: sem evento de conclusão não há reembolso e o Avulso fica por converter", async () => {
    comConta();
    await conversao("protecao", 1000);
    assert.equal(estado.refundsStripe.length, 0);
    assert.equal(conv().estado, "checkout_aberto");
  });

  test("checkout antigo (substituído por um novo) não converte nem reembolsa", async () => {
    comConta();
    await conversao("protecao", 1000, { checkout_session_id: "cs_novo" });
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(conv().estado, "checkout_aberto");
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("o mesmo Avulso já convertido noutro checkout: recusado", async () => {
    comConta();
    await conversao("protecao", 1000, { estado: "convertido", checkout_session_id: "cs_outro", refund_id: "re_antigo" });
    estado.stripeSubscricao = snapshot("active", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("subscrição ainda não ativa: não converte (reembolso só depois da adesão confirmada)", async () => {
    comConta();
    await conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("incomplete", PRECO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(conv().estado, "checkout_aberto");
    assert.equal(estado.refundsStripe.length, 0);
  });

  test("plano pago diferente do oferecido: sem reembolso, fica para intervenção", async () => {
    comConta();
    await conversao("protecao", 1000);
    estado.stripeSubscricao = snapshot("active", PRECO_CASO_PROTECAO);
    await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
    assert.equal(estado.refundsStripe.length, 0);
    assert.equal(conv().requer_intervencao, true);
    assert.equal(estado.avisosAdmin.length, 1);
  });

  test("falha transitória do Stripe: 500 e o reenvio cria o reembolso uma única vez", async () => {
    comConta();
    await conversao("protecao", 1000);
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
    await conversao("protecao", 1000);
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
    await conversao("protecao", 1000, { estado: "convertido", refund_id: "re_1", refund_estado: "pending" });
    await processarEventoStripe(evento("refund.updated", { id: "re_1", object: "refund", status: "succeeded", metadata: { conversao_id: "conv_1" } }), deps);
    assert.equal(conv().refund_estado, "succeeded");
    assert.equal(conv().requer_intervencao, false);
  });

  test("refund.created antes de o refund_id estar gravado: liga pela conversão nos metadados", async () => {
    await conversao("protecao", 1000, { estado: "convertido" });
    await processarEventoStripe(evento("refund.created", { id: "re_9", object: "refund", status: "pending", metadata: { conversao_id: "conv_1" } }), deps);
    assert.equal(conv().refund_id, "re_9");
  });

  test("refund.failed: estado registado, intervenção possível, sem novo reembolso nem cancelamento", async () => {
    comConta({ subscription_plan: "protecao", subscription_status: "active", stripe_subscription_id: SUB });
    await conversao("protecao", 1000, { estado: "convertido", refund_id: "re_1", refund_estado: "pending" });
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

// ---------------------------------------------------------------------------
// Consentimentos da compra (gravados antes do Checkout; o webhook completa
// as ligações).
// ---------------------------------------------------------------------------
describe("consentimentos da compra (webhook)", () => {
  const CONS = "11111111-1111-4111-a111-111111111111";
  const comConsentimento = (extra = {}) =>
    estado.consentimentos.set(CONS, {
      id: CONS,
      termos_versao: "2026-10-01",
      checkout_session_id: null,
      stripe_payment_id: null,
      stripe_subscription_id: null,
      email: null,
      user_id: null,
      ...extra,
    });
  const meta = (m) => ({ ...m, consentimento_compra_id: CONS, produto: "caso_protecao", tipo_compra: "subscricao" });

  test("13. checkout concluído: liga sessão, pagamento, subscrição, e-mail e conta ao consentimento", async () => {
    comConta();
    comConsentimento();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao({ metadata: meta({ plano: "assinatura", user_id: USER }) })), deps);
    const c = estado.consentimentos.get(CONS);
    assert.equal(c.checkout_session_id, "cs_sub");
    assert.equal(c.stripe_payment_id, "pay_cs_sub");
    assert.equal(c.stripe_subscription_id, SUB);
    assert.equal(c.email, "cliente@teste.invalid");
    assert.equal(c.user_id, USER);
    // 15. e-mail com os dados da compra e do consentimento
    const [email] = estado.emails;
    assert.equal(email.valorPagoCentimos, 799);
    assert.equal(email.renovacao, "2023-12-14T22:13:20.000Z");
    assert.deepEqual(email.consentimento, { termos_versao: "2026-10-01", pediu_inicio_imediato: true });
  });

  test("14. webhook repetido: não duplica nem altera o registo; um só e-mail", async () => {
    comConta();
    comConsentimento();
    estado.stripeSubscricao = snapshot("active");
    const s = sessaoSubscricao({ metadata: meta({ plano: "assinatura", user_id: USER }) });
    await processarEventoStripe(evento("checkout.session.completed", s), deps);
    const antes = { ...estado.consentimentos.get(CONS) };
    await processarEventoStripe(evento("checkout.session.completed", s), deps); // novo event.id
    const depois = estado.consentimentos.get(CONS);
    assert.equal(estado.consentimentos.size, 1);
    for (const k of ["checkout_session_id", "stripe_payment_id", "stripe_subscription_id", "email", "user_id"]) {
      assert.equal(depois[k], antes[k], k);
    }
    assert.equal(estado.emails.length, 1);
  });

  test("pagamento pendente (SEPA): o consentimento fica já ligado à sessão", async () => {
    comConta();
    comConsentimento();
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoAvulso({ payment_status: "unpaid", metadata: meta({ plano: "avulso", user_id: USER }) })),
      deps,
    );
    assert.equal(estado.consentimentos.get(CONS).checkout_session_id, "cs_avulso");
    assert.equal(conta().case_credits, 0);
  });

  test("consentimento de outra sessão: não é ligado nem usado no e-mail", async () => {
    comConta();
    comConsentimento({ checkout_session_id: "cs_outra" });
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao({ metadata: meta({ plano: "assinatura", user_id: USER }) })), deps);
    assert.equal(estado.consentimentos.get(CONS).checkout_session_id, "cs_outra");
    assert.equal(estado.emails[0].consentimento, null);
  });

  test("sessão antiga sem consentimento: o acesso é dado na mesma (sem bloquear clientes)", async () => {
    comConta();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", sessaoSubscricao()), deps);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(estado.emails[0].consentimento, null);
  });

  test("16. cupão de 100% (0 €): ativa o plano, liga o consentimento e o e-mail mostra 0 €", async () => {
    comConta();
    comConsentimento();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(
      evento(
        "checkout.session.completed",
        sessaoSubscricao({
          payment_status: "no_payment_required",
          amount_total: 0,
          discounts: [{ coupon: "duploprestigio26" }],
          metadata: meta({ plano: "assinatura", user_id: USER }),
        }),
      ),
      deps,
    );
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(estado.consentimentos.get(CONS).checkout_session_id, "cs_sub");
    assert.equal(estado.emails[0].valorPagoCentimos, 0);
  });

  test("Avulso: e-mail sem renovação", async () => {
    comConta();
    comConsentimento();
    await processarEventoStripe(evento("checkout.session.completed", sessaoAvulso({ metadata: meta({ plano: "avulso", user_id: USER }) })), deps);
    assert.equal(estado.emails[0].plano, "avulso");
    assert.equal(estado.emails[0].renovacao, null);
    assert.equal(conta().case_credits, 1);
  });
});

// ---------------------------------------------------------------------------
// "Tratar o meu caso": o pedido só passa a caso com o pagamento confirmado.
// ---------------------------------------------------------------------------
describe("pedido de caso pago no Checkout (metadata.pedido_id)", () => {
  const PEDIDO = "20000000-0000-4000-a000-000000000001";
  const novoPedido = (extra = {}) =>
    estado.pedidos.set(PEDIDO, { id: PEDIDO, user_id: USER, estado: "aguarda_pagamento", caso_id: null, ...extra });
  const avulsoDoPedido = (extra = {}) =>
    sessaoAvulso({ metadata: { plano: "avulso", user_id: USER, pedido_id: PEDIDO }, ...extra });
  const subscricaoDoPedido = (extra = {}) =>
    sessaoSubscricao({ metadata: { plano: "assinatura", user_id: USER, pedido_id: PEDIDO, upgrade: "false" }, ...extra });

  test("1. Avulso pago: o caso disponível comprado é usado no pedido e o caso é criado uma vez", async () => {
    novoPedido();
    const r = await processarEventoStripe(evento("checkout.session.completed", avulsoDoPedido()), deps);
    assert.equal(r.status, 200);
    assert.equal(estado.casos.length, 1);
    assert.equal(estado.pedidos.get(PEDIDO).estado, "convertido");
    assert.equal(conta().case_credits, 0, "o caso pago foi gasto neste pedido");
    assert.equal(conta().subscription_plan, "none", "Avulso não dá proteção");
    assert.equal(estado.pagamentos.get("cs_avulso").estado, "concluido");
    assert.equal(estado.emails.length, 1);
    assert.equal(estado.emails[0].contaExiste, true);
    assert.equal(ultimoLog().resultado, "pagamento_confirmado_caso_criado");
  });

  test("2. Caso + Proteção pago: subscrição ativa, proteção e caso criado com o caso do 1.º mês", async () => {
    novoPedido();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("checkout.session.completed", subscricaoDoPedido()), deps);
    assert.equal(conta().subscription_plan, "caso_protecao");
    assert.equal(conta().subscription_status, "active");
    assert.equal(estado.casos.length, 1);
    assert.equal(conta().case_credits, 0, "o caso do 1.º mês foi usado no pedido");
    // invoice.paid da mesma fatura não volta a creditar nem cria outro caso.
    await processarEventoStripe(evento("invoice.paid", fatura("in_primeira", "subscription_create")), deps);
    assert.equal(conta().case_credits, 0);
    assert.equal(estado.casos.length, 1);
  });

  test("3/6. Checkout concluído sem pagamento confirmado (ex.: SEPA): nem caso, nem acesso, nem e-mail", async () => {
    novoPedido();
    await processarEventoStripe(evento("checkout.session.completed", avulsoDoPedido({ payment_status: "unpaid" })), deps);
    assert.equal(estado.casos.length, 0);
    assert.equal(estado.pedidos.get(PEDIDO).estado, "aguarda_pagamento");
    assert.equal(conta()?.case_credits ?? 0, 0);
    assert.equal(estado.emails.length, 0);
    // Só a confirmação assíncrona cria o caso.
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", avulsoDoPedido()), deps);
    assert.equal(estado.casos.length, 1);
  });

  test("pagamento assíncrono falhado: o pedido fica por pagar, sem caso", async () => {
    novoPedido();
    await processarEventoStripe(evento("checkout.session.completed", avulsoDoPedido({ payment_status: "unpaid" })), deps);
    await processarEventoStripe(evento("checkout.session.async_payment_failed", avulsoDoPedido({ payment_status: "unpaid" })), deps);
    assert.equal(estado.casos.length, 0);
    assert.equal(estado.pedidos.get(PEDIDO).estado, "aguarda_pagamento");
    assert.equal(estado.pagamentos.get("cs_avulso").estado, "falhado");
  });

  test("7. webhook duplicado ou eventos repetidos: um só caso, um só crédito, um só e-mail", async () => {
    novoPedido();
    const e = evento("checkout.session.completed", avulsoDoPedido());
    await processarEventoStripe(e, deps);
    const dup = await processarEventoStripe(e, deps);
    assert.equal(dup.corpo.duplicado, true);
    // Outro evento da mesma sessão (ex.: reenvio com outro id).
    await processarEventoStripe(evento("checkout.session.completed", avulsoDoPedido()), deps);
    assert.equal(estado.casos.length, 1);
    assert.equal(estado.creditosConcedidos.size, 1);
    assert.equal(conta().case_credits, 0);
    assert.equal(estado.emails.length, 1);
  });

  test("falha a meio (antes do caso): o reenvio do Stripe conclui sem duplicar", async () => {
    novoPedido();
    estado.falharCreditoUmaVez = true;
    const e = evento("checkout.session.completed", avulsoDoPedido());
    assert.equal((await processarEventoStripe(e, deps)).status, 500);
    assert.equal(estado.casos.length, 0);
    assert.equal((await processarEventoStripe(e, deps)).status, 200);
    assert.equal(estado.casos.length, 1);
    assert.equal(conta().case_credits, 0);
  });

  test("5. pedido de outra conta na metadata: nenhum caso é criado nessa conta; o crédito pago fica na conta que pagou", async () => {
    novoPedido({ user_id: "00000000-0000-4000-a000-0000000000ff" });
    await processarEventoStripe(evento("checkout.session.completed", avulsoDoPedido()), deps);
    assert.equal(estado.casos.length, 0);
    assert.equal(conta().case_credits, 1, "o pagamento não se perde: fica um caso disponível");
    assert.equal(estado.avisosAdmin.length, 1);
    assert.equal(ultimoLog().resultado, "pagamento_confirmado_pedido_por_converter");
  });

  test("pedido já convertido (ex.: usou um caso disponível): não cria outro e o novo pagamento fica disponível", async () => {
    novoPedido({ estado: "convertido", caso_id: "caso_existente" });
    await processarEventoStripe(evento("checkout.session.completed", avulsoDoPedido()), deps);
    assert.equal(estado.casos.length, 0);
    assert.equal(conta().case_credits, 1);
  });

  test("compra sem pedido_id (portal / preçário): comportamento anterior, sem casos criados", async () => {
    await processarEventoStripe(evento("checkout.session.completed", sessaoAvulso({ metadata: { plano: "avulso", user_id: USER } })), deps);
    assert.equal(estado.casos.length, 0);
    assert.equal(conta().case_credits, 1);
    assert.equal(ultimoLog().resultado, "pagamento_confirmado");
  });

  test("pedido_id com formato inválido é ignorado", async () => {
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoAvulso({ metadata: { plano: "avulso", user_id: USER, pedido_id: "x' or 1=1" } })),
      deps,
    );
    assert.equal(estado.casos.length, 0);
    assert.equal(conta().case_credits, 1);
  });
});

// ---------------------------------------------------------------------------
// Casos Avulso vs. casos da subscrição (correção de 01/10/2026). Antes, o fim
// do Caso + Proteção protegia do congelamento um caso por cada Avulso
// comprado desde sempre — incluindo Avulsos já usados. Agora só os Avulsos
// por usar (avulso_credits) ficam utilizáveis.
// ---------------------------------------------------------------------------
describe("casos Avulso por usar vs. casos da subscrição", () => {
  const T0 = 1_780_000_000;
  const SUB_NOVA = "sub_nova";
  let pedidos = 0;

  // Avulso pago no "Tratar o meu caso" e usado logo nesse pedido.
  async function avulsoUsadoNumPedido(sessionId = "cs_avulso") {
    const id = `20000000-0000-4000-a000-0000000001${String(++pedidos).padStart(2, "0")}`;
    estado.pedidos.set(id, { id, user_id: USER, estado: "aguarda_pagamento", caso_id: null });
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoAvulso({ id: sessionId, metadata: { plano: "avulso", user_id: USER, pedido_id: id } })),
      deps,
    );
    assert.equal(estado.avulsos.get(`checkout:${sessionId}`).estado, "consumido");
  }

  // Avulso comprado e ainda por usar.
  async function avulsoPorUsar(sessionId = "cs_avulso") {
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoAvulso({ id: sessionId, metadata: { plano: "avulso", user_id: USER } })),
      deps,
    );
  }

  // Caso + Proteção com `ciclos` faturas pagas (1 caso por ciclo).
  async function subscreverComCasos(ciclos, sub = SUB, criado = T0) {
    estado.stripeSubscricao = { ...snapshot("active"), stripe_subscription_id: sub };
    const sufixo = sub === SUB ? "" : `_${sub}`;
    await processarEventoStripe(
      evento("checkout.session.completed", sessaoSubscricao({ id: `cs_sub${sufixo}`, subscription: sub, invoice: `in_1${sufixo}` }), criado),
      deps,
    );
    for (let i = 2; i <= ciclos; i++) {
      await processarEventoStripe(
        evento("invoice.paid", { ...fatura(`in_${i}${sufixo}`), parent: { subscription_details: { subscription: sub } } }, criado + i),
        deps,
      );
    }
  }

  const terminar = (sub = SUB, criado = T0 + 100) =>
    processarEventoStripe(evento("customer.subscription.deleted", { ...subscricao("canceled"), id: sub }, criado), deps);

  test("1. (bug original) Avulso usado + 3 casos da subscrição: o fim congela os 3 e não fica nenhum utilizável", async () => {
    comConta();
    await avulsoUsadoNumPedido();
    await subscreverComCasos(3);
    assert.equal(conta().case_credits, 3, "antes do fim: 3 utilizáveis");
    assert.equal(conta().avulso_credits, 0);

    await terminar();
    assert.equal(conta().case_credits, 0, "depois do fim: 0 utilizáveis");
    assert.equal(estado.congelamentos[0].quantidade, 3, "3 congelados");
    assert.equal(calcularAcesso(conta()).podeCriarCaso, false);
  });

  test("2. Avulso por usar + 2 casos da subscrição: fica 1 utilizável (o Avulso) e 2 congelados", async () => {
    comConta();
    await avulsoPorUsar();
    await subscreverComCasos(2);
    assert.equal(conta().case_credits, 3);

    await terminar();
    assert.equal(conta().case_credits, 1);
    assert.equal(conta().avulso_credits, 1, "o caso que fica é o Avulso");
    assert.equal(estado.avulsos.get("checkout:cs_avulso").estado, "disponivel");
    assert.equal(estado.congelamentos[0].quantidade, 2);
  });

  test("3. 2 Avulsos (1 já usado) + casos da subscrição: só o Avulso por usar fica fora do congelamento", async () => {
    comConta();
    await avulsoUsadoNumPedido("cs_avulso_usado");
    await avulsoPorUsar("cs_avulso_livre");
    await subscreverComCasos(3);
    assert.equal(conta().case_credits, 4);
    assert.equal(conta().avulso_credits, 1);

    await terminar();
    assert.equal(conta().case_credits, 1);
    assert.equal(conta().avulso_credits, 1);
    assert.equal(estado.congelamentos[0].quantidade, 3);
  });

  test("4/5. abrir um caso gasta primeiro a subscrição; o Avulso só quando já não há casos da subscrição", async () => {
    comConta();
    await avulsoPorUsar();
    await subscreverComCasos(1);
    assert.equal(conta().case_credits, 2);

    estado.pedidos.set("p_sub", { id: "p_sub", user_id: USER, estado: "aguarda_pagamento", caso_id: null });
    await deps.converterPedidoEmCaso("p_sub", USER);
    assert.equal(conta().case_credits, 1, "gastou o caso da subscrição");
    assert.equal(conta().avulso_credits, 1, "o Avulso por usar ficou intacto");

    estado.pedidos.set("p_avulso", { id: "p_avulso", user_id: USER, estado: "aguarda_pagamento", caso_id: null });
    await deps.converterPedidoEmCaso("p_avulso", USER);
    assert.equal(conta().case_credits, 0, "sem casos da subscrição: gasta o Avulso");
    assert.equal(conta().avulso_credits, 0, "case_credits e avulso_credits descem juntos");
    assert.equal(estado.avulsos.get("checkout:cs_avulso").estado, "consumido");
  });

  test("E. Avulso pago para um pedido: o pedido gasta esse Avulso, não o caso da subscrição", async () => {
    comConta();
    await subscreverComCasos(1);
    assert.equal(conta().case_credits, 1);
    await avulsoUsadoNumPedido("cs_avulso_do_pedido"); // verifica que ESTE Avulso ficou consumido
    assert.equal(conta().case_credits, 1, "o caso da subscrição continua disponível");
    assert.equal(conta().avulso_credits, 0, "nenhum Avulso guardado");
    assert.equal(estado.casos.length, 1);
  });

  test("P. idempotência: webhook, fatura, reembolso e cancelamento repetidos não duplicam nem retiram duas vezes", async () => {
    comConta();
    const compra = evento("checkout.session.completed", sessaoAvulso({ metadata: { plano: "avulso", user_id: USER } }));
    await processarEventoStripe(compra, deps);
    await processarEventoStripe(compra, deps); // mesmo event.id
    await processarEventoStripe(evento("checkout.session.completed", sessaoAvulso({ metadata: { plano: "avulso", user_id: USER } })), deps);
    assert.equal(conta().case_credits, 1, "Avulso creditado uma vez");

    await subscreverComCasos(2);
    await processarEventoStripe(evento("invoice.paid", fatura("in_2")), deps); // fatura repetida
    assert.equal(conta().case_credits, 3);

    await terminar();
    await terminar(); // cancelamento repetido
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("canceled"), T0 + 200), deps);
    assert.equal(estado.congelamentos.length, 1);
    assert.equal(conta().case_credits, 1);

    estado.stripeAvulsos.set("pi_avulso", { sessionId: "cs_avulso", totalmenteReembolsado: true });
    const reembolso = { id: "re_p", object: "refund", status: "succeeded", payment_intent: "pi_avulso", metadata: {} };
    await processarEventoStripe(evento("refund.created", reembolso), deps);
    await processarEventoStripe(evento("refund.updated", reembolso), deps); // reembolso repetido
    assert.equal(conta().case_credits, 0, "retirado uma só vez");
    assert.equal(conta().avulso_credits, 0);
  });

  test("10. ciclo subscrever → acumular → terminar → voltar a subscrever → terminar: nada escapa ao congelamento", async () => {
    comConta();
    await avulsoUsadoNumPedido();
    await subscreverComCasos(3);
    await terminar(SUB, T0 + 100);
    assert.equal(conta().case_credits, 0);
    assert.equal(calcularAcesso(conta()).podeCriarCaso, false, "sem subscrição, nenhum caso utilizável");

    // Volta dentro dos 90 dias: 3 recuperados + 1 do novo ciclo (limite 4).
    await subscreverComCasos(1, SUB_NOVA, T0 + 10 * 86_400);
    assert.equal(conta().case_credits, 4);
    await terminar(SUB_NOVA, T0 + 20 * 86_400);
    assert.equal(conta().case_credits, 0);
    assert.equal(estado.congelamentos.at(-1).quantidade, 4);
    assert.equal(calcularAcesso(conta()).podeCriarCaso, false);
  });

  describe("conversão de um Avulso", () => {
    const sessaoUpgrade = () =>
      sessaoSubscricao({
        id: "cs_upgrade",
        payment_status: "no_payment_required",
        amount_total: 0,
        metadata: { plano: "assinatura", upgrade: "true", user_id: USER, conversao_id: "conv_1" },
      });
    const abrirConversao = (plano_destino, reembolso) =>
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
      });

    test("7. Avulso por usar → Caso + Proteção: o Avulso sai do saldo, fica só o caso do 1.º ciclo", async () => {
      comConta();
      await avulsoPorUsar();
      abrirConversao("caso_protecao", 700);
      estado.stripeSubscricao = snapshot("active");
      await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
      assert.equal(conta().case_credits, 1, "sem duplicação: o Avulso pagou o 1.º mês");
      assert.equal(conta().avulso_credits, 0);
      assert.equal(estado.avulsos.get("checkout:cs_avulso").estado, "convertido");
      assert.equal(estado.refundsStripe[0].amount, 700, "regra financeira da conversão inalterada");
      // Reenvio: não retira outra vez nem cria outro reembolso.
      await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
      assert.equal(conta().case_credits, 1);
      assert.equal(estado.refundsStripe.length, 1);
    });

    test("I. Avulso já usado: não é elegível (sem conversão, reembolso nem caso extra)", async () => {
      // A elegibilidade no início é testada em conversao.test.mjs; aqui: se
      // mesmo assim chegasse uma conversão, a confirmação anula-a.
      comConta();
      await avulsoUsadoNumPedido();
      abrirConversao("caso_protecao", 700);
      estado.stripeSubscricao = snapshot("active");
      await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
      assert.equal(estado.refundsStripe.length, 0);
      assert.equal(conta().case_credits, 0, "nenhum caso extra");
      assert.equal(estado.conversoes.get("conv_1").estado, "anulada");
    });

    describe("J. race condition: Avulso usado entre abrir o Checkout e pagar", () => {
      async function prepararCorrida(plano = "caso_protecao") {
        comConta();
        await avulsoPorUsar(); // elegível quando o Checkout é aberto
        abrirConversao(plano, plano === "protecao" ? 1000 : 700);
        estado.pedidos.set("p_1", { id: "p_1", user_id: USER, estado: "aguarda_pagamento", caso_id: null });
        await deps.converterPedidoEmCaso("p_1", USER, null); // entretanto, o cliente usa o Avulso
        estado.stripeSubscricao = snapshot("active", plano === "protecao" ? PRECO_PROTECAO : PRECO_CASO_PROTECAO);
      }

      test("o backend revalida: conversão anulada, subscrição cancelada, sem plano, casos, reembolso nem e-mail", async () => {
        await prepararCorrida();
        const emailsAntes = estado.emails.length; // o da compra Avulso
        const r = await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
        assert.equal(r.status, 200);
        assert.equal(ultimoLog().resultado, "conversao_anulada_avulso_indisponivel");
        const conv = estado.conversoes.get("conv_1");
        assert.equal(conv.estado, "anulada");
        assert.match(conv.anulada_motivo, /consumido/, "motivo registado para auditoria");
        assert.deepEqual(estado.subscricoesCanceladasStripe, [SUB], "subscrição cancelada no Stripe");
        assert.equal(conta().subscription_plan, "none", "sem proteção");
        assert.equal(conta().case_credits, 0, "sem o caso do 1.º ciclo");
        assert.equal(estado.refundsStripe.length, 0, "sem reembolso parcial");
        assert.equal(estado.emails.length, emailsAntes, "sem e-mail de pagamento confirmado da adesão");
        assert.equal(estado.pagamentos.get("cs_upgrade").estado, "assinatura_cancelada");
        assert.equal(estado.avisosAdmin.length, 0, "sem intervenção manual");
      });

      test("idempotente: reenvios e eventos seguintes não aplicam nada", async () => {
        await prepararCorrida();
        await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
        await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps); // novo event.id
        estado.stripeSubscricao = { ...snapshot("active"), conversao_id: "conv_1" };
        await processarEventoStripe(evento("invoice.paid", fatura("in_primeira", "subscription_create")), deps);
        assert.equal(ultimoLog().resultado, "pago_conversao_anulada");
        await processarEventoStripe(evento("customer.subscription.deleted", { ...subscricao("canceled"), metadata: { conversao_id: "conv_1" } }), deps);
        assert.equal(estado.subscricoesCanceladasStripe.length, 1);
        assert.equal(conta().subscription_plan, "none");
        assert.equal(conta().case_credits, 0);
        assert.equal(estado.congelamentos.length, 0);
        assert.equal(estado.refundsStripe.length, 0);
      });

      test("invoice.paid antes do checkout: não aplica nada até à revalidação", async () => {
        await prepararCorrida();
        estado.stripeSubscricao = { ...snapshot("active"), conversao_id: "conv_1" };
        await processarEventoStripe(evento("invoice.paid", fatura("in_primeira", "subscription_create")), deps);
        assert.equal(ultimoLog().resultado, "pago_aguarda_conversao");
        assert.equal(conta().subscription_plan, "none");
        assert.equal(conta().case_credits, 0);
        await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
        assert.equal(estado.conversoes.get("conv_1").estado, "anulada");
        assert.equal(conta().case_credits, 0);
      });

      test("depois de anulada, o cliente adere normalmente como nova compra", async () => {
        await prepararCorrida("protecao");
        await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
        estado.stripeSubscricao = { ...snapshot("active", PRECO_PROTECAO), stripe_subscription_id: "sub_normal" };
        await processarEventoStripe(
          evento("checkout.session.completed", sessaoSubscricao({ id: "cs_normal", subscription: "sub_normal", invoice: "in_normal", amount_total: 499 })),
          deps,
        );
        assert.equal(conta().subscription_plan, "protecao");
        assert.equal(estado.refundsStripe.length, 0);
      });

      test("invoice.paid de uma conversão confirmada aplica-se normalmente (e uma só vez)", async () => {
        comConta();
        await avulsoPorUsar();
        abrirConversao("caso_protecao", 700);
        estado.stripeSubscricao = { ...snapshot("active"), conversao_id: "conv_1" };
        await processarEventoStripe(evento("checkout.session.completed", sessaoUpgrade()), deps);
        await processarEventoStripe(evento("invoice.paid", fatura("in_primeira", "subscription_create")), deps);
        assert.equal(estado.conversoes.get("conv_1").estado, "convertido");
        assert.equal(conta().case_credits, 1);
        await processarEventoStripe(evento("invoice.paid", fatura("in_2")), deps);
        assert.equal(conta().case_credits, 2, "renovações seguem a regra normal");
      });
    });
  });

  describe("reembolso de um Avulso (fora de uma conversão)", () => {
    const reembolso = (extra = {}) =>
      evento("refund.created", { id: "re_manual", object: "refund", status: "succeeded", payment_intent: "pi_avulso", metadata: {}, ...extra });

    test("9. Avulso por usar totalmente reembolsado: o caso sai do saldo e o pagamento fica reembolsado", async () => {
      comConta();
      await avulsoPorUsar();
      estado.stripeAvulsos.set("pi_avulso", { sessionId: "cs_avulso", totalmenteReembolsado: true });
      await processarEventoStripe(reembolso(), deps);
      assert.equal(conta().case_credits, 0);
      assert.equal(conta().avulso_credits, 0);
      assert.equal(estado.avulsos.get("checkout:cs_avulso").estado, "reembolsado");
      assert.equal(estado.pagamentos.get("cs_avulso").estado, "reembolsado");
      assert.equal(ultimoLog().resultado, "reembolso_avulso_retirado");
      // refund.updated repetido: nada muda.
      await processarEventoStripe(evento("refund.updated", { id: "re_manual", object: "refund", status: "succeeded", payment_intent: "pi_avulso", metadata: {} }), deps);
      assert.equal(conta().case_credits, 0);
    });

    test("Avulso já usado e depois reembolsado: sem saldo negativo e sem devolver nada", async () => {
      comConta();
      await avulsoUsadoNumPedido();
      await subscreverComCasos(1);
      estado.stripeAvulsos.set("pi_avulso", { sessionId: "cs_avulso", totalmenteReembolsado: true });
      await processarEventoStripe(reembolso(), deps);
      assert.equal(conta().case_credits, 1, "o caso da subscrição não é tocado");
      assert.equal(estado.pagamentos.get("cs_avulso").estado, "reembolsado");
      assert.equal(ultimoLog().resultado, "reembolso_avulso_consumido");
    });

    test("pagamento reembolsado nunca mais dá crédito (ex.: conta ligada depois, webhook reenviado)", async () => {
      estado.pagamentos.set("cs_avulso", { stripe_session_id: "cs_avulso", estado: "reembolsado" });
      comConta();
      await aplicarCompraConfirmadaNaConta(sessaoAvulso(), USER, deps);
      assert.equal(conta().case_credits, 0);
      await avulsoPorUsar(); // checkout.session.completed tardio
      assert.equal(conta().case_credits, 0);
      assert.equal(estado.pagamentos.get("cs_avulso").estado, "reembolsado", "reembolsado é final");
    });

    test("reembolso parcial de um Avulso: o caso mantém-se e o admin é avisado", async () => {
      comConta();
      await avulsoPorUsar();
      estado.stripeAvulsos.set("pi_avulso", { sessionId: "cs_avulso", totalmenteReembolsado: false });
      await processarEventoStripe(reembolso(), deps);
      assert.equal(conta().case_credits, 1);
      assert.equal(estado.avisosAdmin.length, 1);
      assert.equal(ultimoLog().resultado, "reembolso_parcial_avulso");
    });

    test("reembolso ainda pendente: nada muda", async () => {
      comConta();
      await avulsoPorUsar();
      estado.stripeAvulsos.set("pi_avulso", { sessionId: "cs_avulso", totalmenteReembolsado: true });
      await processarEventoStripe(reembolso({ status: "pending" }), deps);
      assert.equal(conta().case_credits, 1);
    });
  });
});
