// Diagnóstico gratuito — áreas do resultado (apresentacao.ts). `npm test`.
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
  test("factura sem nada a assinalar: só o que consta do contrato", () => {
    const s = seccoesDiagnostico(base({ calculos: [{ chave: "soma_linhas", somaCents: 5000, totalCents: 5000, coincide: true }] }));
    assert.deepEqual(s.calculos.map((c) => c.chave), ["soma_linhas"]);
    assert.deepEqual(s.destaques, [{ chave: "so_com_contrato", origem: "contrato" }]);
    assert.deepEqual(Object.keys(s).sort(), ["calculos", "destaques"]);
  });

  test("soma diferente, diferença face à mensalidade e cobranças pontuais ficam em destaque", () => {
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
    const chaves = s.destaques.map((i) => i.chave);
    assert.deepEqual(chaves, ["soma_linhas_difere", "diferenca_mensalidade", "cobrancas_pontuais", "so_com_contrato"]);
    // Só as cobranças pontuais positivas contam (o crédito não, a linha sem indicação também não).
    assert.deepEqual(s.destaques[2], { chave: "cobrancas_pontuais", origem: "documento", quantidade: 1, totalCents: 740 });
  });

  test("factura com menos do que a mensalidade fica em A", () => {
    const s = seccoesDiagnostico(base({ calculos: [{ chave: "diferenca_mensalidade", totalCents: 3000, mensalidadeCents: 4000, diferencaCents: -1000 }] }));
    assert.equal(s.calculos[0].chave, "diferenca_mensalidade");
    assert.ok(!s.destaques.some((i) => i.chave === "diferenca_mensalidade"));
  });

  test("datas: próximas e passadas ficam em destaque; distantes ficam em A", () => {
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
    assert.deepEqual(s.destaques, [
      { chave: "data_proxima", origem: "documento", tipo: "promocao", data: "2026-12-01", dias: 40 },
      { chave: "data_passada", origem: "documento", tipo: "fidelizacao", data: "2026-01-01" },
    ]);
  });

  test("o que não foi lido aparece como não confirmado", () => {
    const s = seccoesDiagnostico(base({ porConfirmar: ["fornecedor", "total"] }));
    assert.deepEqual(
      s.destaques.filter((i) => i.origem === "nao_confirmado").map((i) => i.campo),
      ["fornecedor", "total"],
    );
  });

  test("só factos: os textos não dizem à pessoa o que fazer", async () => {
    const { diagnostico: pt } = await import("../../i18n/mensagens/pt-PT/diagnostico.ts");
    const d = pt.resultado.destaques;
    const textos = [
      d.soma_linhas_difere("1,00 €", "2,00 €"),
      d.diferenca_mensalidade("1,00 €", "2,00 €"),
      d.cobrancas_pontuais(1, "1,00 €"),
      d.cobrancas_pontuais(2, "1,00 €"),
      d.data_proxima.fidelizacao("1 de Janeiro", "3"),
      d.data_proxima.promocao("1 de Janeiro", "3"),
      d.data_passada.fidelizacao("1 de Janeiro"),
      d.data_passada.promocao("1 de Janeiro"),
      d.so_com_contrato,
      pt.resultado.seccoes.destaquesTexto,
    ].join(" ");
    for (const proibido of ["confirme", "peça", "recomend", "deve ", "compare", "indevid", "ilegal"]) {
      assert.ok(!textos.toLowerCase().includes(proibido), proibido);
    }
    assert.ok(!("recomendacoes" in pt.resultado));
  });

  test("sem I/O nem IA", () => {
    const c = fonte("./apresentacao.ts");
    for (const proibido of ["import(", "fetch(", "supabase", "claude", "anthropic"]) assert.ok(!c.toLowerCase().includes(proibido), proibido);
  });
});
