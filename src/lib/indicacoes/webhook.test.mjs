// Programa de indicação no webhook Stripe (`npm test`): eventos reais pela
// porta de entrada de sempre (processarEventoStripe), com dependências falsas
// em memória. As funções indicacao_* falsas seguem as mesmas regras das
// funções SQL (20261007090000_programa_indicacoes.sql), que têm os seus
// próprios testes em supabase/tests/database/indicacoes.test.sql.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, test } from "node:test";
import { processarEventoStripe } from "../stripe/webhook.ts";
import { CUPAO_INDICACAO_RECOMPENSA, faturaComCupao } from "./regras.ts";

const PRECO_PROTECAO = "price_1ULUUeBtJL9VeDPfWuDk5XCo";
const PRECO_CASO_PROTECAO = "price_1UJYnPBtJL9VeDPfnQTlVwsq";
const ANA = "00000000-0000-4000-a000-0000000000a1"; // quem indica
const BRUNO = "00000000-0000-4000-a000-0000000000b2"; // indicado
const CARLA = "00000000-0000-4000-a000-0000000000c3"; // indicada

let e; // estado
let n = 0;
const novoId = (p) => `${p}_${++n}`;

function criarEstado() {
  return {
    eventos: new Set(),
    pagamentos: new Map(), // session → { user_id, estado }
    contas: new Map(), // user → { plano, sub, customer, cancel }
    subsStripe: new Map(), // sub → { customer, price, status, discounts: [cupão] }
    faturas: new Map(), // invoice → { discounts }
    pis: new Map(), // pi → { refunded, impressao }
    cartoes: new Map(), // customer → [impressões]
    indicacoes: new Map(), // referred → linha
    recompensas: [],
    avisos: [],
    logs: [],
  };
}

function jaCliente(user, excetoSessao = null) {
  return [...e.pagamentos].some(
    ([sid, p]) => p.user_id === user && ["concluido", "reembolsado", "assinatura_cancelada"].includes(p.estado) && sid !== excetoSessao,
  );
}

function usaveis(user) {
  return e.recompensas.filter((r) => r.user === user && r.estado === "disponivel");
}

