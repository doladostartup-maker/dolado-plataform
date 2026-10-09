// Regras de acesso por plano — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { avisoDoPortal, calcularAcesso } from "./acesso.ts";

const linha = (subscription_plan, subscription_status, case_credits = 0) => ({
  subscription_plan,
  subscription_status,
  case_credits,
});

describe("calcularAcesso", () => {
  test("Proteção ativa: permite proteção, não permite criar caso sem crédito", () => {
    const a = calcularAcesso(linha("protecao", "active", 0));
    assert.equal(a.temProtecao, true);
    assert.equal(a.podeCriarCaso, false);
  });

  test("Proteção com crédito Avulso comprado à parte: pode criar caso", () => {
    const a = calcularAcesso(linha("protecao", "active", 1));
    assert.equal(a.podeCriarCaso, true);
    assert.equal(a.casoConsomeCredito, true);
  });

  test("Caso + Proteção: proteção e casos só com crédito", () => {
    assert.equal(calcularAcesso(linha("caso_protecao", "active", 2)).podeCriarCaso, true);
    assert.equal(calcularAcesso(linha("caso_protecao", "active", 0)).podeCriarCaso, false);
    assert.equal(calcularAcesso(linha("caso_protecao", "active", 0)).temProtecao, true);
  });

  test("past_due mantém a proteção; canceled/incomplete/unpaid não", () => {
    assert.equal(calcularAcesso(linha("caso_protecao", "past_due")).temProtecao, true);
    for (const s of ["canceled", "incomplete", "unpaid", "incomplete_expired", null]) {
      assert.equal(calcularAcesso(linha("caso_protecao", s)).temProtecao, false, String(s));
    }
  });

  test("Avulso (sem subscrição) com 1 crédito: cria caso, sem proteção", () => {
    const a = calcularAcesso(linha("none", null, 1));
    assert.equal(a.podeCriarCaso, true);
    assert.equal(a.temProtecao, false);
  });

  test("Avulso já usado: sem crédito não cria caso (o histórico continua no portal)", () => {
    assert.equal(calcularAcesso(linha("none", null, 0)).podeCriarCaso, false);
  });

  test("conta sem nenhuma compra (registo livre): sem casos disponíveis nem proteção — criar conta não dá direito a um caso", () => {
    const a = calcularAcesso(null);
    assert.equal(a.temPlanoStripe, false);
    assert.equal(a.podeCriarCaso, false);
    assert.equal(a.casoConsomeCredito, true);
    assert.equal(a.creditos, 0);
    assert.equal(a.temProtecao, false);
  });

  test("dados antigos (plano desconhecido) nunca dão proteção", () => {
    assert.equal(calcularAcesso(linha("assinatura", "active")).temProtecao, false);
  });
});

describe("regresso do Checkout (/portal?upgraded=true)", () => {
  test("upgraded=true não concede acesso: sem plano ativo não mostra sucesso", () => {
    const acesso = calcularAcesso(linha("none", null));
    assert.equal(avisoDoPortal({ regressoDoCheckout: true, acesso, ultimoPagamentoEstado: null }), null);
    assert.equal(acesso.temProtecao, false);
  });

  test("pagamento pendente mostra 'em confirmação', mesmo com upgraded=true", () => {
    const acesso = calcularAcesso(linha("none", null));
    assert.equal(avisoDoPortal({ regressoDoCheckout: true, acesso, ultimoPagamentoEstado: "pendente" }), "pagamento_pendente");
  });

  test("pagamento falhado mostra o estado falhado", () => {
    const acesso = calcularAcesso(linha("none", null));
    assert.equal(avisoDoPortal({ regressoDoCheckout: false, acesso, ultimoPagamentoEstado: "falhado" }), "pagamento_falhado");
  });

  test("com o plano já ativo pelo webhook, mostra a mensagem de sucesso", () => {
    const acesso = calcularAcesso(linha("caso_protecao", "active", 1));
    assert.equal(avisoDoPortal({ regressoDoCheckout: true, acesso, ultimoPagamentoEstado: "concluido" }), "plano_ativo");
  });

  test("a página /portal não escreve acessos nem consulta a sessão Stripe", () => {
    const fonte = readFileSync(new URL("../app/[idioma]/portal/page.tsx", import.meta.url), "utf8");
    assert.equal(/\.(upsert|update|insert)\(/.test(fonte), false);
    assert.equal(fonte.includes("createAdminClient"), false);
    assert.equal(fonte.includes("checkout.sessions"), false);
  });
});
