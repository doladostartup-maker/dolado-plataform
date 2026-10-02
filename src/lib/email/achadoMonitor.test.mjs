// E-mail de uma situação comunicada pelo Monitor de Proteção — `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSUNTO_ACHADO_MONITOR, montarHtmlAchadoMonitor } from "./achadoMonitor.ts";

const MALICIOSO = '<a href="https://phishing.invalid">x</a><script>y()</script>';

test("texto e fornecedor com escape; parágrafos preservados", () => {
  const html = montarHtmlAchadoMonitor({ fornecedor: MALICIOSO, texto: `Linha 1\n\n${MALICIOSO}`, url: "https://portal.dolado.pt/portal/contratos/abc" });
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes('phishing.invalid">'), false);
  assert.ok(html.includes("<p style=\"margin:0 0 16px 0;\">Linha 1</p>"));
  assert.ok(html.includes("https://portal.dolado.pt/portal/contratos/abc"));
});

test("linguagem de verificação, não de conclusão", () => {
  const html = montarHtmlAchadoMonitor({ fornecedor: "NOS", texto: "Facto.", url: "https://portal.dolado.pt" });
  assert.match(ASSUNTO_ACHADO_MONITOR, /merece ser verificada/);
  assert.equal(/indevid|ilegal|violou|tem direito/i.test(html + ASSUNTO_ACHADO_MONITOR), false);
});
