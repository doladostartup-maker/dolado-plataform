// Testes da lógica do webhook Stripe — `npm test` (node --test, sem
// dependências novas). As dependências são falsas e guardam o estado em
// memória, para verificar o efeito real de cada evento no acesso.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { processarEventoStripe } from "./webhook.ts";

const CUSTOMER = "cus_teste";
const SUB = "sub_teste";
const USER = "00000000-0000-4000-a000-00000000000a";
const PRECO = "price_1UJYnPBtJL9VeDPfnQTlVwsq";

function criarEstado() {
  return {
    eventos: new Map(), // event_id → estado
    pagamentos: new Map(), // session_id → linha
    subscricoes: new Map(), // subscription_id → linha
    acessos: new Map(), // user_id → { nivel_acesso, stripe_customer_id }
    emails: [],
    logs: [],
    // Snapshot devolvido pela "API Stripe" em invoice.*.
    stripeSubscricao: null,
    falharConcessaoUmaVez: false,
  };
}

function criarDependencias(estado) {
  const contasDoCustomer = (customerId) =>
    [...estado.acessos.entries()].filter(([, a]) => a.stripe_customer_id === customerId).map(([id]) => id);

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
    async gravarPagamento(dados) {
      estado.pagamentos.set(dados.stripe_session_id, {
        ...estado.pagamentos.get(dados.stripe_session_id),
        ...dados,
      });
    },
    async marcarPagamentosDaSubscricao(subId, novoEstado) {
      for (const p of estado.pagamentos.values()) {
        if (p.stripe_subscription_id === subId) p.estado = novoEstado;
      }
    },
    async obterSubscricaoStripe(subId) {
      assert.equal(subId, estado.stripeSubscricao.stripe_subscription_id);
      return estado.stripeSubscricao;
    },
    async gravarSubscricao(snapshot, estadoEm, cobranca) {
      const atual = estado.subscricoes.get(snapshot.stripe_subscription_id);
      const cob = cobranca ? { ultimo_pagamento_estado: cobranca.estado, ultimo_pagamento_em: cobranca.em } : {};
      if (atual && estadoEm < atual.estado_em) {
        Object.assign(atual, cob);
        return false;
      }
      estado.subscricoes.set(snapshot.stripe_subscription_id, { ...atual, ...snapshot, ...cob, estado_em: estadoEm });
      return true;
    },
    async temOutraSubscricaoAtiva(customerId, excluir) {
      return [...estado.subscricoes.values()].some(
        (s) =>
          s.stripe_customer_id === customerId &&
          s.stripe_subscription_id !== excluir &&
          ["active", "trialing", "past_due"].includes(s.status),
      );
    },
    async concederAssinatura({ userId, customerId }) {
      if (estado.falharConcessaoUmaVez) {
        estado.falharConcessaoUmaVez = false;
        throw Object.assign(new Error("falha simulada"), { code: "08006" });
      }
      if (userId) {
        estado.acessos.set(userId, {
          ...estado.acessos.get(userId),
          nivel_acesso: "assinatura",
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        });
        return 1;
      }
      const contas = contasDoCustomer(customerId);
      for (const id of contas) estado.acessos.get(id).nivel_acesso = "assinatura";
      return contas.length;
    },
    async degradarAssinatura({ userId, customerId }) {
      const contas = new Set([...(userId ? [userId] : []), ...(customerId ? contasDoCustomer(customerId) : [])]);
      let n = 0;
      for (const id of contas) {
        const a = estado.acessos.get(id);
        if (a?.nivel_acesso === "assinatura") {
          a.nivel_acesso = "avulso";
          n++;
        }
      }
      return n;
    },
    async enviarEmailsPagamentoConfirmado(email, plano) {
      estado.emails.push({ email, plano });
    },
    registar(linha) {
      estado.logs.push(linha);
    },
  };
}

let n = 0;
function evento(type, object, created = 1_700_000_000 + n) {
  n++;
  return { id: `evt_${n}`, type, created, data: { object } };
}

function sessao(extra = {}) {
  return {
    id: "cs_teste",
    object: "checkout.session",
    mode: "subscription",
    payment_status: "paid",
    status: "complete",
    customer: CUSTOMER,
    subscription: SUB,
    customer_details: { email: "cliente@teste.invalid" },
    amount_total: 799,
    currency: "eur",
    discounts: [],
    metadata: { plano: "assinatura", upgrade: "true", user_id: USER },
    ...extra,
  };
}

function subscricao(status, extra = {}) {
  return {
    id: SUB,
    object: "subscription",
    customer: CUSTOMER,
    status,
    cancel_at_period_end: false,
    items: {
      data: [{ price: { id: PRECO }, current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }],
    },
    ...extra,
  };
}

