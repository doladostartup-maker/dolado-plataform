// Testes de contrato Stripe ↔ Supabase REAL — `npm run test:contrato`
// (scripts/test-contrato.mjs recria a base local a partir das migrations).
//
// Ao contrário de webhook.test.mjs (base falsa, rápido), aqui as
// dependências são as de produção — criarDependenciasWebhook, funções SQL,
// triggers, constraints e o PostgREST — e só o Stripe e o envio de e-mails
// são falsos. Um campo que não existe numa tabela (ex.: o conversao_id que
// deu PGRST204 em produção a 02/10/2026) faz o evento devolver 500 e o
// teste falhar.
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

const PRECO_PROTECAO = "price_1ULUUeBtJL9VeDPfWuDk5XCo";
const PRECO_CASO_PROTECAO = "price_1UJYnPBtJL9VeDPfnQTlVwsq";
const SITE = "https://portal.dolado.test";
const ADMIN = "admin@dolado.test";
const AGORA = Math.floor(Date.now() / 1000);

let admin; // supabase-js com service_role (só para preparar e verificar)
let deps; // dependências REAIS do webhook (Stripe e e-mails falsos)
let processarEventoStripe;
let associarCompraAConta;
let dependenciasAssociacao;
let enviarLembretesCompraSemConta;
let dependenciasLembretes;
let decidirCompra;
let calcularAcesso;

// ---------------------------------------------------------------------------
// Stripe falso (só o que o servidor usa) e caixa de e-mails
// ---------------------------------------------------------------------------
const stripe = {
  subs: new Map(),
  sessoes: new Map(),
  pagamentos: new Map(), // payment_intent → { refunded }
  reembolsos: [],
  cancelamentos: [],
};
const fakeStripe = {
  subscriptions: {
    async retrieve(id) {
      const s = stripe.subs.get(id);
      if (!s) throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
      return s;
    },
    async cancel(id) {
      stripe.cancelamentos.push(id);
      const s = stripe.subs.get(id);
      s.status = "canceled";
      return s;
    },
  },
  checkout: {
    sessions: {
      async retrieve(id) {
        const s = stripe.sessoes.get(id);
        if (!s) throw Object.assign(new Error("No such checkout session"), { code: "resource_missing" });
        return s;
      },
      async list({ payment_intent }) {
        return { data: [...stripe.sessoes.values()].filter((s) => s.payment_intent === payment_intent) };
      },
    },
  },
  paymentIntents: {
    async retrieve(id) {
      return { id, latest_charge: { refunded: !!stripe.pagamentos.get(id)?.refunded } };
    },
  },
  refunds: {
    async list({ payment_intent }) {
      return { data: stripe.reembolsos.filter((r) => r.payment_intent === payment_intent) };
    },
    async create(params) {
      const r = { id: `re_${stripe.reembolsos.length + 1}`, status: "pending", ...params };
      stripe.reembolsos.push(r);
      return r;
    },
  },
};
const emails = [];
const enviarEmail = async (destinatario, assunto, html) => {
  emails.push({ destinatario, assunto, html });
};
const emailsAdmin = (assunto) => emails.filter((e) => e.destinatario === ADMIN && e.assunto.startsWith(assunto));

// ---------------------------------------------------------------------------
// Construtores (formato da API 2026-08-26.dahlia, a versão do endpoint)
// ---------------------------------------------------------------------------
let n = 0;
function evento(type, object) {
  n++;
  return { id: `evt_contrato_${n}`, object: "event", api_version: "2026-08-26.dahlia", type, created: AGORA + n, data: { object } };
}

function subscricao(id, customer, price, extra = {}) {
  const s = {
    id,
    object: "subscription",
    customer,
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: {},
    items: { data: [{ price: { id: price }, current_period_start: AGORA, current_period_end: AGORA + 30 * 86400 }] },
    ...extra,
  };
  stripe.subs.set(id, s);
  return s;
}

