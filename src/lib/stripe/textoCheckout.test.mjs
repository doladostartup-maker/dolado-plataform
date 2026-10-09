// Texto inglês do Stripe Checkout — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { mensagemCheckout } from "./textoCheckout.ts";

describe("Checkout em inglês", () => {
  test("nome inglês do produto, com o nome português que o Stripe mostra", () => {
    for (const [produto, en, pt] of [
      ["avulso", "Single Case", "Avulso"],
      ["protecao", "Protection", "Proteção"],
      ["caso_protecao", "Case + Protection", "Caso + Proteção"],
      ["caso_extra", "Extra Case", "Caso Extra"],
    ]) {
      const m = mensagemCheckout(produto, "en-GB");
      assert.ok(m.startsWith(`You are buying **${en}**`), m);
      assert.match(m, new RegExp(`“${pt.replace("+", "\\+")}”`));
      assert.ok(m.length <= 1200);
    }
  });

  test("português: nada muda; produto desconhecido: sem texto", () => {
    assert.equal(mensagemCheckout("avulso", "pt-PT"), null);
    assert.equal(mensagemCheckout(null, "en-GB"), null);
  });

  test("só apresentação: locale en-GB e custom_text só em inglês; Price IDs e metadata intocados", () => {
    const acao = readFileSync(new URL("../../app/actions/stripe.ts", import.meta.url), "utf8");
    const comIdioma = acao.slice(acao.indexOf("function comIdioma("), acao.indexOf("function produtoDoCheckout("));
    assert.match(comIdioma, /if \(idioma === "pt-PT"\) return p;/);
    assert.match(comIdioma, /locale: LOCALE_STRIPE\[idioma\]/);
    assert.doesNotMatch(comIdioma, /line_items:|metadata:|price_data|discounts:/);
  });
});