function fatura(extra = {}) {
  return {
    id: "in_teste",
    object: "invoice",
    customer: CUSTOMER,
    parent: { type: "subscription_details", subscription_details: { subscription: SUB } },
    ...extra,
  };
}

function snapshot(status) {
  return {
    stripe_subscription_id: SUB,
    stripe_customer_id: CUSTOMER,
    price_id: PRECO,
    status,
    cancel_at_period_end: false,
    current_period_start: "2023-11-14T22:13:20.000Z",
    current_period_end: "2023-12-14T22:13:20.000Z",
  };
}

let estado;
let deps;
const nivel = () => estado.acessos.get(USER)?.nivel_acesso;
const ultimoLog = () => estado.logs.at(-1);

beforeEach(() => {
  estado = criarEstado();
  deps = criarDependencias(estado);
  // Cliente com conta Avulso que está a fazer upgrade.
  estado.acessos.set(USER, { nivel_acesso: "avulso", stripe_customer_id: CUSTOMER });
});

describe("checkout.session.completed", () => {
  test("pagamento imediato: regista concluído, concede assinatura e envia e-mails", async () => {
    const r = await processarEventoStripe(evento("checkout.session.completed", sessao()), deps);
    assert.equal(r.status, 200);
    assert.equal(estado.pagamentos.get("cs_teste").estado, "concluido");
    assert.equal(nivel(), "assinatura");
    assert.equal(estado.emails.length, 1);
    assert.equal(ultimoLog().resultado, "pagamento_confirmado");
  });

  test("pagamento assíncrono ainda não confirmado: fica pendente, sem acesso nem e-mail", async () => {
    await processarEventoStripe(evento("checkout.session.completed", sessao({ payment_status: "unpaid" })), deps);
    assert.equal(estado.pagamentos.get("cs_teste").estado, "pendente");
    assert.equal(nivel(), "avulso");
    assert.equal(estado.emails.length, 0);
    assert.equal(ultimoLog().resultado, "pagamento_pendente");
  });

  test("cupão de 100% (no_payment_required) continua a contar como pago", async () => {
    await processarEventoStripe(
      evento("checkout.session.completed", sessao({ payment_status: "no_payment_required", amount_total: 0 })),
      deps,
    );
    assert.equal(estado.pagamentos.get("cs_teste").estado, "concluido");
    assert.equal(nivel(), "assinatura");
  });

  test("compra Avulso de raiz (sem conta): regista sem user_id e sem mexer em acessos", async () => {
    estado.acessos.clear();
    await processarEventoStripe(
      evento(
        "checkout.session.completed",
        sessao({ mode: "payment", subscription: null, metadata: { plano: "avulso" }, amount_total: 1499 }),
      ),
      deps,
    );
    const p = estado.pagamentos.get("cs_teste");
    assert.equal(p.estado, "concluido");
    assert.equal("user_id" in p, false, "não pode enviar user_id null (apagava a ligação de /criar-conta)");
    assert.equal(estado.acessos.size, 0);
    assert.equal(estado.emails.length, 1);
  });

  test("não apaga o user_id já ligado por /criar-conta", async () => {
    estado.pagamentos.set("cs_teste", { stripe_session_id: "cs_teste", user_id: USER, estado: "concluido" });
    await processarEventoStripe(
      evento("checkout.session.completed", sessao({ mode: "payment", subscription: null, metadata: { plano: "avulso" } })),
      deps,
    );
    assert.equal(estado.pagamentos.get("cs_teste").user_id, USER);
    assert.equal(estado.emails.length, 0, "já estava concluído: não repete e-mails");
  });

  test("modo incoerente com o plano: ignorado, sem acesso", async () => {
    await processarEventoStripe(evento("checkout.session.completed", sessao({ mode: "payment" })), deps);
    assert.equal(estado.pagamentos.size, 0);
    assert.equal(nivel(), "avulso");
    assert.equal(ultimoLog().resultado, "ignorado_modo_incoerente");
  });

  test("sessão sem plano (não é deste fluxo): ignorada com 200", async () => {
    const r = await processarEventoStripe(evento("checkout.session.completed", sessao({ metadata: {} })), deps);
    assert.equal(r.status, 200);
    assert.equal(estado.pagamentos.size, 0);
  });
});

