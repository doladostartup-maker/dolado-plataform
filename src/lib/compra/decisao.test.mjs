// Decisão de compra em portal.dolado.pt/comprar — `npm test`.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calcularAcesso } from "../acesso.ts";
import { decidirCompra } from "./decisao.ts";

const ativo = (plano) =>
  calcularAcesso({ subscription_plan: plano, subscription_status: "active", case_credits: 0 });

describe("decidirCompra", () => {
  test("utilizador não autenticado: compra pública (conta criada ou associada depois do pagamento)", () => {
    assert.deepEqual(
      decidirCompra({ plano: "caso_protecao", autenticado: false, acesso: null, subscricoesAtivasStripe: [] }),
      { acao: "publico" },
    );
  });

  test("autenticado sem subscrição: adesão com o Customer da conta", () => {
    assert.deepEqual(
      decidirCompra({ plano: "protecao", autenticado: true, acesso: calcularAcesso(null), subscricoesAtivasStripe: [] }),
      { acao: "adesao" },
    );
  });

  test("autenticado com a mesma subscrição ativa: não abre Checkout", () => {
    assert.deepEqual(
      decidirCompra({ plano: "caso_protecao", autenticado: true, acesso: ativo("caso_protecao"), subscricoesAtivasStripe: [] }),
      { acao: "ja_tem_subscricao", mesmoPlano: true },
    );
  });

  test("autenticado com outra subscrição ativa: não abre Checkout (sem regras novas de mudança de plano)", () => {
    assert.deepEqual(
      decidirCompra({ plano: "caso_protecao", autenticado: true, acesso: ativo("protecao"), subscricoesAtivasStripe: [] }),
      { acao: "ja_tem_subscricao", mesmoPlano: false },
    );
  });

  test("subscrição ativa só no Stripe (ainda não refletida na conta): também bloqueia", () => {
    assert.deepEqual(
      decidirCompra({
        plano: "caso_protecao",
        autenticado: true,
        acesso: calcularAcesso(null),
        subscricoesAtivasStripe: ["caso_protecao"],
      }),
      { acao: "ja_tem_subscricao", mesmoPlano: true },
    );
  });

  test("cancelamento agendado (ainda ativa até ao fim do período): bloqueia", () => {
    const acesso = calcularAcesso({
      subscription_plan: "protecao",
      subscription_status: "active",
      case_credits: 0,
      cancel_at_period_end: true,
    });
    assert.equal(decidirCompra({ plano: "protecao", autenticado: true, acesso, subscricoesAtivasStripe: [] }).acao, "ja_tem_subscricao");
  });

  test("subscrição terminada: pode aderir de novo", () => {
    const acesso = calcularAcesso({ subscription_plan: "none", subscription_status: "canceled", case_credits: 2 });
    assert.equal(decidirCompra({ plano: "caso_protecao", autenticado: true, acesso, subscricoesAtivasStripe: [] }).acao, "adesao");
  });

  test("Avulso começa sempre por Tratar o meu caso (com ou sem sessão)", () => {
    for (const autenticado of [true, false]) {
      assert.deepEqual(
        decidirCompra({ plano: "avulso", autenticado, acesso: null, subscricoesAtivasStripe: [] }),
        { acao: "tratar_caso" },
      );
    }
  });
});
