// Gestão de Subscrição (cancelar no fim do período / manter) — `npm test`.
// Stripe e Supabase falsos, em memória.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, test } from "node:test";
import { MAX_MOTIVO_TEXTO, lerMotivo, manterSubscricao, pedirCancelamento } from "./gestaoSubscricao.ts";

const USER = "00000000-0000-4000-a000-00000000000a";
const FIM = "2026-10-30T10:00:00.000Z";

let estado;
let deps;

function criar(conta) {
  estado = {
    conta: conta && {
      subscription_plan: "caso_protecao",
      subscription_status: "active",
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      cancel_at_period_end: false,
      current_period_end: FIM,
      ...conta,
    },
    stripe: { cancel_at_period_end: false, customer: "cus_1", criadas: 0, cobrancas: 0, reembolsos: 0 },
    chamadasStripe: [],
    pedidos: [],
    reversoes: [],
  };
  deps = {
    async obterConta(userId) {
      assert.equal(userId, USER);
      return estado.conta ? { ...estado.conta } : null;
    },
    async definirCancelamentoNoFimDoPeriodo(subId, cancelar) {
      estado.chamadasStripe.push({ subId, cancelar });
      estado.stripe.cancel_at_period_end = cancelar;
      return { stripe_customer_id: estado.stripe.customer, status: "active", cancel_at_period_end: cancelar, current_period_end: FIM };
    },
    async gravarNaConta(userId, subId, dados) {
      assert.equal(subId, estado.conta.stripe_subscription_id);
      Object.assign(estado.conta, dados);
    },
    async registarPedido(dados) {
      estado.pedidos.push(dados);
    },
    async registarReversao(subId, em) {
      estado.reversoes.push({ subId, em });
    },
  };
}

beforeEach(() => criar({}));

describe("pedir cancelamento", () => {
  test("agenda para o fim do período, sem reembolso nem nova cobrança, e regista o pedido", async () => {
    const r = await pedirCancelamento(USER, { codigo: "preco", texto: null }, deps, new Date("2026-10-01T10:00:00Z"));
    assert.deepEqual(r, { ok: true, fim: FIM, jaEstava: false });
    assert.deepEqual(estado.chamadasStripe, [{ subId: "sub_1", cancelar: true }]);
    assert.equal(estado.conta.cancel_at_period_end, true);
    assert.equal(estado.conta.subscription_plan, "caso_protecao"); // mantém-se até ao fim
    assert.equal(estado.conta.subscription_status, "active");
    assert.equal(estado.stripe.reembolsos + estado.stripe.cobrancas, 0);
    assert.equal(estado.pedidos.length, 1);
    assert.equal(estado.pedidos[0].motivo.codigo, "preco");
    assert.equal(estado.pedidos[0].fimPrevisto, FIM);
    assert.equal(estado.pedidos[0].pedidoEm, "2026-10-01T10:00:00.000Z");
  });

  test("motivo opcional: sem resposta, o cancelamento avança igual", async () => {
    const r = await pedirCancelamento(USER, lerMotivo(null, ""), deps);
    assert.equal(r.ok, true);
    assert.deepEqual(estado.pedidos[0].motivo, { codigo: null, texto: null });
  });

  test("pedido repetido (duplo clique): não volta a chamar o Stripe nem regista outra vez", async () => {
    await pedirCancelamento(USER, lerMotivo(null, null), deps);
    const r = await pedirCancelamento(USER, lerMotivo(null, null), deps);
    assert.deepEqual(r, { ok: true, fim: FIM, jaEstava: true });
    assert.equal(estado.chamadasStripe.length, 1);
    assert.equal(estado.pedidos.length, 1);
  });

  test("Proteção também pode ser cancelada", async () => {
    criar({ subscription_plan: "protecao" });
    assert.equal((await pedirCancelamento(USER, lerMotivo(null, null), deps)).ok, true);
    assert.equal(estado.pedidos[0].plano, "protecao");
  });

  test("pagamento em atraso (past_due) também pode ser cancelado", async () => {
    criar({ subscription_status: "past_due" });
    assert.equal((await pedirCancelamento(USER, lerMotivo(null, null), deps)).ok, true);
  });

  for (const [nome, conta] of [
    ["sem linha em user_access (piloto / registo livre)", null],
    ["sem subscrição (só Avulso)", { subscription_plan: "none", subscription_status: null, stripe_subscription_id: null }],
    ["subscrição já terminada", { subscription_plan: "none", subscription_status: "canceled" }],
    ["subscrição por confirmar", { subscription_status: "incomplete" }],
  ]) {
    test(`${nome}: recusado, sem chamar o Stripe`, async () => {
      criar(conta);
      const r = await pedirCancelamento(USER, lerMotivo(null, null), deps);
      assert.deepEqual(r, { ok: false, erro: "sem_subscricao" });
      assert.equal(estado.chamadasStripe.length, 0);
    });
  }

  test("customer do Stripe diferente do da conta: não grava nada", async () => {
    estado.stripe.customer = "cus_outro";
    const r = await pedirCancelamento(USER, lerMotivo(null, null), deps);
    assert.deepEqual(r, { ok: false, erro: "subscricao_diferente" });
    assert.equal(estado.conta.cancel_at_period_end, false);
    assert.equal(estado.pedidos.length, 0);
  });
});

