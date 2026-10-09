// E-mails dos alertas diários (Edge Function verificar-monitor-datas) — `npm test`.
// O módulo partilhado não usa APIs de Deno, por isso corre também em Node.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  assuntoAlertaMonitor,
  escaparHtml,
  htmlAlertaMonitor,
  textoParaAssunto,
} from "../../supabase/functions/_shared/emailAlertas.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const MALICIOSO = '<a href="https://phishing.invalid">Clique aqui</a><script>x()</script>';
const BASE = { nome: "Ana", fornecedor: "Vodafone", descricaoPromocao: null, dataFim: "2027-02-28", contratoId: "abc" };

describe("escape de conteúdo do cliente", () => {
  test("HTML de nome, fornecedor e descrição não passa para o e-mail", () => {
    const fid = htmlAlertaMonitor({ ...BASE, regra: "fidelizacao_30d", dias: 30, nome: MALICIOSO, fornecedor: MALICIOSO });
    const promo = htmlAlertaMonitor({ ...BASE, regra: "promocao_30d", dias: 7, nome: MALICIOSO, fornecedor: MALICIOSO, descricaoPromocao: MALICIOSO });
    for (const html of [fid, promo]) {
      assert.equal(html.includes('phishing.invalid">'), false);
      assert.equal(html.includes("<script>"), false);
      assert.ok(html.includes("&lt;a href=&quot;https://phishing.invalid&quot;&gt;"));
    }
  });

  test("texto normal continua legível (acentos não são alterados)", () => {
    const html = htmlAlertaMonitor({ ...BASE, regra: "promocao_30d", dias: 1, fornecedor: "Operadora Ação & Cª", descricaoPromocao: "Fibra 1 Gbps" });
    assert.ok(html.includes("Operadora Ação &amp; Cª"));
    assert.ok(html.includes("termina amanhã"));
  });

  test("assunto: sem quebras de linha nem cabeçalhos injetados, comprimento limitado", () => {
    const a = assuntoAlertaMonitor("promocao_30d", "Op\r\nBcc: alvo@exemplo.invalid", 7);
    assert.equal(/[\r\n]/.test(a), false);
    assert.ok(assuntoAlertaMonitor("fidelizacao_30d", "x".repeat(500), 30).length < 120);
    assert.equal(textoParaAssunto("  a \n b  "), "a b");
    assert.equal(escaparHtml(`"'<>&`), "&quot;&#39;&lt;&gt;&amp;");
  });
});

describe("destinatário dos alertas diários", () => {
  test("verificar-monitor-datas: destinatário da função da conta, reserva antes de enviar, e-mail com escape", () => {
    const codigo = fonte("../../supabase/functions/verificar-monitor-datas/index.ts");
    assert.match(codigo, /rpc<AlertaPendente\[\]>\("monitor_alertas_pendentes"/);
    assert.match(codigo, /from "\.\.\/_shared\/emailAlertas\.ts"/);
    // A reserva vem antes do envio; uma falha liberta a reserva.
    assert.ok(codigo.indexOf('"monitor_reservar_alerta"') < codigo.indexOf("await enviarEmailBrevo("));
    assert.match(codigo, /"monitor_libertar_alerta"/);
    // Nunca lê tabelas diretamente para escolher destinatários: o único
    // acesso direto é o dono do contrato, só para o idioma do texto.
    assert.equal((codigo.match(/rest\/v1\/contratos_/g) ?? []).length, 1);
    assert.match(codigo, /contratos_monitorizados\?id=eq\.\$\{encodeURIComponent\(contratoId\)\}&select=utilizador_id/);
    assert.match(codigo, /\{ email: a\.email, nome: a\.nome \}/);
  });
});

describe("e-mails do Monitor de Proteção", async () => {
  const { assuntoAlertaMonitor, htmlAlertaMonitor } = await import("../../supabase/functions/_shared/emailAlertas.ts");
  const base = { nome: "Ana", fornecedor: "Vodafone", descricaoPromocao: null, dataFim: "2027-02-28", contratoId: "abc" };

  test("assuntos por janela", () => {
    assert.equal(assuntoAlertaMonitor("fidelizacao_60d", "Vodafone", 59), "A fidelização com Vodafone termina dentro de 59 dias");
    assert.equal(assuntoAlertaMonitor("promocao_fim", "NOS", 0), "A promoção com NOS termina hoje");
    assert.equal(assuntoAlertaMonitor("fidelizacao_fim", null, -1), "A fidelização terminou");
  });

  test("texto factual, com ligação ao contrato e sem conclusões sobre direitos", () => {
    const html = htmlAlertaMonitor({ ...base, regra: "fidelizacao_30d", dias: 30 });
    assert.ok(html.includes("que temos registada termina dentro de 30 dias"));
    assert.ok(html.includes("https://portal.dolado.pt/portal/contratos/abc"));
    assert.equal(/tem direito|ilegal|violou/i.test(html), false);
  });

  test("escape do fornecedor e da descrição da promoção", () => {
    const html = htmlAlertaMonitor({ ...base, regra: "promocao_30d", dias: 10, fornecedor: MALICIOSO, descricaoPromocao: MALICIOSO });
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes('phishing.invalid">'), false);
  });
});