// --- Dependências do programa de indicação (mesmas regras das funções SQL) ---
function depsIndicacoes() {
  return {
    async indicacaoPorDecidir(user) {
      const i = e.indicacoes.get(user);
      return i && i.estado === "registada" ? { referrerUserId: i.referrer } : null;
    },
    async paymentIntentDaCompra(session) {
      return session.payment_intent ?? (session.invoice ? `pi_de_${session.invoice}` : null);
    },
    async sinalAutoIndicacao({ referrerUserId, referredCustomerId, paymentIntentId }) {
      const cust = e.contas.get(referrerUserId)?.customer;
      if (referredCustomerId && referredCustomerId === cust) return "mesmo_cliente_stripe";
      const imp = e.pis.get(paymentIntentId)?.impressao;
      return imp && (e.cartoes.get(cust) ?? []).includes(imp) ? "mesmo_meio_de_pagamento" : null;
    },
    async confirmarCompra(d) {
      const i = e.indicacoes.get(d.referredUserId);
      if (!i) return { resultado: "sem_indicacao" };
      if (i.compra_session_id) {
        return { resultado: i.compra_session_id === d.sessionId ? "ja_registada" : "nao_primeira_compra" };
      }
      const motivo = jaCliente(d.referredUserId, d.sessionId)
        ? "nao_primeira_compra"
        : (d.valorCentimos ?? 0) <= 0
          ? "compra_sem_pagamento"
          : null;
      Object.assign(i, {
        estado: motivo ? "rejeitada" : "compra_confirmada",
        compra_session_id: d.sessionId,
        produto: d.produto,
        pi: d.paymentIntentId,
        com_desconto: d.comDescontoIndicacao,
        motivo,
      });
      if (motivo) return { resultado: `rejeitada_${motivo}`, referrer_user_id: i.referrer };
      const estado = d.suspeita ? "em_revisao" : "disponivel";
      const r = { id: randomUUID(), user: i.referrer, indicacao: i, estado, reserva: null, usada: null };
      e.recompensas.push(r);
      return { resultado: `recompensa_${estado}`, recompensa_id: r.id, referrer_user_id: i.referrer };
    },
    async usarRecompensa(id, user, origem) {
      const r = e.recompensas.find((x) => x.id === id && x.user === user);
      if (!r) return "inexistente";
      if (r.estado === "usada") return r.usada === origem ? "ja_usada" : "usada_noutra";
      if (["anulada", "em_revisao"].includes(r.estado)) return r.estado;
      if (e.recompensas.some((x) => x.usada === origem)) return "cobranca_ja_com_desconto";
      Object.assign(r, { estado: "usada", usada: origem, reserva: null });
      return "usada";
    },
    async atualizarReserva(id, origem, expira) {
      const r = e.recompensas.find((x) => x.id === id && x.estado === "reservada");
      if (!r) return false;
      Object.assign(r, { reserva: origem, expira });
      return true;
    },
    async libertarReserva(origem) {
      const r = e.recompensas.filter((x) => x.estado === "reservada" && x.reserva === origem);
      for (const x of r) Object.assign(x, { estado: "disponivel", reserva: null });
      return r.length;
    },
    async reverterCompra(_s, pi, motivo) {
      const i = [...e.indicacoes.values()].find((x) => x.pi === pi);
      if (!i) return { resultado: "sem_indicacao" };
      if (i.estado === "revertida") return { resultado: "ja_revertida" };
      if (i.estado !== "compra_confirmada") return { resultado: "sem_recompensa" };
      Object.assign(i, { estado: "revertida", motivo });
      const r = e.recompensas.find((x) => x.indicacao === i);
      if (r.estado === "usada") return { resultado: "revertida_recompensa_ja_usada", referrer_user_id: r.user };
      const reserva = r.reserva;
      Object.assign(r, { estado: "anulada", reserva: null });
      return { resultado: "revertida", reserva_origem: reserva, referrer_user_id: r.user };
    },
    async pagamentoTotalmenteReembolsado(pi) {
      return e.pis.get(pi)?.refunded === true;
    },
    async recompensaDaFatura(invoiceId, sub) {
      const r = e.recompensas.find((x) => x.estado === "reservada" && x.reserva === `subscricao:${sub}`);
      if (!r) return null;
      if (!faturaComCupao(e.faturas.get(invoiceId)?.discounts, CUPAO_INDICACAO_RECOMPENSA.id)) return null;
      return { recompensaId: r.id, userId: r.user, descontoCentimos: 100 };
    },
    async aplicarRecompensaNaSubscricao(user) {
      const c = e.contas.get(user);
      if (!c?.sub) return "sem_subscricao";
      if (e.recompensas.some((x) => x.estado === "reservada" && x.reserva === `subscricao:${c.sub}`)) return "ja_aplicada";
      const s = e.subsStripe.get(c.sub);
      if (!["protecao", "caso_protecao"].includes(c.plano) || s.status !== "active" || c.cancel || s.discounts.length > 0) {
        return "subscricao_nao_elegivel";
      }
      const r = usaveis(user)[0];
      if (!r) return "sem_recompensa";
      Object.assign(r, { estado: "reservada", reserva: `subscricao:${c.sub}` });
      s.discounts = [CUPAO_INDICACAO_RECOMPENSA.id];
      return "aplicada";
    },
    async removerRecompensaDaSubscricao(sub) {
      const s = e.subsStripe.get(sub);
      s.discounts = s.discounts.filter((c) => c !== CUPAO_INDICACAO_RECOMPENSA.id);
    },
    async notificarAdmin(assunto) {
      e.avisos.push(assunto);
    },
    registar(l) {
      e.logs.push(l);
    },
  };
}

