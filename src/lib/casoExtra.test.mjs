// Testes do Caso Extra — `npm test`. Regras de direito, "Casos deste mês",
// modalidades do pedido, validação do pedido de compra e parâmetros do
// Checkout. O webhook (crédito, idempotência, renovação, cancelamento) está
// em src/lib/stripe/webhook.test.mjs; a base de dados em
// supabase/tests/database/creditos_caso.test.sql.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { calcularAcesso } from "./acesso.ts";
import {
  casosAcumulados,
  casosDoMes,
  direitoCasoExtra,
  elegivelCasoExtra,
  subscricaoStripeConfirmaCasoExtra,
  textoUtilizacaoMes,
} from "./casoExtra.ts";
import { lerPedidoCompra } from "./consentimentoCompra.ts";
import { entradaDoPedido, opcoesDoPedido } from "./pedidoCaso.ts";
import { CASO_EXTRA, PLANOS, formatarPreco } from "./planos.ts";
import { parametrosCheckoutCasoExtra } from "./stripe/casoExtra.ts";

const FIM_PERIODO = "2026-11-05T10:00:00.000Z";

function conta(extra = {}) {
  return calcularAcesso({
    subscription_plan: "caso_protecao",
    subscription_status: "active",
    case_credits: 0,
    avulso_credits: 0,
    current_period_end: FIM_PERIODO,
    cancel_at_period_end: false,
    ...extra,
  });
}

describe("preço do Caso Extra", () => {
  test("11,99 € em vez dos 14,99 € do Avulso (cerca de 20%)", () => {
    assert.equal(CASO_EXTRA.precoCentimos, 1199);
    assert.equal(CASO_EXTRA.precoReferenciaCentimos, PLANOS.avulso.precoCentimos);
    assert.equal(formatarPreco(CASO_EXTRA.precoReferenciaCentimos), "14,99 €");
    assert.equal(formatarPreco(CASO_EXTRA.precoCentimos), "11,99 €");
    const desconto = 1 - CASO_EXTRA.precoCentimos / CASO_EXTRA.precoReferenciaCentimos;
    assert.ok(Math.abs(desconto - CASO_EXTRA.descontoPercentagem / 100) < 0.005);
  });
});

describe("cenário 1 — subscritor ainda com o caso do mês", () => {
  test("pode criar o caso normalmente e não vê o Caso Extra", () => {
    const acesso = conta({ case_credits: 1 });
    assert.equal(acesso.podeCriarCaso, true);
    assert.equal(elegivelCasoExtra(acesso), false);
    assert.deepEqual(direitoCasoExtra(acesso), { ok: false, motivo: "tem_casos_disponiveis" });
    const mes = casosDoMes(acesso);
    assert.equal(mes.utilizado, false);
    assert.equal(textoUtilizacaoMes(mes), "0 de 1 utilizado");
    const opcoes = opcoesDoPedido(acesso, true);
    assert.equal(opcoes.usarCasoDisponivel, true);
    assert.equal(opcoes.casoExtra, false);
    assert.equal(entradaDoPedido(acesso, true), "usar_caso");
  });

  test("casos mensais acumulados: o deste mês conta como por usar", () => {
    const mes = casosDoMes(conta({ case_credits: 3 }));
    assert.equal(textoUtilizacaoMes(mes), "0 de 1 utilizado");
    assert.equal(casosAcumulados(mes), 2);
  });

  test("Caso Extra já pago e por usar: usa-o, não se vende outro", () => {
    const acesso = conta({ case_credits: 1, avulso_credits: 1 });
    assert.equal(acesso.casosSubscricao, 0);
    assert.equal(acesso.casosComprados, 1);
    assert.equal(casosDoMes(acesso).utilizado, true);
    assert.equal(elegivelCasoExtra(acesso), false);
    assert.equal(opcoesDoPedido(acesso, true).usarCasoDisponivel, true);
  });
});

