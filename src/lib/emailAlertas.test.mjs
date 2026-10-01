// E-mails dos alertas diários (Edge Functions verificar-alertas-*) — `npm test`.
// O módulo partilhado não usa APIs de Deno, por isso corre também em Node.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  assuntoFidelizacao,
  assuntoPromocao,
  escaparHtml,
  htmlAvisoFidelizacao,
  htmlAvisoPromocao,
  textoParaAssunto,
} from "../../supabase/functions/_shared/emailAlertas.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const MALICIOSO = '<a href="https://phishing.invalid">Clique aqui</a><script>x()</script>';

describe("escape de conteúdo do cliente", () => {
  test("HTML de nome, operadora e descrição não passa para o e-mail", () => {
    const fid = htmlAvisoFidelizacao(MALICIOSO, MALICIOSO, 30, "2027-01-01");
    const promo = htmlAvisoPromocao(MALICIOSO, MALICIOSO, MALICIOSO, 7, "2027-01-01");
    for (const html of [fid, promo]) {
      assert.equal(html.includes("phishing.invalid\">"), false);
      assert.equal(html.includes("<script>"), false);
      assert.ok(html.includes("&lt;a href=&quot;https://phishing.invalid&quot;&gt;"));
    }
  });

  test("texto normal continua legível (acentos não são alterados)", () => {
    const html = htmlAvisoPromocao("Ana", "Operadora Ação & Cª", "Fibra 1 Gbps", 1, "2027-01-01");
    assert.ok(html.includes("Operadora Ação &amp; Cª"));
    assert.ok(html.includes("termina em 1 dia (em"));
  });

  test("assunto: sem quebras de linha nem cabeçalhos injetados, comprimento limitado", () => {
    const a = assuntoPromocao("Op\r\nBcc: alvo@exemplo.invalid", 7);
    assert.equal(/[\r\n]/.test(a), false);
    assert.ok(assuntoFidelizacao("x".repeat(500), 30).length < 120);
    assert.equal(textoParaAssunto("  a \n b  "), "a b");
    assert.equal(escaparHtml(`"'<>&`), "&quot;&#39;&lt;&gt;&amp;");
  });
});

describe("destinatário dos alertas diários", () => {
  for (const f of ["verificar-alertas-fidelizacao", "verificar-alertas-promocao"]) {
    const codigo = fonte(`../../supabase/functions/${f}/index.ts`);

    test(`${f}: pendentes vêm da função que devolve o e-mail da conta`, () => {
      assert.match(codigo, /\/rest\/v1\/rpc\/alertas_(fidelizacao|promocao)_pendentes/);
      // Já não lê a tabela para escolher destinatários (só a usa para marcar enviados).
      assert.equal(/rest\/v1\/alertas_[a-z_]+_portal\?select=/.test(codigo), false);
      assert.match(codigo, /method: "PATCH"/);
    });

    test(`${f}: monta o e-mail com o módulo que faz escape`, () => {
      assert.match(codigo, /from "\.\.\/_shared\/emailAlertas\.ts"/);
      assert.equal(/function htmlAviso\(/.test(codigo), false);
    });
  }

  test("confirmação imediata do alerta de promoção também faz escape", () => {
    const acoes = fonte("../app/portal/promocoes/actions.ts");
    assert.match(acoes, /escaparHtml\(operadora\)/);
    assert.match(acoes, /escaparHtml\(descricao\)/);
    assert.match(acoes, /escaparHtml\(destino\.nome\)/);
    // O destino desta confirmação é o e-mail da sessão.
    assert.match(acoes, /\{ email: user\.email!/);
  });
});