describe("checkout.session.async_payment_succeeded", () => {
  test("confirma o pagamento pendente, concede acesso e envia e-mails uma vez", async () => {
    await processarEventoStripe(evento("checkout.session.completed", sessao({ payment_status: "unpaid" })), deps);
    const r = await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessao()), deps);
    assert.equal(r.status, 200);
    assert.equal(estado.pagamentos.get("cs_teste").estado, "concluido");
    assert.equal(nivel(), "assinatura");
    assert.equal(estado.emails.length, 1);
  });

  test("um completed pendente entregue depois não recua o estado concluído", async () => {
    await processarEventoStripe(evento("checkout.session.async_payment_succeeded", sessao()), deps);
    await processarEventoStripe(evento("checkout.session.completed", sessao({ payment_status: "unpaid" })), deps);
    assert.equal(estado.pagamentos.get("cs_teste").estado, "concluido");
    assert.equal(nivel(), "assinatura");
  });
});

describe("checkout.session.async_payment_failed", () => {
  test("regista a falha e não concede acesso", async () => {
    await processarEventoStripe(evento("checkout.session.completed", sessao({ payment_status: "unpaid" })), deps);
    await processarEventoStripe(
      evento("checkout.session.async_payment_failed", sessao({ payment_status: "unpaid" })),
      deps,
    );
    assert.equal(estado.pagamentos.get("cs_teste").estado, "falhado");
    assert.equal(nivel(), "avulso");
    assert.equal(estado.emails.length, 0);
  });

  test("retira acesso provisório dado antes da confirmação, sem apagar a conta", async () => {
    estado.acessos.get(USER).nivel_acesso = "assinatura"; // ex.: página de regresso do upgrade
    await processarEventoStripe(
      evento("checkout.session.async_payment_failed", sessao({ payment_status: "unpaid" })),
      deps,
    );
    assert.equal(nivel(), "avulso");
    assert.ok(estado.acessos.has(USER));
    assert.equal(ultimoLog().resultado, "pagamento_falhado_acesso_retirado");
  });

  test("mantém o acesso se o cliente tiver outra subscrição ativa", async () => {
    estado.acessos.get(USER).nivel_acesso = "assinatura";
    estado.subscricoes.set("sub_outra", { stripe_subscription_id: "sub_outra", stripe_customer_id: CUSTOMER, status: "active", estado_em: 0 });
    await processarEventoStripe(
      evento("checkout.session.async_payment_failed", sessao({ payment_status: "unpaid" })),
      deps,
    );
    assert.equal(nivel(), "assinatura");
  });
});

describe("invoice.*", () => {
  test("invoice.paid: sincroniza a subscrição, marca pago e garante acesso (renovação)", async () => {
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("invoice.paid", fatura()), deps);
    const s = estado.subscricoes.get(SUB);
    assert.equal(s.status, "active");
    assert.equal(s.price_id, PRECO);
    assert.equal(s.ultimo_pagamento_estado, "pago");
    assert.equal(nivel(), "assinatura");
    assert.equal(ultimoLog().resultado, "acesso_garantido");
    assert.equal(ultimoLog().subscription_id, SUB);
  });

  test("invoice.paid sem conta ligada ao customer: regista sem criar acesso", async () => {
    estado.acessos.clear();
    estado.stripeSubscricao = snapshot("active");
    await processarEventoStripe(evento("invoice.paid", fatura()), deps);
    assert.equal(estado.acessos.size, 0);
    assert.equal(ultimoLog().resultado, "pago_sem_conta_ligada");
  });

  test("invoice.paid de fatura sem subscrição: ignorada", async () => {
    await processarEventoStripe(evento("invoice.paid", fatura({ parent: null })), deps);
    assert.equal(estado.subscricoes.size, 0);
    assert.equal(ultimoLog().resultado, "ignorado_sem_subscricao");
  });

  test("invoice.payment_failed: regista a falha sem retirar acesso", async () => {
    estado.acessos.get(USER).nivel_acesso = "assinatura";
    estado.stripeSubscricao = snapshot("past_due");
    await processarEventoStripe(evento("invoice.payment_failed", fatura()), deps);
    assert.equal(estado.subscricoes.get(SUB).ultimo_pagamento_estado, "falhado");
    assert.equal(estado.subscricoes.get(SUB).status, "past_due");
    assert.equal(nivel(), "assinatura");
  });

  test("invoice.payment_action_required: regista sem tratar como pago", async () => {
    estado.stripeSubscricao = snapshot("incomplete");
    await processarEventoStripe(evento("invoice.payment_action_required", fatura()), deps);
    assert.equal(estado.subscricoes.get(SUB).ultimo_pagamento_estado, "acao_necessaria");
    assert.equal(nivel(), "avulso");
    assert.equal(ultimoLog().resultado, "acao_necessaria");
  });
});