describe("cenário 2 — subscritor que já usou o caso do mês", () => {
  test("limite atingido + data real do próximo ciclo + Caso Extra a 11,99 €", () => {
    const acesso = conta();
    assert.equal(acesso.podeCriarCaso, false);
    assert.equal(elegivelCasoExtra(acesso), true);
    const mes = casosDoMes(acesso);
    assert.equal(mes.utilizado, true);
    assert.equal(textoUtilizacaoMes(mes), "1 de 1 utilizado");
    // A data é o fim do período pago gravado a partir do Stripe — não "daqui a 30 dias".
    assert.equal(mes.proximoCasoEm, FIM_PERIODO);
    assert.equal(mes.subscricaoTerminaEm, null);
    const opcoes = opcoesDoPedido(acesso, true);
    assert.deepEqual(opcoes, { usarCasoDisponivel: false, casoExtra: true, modalidades: [] });
    assert.equal(entradaDoPedido(acesso, true), "caso_extra");
  });

  test("cancelamento agendado: continua subscritor, sem data de próximo caso", () => {
    const acesso = conta({ cancel_at_period_end: true });
    assert.equal(elegivelCasoExtra(acesso), true);
    const mes = casosDoMes(acesso);
    assert.equal(mes.proximoCasoEm, null);
    assert.equal(mes.subscricaoTerminaEm, FIM_PERIODO);
  });

  test("Caso Extra ainda não configurado no Stripe: fica como antes (Avulso)", () => {
    const acesso = conta();
    assert.deepEqual(opcoesDoPedido(acesso, false), { usarCasoDisponivel: false, casoExtra: false, modalidades: ["avulso"] });
    assert.equal(entradaDoPedido(acesso, false), "so_avulso");
  });
});

describe("cenário 10 — sem direito ao desconto", () => {
  const casos = [
    ["Proteção (não inclui casos)", { subscription_plan: "protecao" }, "sem_caso_protecao"],
    ["sem subscrição (Avulso comprado antes)", { subscription_plan: "none", subscription_status: "canceled" }, "sem_caso_protecao"],
    ["pagamento em atraso", { subscription_status: "past_due" }, "subscricao_nao_ativa"],
    ["subscrição suspensa", { subscription_status: "unpaid" }, "subscricao_nao_ativa"],
  ];
  for (const [nome, extra, motivo] of casos) {
    test(nome, () => {
      assert.deepEqual(direitoCasoExtra(conta(extra)), { ok: false, motivo });
      assert.equal(opcoesDoPedido(conta(extra), true).casoExtra, false);
    });
  }

  test("conta sem compras: sem Caso Extra", () => {
    assert.equal(elegivelCasoExtra(calcularAcesso(null)), false);
    assert.equal(casosDoMes(calcularAcesso(null)), null);
  });

  test("subscrição no Stripe tem de ser ativa, Caso + Proteção e do Customer da conta", () => {
    const ok = { status: "active", customerId: "cus_a", plano: "caso_protecao" };
    assert.equal(subscricaoStripeConfirmaCasoExtra(ok, "cus_a"), true);
    assert.equal(subscricaoStripeConfirmaCasoExtra({ ...ok, customerId: "cus_outro" }, "cus_a"), false);
    assert.equal(subscricaoStripeConfirmaCasoExtra({ ...ok, status: "canceled" }, "cus_a"), false);
    assert.equal(subscricaoStripeConfirmaCasoExtra({ ...ok, status: "past_due" }, "cus_a"), false);
    assert.equal(subscricaoStripeConfirmaCasoExtra({ ...ok, plano: "protecao" }, "cus_a"), false);
    assert.equal(subscricaoStripeConfirmaCasoExtra(null, "cus_a"), false);
    assert.equal(subscricaoStripeConfirmaCasoExtra(ok, null), false);
  });

  test("pedido de compra manipulado: recusado antes de gravar ou abrir o Checkout", () => {
    const base = {
      plano: "avulso",
      fluxo: "caso_extra",
      origem: "tratar_caso",
      pedido_id: "20000000-0000-4000-a000-000000000001",
      aceita_termos: "sim",
      pede_inicio_imediato: "sim",
    };
    const ler = (extra) => lerPedidoCompra((c) => ({ ...base, ...extra })[c]);
    assert.equal(ler({}).ok, true);
    assert.equal(ler({}).pedido.pedidoId, base.pedido_id);
    assert.deepEqual(ler({ plano: "caso_protecao" }), { ok: false, erro: "dados_invalidos" });
    assert.deepEqual(ler({ plano: "caso_extra" }), { ok: false, erro: "dados_invalidos" });
    assert.deepEqual(ler({ pedido_id: undefined }), { ok: false, erro: "dados_invalidos" });
    assert.deepEqual(ler({ pedido_id: "../outro" }), { ok: false, erro: "dados_invalidos" });
    assert.deepEqual(ler({ origem: "portal" }), { ok: false, erro: "dados_invalidos" });
    assert.deepEqual(ler({ aceita_termos: undefined }), { ok: false, erro: "termos" });
    // O browser não escolhe preço, Price ID, conta nem desconto: nada disso é lido.
    const comExtras = ler({ preco: "1", price_id: "price_x", user_id: "outra-conta", desconto: "100" });
    assert.deepEqual(Object.keys(comExtras.pedido).sort(), ["fluxo", "origem", "pedidoId", "plano"]);
  });
});