// --- Dependências do webhook de sempre (só o que estes cenários usam) ---
function depsWebhook() {
  const reais = {
    async reclamarEvento(id) {
      if (e.eventos.has(id)) return false;
      e.eventos.add(id);
      return true;
    },
    async obterEstadoPagamento(sid) {
      return e.pagamentos.get(sid)?.estado ?? null;
    },
    async utilizadorDoPagamento(sid) {
      return e.pagamentos.get(sid)?.user_id ?? null;
    },
    async gravarPagamento(d) {
      e.pagamentos.set(d.stripe_session_id, { ...e.pagamentos.get(d.stripe_session_id), ...d });
    },
    async obterSubscricaoStripe(sub) {
      const s = e.subsStripe.get(sub);
      return { stripe_subscription_id: sub, stripe_customer_id: s.customer, price_id: s.price, status: s.status, cancel_at_period_end: false, cancel_at: null, current_period_start: null, current_period_end: null };
    },
    async gravarSubscricao() {
      return true;
    },
    planoDoPreco(p) {
      return p === PRECO_PROTECAO ? "protecao" : p === PRECO_CASO_PROTECAO ? "caso_protecao" : null;
    },
    async contasDoCustomer(cust) {
      return [...e.contas].filter(([, c]) => c.customer === cust).map(([u]) => u);
    },
    async subscricaoAtivaDaConta(user) {
      return e.contas.get(user)?.sub ?? null;
    },
    async aplicarSubscricaoNaConta(user, sub) {
      Object.assign(e.contas.get(user), { plano: sub.plano, sub: sub.stripe_subscription_id });
    },
    async atualizarSubscricaoNasContas() {
      return 0;
    },
    async garantirConta(user, customer) {
      if (!e.contas.has(user)) e.contas.set(user, { plano: "none", sub: null, customer });
      if (customer && !e.contas.get(user).customer) e.contas.get(user).customer = customer;
    },
    async concederCreditoCaso() {
      return true;
    },
    async atualizarReembolso() {
      return null;
    },
    async avulsoDoPagamento() {
      return null;
    },
    async enviarEmailPagamentoConfirmado() {},
    async notificarAdmin(a) {
      e.avisos.push(a);
    },
    registar(l) {
      e.logs.push(l);
    },
    indicacoes: depsIndicacoes(),
  };
  // Tudo o resto não tem efeito nestes cenários.
  return new Proxy(reais, { get: (t, k) => (k in t ? t[k] : async () => undefined) });
}

const evento = (type, object, id = novoId("evt")) => ({ id, type, created: 1_800_000_000, data: { object } });
const processar = (ev) => processarEventoStripe(ev, depsWebhook());

function sessaoAvulso(user, { valor = 1499, desconto = 0, meta = {}, customer = `cus_${user.slice(-2)}`, pago = true } = {}) {
  const id = novoId("cs");
  const pi = novoId("pi");
  e.pis.set(pi, { refunded: false, impressao: `fp_${customer}` });
  return {
    id,
    mode: "payment",
    payment_status: pago ? "paid" : "unpaid",
    amount_total: valor,
    total_details: { amount_discount: desconto },
    currency: "eur",
    customer,
    customer_details: { email: `${user}@exemplo.pt` },
    payment_intent: pi,
    metadata: { plano: "avulso", user_id: user, ...meta },
  };
}

function sessaoSubscricao(user, preco, { valor = 499, meta = {}, customer = `cus_${user.slice(-2)}` } = {}) {
  const sub = novoId("sub");
  const invoice = novoId("in");
  e.subsStripe.set(sub, { customer, price: preco, status: "active", discounts: [] });
  e.pis.set(`pi_de_${invoice}`, { refunded: false, impressao: `fp_${customer}` });
  return {
    id: novoId("cs"),
    mode: "subscription",
    payment_status: valor > 0 ? "paid" : "no_payment_required",
    amount_total: valor,
    total_details: { amount_discount: 0 },
    currency: "eur",
    customer,
    customer_details: { email: `${user}@exemplo.pt` },
    subscription: sub,
    invoice,
    metadata: { plano: "assinatura", user_id: user, ...meta },
  };
}

/** Renovação mensal: o Stripe aplica o cupão "once" que estiver na subscrição e retira-o. */
async function renovar(user) {
  const c = e.contas.get(user);
  const s = e.subsStripe.get(c.sub);
  const id = novoId("in");
  e.faturas.set(id, { discounts: s.discounts.map((cupao) => ({ source: { coupon: cupao } })) });
  s.discounts = [];
  await processar(
    evento("invoice.paid", {
      id,
      customer: s.customer,
      billing_reason: "subscription_cycle",
      parent: { subscription_details: { subscription: c.sub } },
    }),
  );
  return e.faturas.get(id).discounts.length; // descontos nesta cobrança
}

function atribuir(referred, referrer) {
  e.indicacoes.set(referred, { referrer, estado: "registada", compra_session_id: null });
}

const recompensasDe = (user) => e.recompensas.filter((r) => r.user === user);

beforeEach(() => {
  e = criarEstado();
  e.contas.set(ANA, { plano: "none", sub: null, customer: "cus_a1" });
});