function sessao(id, extra) {
  const s = {
    id,
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    currency: "eur",
    discounts: [],
    payment_intent: null,
    subscription: null,
    invoice: null,
    ...extra,
  };
  stripe.sessoes.set(id, s);
  return s;
}

function fatura(id, customer, subscriptionId, billing_reason) {
  return {
    id,
    object: "invoice",
    customer,
    billing_reason,
    parent: { type: "subscription_details", subscription_details: { subscription: subscriptionId } },
  };
}

async function enviar(evt) {
  const r = await processarEventoStripe(evt, deps);
  assert.equal(r.status, 200, `${evt.type} devolveu ${r.status} (${JSON.stringify(r.corpo)})`);
  return r;
}

// Último resultado registado pelo webhook (console.log JSON), por event_id.
const resultados = new Map();

// ---------------------------------------------------------------------------
// Leitura da base de dados real
// ---------------------------------------------------------------------------
async function uma(tabela, filtros) {
  let q = admin.from(tabela).select("*");
  for (const [c, v] of Object.entries(filtros)) q = v === null ? q.is(c, null) : q.eq(c, v);
  const { data, error } = await q;
  assert.equal(error, null, `${tabela}: ${error?.message}`);
  assert.equal(data.length, 1, `${tabela} ${JSON.stringify(filtros)}: esperava 1 linha, há ${data.length}`);
  return data[0];
}
async function contar(tabela, filtros) {
  let q = admin.from(tabela).select("*", { count: "exact", head: true });
  for (const [c, v] of Object.entries(filtros)) q = q.eq(c, v);
  const { count, error } = await q;
  assert.equal(error, null, `${tabela}: ${error?.message}`);
  return count;
}
async function rpc(nome, args) {
  const { data, error } = await admin.rpc(nome, args);
  assert.equal(error, null, `${nome}: ${error?.message}`);
  return data;
}

