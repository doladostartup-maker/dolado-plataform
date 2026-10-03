// /criar-conta: quando uma Checkout Session permite criar conta — `npm test`.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MENSAGEM_EMAIL_COM_CONTA, avaliarSessaoParaCriarConta } from "./criarConta.ts";

const sessao = (extra = {}) => ({
  status: "complete",
  payment_status: "paid",
  metadata: { plano: "avulso" },
  customer_details: { email: "cliente@teste.invalid" },
  ...extra,
});

describe("avaliarSessaoParaCriarConta", () => {
  test("pagamento imediato: cria conta com pagamento confirmado", () => {
    assert.deepEqual(avaliarSessaoParaCriarConta(sessao(), null), {
      ok: true,
      email: "cliente@teste.invalid",
      pagamentoConfirmado: true,
    });
  });

  test("SEPA pendente: deixa criar a conta, mas sem pagamento confirmado", () => {
    const r = avaliarSessaoParaCriarConta(sessao({ payment_status: "unpaid" }), null);
    assert.equal(r.ok, true);
    assert.equal(r.pagamentoConfirmado, false);
  });

  test("cupão de 100% conta como confirmado", () => {
    assert.equal(avaliarSessaoParaCriarConta(sessao({ payment_status: "no_payment_required" }), null).pagamentoConfirmado, true);
  });

  test("checkout não concluído (ex.: abandonado): recusa", () => {
    assert.deepEqual(avaliarSessaoParaCriarConta(sessao({ status: "open" }), null), { ok: false, motivo: "sessao_invalida" });
  });

  test("uma compra só cria uma conta", () => {
    assert.deepEqual(avaliarSessaoParaCriarConta(sessao(), "00000000-0000-4000-a000-00000000000a"), {
      ok: false,
      motivo: "ja_tem_conta",
    });
  });

  test("sessão de uma compra feita com conta (user_id nos metadados): recusa", () => {
    assert.equal(avaliarSessaoParaCriarConta(sessao({ metadata: { plano: "avulso", user_id: "x" } }), null).ok, false);
  });

  test("sessão de outro fluxo (sem plano): recusa", () => {
    assert.equal(avaliarSessaoParaCriarConta(sessao({ metadata: {} }), null).ok, false);
  });
});

describe("e-mail do Checkout que já tem conta", () => {
  test("nunca cria uma segunda conta: pede login para associar a compra", () => {
    assert.deepEqual(avaliarSessaoParaCriarConta(sessao(), null, true), {
      ok: false,
      motivo: "email_com_conta",
      email: "cliente@teste.invalid",
    });
    assert.equal(MENSAGEM_EMAIL_COM_CONTA, "Já existe uma conta com este e-mail. Inicie sessão para associar esta compra.");
  });

  test("compra já ligada continua a ter prioridade (já tem conta)", () => {
    assert.equal(avaliarSessaoParaCriarConta(sessao(), "user-1", true).motivo, "ja_tem_conta");
  });

  test("pessoa nova: cria conta normalmente", () => {
    assert.equal(avaliarSessaoParaCriarConta(sessao(), null, false).ok, true);
  });
});
