// Estado do caso visto pelo cliente no portal — `npm test`. Só apresentação:
// cobre todos os valores de casos.status e a prioridade do texto em curso.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EVENTOS_CASO, EVENTOS_CASO_INTERNOS } from "../textoCaso.ts";
import { EVENTOS_CASO_CLIENTE, cronologiaCliente, estadoCasoCliente, rotuloEventoCliente } from "./estadoCaso.ts";

const STATUS = [
  "Novo",
  "Em investigação",
  "Aguardando operador",
  "Resposta em análise",
  "Aguardando cliente",
  "Aguardando decisão cliente",
  "Resolvido",
  "Bloqueado",
  "Encerrado sem resolução",
];

describe("estadoCasoCliente", () => {
  test("todos os estados da base de dados têm rótulo humano e explicação", () => {
    for (const s of STATUS) {
      const e = estadoCasoCliente(s);
      assert.ok(e.rotulo && e.explicacao, s);
      assert.notEqual(e.rotulo, s === "Resolvido" ? "" : s, `rótulo técnico em ${s}`);
    }
  });

  test("só a confirmação da solução e o pedido de informação pedem ação pelo estado do caso", () => {
    for (const s of STATUS) assert.equal(estadoCasoCliente(s).requerAcao, s === "Aguardando decisão cliente" || s === "Aguardando cliente", s);
  });

  test("texto à espera de autorização pede ação, exceto em caso resolvido ou à espera de decisão", () => {
    const e = estadoCasoCliente("Em investigação", "aguardando_aprovacao");
    assert.equal(e.requerAcao, true);
    assert.equal(e.rotulo, "Precisamos da sua autorização");
    assert.equal(estadoCasoCliente("Resolvido", "aguardando_aprovacao").rotulo, "Resolvido");
    assert.equal(estadoCasoCliente("Aguardando decisão cliente", "autorizado").rotulo, "A empresa apresentou uma solução");
    assert.equal(estadoCasoCliente("Aguardando cliente", "aguardando_aprovacao").rotulo, "Precisamos de informação sua");
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

describe("acompanhamento depois do envio", () => {
  test("depois do envio: a aguardar resposta da empresa, nunca concluído", () => {
    const e = estadoCasoCliente("Aguardando operador");
    assert.equal(e.rotulo, "A aguardar resposta da empresa");
    assert.equal(e.explicacao, "A sua reclamação foi enviada. Estamos a aguardar a resposta da empresa.");
    assert.match(e.proximoPasso, /Não precisa de fazer nada neste momento/);
    assert.notEqual(e.tom, "concluido");
  });

  test("resposta recebida: em análise, sem pedir ação", () => {
    const e = estadoCasoCliente("Resposta em análise");
    assert.equal(e.rotulo, "Resposta recebida — em análise pela DoLado");
    assert.equal(e.requerAcao, false);
    assert.equal(estadoCasoCliente("Resposta em análise", null, { analiseSemResposta: true }).rotulo, "Em análise pela DoLado");
  });

  test("nova comunicação: textos próprios", () => {
    assert.match(estadoCasoCliente("Em investigação", null, { jaEnviado: true }).explicacao, /nova comunicação/);
    assert.match(estadoCasoCliente("Em investigação", "aguardando_aprovacao", { jaEnviado: true }).explicacao, /nova comunicação/);
  });

  test("cronologia: reclamação, referência e nova comunicação", () => {
    const itens = cronologiaCliente(
      [
        { tipo: "texto_preparado", created_at: "1" },
        { tipo: "comunicacao_enviada", created_at: "2", texto_id: "t1" },
        { tipo: "aguarda_resposta_empresa", created_at: "3" },
        { tipo: "comunicacao_recebida", created_at: "4" },
        { tipo: "nova_versao", created_at: "5" },
        { tipo: "comunicacao_enviada", created_at: "6", texto_id: "t2" },
        { tipo: "encaminhamento_registado", created_at: "7", dados: { rotulo: "Centro de Arbitragem" } },
      ],
      new Map([["t1", "LRE-1"]]),
    );
    assert.deepEqual(
      itens.map((i) => i.titulo),
      [
        "Texto da reclamação preparado",
        "Reclamação enviada",
        "A aguardar resposta da empresa",
        "Comunicação recebida da empresa",
        "Nova comunicação preparada",
        "Nova comunicação enviada à empresa",
        "Próximo passo indicado",
      ],
    );
    assert.equal(itens[1].detalhe, "Referência: LRE-1");
    assert.equal(itens[6].detalhe, "Centro de Arbitragem");
  });

  test("eventos internos não têm versão para o cliente", () => {
    for (const tipo of Object.keys(EVENTOS_CASO_INTERNOS)) assert.equal(EVENTOS_CASO_CLIENTE[tipo], undefined, tipo);
  });
});
