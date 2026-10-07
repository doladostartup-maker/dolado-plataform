// Programa de indicação contra a Supabase REAL — `npm run test:contrato`.
//
// Mesmo princípio de src/lib/stripe/webhook.contrato.test.mjs: dependências
// de produção (criarDependenciasWebhook + criarDependenciasIndicacoes,
// funções SQL, constraints, PostgREST) e só o Stripe e os e-mails falsos. Um
// nome de coluna ou filtro errado nas consultas do servidor faz o teste falhar.
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const PRECO_PROTECAO = "price_1ULUUeBtJL9VeDPfWuDk5XCo";
const AGORA = Math.floor(Date.now() / 1000);
const CUPAO_RECOMPENSA = "dolado-indicacao-recompensa-20";

let admin;
let deps;
let processarEventoStripe;
let srv;
let n = 0;

const stripe = {
  subs: new Map(),
  sessoes: new Map(),
  cupoes: new Map(),
  faturas: new Map(),
  pis: new Map(), // pi → { impressao, refunded }
  meios: new Map(), // customer → [impressões]
  atualizacoes: [],
};
const fakeStripe = {
  subscriptions: {
    async retrieve(id) {
      const s = stripe.subs.get(id);
      if (!s) throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
      return s;
    },
    async update(id, params) {
      stripe.atualizacoes.push({ id, params });
      const s = stripe.subs.get(id);
      if (params.discounts !== undefined) s.discounts = params.discounts ? params.discounts.map((d) => d.coupon ?? d.discount) : [];
      return s;
    },
    async cancel(id) {
      return stripe.subs.get(id);
    },
  },
  checkout: {
    sessions: {
      async retrieve(id) {
        return stripe.sessoes.get(id);
      },
      async list({ payment_intent }) {
        return { data: [...stripe.sessoes.values()].filter((s) => s.payment_intent === payment_intent) };
      },
    },
  },
  coupons: {
    async retrieve(id) {
      const c = stripe.cupoes.get(id);
      if (!c) throw Object.assign(new Error("No such coupon"), { code: "resource_missing" });
      return c;
    },
    async create(p) {
      const c = { ...p, valid: true };
      stripe.cupoes.set(p.id, c);
      return c;
    },
  },
  invoices: {
    async retrieve(id) {
      return stripe.faturas.get(id);
    },
  },
  invoicePayments: {
    async list() {
      return { data: [] };
    },
  },
  paymentIntents: {
    async retrieve(id) {
      const p = stripe.pis.get(id) ?? {};
      return { id, payment_method: { card: { fingerprint: p.impressao ?? null } }, latest_charge: { refunded: !!p.refunded } };
    },
  },
  customers: {
    async listPaymentMethods(customer) {
      return { data: (stripe.meios.get(customer) ?? []).map((f) => ({ card: { fingerprint: f } })) };
    },
  },
  refunds: {
    async list() {
      return { data: [] };
    },
  },
};

const avisos = [];
const evento = (type, object) => ({ id: `evt_ind_${++n}`, object: "event", type, created: AGORA + n, data: { object } });

async function criarUtilizador(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: "Palavra-passe-1" });
  if (error) throw error;
  return data.user.id;
}

