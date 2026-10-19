// Escape do texto do cliente/admin nos e-mails de boas-vindas e do aviso
// sectorial — `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { montarHtmlBoasVindas } from "./boas-vindas.ts";
import { montarHtmlAvisoSetorial } from "./avisoSetorial.ts";

const MALICIOSO = '<a href="https://phishing.invalid">Clique aqui</a><script>x()</script>';

function semHtmlInjetado(html) {
  assert.equal(html.includes('phishing.invalid">'), false);
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("&lt;a href=&quot;https://phishing.invalid&quot;&gt;"));
}

test("boas-vindas: o nome do cliente passa por escape", () => {
  semHtmlInjetado(montarHtmlBoasVindas(MALICIOSO));
  assert.ok(montarHtmlBoasVindas("Ana & Rui").includes("Olá Ana &amp; Rui,"));
});

test("aviso sectorial: nome, título e descrição passam por escape", () => {
  semHtmlInjetado(montarHtmlAvisoSetorial(MALICIOSO, "Energia", "Título", "Descrição"));
  semHtmlInjetado(montarHtmlAvisoSetorial("Ana", "Energia", MALICIOSO, "Descrição"));
  semHtmlInjetado(montarHtmlAvisoSetorial("Ana", "Energia", "Título", MALICIOSO));
});

test("aviso sectorial: quebras de linha da descrição mantêm-se, acentos intactos", () => {
  const html = montarHtmlAvisoSetorial("Ana", "Água", "Subida de preços", "Linha 1\nLinha 2");
  assert.ok(html.includes("Linha 1<br>Linha 2"));
  assert.ok(html.includes("Publicámos um aviso sobre o sector de Água,"));
});

test("boas-vindas: em nome da equipa, sem contacto pessoal, chamadas, operador nem prazo antigo", () => {
  const html = montarHtmlBoasVindas("Ana");
  assert.ok(html.includes("Recebemos o seu caso e vamos agora rever os elementos e documentos que nos enviou"));
  assert.ok(html.includes("A DoLado só enviará a reclamação depois de receber a sua autorização."));
  assert.ok(html.includes("Estamos do seu lado.") && html.includes("Equipa DoLado"));
  for (const proibido of [/Thiago/, /pessoalmente/i, /vou rever/i, /chamada/i, /telef/i, /operador/i, /1-2 dias/, /confirmar tudo/i, /importar/i]) {
    assert.equal(proibido.test(html), false, String(proibido));
  }
});
