// Estado do caso visto pelo cliente no portal — `npm test`. Só apresentação:
// cobre todos os valores de casos.status e a prioridade do texto em curso.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EVENTOS_CASO } from "../textoCaso.ts";
import { EVENTOS_CASO_CLIENTE, estadoCasoCliente, rotuloEventoCliente } from "./estadoCaso.ts";

const STATUS = ["Novo", "Em investigação", "Aguardando operador", "Aguardando decisão cliente", "Resolvido", "Bloqueado"];

describe("estadoCasoCliente", () => {
  test("todos os estados da base de dados têm rótulo humano e explicação", () => {
    for (const s of STATUS) {
      const e = estadoCasoCliente(s);
      assert.ok(e.rotulo && e.explicacao, s);
      assert.notEqual(e.rotulo, s === "Resolvido" ? "" : s, `rótulo técnico em ${s}`);
    }
  });

  test("só a decisão sobre a proposta pede ação pelo estado do caso", () => {
    for (const s of STATUS) assert.equal(estadoCasoCliente(s).requerAcao, s === "Aguardando decisão cliente", s);
  });

  test("texto à espera de autorização pede ação, exceto em caso resolvido ou à espera de decisão", () => {
    const e = estadoCasoCliente("Em investigação", "aguardando_aprovacao");
    assert.equal(e.requerAcao, true);
    assert.equal(e.rotulo, "Precisamos da sua autorização");
    assert.equal(estadoCasoCliente("Resolvido", "aguardando_aprovacao").rotulo, "Resolvido");
    assert.equal(estadoCasoCliente("Aguardando decisão cliente", "autorizado").rotulo, "Precisa da sua decisão");
  });

  test("estado desconhecido não falha nem mostra o valor interno", () => {
    const e = estadoCasoCliente("valor_novo");
    assert.equal(e.rotulo, "Em acompanhamento");
    assert.equal(e.requerAcao, false);
  });
});

describe("eventos do caso no portal", () => {
  test("todos os eventos da equipa têm versão para o cliente", () => {
    for (const tipo of Object.keys(EVENTOS_CASO)) assert.ok(EVENTOS_CASO_CLIENTE[tipo], tipo);
  });

  test("evento desconhecido não mostra o tipo interno", () => {
    assert.equal(rotuloEventoCliente("tipo_interno_x"), "Atualização do caso");
  });

  test("na terceira pessoa, sem 'Cliente'", () => {
    for (const t of Object.values(EVENTOS_CASO_CLIENTE)) assert.doesNotMatch(t, /cliente/i);
  });
});
