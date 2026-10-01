// E-mails da Edge Function novo-caso — `npm test`.
// O módulo partilhado não usa APIs de Deno, por isso corre também em Node.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  assuntoNotificacaoAdmin,
  htmlConfirmacaoCliente,
  htmlNotificacaoAdmin,
} from "../../supabase/functions/_shared/emailNovoCaso.ts";

const MALICIOSO = '<a href="https://phishing.invalid">Clique aqui</a><script>x()</script>';
const SITE = "https://portal.dolado.pt";

const caso = (campos = {}) => ({
  id: "00000000-0000-0000-0000-000000000001",
  nome: "Ana",
  email: "ana@exemplo.invalid",
  telefone: null,
  sector: null,
  tipo_problema: null,
  problema_tipo: null,
  empresa: null,
  empresa_parceira: null,
  descricao: null,
  ...campos,
});

const semHtmlInjetado = (html) => {
  assert.equal(html.includes('phishing.invalid">'), false);
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("&lt;a href=&quot;https://phishing.invalid&quot;&gt;"));
};

describe("novo-caso: escape de conteúdo do cliente", () => {
  test("confirmação ao cliente faz escape do nome", () => {
    semHtmlInjetado(htmlConfirmacaoCliente(MALICIOSO));
  });

  test("notificação ao admin faz escape de todos os campos do cliente", () => {
    const campos = [
      "nome", "email", "telefone", "sector", "tipo_problema",
      "problema_tipo", "empresa", "empresa_parceira", "descricao",
    ];
    for (const campo of campos) {
      semHtmlInjetado(htmlNotificacaoAdmin(caso({ [campo]: MALICIOSO }), SITE));
    }
  });

  test("notificação ao admin mostra problema_tipo e empresa (formulário guiado)", () => {
    const html = htmlNotificacaoAdmin(
      caso({ problema_tipo: "Cobrança indevida", empresa: "Operadora Ação & Cª" }),
      SITE,
    );
    assert.ok(html.includes("Cobrança indevida"));
    assert.ok(html.includes("Operadora Ação &amp; Cª"));
  });

  test("descrição mantém as quebras de linha; campos vazios aparecem como —", () => {
    const html = htmlNotificacaoAdmin(caso({ descricao: "linha 1\nlinha <2>", telefone: "  " }), SITE);
    assert.ok(html.includes("linha 1<br>linha &lt;2&gt;"));
    assert.ok(html.includes("<strong>Telefone:</strong> —"));
  });

  test("link do backoffice usa o id do caso", () => {
    const html = htmlNotificacaoAdmin(caso(), SITE);
    assert.ok(html.includes(`href="${SITE}/backoffice/casos/00000000-0000-0000-0000-000000000001"`));
  });
});

describe("novo-caso: assunto ao admin", () => {
  test("sem quebras de linha nem cabeçalhos injetados", () => {
    const a = assuntoNotificacaoAdmin({ nome: "Ana\r\nBcc: alvo@exemplo.invalid", sector: "Tele\ncom" });
    assert.equal(/[\r\n]/.test(a), false);
    assert.equal(a, "[NOVO CASO] Tele com – Ana Bcc: alvo@exemplo.invalid");
  });

  test("comprimento limitado e valores em falta", () => {
    assert.ok(assuntoNotificacaoAdmin({ nome: "x".repeat(500), sector: "y".repeat(500) }).length < 120);
    assert.equal(assuntoNotificacaoAdmin({ nome: "", sector: null }), "[NOVO CASO] Sem setor – Sem nome");
  });
});

test("a Edge Function novo-caso usa o módulo partilhado e não monta HTML própria", () => {
  const codigo = readFileSync(new URL("../../supabase/functions/novo-caso/index.ts", import.meta.url), "utf8");
  assert.match(codigo, /from "\.\.\/_shared\/emailNovoCaso\.ts"/);
  assert.equal(/function html[A-Z]/.test(codigo), false);
  assert.equal(/\$\{caso\.(nome|sector)/.test(codigo), false);
});
