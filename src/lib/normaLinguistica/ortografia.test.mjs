import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { converterTexto, grafiaTradicional, palavrasForaDaNorma } from "./ortografia.ts";

describe("grafia tradicional", () => {
  test("exemplos da norma", () => {
    const pares = {
      Proteção: "Protecção", "Caso + Proteção": "Caso + Protecção", fatura: "factura", faturação: "facturação",
      atualização: "actualização", atual: "actual", atualmente: "actualmente", ação: "acção", correção: "correcção",
      direção: "direcção", incorreta: "incorrecta", eletricidade: "electricidade", setor: "sector", objetivo: "objectivo",
      projeto: "projecto", atividade: "actividade", ativar: "activar", ativo: "activo", desativar: "desactivar",
      selecionar: "seleccionar", detetar: "detectar", respetivo: "respectivo", afetado: "afectado", exceção: "excepção",
      exato: "exacto", ótimo: "óptimo", perspetiva: "perspectiva", receção: "recepção", redação: "redacção",
      efetuado: "efectuado", exceto: "excepto", outubro: "Outubro", PROTEÇÃO: "PROTECÇÃO", "ativá-la": "activá-la",
    };
    for (const [ao90, tradicional] of Object.entries(pares)) assert.equal(converterTexto(ao90), tradicional, ao90);
  });

  test("palavras iguais antes e depois do Acordo não mudam", () => {
    for (const p of ["relativo", "alternativa", "iniciativa", "negativo", "direito", "informação", "situação", "contacto", "facto", "aceitar", "atum", "secção", "corretor", "Telecomunicações", "Fidelização"]) {
      assert.equal(grafiaTradicional(p), p, p);
    }
  });

  test("texto técnico não muda: parâmetros, caminhos, identificadores, slugs", () => {
    for (const t of ["/tratar-caso?setor=Energia", "setor_id", "x.setor", "/protecao", "fatura-2026", "data-ativo", "fatura.pdf"]) {
      assert.equal(converterTexto(t), t, t);
    }
    assert.equal(converterTexto("no seu setor."), "no seu sector.");
  });

  test("lista as palavras fora da norma", () => {
    assert.deepEqual(palavrasForaDaNorma("A Proteção atual da sua fatura."), ["Proteção", "atual", "fatura"]);
    assert.deepEqual(palavrasForaDaNorma("A Protecção actual da sua factura."), []);
  });
});