describe("primeira compra de quem foi indicado", () => {
  test("Avulso com desconto de novo cliente → 1 desconto de 20% para quem indicou", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO, { valor: 1199, desconto: 300, meta: { indicacao_desconto: "novo_cliente" } });
    await processar(evento("checkout.session.completed", s));
    assert.equal(e.indicacoes.get(BRUNO).estado, "compra_confirmada");
    assert.equal(e.indicacoes.get(BRUNO).com_desconto, true);
    assert.deepEqual(recompensasDe(ANA).map((r) => r.estado), ["disponivel"]);
  });

  test("Proteção com desconto na 1.ª mensalidade → desconto para quem indicou", async () => {
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoSubscricao(BRUNO, PRECO_PROTECAO, { valor: 399, meta: { indicacao_desconto: "novo_cliente" } })));
    assert.equal(e.indicacoes.get(BRUNO).produto, "protecao");
    assert.equal(recompensasDe(ANA).length, 1);
  });

  test("Caso + Proteção (sem desconto de indicação) continua a recompensar quem indicou", async () => {
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoSubscricao(BRUNO, PRECO_CASO_PROTECAO, { valor: 799 })));
    const i = e.indicacoes.get(BRUNO);
    assert.equal(i.estado, "compra_confirmada");
    assert.equal(i.produto, "caso_protecao");
    assert.equal(i.com_desconto, false);
    assert.equal(recompensasDe(ANA).length, 1);
  });

  test("webhook duplicado (mesmo evento e outro evento da mesma sessão) → uma só recompensa", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    const ev = evento("checkout.session.completed", s);
    await processar(ev);
    const repetido = await processar(ev);
    assert.equal(repetido.corpo.duplicado, true);
    await processar(evento("checkout.session.async_payment_succeeded", s));
    await processar(evento("checkout.session.completed", s)); // reenvio com outro id
    assert.equal(recompensasDe(ANA).length, 1);
  });

  test("segunda compra do indicado não dá segunda recompensa", async () => {
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO)));
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO)));
    assert.equal(recompensasDe(ANA).length, 1);
  });

  test("conta sem indicação: nada acontece", async () => {
    await processar(evento("checkout.session.completed", sessaoAvulso(CARLA)));
    assert.equal(e.recompensas.length, 0);
  });

  test("voucher de 100% (0 €) não recompensa quem indicou", async () => {
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoSubscricao(BRUNO, PRECO_CASO_PROTECAO, { valor: 0 })));
    assert.equal(e.indicacoes.get(BRUNO).estado, "rejeitada");
    assert.equal(e.indicacoes.get(BRUNO).motivo, "compra_sem_pagamento");
    assert.equal(e.recompensas.length, 0);
  });

  test("pagamento pendente (SEPA) não recompensa; só quando é confirmado", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO, { pago: false });
    await processar(evento("checkout.session.completed", s));
    assert.equal(e.recompensas.length, 0);
    await processar(evento("checkout.session.async_payment_succeeded", { ...s, payment_status: "paid" }));
    assert.equal(recompensasDe(ANA).length, 1);
  });

  test("pagamento falhado: sem recompensa", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO, { pago: false });
    await processar(evento("checkout.session.completed", s));
    await processar(evento("checkout.session.async_payment_failed", s));
    assert.equal(e.recompensas.length, 0);
    assert.equal(e.indicacoes.get(BRUNO).estado, "registada");
  });
});

describe("auto-indicação", () => {
  test("mesmo Customer Stripe de quem indicou → recompensa em revisão humana", async () => {
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO, { customer: "cus_a1" })));
    assert.deepEqual(recompensasDe(ANA).map((r) => r.estado), ["em_revisao"]);
    assert.ok(e.avisos.some((a) => a.startsWith("Indicação por rever")));
  });

  test("mesmo cartão de quem indicou → desconto em revisão e aviso ao admin (nunca por IP)", async () => {
    e.cartoes.set("cus_a1", ["fp_partilhado"]);
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    e.pis.get(s.payment_intent).impressao = "fp_partilhado";
    await processar(evento("checkout.session.completed", s));
    assert.deepEqual(recompensasDe(ANA).map((r) => r.estado), ["em_revisao"]);
    assert.ok(e.avisos.some((a) => a.startsWith("Indicação por rever")));
  });
});