async function criarUtilizador(email, confirmado = true) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Contrato-${Math.random().toString(36).slice(2)}!`,
    email_confirm: confirmado,
  });
  assert.equal(error, null, error?.message);
  return data.user.id;
}

const contaDe = (id, email) => async () => ({ id, email, emailConfirmado: true });

// ---------------------------------------------------------------------------

describe("contrato Stripe ↔ Supabase real", { skip: !ATIVO && "corre com npm run test:contrato (Supabase local)" }, () => {
  let U1, U2, U3, U4, U9, U10, U11;

  before(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    ({ processarEventoStripe } = await import("./webhook.ts"));
    const { criarDependenciasWebhook } = await import("./webhookDependencias.ts");
    ({ associarCompraAConta } = await import("../compra/associacao.ts"));
    ({ dependenciasAssociacao, dependenciasLembretes } = await import("../compra/servidor.ts"));
    ({ enviarLembretesCompraSemConta } = await import("../compra/lembretes.ts"));
    ({ decidirCompra } = await import("../compra/decisao.ts"));
    ({ calcularAcesso } = await import("../acesso.ts"));

    const reais = criarDependenciasWebhook({ stripe: fakeStripe, enviarEmail });
    deps = {
      ...reais,
      registar(linha) {
        resultados.set(linha.event_id, linha.resultado);
      },
    };

    U1 = await criarUtilizador("u1@contrato.test");
    U2 = await criarUtilizador("u2@contrato.test");
    U3 = await criarUtilizador("u3@contrato.test");
    U4 = await criarUtilizador("u4@contrato.test");
    U10 = await criarUtilizador("u10@contrato.test");
    U11 = await criarUtilizador("u11@contrato.test");
  });

  // 1 + 2 ---------------------------------------------------------------------
  test("1. checkout de subscrição (conta com sessão): plano, pagamento e 1.º caso nas tabelas reais", async () => {
    subscricao("sub_c1", "cus_c1", PRECO_CASO_PROTECAO);
    const s = sessao("cs_c1", {
      mode: "subscription",
      customer: "cus_c1",
      subscription: "sub_c1",
      invoice: "in_c1",
      amount_total: 799,
      customer_details: { email: "u1@contrato.test" },
      metadata: { plano: "assinatura", upgrade: "false", user_id: U1 },
    });
    const evt = evento("checkout.session.completed", s);
    await enviar(evt);
    assert.equal(resultados.get(evt.id), "pagamento_confirmado");

    const ua = await uma("user_access", { user_id: U1 });
    assert.equal(ua.subscription_plan, "caso_protecao");
    assert.equal(ua.subscription_status, "active");
    assert.equal(ua.stripe_subscription_id, "sub_c1");
    assert.equal(ua.stripe_customer_id, "cus_c1");
    assert.equal(ua.case_credits, 1);
    const p = await uma("stripe_payments", { stripe_session_id: "cs_c1" });
    assert.equal(p.estado, "concluido");
    assert.equal(p.user_id, U1);
    assert.equal(await contar("case_credit_grants", { user_id: U1 }), 1);
    await uma("case_credit_grants", { origem: "invoice:in_c1" });
  });

  test("2. invoice.paid: grava stripe_subscriptions (regressão PGRST204) sem crédito a dobrar; renovação dá +1", async () => {
    await enviar(evento("invoice.paid", fatura("in_c1", "cus_c1", "sub_c1", "subscription_create")));
    const sub = await uma("stripe_subscriptions", { stripe_subscription_id: "sub_c1" });
    assert.equal(sub.status, "active");
    assert.equal(sub.price_id, PRECO_CASO_PROTECAO);
    assert.equal(sub.ultimo_pagamento_estado, "pago");
    assert.equal((await uma("user_access", { user_id: U1 })).case_credits, 1, "mesma fatura: sem crédito novo");

    await enviar(evento("invoice.paid", fatura("in_c1b", "cus_c1", "sub_c1", "subscription_cycle")));
    assert.equal((await uma("user_access", { user_id: U1 })).case_credits, 2);
  });

  // 3 + 7 ---------------------------------------------------------------------
  test("3. Avulso com conta: caso disponível de origem checkout", async () => {
    const s = sessao("cs_a2", {
      mode: "payment",
      customer: "cus_a2",
      payment_intent: "pi_a2",
      amount_total: 1499,
      customer_details: { email: "u2@contrato.test" },
      metadata: { plano: "avulso", user_id: U2 },
    });
    await enviar(evento("checkout.session.completed", s));
    const g = await uma("case_credit_grants", { origem: "checkout:cs_a2" });
    assert.equal(g.estado, "disponivel");
    const ua = await uma("user_access", { user_id: U2 });
    assert.equal(ua.case_credits, 1);
    assert.equal(ua.avulso_credits, 1);
    assert.equal(ua.subscription_plan, "none");
  });

  test("7. reembolso total do Avulso: pagamento reembolsado (final) e caso retirado", async () => {
    stripe.pagamentos.set("pi_a2", { refunded: true });
    await enviar(evento("refund.updated", { id: "re_manual", object: "refund", status: "succeeded", payment_intent: "pi_a2", metadata: {} }));
    assert.equal((await uma("stripe_payments", { stripe_session_id: "cs_a2" })).estado, "reembolsado");
    assert.equal((await uma("case_credit_grants", { origem: "checkout:cs_a2" })).estado, "reembolsado");
    const ua = await uma("user_access", { user_id: U2 });
    assert.equal(ua.case_credits, 0);
    assert.equal(ua.avulso_credits, 0);
  });

  // 4 -------------------------------------------------------------------------
  test("4. pedido de caso pago com Avulso: o caso é criado e gasta o caso dessa compra", async () => {
    const { data: pedido, error } = await admin
      .from("pedidos_caso")
      .insert({
        user_id: U3,
        estado: "aguarda_pagamento",
        nome: "Cliente Contrato",
        sector: "Telecomunicações",
        empresa: "Operador",
        problema_tipo: "Faturação",
        momento_cliente: "ja_reclamei",
        autorizacao: true,
        pedido_confirmado_em: new Date().toISOString(),
        plano_escolhido: "avulso",
        checkout_session_id: "cs_p3",
      })
      .select("id")
      .single();
    assert.equal(error, null, error?.message);
    const s = sessao("cs_p3", {
      mode: "payment",
      customer: "cus_p3",
      payment_intent: "pi_p3",
      amount_total: 1499,
      customer_details: { email: "u3@contrato.test" },
      metadata: { plano: "avulso", user_id: U3, pedido_id: pedido.id },
    });
    const evt = evento("checkout.session.completed", s);
    await enviar(evt);
    assert.equal(resultados.get(evt.id), "pagamento_confirmado_caso_criado");
    const p = await uma("pedidos_caso", { id: pedido.id });
    assert.equal(p.estado, "convertido");
    assert.ok(p.caso_id);
    assert.equal(await contar("casos", { utilizador_id: U3 }), 1);
    assert.equal((await uma("case_credit_grants", { origem: "checkout:cs_p3" })).estado, "consumido");
    assert.equal((await uma("user_access", { user_id: U3 })).case_credits, 0);
  });

  // 5 + 6 ---------------------------------------------------------------------
  test("5. customer.subscription.updated: cancelamento agendado sincronizado e auditado", async () => {
    const s = stripe.subs.get("sub_c1");
    s.cancel_at_period_end = true;
    await enviar(evento("customer.subscription.updated", { ...s }));
    assert.equal((await uma("user_access", { user_id: U1 })).cancel_at_period_end, true);
    assert.equal((await uma("stripe_subscriptions", { stripe_subscription_id: "sub_c1" })).cancel_at_period_end, true);
    const c = await uma("subscricao_cancelamentos", { stripe_subscription_id: "sub_c1" });
    assert.equal(c.terminado_em, null);
  });

  test("6. customer.subscription.deleted: conta sem subscrição, casos congelados, fim auditado", async () => {
    const s = { ...stripe.subs.get("sub_c1"), status: "canceled" };
    stripe.subs.set("sub_c1", s);
    await enviar(evento("customer.subscription.deleted", s));
    const ua = await uma("user_access", { user_id: U1 });
    assert.equal(ua.subscription_plan, "none");
    assert.equal(ua.subscription_status, "canceled");
    assert.equal((await uma("stripe_subscriptions", { stripe_subscription_id: "sub_c1" })).status, "canceled");
    assert.ok((await contar("case_credit_freezes", { user_id: U1 })) >= 1, "casos da subscrição congelados");
    assert.ok((await uma("subscricao_cancelamentos", { stripe_subscription_id: "sub_c1" })).terminado_em);
  });

  // 8 -------------------------------------------------------------------------
  test("8. conversão Avulso → Proteção: convertida, reembolso de 10,00 € criado uma vez, caso do Avulso convertido", async () => {
    sessao("cs_a4", {
      mode: "payment",
      customer: "cus_a4",
      payment_intent: "pi_a4",
      amount_total: 1499,
      customer_details: { email: "u4@contrato.test" },
      metadata: { plano: "avulso", user_id: U4 },
    });
    await enviar(evento("checkout.session.completed", stripe.sessoes.get("cs_a4")));
    const pagamento = await uma("stripe_payments", { stripe_session_id: "cs_a4" });
    const { data: conv, error } = await admin
      .from("conversoes_avulso")
      .insert({
        stripe_payment_id: pagamento.id,
        user_id: U4,
        plano_destino: "protecao",
        checkout_session_id: "cs_conv4",
        valor_avulso_centimos: 1499,
        valor_primeira_mensalidade_centimos: 499,
        refund_montante_centimos: 1000,
      })
      .select("id")
      .single();
    assert.equal(error, null, error?.message);

    subscricao("sub_conv4", "cus_a4", PRECO_PROTECAO, { metadata: { conversao_id: conv.id } });
    const s = sessao("cs_conv4", {
      mode: "subscription",
      customer: "cus_a4",
      subscription: "sub_conv4",
      invoice: "in_conv4",
      amount_total: 0,
      payment_status: "no_payment_required",
      customer_details: { email: "u4@contrato.test" },
      metadata: { plano: "assinatura", upgrade: "true", user_id: U4, conversao_id: conv.id },
    });
    await enviar(evento("checkout.session.completed", s));
    await enviar(evento("invoice.paid", fatura("in_conv4", "cus_a4", "sub_conv4", "subscription_create")));
    await enviar(evento("checkout.session.completed", s)); // reenvio com novo event.id

    const c = await uma("conversoes_avulso", { id: conv.id });
    assert.equal(c.estado, "convertido");
    assert.ok(c.refund_id);
    assert.equal(stripe.reembolsos.length, 1, "um único reembolso");
    assert.equal(stripe.reembolsos[0].amount, 1000);
    assert.equal((await uma("case_credit_grants", { origem: "checkout:cs_a4" })).estado, "convertido");
    const ua = await uma("user_access", { user_id: U4 });
    assert.equal(ua.subscription_plan, "protecao");
    assert.equal(ua.case_credits, 0);
    assert.equal(ua.avulso_credits, 0);
  });

  // 9 -------------------------------------------------------------------------
  test("9. pagamento sem conta: fica registado sem conta, lembretes a 1 e 3 dias, avisos únicos", async () => {
    subscricao("sub_pub9", "cus_pub9", PRECO_CASO_PROTECAO);
    const s = sessao("cs_pub9", {
      mode: "subscription",
      customer: "cus_pub9",
      subscription: "sub_pub9",
      invoice: "in_pub9",
      amount_total: 0,
      payment_status: "no_payment_required",
      customer_details: { email: "pessoa9@contrato.test" },
      metadata: { plano: "assinatura" },
    });
    const evt = evento("checkout.session.completed", s);
    await enviar(evt);
    assert.equal(resultados.get(evt.id), "pagamento_confirmado_sem_conta");
    await enviar(evento("checkout.session.completed", s)); // reenvio: novo event.id
    const fat = evento("invoice.paid", fatura("in_pub9", "cus_pub9", "sub_pub9", "subscription_create"));
    await enviar(fat);
    assert.equal(resultados.get(fat.id), "pago_sem_conta_ligada");

    assert.equal((await uma("stripe_payments", { stripe_session_id: "cs_pub9" })).user_id, null);
    await uma("stripe_subscriptions", { stripe_subscription_id: "sub_pub9" });
    const c = await uma("compras_sem_conta", { stripe_session_id: "cs_pub9" });
    assert.equal(c.plano, "caso_protecao");
    assert.equal(c.resolvido_em, null);
    assert.equal(emailsAdmin("Compra paga sem conta associada").length, 1, "aviso interno imediato, uma vez");
    const cliente = emails.filter((e) => e.destinatario === "pessoa9@contrato.test");
    assert.equal(cliente.length, 1);
    assert.match(cliente[0].html, /\/criar-conta\?session_id=cs_pub9/);

    // Lembretes (funções SQL reais): 1 dia, repetição, 3 dias, repetição.
    const lembretes = dependenciasLembretes({ enviarEmail });
    const base = new Date(c.confirmado_em).getTime();
    const em = (h) => new Date(base + h * 3600 * 1000);
    const antes = emails.length;
    assert.deepEqual(await enviarLembretesCompraSemConta(lembretes, SITE, em(25)), { enviados: 1, avisosAdmin: 0 });
    assert.deepEqual(await enviarLembretesCompraSemConta(lembretes, SITE, em(26)), { enviados: 0, avisosAdmin: 0 });
    const paralelo = await Promise.all([1, 2, 3].map(() => enviarLembretesCompraSemConta(lembretes, SITE, em(73))));
    assert.equal(paralelo.reduce((t, r) => t + r.enviados, 0), 1, "3 dias: sai uma vez, mesmo em paralelo");
    assert.equal(emails.length - antes, 3, "2 lembretes ao cliente + 1 aviso interno aos 3 dias");
    assert.equal(emailsAdmin("Compra paga continua sem conta").length, 1);
    const linha = await uma("compras_sem_conta", { stripe_session_id: "cs_pub9" });
    assert.ok(linha.lembrete_1d_em && linha.lembrete_3d_em);
  });

  // 10 + 11 -------------------------------------------------------------------
  test("10. associação posterior a uma conta com o mesmo e-mail confirmado: liga e aplica uma vez", async () => {
    U9 = await criarUtilizador("pessoa9@contrato.test");
    const r = await associarCompraAConta(
      "cs_pub9",
      dependenciasAssociacao(contaDe(U9, "pessoa9@contrato.test"), { stripe: fakeStripe, enviarEmail }),
    );
    assert.equal(r, "associada");
    assert.equal((await uma("stripe_payments", { stripe_session_id: "cs_pub9" })).user_id, U9);
    const a = await uma("associacoes_compra", { stripe_session_id: "cs_pub9" });
    assert.equal(a.user_id, U9);
    assert.equal(a.resultado, "associada");
    const c = await uma("compras_sem_conta", { stripe_session_id: "cs_pub9" });
    assert.equal(c.resolucao, "associada");
    const ua = await uma("user_access", { user_id: U9 });
    assert.equal(ua.subscription_plan, "caso_protecao");
    assert.equal(ua.stripe_subscription_id, "sub_pub9");
    assert.equal(ua.stripe_customer_id, "cus_pub9");
    assert.equal(ua.case_credits, 1);

    // Depois da associação: nenhum lembrete.
    const lembretes = dependenciasLembretes({ enviarEmail });
    const r2 = await enviarLembretesCompraSemConta(lembretes, SITE, new Date(Date.now() + 10 * 86400 * 1000));
    assert.equal(r2.enviados, 0);

    // Renovação da subscrição associada: aplica-se à conta (Customer ligado).
    await enviar(evento("invoice.paid", fatura("in_pub9b", "cus_pub9", "sub_pub9", "subscription_cycle")));
    assert.equal((await uma("user_access", { user_id: U9 })).case_credits, 2);
  });

  test("11. reclamar a mesma compra duas vezes: outra conta recusada; a mesma conta é idempotente; sem créditos a dobrar", async () => {
    // Direto à função SQL (a camada TS já recusaria pelo e-mail).
    assert.equal(
      await rpc("reclamar_compra_sem_conta", {
        p_session_id: "cs_pub9",
        p_user_id: U10,
        p_customer_id: "cus_pub9",
        p_subscription_id: "sub_pub9",
        p_subscricao_existente: null,
      }),
      "outra_conta",
    );
    const r = await associarCompraAConta(
      "cs_pub9",
      dependenciasAssociacao(contaDe(U9, "pessoa9@contrato.test"), { stripe: fakeStripe, enviarEmail }),
    );
    assert.equal(r, "ja_associada");
    assert.equal(await contar("associacoes_compra", { stripe_session_id: "cs_pub9" }), 1);
    assert.equal((await uma("user_access", { user_id: U9 })).case_credits, 2);
    assert.equal((await uma("stripe_payments", { stripe_session_id: "cs_pub9" })).user_id, U9);

    // A base de dados recusa sozinha um e-mail diferente e IDs Stripe trocados.
    subscricao("sub_pub11", "cus_pub11", PRECO_PROTECAO);
    const s11 = sessao("cs_pub11", {
      mode: "subscription",
      customer: "cus_pub11",
      subscription: "sub_pub11",
      invoice: "in_pub11",
      amount_total: 499,
      customer_details: { email: "u11@contrato.test" },
      metadata: { plano: "assinatura" },
    });
    await enviar(evento("checkout.session.completed", s11));
    const base = { p_session_id: "cs_pub11", p_customer_id: "cus_pub11", p_subscription_id: "sub_pub11", p_subscricao_existente: null };
    assert.equal(await rpc("reclamar_compra_sem_conta", { ...base, p_user_id: U10 }), "email_diferente");
    assert.equal(await rpc("reclamar_compra_sem_conta", { ...base, p_user_id: U11, p_subscription_id: "sub_outra" }), "dados_diferentes");

    // Dois pedidos em simultâneo da conta certa: um associa, o outro vê que já está.
    const paralelo = await Promise.all([1, 2].map(() => rpc("reclamar_compra_sem_conta", { ...base, p_user_id: U11 })));
    assert.deepEqual(paralelo.sort(), ["associada", "ja_associada"]);
    assert.equal(await contar("associacoes_compra", { stripe_session_id: "cs_pub11" }), 1);

    // Prova só de inserção.
    const { error } = await admin.from("associacoes_compra").update({ resultado: "associada" }).eq("stripe_session_id", "cs_pub11");
    assert.ok(error, "associacoes_compra não pode ser alterada");
  });

  // 12 ------------------------------------------------------------------------
  test("12. reenvio do mesmo evento Stripe (mesmo event.id): duplicado, nada muda", async () => {
    const s = stripe.sessoes.get("cs_pub9");
    const evt = evento("checkout.session.completed", s);
    await enviar(evt);
    const antes = {
      grants: await contar("case_credit_grants", { user_id: U9 }),
      pagamentos: await contar("stripe_payments", { stripe_session_id: "cs_pub9" }),
      emails: emails.length,
    };
    const r = await enviar(evt);
    assert.equal(r.corpo.duplicado, true);
    const fat = evento("invoice.paid", fatura("in_pub9b", "cus_pub9", "sub_pub9", "subscription_cycle"));
    await enviar(fat);
    assert.equal((await enviar(fat)).corpo.duplicado, true);
    assert.equal(await contar("case_credit_grants", { user_id: U9 }), antes.grants);
    assert.equal(await contar("stripe_payments", { stripe_session_id: "cs_pub9" }), antes.pagamentos);
    assert.equal(emails.length, antes.emails);
    assert.equal((await uma("user_access", { user_id: U9 })).case_credits, 2);
  });

  // 13 ------------------------------------------------------------------------
  test("13. conta que já tem o plano: a compra é bloqueada, e uma segunda subscrição nunca é aplicada por cima", async () => {
    // a) Decisão de compra com o estado real da conta.
    const ua = await uma("user_access", { user_id: U9 });
    assert.deepEqual(
      decidirCompra({ plano: "caso_protecao", autenticado: true, acesso: calcularAcesso(ua), subscricoesAtivasStripe: [] }),
      { acao: "ja_tem_subscricao", mesmoPlano: true },
    );

    // b) Mesmo assim comprou pelo fluxo público (ex.: sem sessão) e pede a associação.
    subscricao("sub_pub13", "cus_pub13", PRECO_CASO_PROTECAO);
    sessao("cs_pub13", {
      mode: "subscription",
      customer: "cus_pub13",
      subscription: "sub_pub13",
      invoice: "in_pub13",
      amount_total: 0,
      payment_status: "no_payment_required",
      customer_details: { email: "pessoa9@contrato.test" },
      metadata: { plano: "assinatura" },
    });
    await enviar(evento("checkout.session.completed", stripe.sessoes.get("cs_pub13")));
    const deps9 = dependenciasAssociacao(contaDe(U9, "pessoa9@contrato.test"), { stripe: fakeStripe, enviarEmail });
    assert.equal(await associarCompraAConta("cs_pub13", deps9), "duplicado_por_rever");
    assert.equal(await associarCompraAConta("cs_pub13", deps9), "ja_em_revisao");
    const depois = await uma("user_access", { user_id: U9 });
    assert.equal(depois.stripe_subscription_id, "sub_pub9", "a subscrição existente continua ligada");
    assert.equal(depois.case_credits, 2, "sem casos da subscrição duplicada");
    assert.equal((await uma("stripe_payments", { stripe_session_id: "cs_pub13" })).user_id, null);
    const d = await uma("subscricoes_duplicadas", { nova_subscription_id: "sub_pub13" });
    assert.equal(d.estado, "por_rever");
    assert.equal(d.subscricao_existente_id, "sub_pub9");
    assert.equal(d.origem, "associacao");
    assert.equal((await uma("associacoes_compra", { stripe_session_id: "cs_pub13" })).resultado, "duplicado_por_rever");
    assert.equal((await uma("compras_sem_conta", { stripe_session_id: "cs_pub13" })).resolucao, "duplicado_por_rever");

    // c) Checkout com sessão para a mesma conta (ex.: dois separadores): o webhook não aplica por cima.
    subscricao("sub_dup13", "cus_pub9", PRECO_CASO_PROTECAO);
    const s = sessao("cs_dup13", {
      mode: "subscription",
      customer: "cus_pub9",
      subscription: "sub_dup13",
      invoice: "in_dup13",
      amount_total: 799,
      customer_details: { email: "pessoa9@contrato.test" },
      metadata: { plano: "assinatura", upgrade: "false", user_id: U9 },
    });
    const evt = evento("checkout.session.completed", s);
    await enviar(evt);
    assert.equal(resultados.get(evt.id), "pagamento_confirmado_subscricao_duplicada");
    const fat = evento("invoice.paid", fatura("in_dup13", "cus_pub9", "sub_dup13", "subscription_create"));
    await enviar(fat);
    assert.equal(resultados.get(fat.id), "pago_subscricao_duplicada");
    const fim = await uma("user_access", { user_id: U9 });
    assert.equal(fim.stripe_subscription_id, "sub_pub9");
    assert.equal(fim.case_credits, 2);
    assert.equal((await uma("subscricoes_duplicadas", { nova_subscription_id: "sub_dup13" })).origem, "checkout");
    assert.equal(emailsAdmin("Subscrição duplicada por rever").length, 2, "um aviso por subscrição duplicada");

    // Nada cancelado nem reembolsado automaticamente.
    assert.deepEqual(stripe.cancelamentos, []);
    assert.equal(stripe.reembolsos.length, 1, "só o reembolso da conversão do cenário 8");
  });

  test("permissões: anon e clientes autenticados não executam as funções novas nem leem as tabelas", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    assert.ok(process.env.CONTRATO_ANON_KEY, "chave anon local em falta");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const args = { p_session_id: "cs_pub11", p_user_id: U10, p_customer_id: null, p_subscription_id: null, p_subscricao_existente: null };
    assert.ok((await anon.rpc("reclamar_compra_sem_conta", args)).error, "anon não reclama compras");
    assert.ok((await anon.rpc("conta_existe_com_email", { p_email: "u1@contrato.test" })).error, "anon não pergunta por e-mails");

    // Cliente autenticado (U10): sem execução das funções e sem leitura das tabelas de operação.
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: "u10@contrato.test" });
    const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: erroOtp } = await cliente.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    assert.equal(erroOtp, null, erroOtp?.message);
    assert.ok((await cliente.rpc("reclamar_compra_sem_conta", args)).error, "cliente não reclama pela API");
    assert.ok((await cliente.rpc("reservar_lembrete_compra", { p_session_id: "cs_pub9", p_marco: "1d" })).error);
    for (const tabela of ["compras_sem_conta", "associacoes_compra", "subscricoes_duplicadas"]) {
      const { data } = await cliente.from(tabela).select("*");
      assert.deepEqual(data ?? [], [], `${tabela}: o cliente não vê linhas`);
    }
  });
});
