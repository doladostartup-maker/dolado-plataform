// Leitura das respostas da Claude API — `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { textoDaResposta } from "./claude.ts";

test("ignora blocos de raciocínio antes do texto", () => {
  const corpo = {
    content: [
      { type: "thinking", thinking: "", signature: "x" },
      { type: "text", text: '{"ok":true}' },
    ],
  };
  assert.equal(textoDaResposta(corpo), '{"ok":true}');
});

test("resposta só com texto", () => {
  assert.equal(textoDaResposta({ content: [{ type: "text", text: "abc" }] }), "abc");
});

test("respostas inválidas devolvem undefined", () => {
  assert.equal(textoDaResposta(null), undefined);
  assert.equal(textoDaResposta({}), undefined);
  assert.equal(textoDaResposta({ content: [{ type: "thinking", thinking: "" }] }), undefined);
});
