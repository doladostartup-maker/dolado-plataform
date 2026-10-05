// Moldura V2 dos e-mails — `npm test`. As Edge Functions não importam de
// src/, por isso a moldura existe em dois sítios: têm de ser iguais.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CONTACTO_EMAIL, MARKETING_SITE_URL } from "../site.ts";
import { CONTACTO_EMAIL_MOLDURA, LOGO_EMAIL, SITE_EMAIL, emailV2 } from "./molduraEmail.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("a cópia das Edge Functions é igual à da aplicação", () => {
  assert.equal(fonte("../../../supabase/functions/_shared/molduraEmail.ts"), fonte("./molduraEmail.ts"));
});

test("constantes repetidas coincidem com src/lib/site.ts", () => {
  assert.equal(CONTACTO_EMAIL_MOLDURA, CONTACTO_EMAIL);
  assert.equal(SITE_EMAIL, MARKETING_SITE_URL);
});

test("logótipo em PNG existente em public/ (o Gmail não mostra SVG)", () => {
  assert.match(LOGO_EMAIL, /\.png$/);
  assert.ok(readFileSync(new URL("../../../public/brand/dolado-logo-icone.png", import.meta.url)).length > 0);
});

test("moldura: sem fontes externas, sem scripts, com rodapé e contacto", () => {
  const html = emailV2({ titulo: "T", corpo: "<p>x</p>" });
  assert.equal(/<script|<link|fonts\.googleapis/i.test(html), false);
  assert.match(html, /Do lado dos consumidores\./);
  assert.ok(html.includes(`mailto:${CONTACTO_EMAIL}`));
  assert.match(html, /lang="pt-PT"/);
});

test("moldura: pré-visualização e motivo no rodapé só quando pedidos", () => {
  const simples = emailV2({ titulo: "T", corpo: "<p>x</p>" });
  assert.equal(/display:none/.test(simples), false);
  assert.equal(simples.includes("<br><br><span"), false);
  const completo = emailV2({ titulo: "T", corpo: "<p>x</p>", preheader: "Resumo curto", rodape: "Recebe este e-mail porque…" });
  assert.match(completo, /<div style="display:none;[^"]*mso-hide:all;[^"]*">Resumo curto<\/div>/);
  assert.ok(completo.indexOf("Resumo curto") < completo.indexOf("<p>x</p>"));
  assert.ok(completo.indexOf("Recebe este e-mail porque…") < completo.indexOf("Do lado dos consumidores."));
});

test("todos os e-mails ao cliente usam a moldura V2 (nenhum com as cores antigas)", () => {
  for (const p of [
    "./pagamento.ts",
    "./textoRevisao.ts",
    "./boas-vindas.ts",
    "./achadoMonitor.ts",
    "./compraSemConta.ts",
    "./livreResolucao.ts",
    "./avisoSetorial.ts",
    "../../../supabase/functions/_shared/emailAlertas.ts",
    "../../../supabase/functions/_shared/emailNovoCaso.ts",
    "../../../supabase/templates/confirmacao.html",
  ]) {
    const f = fonte(p);
    assert.equal(/#0E6B5C|#F7F6F2|#EFEDE7/i.test(f), false, p);
    if (!p.endsWith(".html")) assert.match(f, /emailV2\(/, p);
  }
});

test("template de confirmação mantém as variáveis da Supabase", () => {
  const t = fonte("../../../supabase/templates/confirmacao.html");
  assert.match(t, /\{\{ \.ConfirmationURL \}\}/);
  assert.match(t, /\{\{ with \.Data \}\}\{\{ if \.mostrar_codigo \}\}/);
  assert.match(t, /\{\{ \$\.Token \}\}/);
});
