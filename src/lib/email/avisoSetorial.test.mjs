// E-mail do Aviso Sectorial no padrão V2 — `npm test`. O escape do texto
// está em escapeEmails.test.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { dataAvisoSetorial, montarHtmlAvisoSetorial } from "./avisoSetorial.ts";

const DATA = new Date("2026-10-05T10:00:00Z");
const aviso = (over = {}) => {
  const a = { nome: "Ana", setor: "Energia", titulo: "Atualização das tarifas reguladas", descricao: "A ERSE publicou novas tarifas.", ...over };
  return montarHtmlAvisoSetorial(a.nome, a.setor, a.titulo, a.descricao, DATA);
};

/** Texto visível (sem etiquetas nem o bloco de pré-visualização). */
const visivel = (html) =>
  html
    .replace(/<div style="display:none;[\s\S]*?<\/div>/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

function semValoresEstranhos(html) {
  const t = visivel(html);
  for (const v of ["undefined", "null", "NaN", "[object Object]", "Invalid Date"]) assert.equal(t.includes(v), false, v);
  assert.equal(/Olá\s+,/.test(t), false);
  assert.equal(/<p[^>]*>\s*<\/p>/.test(html), false, "parágrafo vazio");
}

test("identificação: rótulo, setor, título em destaque e data de envio", () => {
  const html = aviso();
  assert.match(html, /Aviso setorial · Energia<\/p>/);
  assert.match(html, /<h1 [^>]*>Atualização das tarifas reguladas<\/h1>/);
  assert.ok(html.includes("Enviado a 5 de outubro de 2026"));
  assert.ok(html.includes("<title>Aviso setorial: Energia — DoLado</title>"));
  semValoresEstranhos(html);
});

test("data na hora de Lisboa (UTC+1 no verão, UTC+0 no inverno)", () => {
  assert.equal(dataAvisoSetorial(new Date("2026-07-31T23:30:00Z")), "1 de agosto de 2026");
  assert.equal(dataAvisoSetorial(new Date("2026-12-31T23:30:00Z")), "31 de dezembro de 2026");
});

test("título curto e título longo: sem truncar e com quebra de palavras longas", () => {
  assert.match(aviso({ titulo: "Água" }), /<h1 [^>]*>Água<\/h1>/);
  const longo = "Alteração das condições gerais de vários operadores de telecomunicações a partir de janeiro, com impacto nas mensalidades e nos períodos de fidelização";
  const html = aviso({ titulo: longo });
  assert.ok(html.includes(`>${longo}</h1>`));
  assert.match(html, /<h1 style="[^"]*overflow-wrap:break-word;/);
  semValoresEstranhos(html);
});

test("texto principal longo: parágrafos separados, quebras simples mantidas", () => {
  const descricao = "Primeiro parágrafo.\nCom uma linha seguida.\r\n\r\nSegundo parágrafo.\n\n\n  Terceiro.  ";
  const html = aviso({ descricao: `${descricao}${" palavra".repeat(300)}` });
  assert.ok(html.includes("Primeiro parágrafo.<br>Com uma linha seguida.</p>"));
  assert.ok(html.includes(">Segundo parágrafo.</p>"));
  assert.ok(html.includes(">Terceiro."));
  assert.equal((html.match(/margin-bottom:12px/g) ?? []).length, 2, "só entre parágrafos");
  semValoresEstranhos(html);
});

test("sem CTA nem secção de recomendação: o aviso não tem esses dados", () => {
  const html = aviso();
  assert.equal(/O que recomendamos/i.test(html), false);
  // O único botão da moldura é o verde com fundo; não há nenhum.
  assert.equal(/<td style="border-radius:10px; background-color:#0A7A4F;"/.test(html), false);
  assert.equal(html.includes("Se tiver perguntas"), false);
});

test("sem empresa: nenhum campo de empresa/operador inventado", () => {
  assert.equal(/operador|empresa:/i.test(visivel(aviso())), false);
});

test("nome vazio: cumprimento sem espaço solto; descrição vazia: sem caixa vazia", () => {
  const html = aviso({ nome: "  ", descricao: "   " });
  assert.ok(visivel(html).includes("Olá,"));
  assert.equal(html.includes("background-color:#F4F8FC; border:1px solid #D6E4F5"), false);
  semValoresEstranhos(html);
});

test("os três setores aparecem no texto, no rótulo e no motivo do rodapé", () => {
  for (const setor of ["Telecomunicações", "Energia", "Água"]) {
    const html = aviso({ setor });
    assert.ok(html.includes(`Aviso setorial · ${setor}`));
    assert.ok(html.includes(`aviso sobre o setor de ${setor},`));
    assert.ok(html.includes(`receber avisos sobre o setor de ${setor}.`));
  }
});

test("rodapé: motivo do envio, preferências no portal e identificação da DoLado", () => {
  const html = aviso();
  assert.ok(html.includes('href="https://portal.dolado.pt/portal/perfil#avisos"'));
  assert.ok(html.indexOf("Recebe este e-mail porque") < html.indexOf("Do lado dos consumidores."));
  assert.ok(html.includes("mailto:contacto@dolado.pt"));
});

test("pré-visualização na caixa de entrada é o título, com escape", () => {
  const html = aviso({ titulo: 'Preços & "novas" regras' });
  assert.match(html, /mso-hide:all;[^"]*">Preços &amp; &quot;novas&quot; regras<\/div>/);
});

test("telemóvel e desktop: largura fluida até 560px, sem larguras fixas no conteúdo, sem tom alarmista", () => {
  const html = aviso();
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1.0">/);
  assert.match(html, /width="100%"[^>]*style="max-width:560px;"/);
  assert.equal(/width="(?!100%|30")\d+/.test(html), false, "só o logótipo tem largura fixa");
  assert.equal(/URGENTE|<script|!{2}/i.test(html), false);
  assert.match(html, /<meta name="color-scheme" content="light">/);
});