describe("manter subscrição (reverter o cancelamento)", () => {
  test("retira o agendamento na mesma subscrição, sem criar outra nem cobrar", async () => {
    await pedirCancelamento(USER, lerMotivo(null, null), deps);
    const r = await manterSubscricao(USER, deps, new Date("2026-10-02T10:00:00Z"));
    assert.equal(r.ok, true);
    assert.deepEqual(estado.chamadasStripe.at(-1), { subId: "sub_1", cancelar: false });
    assert.equal(estado.conta.cancel_at_period_end, false);
    assert.equal(estado.conta.stripe_subscription_id, "sub_1");
    assert.equal(estado.stripe.criadas + estado.stripe.cobrancas, 0);
    assert.deepEqual(estado.reversoes, [{ subId: "sub_1", em: "2026-10-02T10:00:00.000Z" }]);
  });

  test("sem cancelamento agendado: nada a reverter", async () => {
    const r = await manterSubscricao(USER, deps);
    assert.deepEqual(r, { ok: false, erro: "sem_cancelamento" });
    assert.equal(estado.chamadasStripe.length, 0);
  });

  test("depois do fim da subscrição já não é possível manter", async () => {
    criar({ subscription_plan: "none", subscription_status: "canceled", cancel_at_period_end: false });
    assert.deepEqual(await manterSubscricao(USER, deps), { ok: false, erro: "sem_subscricao" });
  });
});

describe("motivo", () => {
  test("códigos inválidos contam como sem resposta; texto limpo e limitado", () => {
    assert.deepEqual(lerMotivo("hack", "  "), { codigo: null, texto: null });
    assert.equal(lerMotivo("outro", "x".repeat(900)).texto.length, MAX_MOTIVO_TEXTO);
    assert.deepEqual(lerMotivo("pouco_uso", "  Pouco tempo  "), { codigo: "pouco_uso", texto: "Pouco tempo" });
  });
});

describe("o cancelamento normal não é livre resolução nem cancelamento imediato", () => {
  const acoes = readFileSync(new URL("../app/[idioma]/portal/subscricao/actions.ts", import.meta.url), "utf8");
  const pagina = readFileSync(new URL("../app/[idioma]/portal/subscricao/page.tsx", import.meta.url), "utf8");

  test("as ações do cliente só usam cancel_at_period_end: sem reembolsos nem cancelamento imediato", () => {
    assert.match(acoes, /cancel_at_period_end: cancelar/);
    assert.equal(/refunds|subscriptions\.(cancel|del)\(|invoice_now|prorate/.test(acoes), false);
  });

  test("o user_id vem da sessão, nunca do formulário", () => {
    assert.match(acoes, /requireUser\(\)/);
    assert.equal(/formData\.get\("(user_id|subscription|stripe)/.test(acoes), false);
  });

  test("a página não oferece cancelamento imediato com reembolso", () => {
    assert.equal(/imediat|reembols/i.test(pagina), false);
  });
});