describe("customer.subscription.*", () => {
  test("updated: sincroniza status, cancelamento, período, price e ids — sem conceder acesso", async () => {
    await processarEventoStripe(
      evento("customer.subscription.updated", subscricao("active", { cancel_at_period_end: true })),
      deps,
    );
    const s = estado.subscricoes.get(SUB);
    assert.deepEqual(
      [s.status, s.cancel_at_period_end, s.price_id, s.stripe_customer_id, s.stripe_subscription_id],
      ["active", true, PRECO, CUSTOMER, SUB],
    );
    assert.equal(s.current_period_start, "2023-11-14T22:13:20.000Z");
    assert.equal(s.current_period_end, "2023-12-14T22:13:20.000Z");
    assert.equal(nivel(), "avulso", "updated nunca concede acesso");
  });

  test("updated para unpaid: degrada para avulso", async () => {
    estado.acessos.get(USER).nivel_acesso = "assinatura";
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("unpaid")), deps);
    assert.equal(nivel(), "avulso");
  });

  test("updated antigo entregue fora de ordem não sobrepõe o mais recente", async () => {
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("active"), 2000), deps);
    await processarEventoStripe(evento("customer.subscription.updated", subscricao("incomplete"), 1000), deps);
    assert.equal(estado.subscricoes.get(SUB).status, "active");
    assert.equal(ultimoLog().resultado, "ignorado_evento_antigo");
  });

  test("deleted: degrada para avulso, marca pagamentos e não apaga nada", async () => {
    estado.acessos.get(USER).nivel_acesso = "assinatura";
    estado.pagamentos.set("cs_teste", { stripe_session_id: "cs_teste", stripe_subscription_id: SUB, estado: "concluido" });
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled")), deps);
    assert.equal(nivel(), "avulso");
    assert.ok(estado.acessos.has(USER));
    assert.equal(estado.pagamentos.get("cs_teste").estado, "assinatura_cancelada");
    assert.equal(estado.subscricoes.get(SUB).status, "canceled");
  });

  test("deleted de uma subscrição antiga não degrada quem tem outra ativa", async () => {
    estado.acessos.get(USER).nivel_acesso = "assinatura";
    estado.subscricoes.set("sub_nova", { stripe_subscription_id: "sub_nova", stripe_customer_id: CUSTOMER, status: "active", estado_em: 0 });
    await processarEventoStripe(evento("customer.subscription.deleted", subscricao("canceled")), deps);
    assert.equal(nivel(), "assinatura");
  });
});

describe("idempotência, eventos desconhecidos e erros", () => {
  test("o mesmo event.id só é processado uma vez", async () => {
    const e = evento("checkout.session.completed", sessao());
    await processarEventoStripe(e, deps);
    const r = await processarEventoStripe(e, deps);
    assert.equal(r.status, 200);
    assert.equal(r.corpo.duplicado, true);
    assert.equal(estado.emails.length, 1);
    assert.equal(ultimoLog().resultado, "duplicado");
  });

  test("evento desconhecido: 200, ignorado e sem gravar nada", async () => {
    const r = await processarEventoStripe(evento("customer.created", { id: CUSTOMER }), deps);
    assert.equal(r.status, 200);
    assert.equal(estado.eventos.size, 0);
    assert.equal(ultimoLog().resultado, "ignorado_sem_tratamento");
  });

  test("falha a meio: 500, liberta o evento e o reenvio aplica o acesso e envia o e-mail uma vez", async () => {
    // Primeira tentativa: a concessão falha antes de o pagamento ficar concluído.
    estado.falharConcessaoUmaVez = true;
    const e = evento("checkout.session.completed", sessao());
    const r1 = await processarEventoStripe(e, deps);
    assert.equal(r1.status, 500);
    assert.equal(estado.eventos.has(e.id), false, "evento libertado para o Stripe reenviar");
    assert.equal(ultimoLog().resultado, "erro");
    assert.equal(ultimoLog().erro_codigo, "08006");
    assert.notEqual(estado.pagamentos.get("cs_teste")?.estado, "concluido");
    assert.equal(estado.emails.length, 0);

    const r2 = await processarEventoStripe(e, deps);
    assert.equal(r2.status, 200);
    assert.equal(nivel(), "assinatura");
    assert.equal(estado.emails.length, 1, "e-mail enviado uma vez, no reenvio bem-sucedido");
  });

  test("os logs não levam e-mails nem payload", async () => {
    await processarEventoStripe(evento("checkout.session.completed", sessao()), deps);
    const texto = JSON.stringify(estado.logs);
    assert.equal(texto.includes("@"), false);
    assert.deepEqual(Object.keys(ultimoLog()).sort(), ["customer_id", "event_id", "evento", "resultado", "subscription_id"]);
  });
});
