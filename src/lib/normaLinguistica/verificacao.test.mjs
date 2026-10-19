// A DoLado escreve em português europeu, na ortografia tradicional anterior
// ao Acordo Ortográfico de 1990 (docs/identidade-linguistica-dolado.md).
// Este teste falha quando um texto visível usa a grafia do Acordo
// ("proteção", "fatura", "setor", "atual"…). Para corrigir:
//   node scripts/dev/ortografia-tradicional.mjs --corrigir
// Excepções justificadas: src/lib/normaLinguistica/excecoes.ts.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { varrer } from "./varrimento.mjs";

describe("ortografia tradicional nos textos visíveis", () => {
  test("nenhum texto em português usa a grafia do Acordo de 1990", () => {
    const achados = varrer();
    const lista = achados.map((a) => `  ${a.ficheiro}:${a.linha} — ${a.palavras.join(", ")} — "${a.texto.slice(0, 80)}"`);
    assert.equal(
      achados.length,
      0,
      `Grafia fora da norma da DoLado (corrigir com node scripts/dev/ortografia-tradicional.mjs --corrigir):\n${lista.join("\n")}`,
    );
  });
});