describe("programa de indicação (Supabase real)", { skip: !ATIVO }, () => {
  let ana; // quem indica (Proteção)
  let bruno; // indicado (Avulso)
  let subAna;

  before(async () => {
    process.env.INDICACOES_ATIVO = "1";
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
    });
    ({ processarEventoStripe } = await import("../stripe/webhook.ts"));
    const { criarDependenciasWebhook } = await import("../stripe/webhookDependencias.ts");
    srv = await import("./servidor.ts");
    deps = criarDependenciasWebhook({
      stripe: fakeStripe,
      stripeIndicacoes: fakeStripe,
      indicacoes: true,
      enviarEmail: async (para, assunto) => avisos.push({ para, assunto }),
    });
    ana = await criarUtilizador(`ana.indicacao.${Date.now()}@teste.invalid`);
    bruno = await criarUtilizador(`bruno.indicacao.${Date.now()}@teste.invalid`);
  });

  test("código estável, opaco, e visita só para um código que existe", async () => {
    const codigo = await srv.codigoDaConta(ana);
    assert.match(codigo, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(await srv.codigoDaConta(ana), codigo, "o código não muda");
    const visita = await srv.registarVisita(codigo, null);
    assert.ok(visita);
    assert.equal(await srv.registarVisita(codigo, visita), visita, "recarregar não conta duas vezes");
    assert.equal(await srv.registarVisita("ZZZZ9999", null), null, "código inexistente: sem visita");
    const { data } = await admin.rpc("indicacao_atribuir", { p_referred: bruno, p_visita: visita, p_janela_dias: 30 });
    assert.equal(data, "atribuida");
    assert.deepEqual(await srv.estadoIndicacaoDaConta(bruno), { novoClienteIndicado: true, recompensasDisponiveis: 0 });
  });

  test("quem indica tem Proteção ativa", async () => {
    subAna = "sub_ind_ana";
    stripe.subs.set(subAna, {
      id: subAna,
      object: "subscription",
      customer: "cus_ind_ana",
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      discounts: [],
      metadata: {},
      items: { data: [{ price: { id: PRECO_PROTECAO }, current_period_start: AGORA, current_period_end: AGORA + 30 * 86400 }] },
    });
    stripe.meios.set("cus_ind_ana", ["fp_ana"]);
    const sessao = {
      id: "cs_ind_ana",
      object: "checkout.session",
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      amount_total: 499,
      currency: "eur",
      customer: "cus_ind_ana",
      customer_details: { email: "ana@teste.invalid" },
      subscription: subAna,
      invoice: "in_ind_ana_1",
      discounts: [],
      metadata: { plano: "assinatura", user_id: ana },
    };
    stripe.sessoes.set(sessao.id, sessao);
    const r = await processarEventoStripe(evento("checkout.session.completed", sessao), deps);
    assert.equal(r.status, 200);
  });

  test("primeira compra paga do indicado → desconto posto na próxima mensalidade de quem indicou", async () => {
    stripe.pis.set("pi_ind_bruno", { impressao: "fp_bruno" });
    const sessao = {
      id: "cs_ind_bruno",
      object: "checkout.session",
      mode: "payment",
      status: "complete",
      payment_status: "paid",
      amount_total: 1199,
      total_details: { amount_discount: 300 },
      currency: "eur",
      customer: "cus_ind_bruno",
      customer_details: { email: "bruno@teste.invalid" },
      payment_intent: "pi_ind_bruno",
      discounts: [{ coupon: "dolado-indicacao-novo-cliente-20" }],
      metadata: { plano: "avulso", user_id: bruno, indicacao_desconto: "novo_cliente" },
    };
    stripe.sessoes.set(sessao.id, sessao);
    const ev = evento("checkout.session.completed", sessao);
    assert.equal((await processarEventoStripe(ev, deps)).status, 200);
    assert.equal((await processarEventoStripe({ ...ev, id: `${ev.id}_reenvio` }, deps)).status, 200);

    const { data: ind } = await admin.from("indicacoes").select("*").eq("referred_user_id", bruno).single();
    assert.equal(ind.estado, "compra_confirmada");
    assert.equal(ind.compra_produto, "avulso");
    assert.equal(ind.compra_desconto_centimos, 300);
    assert.equal(ind.stripe_payment_intent_id, "pi_ind_bruno");
    const { data: recs } = await admin.from("indicacoes_recompensas").select("*").eq("user_id", ana);
    assert.equal(recs.length, 1, "uma só recompensa, mesmo com reenvio");
    assert.equal(recs[0].estado, "reservada");
    assert.equal(recs[0].reserva_origem, `subscricao:${subAna}`);
    const meses = (Date.parse(recs[0].expira_em) - Date.parse(recs[0].disponivel_desde)) / (86400000 * 30.4);
    assert.ok(meses > 11.9 && meses < 12.1, "válido 12 meses");
    const { data: hist } = await admin.from("indicacoes_recompensas_historico").select("estado_novo").eq("recompensa_id", recs[0].id).order("id");
    assert.deepEqual(hist.map((h) => h.estado_novo), ["disponivel", "reservada"], "histórico auditável");
    assert.deepEqual(stripe.subs.get(subAna).discounts, [CUPAO_RECOMPENSA]);
    assert.equal(stripe.cupoes.get(CUPAO_RECOMPENSA).percent_off, 20);
    assert.equal((await srv.estadoIndicacaoDaConta(bruno)).novoClienteIndicado, false);
  });

  test("renovação paga com o desconto → usado; depois volta ao preço normal", async () => {
    stripe.faturas.set("in_ind_ana_2", {
      id: "in_ind_ana_2",
      discounts: [{ source: { coupon: CUPAO_RECOMPENSA } }],
      total_discount_amounts: [{ amount: 100 }],
    });
    stripe.subs.get(subAna).discounts = []; // cupão "once" consumido pela fatura
    const r = await processarEventoStripe(
      evento("invoice.paid", {
        id: "in_ind_ana_2",
        customer: "cus_ind_ana",
        billing_reason: "subscription_cycle",
        parent: { subscription_details: { subscription: subAna } },
      }),
      deps,
    );
    assert.equal(r.status, 200);
    const { data: rec } = await admin.from("indicacoes_recompensas").select("*").eq("user_id", ana).single();
    assert.equal(rec.estado, "usada");
    assert.equal(rec.usada_origem, "invoice:in_ind_ana_2");
    assert.equal(rec.usada_desconto_centimos, 100);
    assert.deepEqual(stripe.subs.get(subAna).discounts, [], "sem mais descontos: nada é posto na subscrição");

    const resumo = await srv.resumoIndicacaoDaConta(ana);
    assert.equal(resumo.disponiveis, 0);
    assert.equal(resumo.usados, 1);
    assert.equal(resumo.concluidas, 1);
    assert.match(resumo.url, /^https:\/\/dolado\.pt\/r\/[A-HJ-NP-Z2-9]{8}$/);
  });

  test("reembolso integral depois de o desconto ser usado → revertida, aviso ao admin", async () => {
    stripe.pis.get("pi_ind_bruno").refunded = true;
    const r = await processarEventoStripe(
      evento("refund.created", { id: "re_ind_1", status: "succeeded", payment_intent: "pi_ind_bruno", metadata: {} }),
      deps,
    );
    assert.equal(r.status, 200);
    const { data: ind } = await admin.from("indicacoes").select("estado, motivo").eq("referred_user_id", bruno).single();
    assert.deepEqual(ind, { estado: "revertida", motivo: "reembolso_integral" });
    assert.ok(avisos.some((a) => a.assunto.startsWith("Indicação revertida com desconto já usado")));
  });

  test("métricas para o admin (service role)", async () => {
    const { data, error } = await admin.rpc("indicacoes_metricas");
    assert.equal(error, null);
    assert.ok(data.visitas >= 1);
    assert.ok(data.recompensas_usadas >= 1);
  });
});
