// Escolha da compra Avulso para o crédito de upgrade — `npm test`.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { escolherPagamentoParaCreditoUpgrade } from "./upgrade.ts";

const USER = "00000000-0000-4000-a000-00000000000a";
const pagamento = (extra = {}) => ({
  id: "p1",
  user_id: USER,
  plano: "avulso",
  estado: "concluido",
  valor_total_centimos: 1499,
  stripe_customer_id: "cus_1",
  credito_upgrade_em: null,
  created_at: "2026-09-30T10:00:00Z",
  ...extra,
});

describe("escolherPagamentoParaCreditoUpgrade", () => {
  test("Avulso concluído pode servir para upgrade", () => {
    assert.equal(escolherPagamentoParaCreditoUpgrade([pagamento()], USER)?.id, "p1");
  });

  for (const estado of ["pendente", "falhado", "reembolsado", "assinatura_cancelada"]) {
    test(`Avulso ${estado} não serve para upgrade`, () => {
      assert.equal(escolherPagamentoParaCreditoUpgrade([pagamento({ estado })], USER), null);
    });
  }

  test("uma compra já creditada não é creditada duas vezes", () => {
    assert.equal(escolherPagamentoParaCreditoUpgrade([pagamento({ credito_upgrade_em: "2026-09-30T11:00:00Z" })], USER), null);
  });

  test("só compras da própria conta e do plano Avulso", () => {
    assert.equal(escolherPagamentoParaCreditoUpgrade([pagamento({ user_id: "outro" })], USER), null);
    assert.equal(escolherPagamentoParaCreditoUpgrade([pagamento({ plano: "assinatura" })], USER), null);
  });

  test("compra a 0 € (cupão de 100%) não tem valor a creditar", () => {
    assert.equal(escolherPagamentoParaCreditoUpgrade([pagamento({ valor_total_centimos: 0 })], USER), null);
  });

  test("escolhe a compra elegível mais recente, ignorando as não elegíveis", () => {
    const r = escolherPagamentoParaCreditoUpgrade(
      [
        pagamento({ id: "antiga", created_at: "2026-09-01T00:00:00Z" }),
        pagamento({ id: "falhada", estado: "falhado", created_at: "2026-09-30T12:00:00Z" }),
        pagamento({ id: "recente", created_at: "2026-09-20T00:00:00Z" }),
      ],
      USER,
    );
    assert.equal(r?.id, "recente");
  });
});
