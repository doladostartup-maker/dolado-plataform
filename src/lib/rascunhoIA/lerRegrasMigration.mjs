// Leitura das regras de uma migration de carga jurídica (só para testes):
// as tuplas do `insert … values (…), (…) on conflict` com literais simples.
// Usado por regrasCarga4.test.mjs e autoconsumo.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const COLUNAS = [
  "codigo", "setor", "categoria", "subcategoria", "titulo", "diploma", "artigo", "resumo",
  "condicoes_aplicabilidade", "fonte_url", "em_vigor_desde", "revogada_em", "ativa", "revista_em", "revista_por",
  "efeito_juridico", "provas_necessarias", "resultado_pretendido", "palavras_chave",
];

export function lerRegrasDaMigration(MIGRATION) {
  const sql = readFileSync(MIGRATION, "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
  // Só o insert em regras_juridicas (a migration pode ter outras instruções antes).
  const inicio = sql.indexOf("insert into public.regras_juridicas");
  assert.ok(inicio >= 0, "insert em regras_juridicas");
  const corpo = sql.slice(sql.indexOf(") values", inicio) + ") values".length, sql.indexOf("on conflict (codigo)", inicio));
  const linhas = [];
  let i = 0;
  const espacos = () => {
    while (i < corpo.length && /[\s,]/.test(corpo[i])) i++;
  };
  const texto = () => {
    let s = "";
    i++; // '
    for (;;) {
      if (corpo[i] === "'" && corpo[i + 1] === "'") {
        s += "'";
        i += 2;
      } else if (corpo[i] === "'") {
        i++;
        return s;
      } else {
        s += corpo[i++];
      }
    }
  };
  const valor = () => {
    espacos();
    if (corpo[i] === "'") return texto();
    if (corpo.startsWith("null", i)) return (i += 4), null;
    if (corpo.startsWith("false", i)) return (i += 5), false;
    if (corpo.startsWith("true", i)) return (i += 4), true;
    if (corpo.startsWith("array[", i)) {
      i += 6;
      const lista = [];
      for (;;) {
        espacos();
        if (corpo[i] === "]") return i++, lista;
        lista.push(texto());
      }
    }
    throw new Error(`Valor inesperado em ${i}: ${corpo.slice(i, i + 40)}`);
  };
  for (;;) {
    espacos();
    if (i >= corpo.length) break;
    assert.equal(corpo[i], "(", `tupla em ${i}`);
    i++;
    const linha = {};
    for (const c of COLUNAS) linha[c] = valor();
    espacos();
    assert.equal(corpo[i], ")", `fim da tupla ${linha.codigo}`);
    i++;
    linhas.push(linha);
  }
  return linhas;
}

