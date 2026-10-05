// Próxima cobrança na Gestão de Subscrição — `npm test`.
// Preço-base ≠ valor efetivo: os descontos em vigor no Stripe contam.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  descontosDaSubscricao,
  resumirCobranca,
  textoDesconto,
  textoProximaCobranca,
  valorComDescontos,
} from "./proximaCobranca.ts";

const AGORA = new Date("2026-10-05T10:00:00.000Z");
const RENOVACAO = "2026-10-30T10:00:00.000Z";
const BASE = 799;

const epoch = (iso) => Math.floor(new Date(iso).getTime() / 1000);

/** Desconto como o Stripe o devolve, com `discounts.source.coupon` expandido. */
function discount({ percent_off = null, amount_off = null, duration, end = null, name = null }) {
  return {
    id: "di_1",
    object: "discount",
    end: end ? epoch(end) : null,
    start: epoch("2026-09-30T10:00:00.000Z"),
    source: {
      type: "coupon",
      coupon: { id: "co_1", object: "coupon", name, percent_off, amount_off, duration, valid: true },
    },
  };
}

function cobrancaCom(discounts, valorPrevistoStripe = null) {
  return resumirCobranca({
    precoBaseCentimos: BASE,
    dataCobranca: RENOVACAO,
    descontos: descontosDaSubscricao(discounts, AGORA),
    valorPrevistoStripe,
  });
}

describe("100% vitalício", () => {
  test("próxima cobrança 0,00 € (pré-visualização do Stripe)", () => {
    const r = cobrancaCom([discount({ percent_off: 100, duration: "forever" })], 0);
    assert.equal(r.precoBaseCentimos, 799);
    assert.equal(r.valorProximaCobrancaCentimos, 0);
    assert.equal(r.mudaEm, null);
    assert.deepEqual(r.descontosAplicaveis.map(textoDesconto), ["100% vitalício"]);
    assert.equal(textoProximaCobranca(r), "0,00 € — sem cobrança prevista, desconto de 100% vitalício ativo");
  });

  test("sem pré-visualização, calcula 0,00 € com o desconto — nunca o preço-base", () => {
    const r = cobrancaCom([discount({ percent_off: 100, duration: "forever" })], null);
    assert.equal(r.valorProximaCobrancaCentimos, 0);
  });
});

describe("desconto parcial", () => {
  test("25% vitalício: 7,99 € → 5,99 €", () => {
    const r = cobrancaCom([discount({ percent_off: 25, duration: "forever" })]);
    assert.equal(r.valorProximaCobrancaCentimos, 599);
    assert.equal(textoProximaCobranca(r), "5,99 €");
    assert.equal(textoDesconto(r.descontosAplicaveis[0]), "25% vitalício");
  });

  test("valor fixo de 2,00 €", () => {
    const r = cobrancaCom([discount({ amount_off: 200, duration: "forever" })]);
    assert.equal(r.valorProximaCobrancaCentimos, 599);
    assert.equal(textoDesconto(r.descontosAplicaveis[0]), "2,00 € vitalício");
  });

  test("valor fixo maior do que o preço nunca dá valor negativo", () => {
    assert.equal(valorComDescontos(BASE, [{ percentOff: null, amountOffCentimos: 1000, duracao: "forever", fim: null }]), 0);
  });

  test("a pré-visualização do Stripe prevalece sobre o cálculo local", () => {
    const r = cobrancaCom([discount({ percent_off: 25, duration: "forever" })], 600);
    assert.equal(r.valorProximaCobrancaCentimos, 600);
  });
});

describe("desconto temporário", () => {
  test("50% durante 3 meses: aplica-se à próxima cobrança e indica quando acaba", () => {
    const fim = "2027-01-05T10:00:00.000Z";
    const r = cobrancaCom([discount({ percent_off: 50, duration: "repeating", end: fim })]);
    assert.equal(r.valorProximaCobrancaCentimos, 399); // desconto de 4,00 € (arredondado, como no Stripe)
    assert.equal(r.mudaEm, fim);
    assert.equal(textoDesconto(r.descontosAplicaveis[0]), "50% até 5 de janeiro de 2027");
  });

  test("termina antes da próxima cobrança: não se aplica", () => {
    const r = cobrancaCom([discount({ percent_off: 50, duration: "repeating", end: "2026-10-20T10:00:00.000Z" })]);
    assert.equal(r.descontosAplicaveis.length, 0);
    assert.equal(r.valorProximaCobrancaCentimos, 799);
    assert.equal(r.mudaEm, null);
  });

  test("pontual (once): só a próxima cobrança", () => {
    const r = cobrancaCom([discount({ percent_off: 20, duration: "once" })]);
    assert.equal(r.valorProximaCobrancaCentimos, 639);
    assert.equal(textoDesconto(r.descontosAplicaveis[0]), "20% na próxima cobrança");
  });
});

describe("sem desconto", () => {
  test("próxima cobrança = preço-base", () => {
    const r = cobrancaCom([], 799);
    assert.equal(r.descontosAplicaveis.length, 0);
    assert.equal(r.valorProximaCobrancaCentimos, 799);
    assert.equal(textoProximaCobranca(r), "7,99 €");
    assert.equal(r.mudaEm, null);
  });

  test("discounts não expandidos (só ids) são ignorados", () => {
    assert.deepEqual(descontosDaSubscricao(["di_1"], AGORA), []);
    assert.deepEqual(descontosDaSubscricao(null, AGORA), []);
  });
});

describe("desconto expirado", () => {
  test("fim já passado: ignorado, cobra o preço-base", () => {
    const expirado = discount({ percent_off: 100, duration: "repeating", end: "2026-10-01T10:00:00.000Z" });
    assert.deepEqual(descontosDaSubscricao([expirado], AGORA), []);
    const r = cobrancaCom([expirado]);
    assert.equal(r.valorProximaCobrancaCentimos, 799);
    assert.equal(textoProximaCobranca(r), "7,99 €");
  });

  test("um expirado e um ativo: só conta o ativo", () => {
    const r = cobrancaCom([
      discount({ percent_off: 100, duration: "repeating", end: "2026-10-01T10:00:00.000Z" }),
      discount({ percent_off: 10, duration: "forever" }),
    ]);
    assert.equal(r.descontosAplicaveis.length, 1);
    assert.equal(r.valorProximaCobrancaCentimos, 719);
  });
});