describe("reembolso e disputa", () => {
  test("reembolso integral antes de usar → indicação revertida e desconto anulado", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    await processar(evento("checkout.session.completed", s));
    e.pis.get(s.payment_intent).refunded = true;
    await processar(evento("refund.created", { id: novoId("re"), status: "succeeded", payment_intent: s.payment_intent, metadata: {} }));
    assert.equal(e.indicacoes.get(BRUNO).estado, "revertida");
    assert.deepEqual(recompensasDe(ANA).map((r) => r.estado), ["anulada"]);
  });

  test("reembolso parcial não reverte", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    await processar(evento("checkout.session.completed", s));
    await processar(evento("refund.created", { id: novoId("re"), status: "succeeded", payment_intent: s.payment_intent, metadata: {} }));
    assert.equal(e.indicacoes.get(BRUNO).estado, "compra_confirmada");
    assert.equal(recompensasDe(ANA)[0].estado, "disponivel");
  });

  test("desconto já posto na mensalidade de quem indicou é retirado da subscrição", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_PROTECAO, { customer: "cus_a1" })));
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    await processar(evento("checkout.session.completed", s));
    assert.deepEqual(e.subsStripe.get(e.contas.get(ANA).sub).discounts, [CUPAO_INDICACAO_RECOMPENSA.id]);
    e.pis.get(s.payment_intent).refunded = true;
    await processar(evento("refund.created", { id: novoId("re"), status: "succeeded", payment_intent: s.payment_intent, metadata: {} }));
    assert.deepEqual(e.subsStripe.get(e.contas.get(ANA).sub).discounts, []);
    assert.equal(recompensasDe(ANA)[0].estado, "anulada");
  });

  test("reembolso depois de o desconto ser usado → não toca no desconto, avisa o admin", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_PROTECAO, { customer: "cus_a1" })));
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    await processar(evento("checkout.session.completed", s));
    await renovar(ANA);
    e.pis.get(s.payment_intent).refunded = true;
    await processar(evento("refund.created", { id: novoId("re"), status: "succeeded", payment_intent: s.payment_intent, metadata: {} }));
    assert.equal(recompensasDe(ANA)[0].estado, "usada");
    assert.ok(e.avisos.some((a) => a.startsWith("Indicação revertida com desconto já usado")));
  });

  test("disputa (chargeback) reverte como um reembolso integral", async () => {
    atribuir(BRUNO, ANA);
    const s = sessaoAvulso(BRUNO);
    await processar(evento("checkout.session.completed", s));
    await processar(evento("charge.dispute.created", { id: novoId("dp"), payment_intent: s.payment_intent }));
    assert.equal(e.indicacoes.get(BRUNO).estado, "revertida");
    assert.equal(recompensasDe(ANA)[0].estado, "anulada");
  });
});

