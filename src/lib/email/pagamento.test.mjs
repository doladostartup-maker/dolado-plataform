// E-mail de confirmação da compra (suporte duradouro) — `npm test`.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { montarHtmlBoasVindasPagamento } from "./pagamento.ts";

const base = {
  contaExiste: true,
  ligacao: "https://portal.dolado.pt/entrar",
  portalUrl: "https://portal.dolado.pt",
  valorPagoCentimos: 799,
  renovacao: "2026-11-01T10:00:00.000Z",
  consentimento: { termos_versao: "2026-10-01", pediu_inicio_imediato: true },
};

describe("15. e-mail pós-pagamento", () => {
  test("Caso + Proteção: produto, valor, IVA, subscrição, renovação, gestão, início imediato, livre resolução, contacto e documentos", () => {
    const html = montarHtmlBoasVindasPagamento("caso_protecao", base);
    for (const esperado of [
      "Caso + Proteção",
      "7,99 € (IVA incluído)",
      "Subscrição mensal com renovação automática",
      "7,99 €/mês (IVA incluído)",
      "01 de novembro de 2026",
      "https://portal.dolado.pt/portal/subscricao",
      "Gestão de Subscrição",
      "pediu expressamente que a DoLado iniciasse a prestação do serviço",
      "Direito de livre resolução",
      "14 dias",
      "contacto@dolado.pt",
      "https://dolado.pt/termos/2026-10-01",
      "https://dolado.pt/privacidade",
      "https://dolado.pt/livre-resolucao",
    ]) {
      assert.ok(html.includes(esperado), esperado);
    }
    assert.equal(/\bemail\b/.test(html.replace(/<[^>]+>/g, "")), false); // sempre "e-mail"
  });

  test("Avulso: pagamento único, sem renovação nem Gestão de Subscrição", () => {
    const html = montarHtmlBoasVindasPagamento("avulso", { ...base, valorPagoCentimos: 1499, renovacao: null });
    assert.ok(html.includes("Pagamento único"));
    assert.ok(html.includes("14,99 € (IVA incluído)"));
    assert.equal(html.includes("renovação automática"), false);
    assert.equal(html.includes("/portal/subscricao"), false);
  });

  test("cupão de 100%: mostra 0 €, o preço do plano e a renovação nas condições do código", () => {
    const html = montarHtmlBoasVindasPagamento("caso_protecao", { ...base, valorPagoCentimos: 0 });
    assert.ok(html.includes("0,00 € (IVA incluído)"));
    assert.ok(html.includes("7,99 €/mês"));
    assert.ok(html.includes("condições do código usado no pagamento"));
  });

  test("compra sem registo de consentimento: sem a frase de início imediato, Termos em vigor", () => {
    const html = montarHtmlBoasVindasPagamento("protecao", { ...base, consentimento: null, valorPagoCentimos: 499 });
    assert.equal(html.includes("pediu expressamente"), false);
    assert.ok(html.includes('href="https://dolado.pt/termos"'));
  });

  test("conta por criar: ligação para criar a conta", () => {
    const html = montarHtmlBoasVindasPagamento("protecao", { ...base, contaExiste: false, ligacao: "https://portal.dolado.pt/criar-conta?session_id=cs_1" });
    assert.ok(html.includes("Criar a minha conta"));
    assert.ok(html.includes("criar-conta?session_id=cs_1"));
  });
});
