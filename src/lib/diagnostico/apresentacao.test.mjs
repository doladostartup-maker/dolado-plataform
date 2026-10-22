// Diagnóstico gratuito — três áreas do resultado (apresentacao.ts). `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { DIAS_DATA_PROXIMA, seccoesDiagnostico } from "./apresentacao.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const base = (extra = {}) => ({
  versao: "diagnostico_v2",
  tipo: "fatura",
  setor: "eletricidade",
  fornecedor: "Comercializador X",
  factos: [],
  linhas: [],
  calculos: [],
  porConfirmar: [],
  ...extra,
});

describe("seccoesDiagnostico", () => {
  test("factura sem nada a assinalar: só o lembrete do contrato e recomendações gerais", () => {
    const s = seccoesDiagnostico(base({ calculos: [{ chave: "soma_linhas", somaCents: 5000, totalCents: 5000, coincide: true }] }));
    assert.deepEqual(s.calculos.map((c) => c.chave), ["soma_linhas"]);
    assert.deepEqual(s.confirmar, [{ chave: "so_com_contrato", origem: "contrato" }]);
    assert.deepEqual(s.recomendacoes, ["ter_contrato", "guardar_factura"]);
  });

  test("soma diferente, diferença face à mensalidade e cobranças pontuais passam para confirmação", () => {
    const s = seccoesDiagnostico(
      base({
        linhas: [
          { descricao: "Energia", valorCents: 4000, recorrente: true },
          { descricao: "Acerto", valorCents: 740, recorrente: false },
          { descricao: "Crédito", valorCents: -200, recorrente: false },
          { descricao: "Taxa", valorCents: 300, recorrente: null },
        ],
        calculos: [
          { chave: "soma_linhas", somaCents: 4840, totalCents: 5100, coincide: false },
          { chave: "diferenca_mensalidade", totalCents: 5100, mensalidadeCents: 4000, diferencaCents: 1100 },
        ],
      }),
    );
    assert.deepEqual(s.calculos, []);
    const chaves = s.confirmar.map((i) => i.chave);
    assert.deepEqual(chaves, ["soma_linhas_difere", "diferenca_mensalidade", "cobrancas_pontuais", "so_com_contrato"]);
    // Só as cobranças pontuais positivas contam (o crédito não, a linha sem indicação também não).
    assert.deepEqual(s.confirmar[2], { chave: "cobrancas_pontuais", origem: "documento", quantidade: 1, totalCents: 740 });
    assert.deepEqual(s.recomendacoes, ["comparar_anterior", "pedir_esclarecimento", "ter_contrato"]);
  });

  test("factura com menos do que a mensalidade fica em A", () => {
    const s = seccoesDiagnostico(base({ calculos: [{ chave: "diferenca_mensalidade", totalCents: 3000, mensalidadeCents: 4000, diferencaCents: -1000 }] }));
    assert.equal(s.calculos[0].chave, "diferenca_mensalidade");
    assert.ok(!s.confirmar.some((i) => i.chave === "diferenca_mensalidade"));
  });

  test("datas: próximas e passadas pedem confirmação; distantes ficam em A", () => {
    const s = seccoesDiagnostico(
      base({
        tipo: "contrato",
        calculos: [
          { chave: "dias_fim_promocao", data: "2026-12-01", dias: 40 },
          { chave: "dias_fim_fidelizacao", data: "2027-12-01", dias: DIAS_DATA_PROXIMA + 1 },
          { chave: "fidelizacao_terminada", data: "2026-01-01" },
        ],
      }),
    );
    assert.deepEqual(s.calculos.map((c) => c.chave), ["dias_fim_fidelizacao"]);
    assert.deepEqual(s.confirmar, [
      { chave: "data_proxima", origem: "documento", tipo: "promocao", data: "2026-12-01", dias: 40 },
      { chave: "data_passada", origem: "documento", tipo: "fidelizacao", data: "2026-01-01" },
    ]);
    assert.deepEqual(s.recomendacoes, ["anotar_data", "rever_condicoes", "comparar_facturas_contrato"]);
  });

  test("o que não foi lido aparece como não confirmado; total ilegível sugere o PDF original", () => {
    const s = seccoesDiagnostico(base({ porConfirmar: ["fornecedor", "total"] }));
    assert.deepEqual(
      s.confirmar.filter((i) => i.origem === "nao_confirmado").map((i) => i.campo),
      ["fornecedor", "total"],
    );
    assert.ok(s.recomendacoes.includes("pdf_original"));
    assert.ok(s.recomendacoes.length <= 4);
  });

  test("sem I/O nem IA", () => {
    const c = fonte("./apresentacao.ts");
    for (const proibido of ["import(", "fetch(", "supabase", "claude", "anthropic"]) assert.ok(!c.toLowerCase().includes(proibido), proibido);
  });
});