describe("descontos de quem indicou: um por cobrança", () => {
  test("Proteção: 3 indicações = 3 mensalidades seguidas com 20%, nunca 40%/60%, depois preço normal", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_PROTECAO, { customer: "cus_a1" })));
    for (const [user, cust] of [[BRUNO, "cus_b2"], [CARLA, "cus_c3"], ["00000000-0000-4000-a000-0000000000d4", "cus_d4"]]) {
      atribuir(user, ANA);
      await processar(evento("checkout.session.completed", sessaoAvulso(user, { customer: cust })));
    }
    assert.equal(recompensasDe(ANA).length, 3);
    // Só um desconto na subscrição de cada vez.
    assert.equal(e.subsStripe.get(e.contas.get(ANA).sub).discounts.length, 1);

    assert.equal(await renovar(ANA), 1);
    assert.equal(await renovar(ANA), 1);
    assert.equal(await renovar(ANA), 1);
    assert.equal(await renovar(ANA), 0); // volta ao preço normal
    assert.deepEqual(recompensasDe(ANA).map((r) => r.estado), ["usada", "usada", "usada"]);
    assert.equal(new Set(recompensasDe(ANA).map((r) => r.usada)).size, 3); // cobranças diferentes
  });

  test("reenvio do invoice.paid não gasta um segundo desconto", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_PROTECAO, { customer: "cus_a1" })));
    for (const [user, cust] of [[BRUNO, "cus_b2"], [CARLA, "cus_c3"]]) {
      atribuir(user, ANA);
      await processar(evento("checkout.session.completed", sessaoAvulso(user, { customer: cust })));
    }
    const c = e.contas.get(ANA);
    const s = e.subsStripe.get(c.sub);
    const id = novoId("in");
    e.faturas.set(id, { discounts: s.discounts.map((cupao) => ({ source: { coupon: cupao } })) });
    s.discounts = [];
    const fatura = { id, customer: s.customer, billing_reason: "subscription_cycle", parent: { subscription_details: { subscription: c.sub } } };
    await processar(evento("invoice.paid", fatura));
    await processar(evento("invoice.paid", fatura)); // outro evento, mesma fatura
    assert.deepEqual(recompensasDe(ANA).map((r) => r.estado).sort(), ["reservada", "usada"]);
  });

  test("Avulso: o desconto reservado no Checkout é usado quando o pagamento é confirmado", async () => {
    for (const [user, cust] of [[BRUNO, "cus_b2"], [CARLA, "cus_c3"]]) {
      atribuir(user, ANA);
      await processar(evento("checkout.session.completed", sessaoAvulso(user, { customer: cust })));
    }
    const [r1, r2] = recompensasDe(ANA);
    Object.assign(r1, { estado: "reservada", reserva: "checkout-pendente:x" }); // reservado pelo servidor ao abrir o Checkout
    const s = sessaoAvulso(ANA, { customer: "cus_a1", valor: 1199, desconto: 300, meta: { indicacao_desconto: "recompensa", indicacao_recompensa_id: r1.id } });
    await processar(evento("checkout.session.completed", s));
    assert.equal(r1.estado, "usada");
    assert.equal(r1.usada, `checkout:${s.id}`);
    assert.equal(r2.estado, "disponivel"); // o segundo fica para a próxima compra
  });

  test("Caso + Proteção de quem indicou: a recompensa já ganha é usada na renovação mensal seguinte", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_CASO_PROTECAO, { customer: "cus_a1", valor: 799 })));
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO)));
    assert.deepEqual(e.subsStripe.get(e.contas.get(ANA).sub).discounts, [CUPAO_INDICACAO_RECOMPENSA.id]);
    assert.equal(await renovar(ANA), 1);
    assert.equal(await renovar(ANA), 0); // depois volta ao preço normal
    assert.equal(recompensasDe(ANA)[0].estado, "usada");
  });

  test("Caso + Proteção com cupão do piloto (100%): o desconto de indicação não acumula, fica disponível", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_CASO_PROTECAO, { customer: "cus_a1", valor: 0 })));
    e.subsStripe.get(e.contas.get(ANA).sub).discounts = ["duploprestigio26"];
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO)));
    assert.deepEqual(e.subsStripe.get(e.contas.get(ANA).sub).discounts, ["duploprestigio26"]);
    assert.equal(recompensasDe(ANA)[0].estado, "disponivel");
  });

  test("pagamento SEPA pendente prolonga a reserva; falhado devolve o desconto", async () => {
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO)));
    const [r] = recompensasDe(ANA);
    Object.assign(r, { estado: "reservada", reserva: "checkout-pendente:y", expira: "2026-10-07T12:00:00Z" });
    const s = sessaoAvulso(ANA, { customer: "cus_a1", pago: false, meta: { indicacao_recompensa_id: r.id } });
    await processar(evento("checkout.session.completed", s));
    assert.equal(r.reserva, `checkout:${s.id}`);
    assert.equal(r.expira, null);
    await processar(evento("checkout.session.async_payment_failed", s));
    assert.equal(r.estado, "disponivel");
  });

  test("subscrição terminada com desconto à espera: o desconto volta a estar disponível", async () => {
    await processar(evento("checkout.session.completed", sessaoSubscricao(ANA, PRECO_PROTECAO, { customer: "cus_a1" })));
    atribuir(BRUNO, ANA);
    await processar(evento("checkout.session.completed", sessaoAvulso(BRUNO)));
    const sub = e.contas.get(ANA).sub;
    assert.equal(recompensasDe(ANA)[0].estado, "reservada");
    await processar(
      evento("customer.subscription.deleted", {
        id: sub,
        customer: "cus_a1",
        status: "canceled",
        cancel_at_period_end: false,
        cancel_at: null,
        items: { data: [{ price: { id: PRECO_PROTECAO } }] },
        metadata: {},
      }),
    );
    assert.equal(recompensasDe(ANA)[0].estado, "disponivel");
  });
});