describe("cenário 5 — Checkout com a conta e a sessão atuais", () => {
  const params = parametrosCheckoutCasoExtra({
    precoId: "price_caso_extra",
    customerId: "cus_existente",
    userId: "00000000-0000-4000-a000-00000000000a",
    subscriptionId: "sub_ativa",
    pedidoId: "20000000-0000-4000-a000-000000000001",
    siteUrl: "https://portal.dolado.pt",
    metadataConsentimento: { consentimento_compra_id: "c1", produto: "avulso", tipo_compra: "caso_extra" },
  });

  test("usa o Customer Stripe da conta e nunca cria outro", () => {
    assert.equal(params.customer, "cus_existente");
    assert.equal(params.customer_creation, undefined);
    assert.equal(params.customer_email, undefined);
  });

  test("pagamento único com o Price do Caso Extra, sem códigos promocionais", () => {
    assert.equal(params.mode, "payment");
    assert.deepEqual(params.line_items, [{ price: "price_caso_extra", quantity: 1 }]);
    assert.equal(params.allow_promotion_codes, undefined);
    assert.equal(params.discounts, undefined);
    assert.equal(params.subscription_data, undefined);
  });

  test("regressa à área com sessão do pedido — nunca a /criar-conta nem ao registo", () => {
    assert.equal(params.success_url, "https://portal.dolado.pt/tratar-caso/recebido?pedido=20000000-0000-4000-a000-000000000001");
    assert.equal(params.cancel_url, "https://portal.dolado.pt/tratar-caso/modalidade?pedido=20000000-0000-4000-a000-000000000001&cancelado=1");
    for (const url of [params.success_url, params.cancel_url]) {
      assert.doesNotMatch(url, /criar-conta|registo|associar-compra|entrar|login/);
    }
  });

  test("metadata identifica conta, tipo de compra, pedido e subscrição (também no pagamento)", () => {
    for (const m of [params.metadata, params.payment_intent_data.metadata]) {
      assert.equal(m.plano, "caso_extra");
      assert.equal(m.tipo, "extra_case");
      assert.equal(m.user_id, "00000000-0000-4000-a000-00000000000a");
      assert.equal(m.pedido_id, "20000000-0000-4000-a000-000000000001");
      assert.equal(m.stripe_subscription_id, "sub_ativa");
      assert.equal(m.consentimento_compra_id, "c1");
      assert.equal(m.tipo_compra, "caso_extra");
    }
  });
});

describe("Server Action do Caso Extra (código)", () => {
  const acoes = readFileSync(new URL("../app/actions/stripe.ts", import.meta.url), "utf8");
  const funcao = acoes.slice(acoes.indexOf("async function compraCasoExtra"), acoes.indexOf("async function checkoutPedidoCaso"));

  test("valida sessão, direito no servidor e a subscrição no Stripe antes de abrir o Checkout", () => {
    assert.match(funcao, /requireUser\(\)/);
    assert.match(funcao, /direitoCasoExtra\(acesso\)/);
    assert.match(funcao, /subscricaoStripeConfirmaCasoExtra\(/);
    assert.match(funcao, /casoExtraConfigurado\(\)/);
    assert.ok(funcao.indexOf("direitoCasoExtra") < funcao.indexOf("abrirCheckoutComConsentimento"));
    assert.ok(funcao.indexOf("subscricaoStripeConfirmaCasoExtra") < funcao.indexOf("abrirCheckoutComConsentimento"));
  });

  test("o preço vem do servidor e o pedido passa pela posse validada em checkoutPedidoCaso", () => {
    assert.match(funcao, /precoId: PRECO_CASO_EXTRA_ID/);
    assert.match(acoes, /pedido\.fluxo === "caso_extra"\s*\? await compraCasoExtra\(pedido, ctx\)/);
    assert.match(acoes, /pedido\.fluxo === "pedido_caso" \|\| pedido\.fluxo === "caso_extra"\s*\? await checkoutPedidoCaso\(pedido\)/);
  });

  test("sem direito, volta à modalidade — nunca cobra o Avulso em vez do Caso Extra", () => {
    assert.match(funcao, /erro=caso-extra-indisponivel/);
    assert.doesNotMatch(funcao, /PRECO_AVULSO_ID|compraAvulsoComConta/);
  });

  test("compraCasoExtra não é exportada (não é um endpoint público)", () => {
    assert.doesNotMatch(acoes, /export async function compraCasoExtra/);
  });
});
