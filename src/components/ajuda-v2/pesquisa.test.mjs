import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { correspondeAPesquisa, normalizar, textoDe } from "./pesquisa.ts";

describe("pesquisa nas perguntas frequentes", () => {
  test("ignora maiúsculas e acentos", () => {
    assert.equal(normalizar("  Proteção e FATURA "), "protecao e fatura");
  });

  test("extrai o texto de respostas em JSX", () => {
    const resposta = { props: { children: [{ props: { children: ["Pode cancelar na área ", { props: { children: "Gestão de Subscrição" } }] } }, 14, false, null] } };
    assert.equal(textoDe(resposta).replace(/\s+/g, " ").trim(), "Pode cancelar na área Gestão de Subscrição 14");
  });

  test("todas as palavras têm de aparecer na pergunta ou na resposta", () => {
    const p = { pergunta: "Posso cancelar a Proteção?", resposta: "Sim, na Gestão de Subscrição." };
    assert.equal(correspondeAPesquisa(p, "cancelar protecao"), true);
    assert.equal(correspondeAPesquisa(p, "GESTAO subscricao"), true);
    assert.equal(correspondeAPesquisa(p, "cancelar reembolso"), false);
    assert.equal(correspondeAPesquisa(p, "   "), true);
  });
});
