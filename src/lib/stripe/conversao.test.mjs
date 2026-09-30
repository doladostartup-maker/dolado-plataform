// Conversão Avulso → assinatura: montantes, elegibilidade e Checkout — `npm test`.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CUPAO_CONVERSAO,
  calcularConversao,
  escolherAvulsoParaConversao,
  mensagemConversao,
  parametrosCheckoutConversao,
} from "./conversao.ts";

const USER = "00000000-0000-4000-a000-00000000000a";
const avulso = (extra = {}) => ({
  id: "pay_1",
  stripe_session_id: "cs_avulso",
  user_id: USER,
  plano: "avulso",
  estado: "concluido",
  valor_total_centimos: 1499,
  created_at: "2026-09-30T10:00:00Z",
  ...extra,
});

describe("montantes (sempre em cêntimos)", () => {
  test("Avulso → Proteção: 1.ª mensalidade 4,99 € coberta, reembolso 10,00 €", () => {
    assert.deepEqual(calcularConversao(1499, "protecao"), { valorAvulso: 1499, mensalidade: 499, reembolso: 1000 });
  });

  test("Avulso → Caso + Proteção: 1.ª mensalidade 7,99 € coberta, reembolso 7,00 €", () => {
    assert.deepEqual(calcularConversao(1499, "caso_protecao"), { valorAvulso: 1499, mensalidade: 799, reembolso: 700 });
  });

  test("nunca devolve mais do que foi pago: Avulso com cupão abaixo da mensalidade não converte", () => {
    assert.equal(calcularConversao(0, "protecao"), null);
    assert.equal(calcularConversao(499, "caso_protecao"), null);
    assert.deepEqual(calcularConversao(799, "caso_protecao"), { valorAvulso: 799, mensalidade: 799, reembolso: 0 });
  });
});

describe("elegibilidade do Avulso", () => {
  test("Avulso concluído é elegível", () => {
    assert.equal(escolherAvulsoParaConversao([avulso()], [], USER, "protecao")?.pagamento.id, "pay_1");
  });

  for (const estado of ["pendente", "falhado", "reembolsado"]) {
    test(`Avulso ${estado} não é elegível`, () => {
      assert.equal(escolherAvulsoParaConversao([avulso({ estado })], [], USER, "protecao"), null);
    });
  }

  test("Checkout abandonado (checkout_aberto): o Avulso continua elegível", () => {
    const aberta = { id: "conv_1", stripe_payment_id: "pay_1", estado: "checkout_aberto", checkout_session_id: "cs_antigo" };
    const r = escolherAvulsoParaConversao([avulso()], [aberta], USER, "caso_protecao");
    assert.equal(r?.pagamento.id, "pay_1");
    assert.equal(r?.conversao?.id, "conv_1", "reutiliza a mesma conversão (não cria outra)");
  });

  test("o mesmo Avulso já convertido é recusado", () => {
    const convertida = { id: "conv_1", stripe_payment_id: "pay_1", estado: "convertido", checkout_session_id: "cs_1" };
    assert.equal(escolherAvulsoParaConversao([avulso()], [convertida], USER, "protecao"), null);
  });

  test("só compras da própria conta", () => {
    assert.equal(escolherAvulsoParaConversao([avulso({ user_id: "outro" })], [], USER, "protecao"), null);
  });
});

describe("Checkout de conversão", () => {
  const params = parametrosCheckoutConversao({
    precoId: "price_1ULUUeBtJL9VeDPfWuDk5XCo",
    cliente: { customer: "cus_1" },
    conversaoId: "conv_1",
    userId: USER,
    plano: "protecao",
    siteUrl: "https://portal.dolado.pt",
  });

  test("1.ª fatura a 0 €: cupão de 100% aplicado só uma vez (renovações cobram o preço normal)", () => {
    assert.deepEqual(params.discounts, [{ coupon: CUPAO_CONVERSAO.id }]);
    assert.equal(CUPAO_CONVERSAO.percent_off, 100);
    assert.equal(CUPAO_CONVERSAO.duration, "once");
    assert.deepEqual(params.line_items, [{ price: "price_1ULUUeBtJL9VeDPfWuDk5XCo", quantity: 1 }]);
  });

  test("método de pagamento sempre recolhido para as renovações (nunca if_required)", () => {
    assert.equal(params.payment_method_collection, "always");
  });

  test("subscrição, sem Customer Balance nem códigos promocionais misturados", () => {
    assert.equal(params.mode, "subscription");
    assert.equal("allow_promotion_codes" in params, false);
    assert.equal(JSON.stringify(params).includes("balance"), false);
  });

  test("metadados ligam a sessão e a subscrição à conversão e ao utilizador", () => {
    assert.equal(params.metadata.conversao_id, "conv_1");
    assert.equal(params.metadata.user_id, USER);
    assert.equal(params.metadata.plano_destino, "protecao");
    assert.equal(params.subscription_data.metadata.conversao_id, "conv_1");
  });
});

describe("mensagem ao cliente (PT-PT, sem saldo nem crédito futuro)", () => {
  test("Proteção", () => {
    assert.equal(
      mensagemConversao("protecao", 499, 1000),
      "Utilizámos 4,99 € do valor do seu pagamento Avulso para cobrir o primeiro mês do plano Proteção. Os restantes 10,00 € serão reembolsados para o método de pagamento original.",
    );
  });

  test("Caso + Proteção", () => {
    assert.equal(
      mensagemConversao("caso_protecao", 799, 700),
      "Utilizámos 7,99 € do valor do seu pagamento Avulso para cobrir o primeiro mês do plano Caso + Proteção. Os restantes 7,00 € serão reembolsados para o método de pagamento original.",
    );
  });

  test("não fala em saldo nem crédito", () => {
    const texto = mensagemConversao("protecao", 499, 1000).toLowerCase();
    assert.equal(/saldo|crédito/.test(texto), false);
  });
});
