// Diagnóstico gratuito — organização do resultado (apresentacao.ts). `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { DIAS_DATA_PROXIMA, MAX_DESCOBERTAS, apresentarDiagnostico, ehPeriodoMensal } from "./apresentacao.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const base = (extra = {}) => ({
  versao: "diagnostico_v2",
  tipo: "fatura",
  setor: "telecomunicacoes",
  fornecedor: "Operador X",
  factos: [],
  linhas: [],
  calculos: [],
  porConfirmar: [],
  ...extra,
});

const euros = (chave, valor) => ({ chave, tipo: "euros", valor, pagina: null });
const dataF = (chave, valor) => ({ chave, tipo: "data", valor, pagina: null });

describe("apresentarDiagnostico", () => {
  test("factura sem nada a destacar: estado sem_destaques, mas mostra o custo por ano", () => {
    const a = apresentarDiagnostico(
      base({ factos: [euros("mensalidade", 599)], calculos: [{ chave: "soma_linhas", somaCents: 599, totalCents: 599, coincide: true }] }),
    );
    assert.equal(a.estado, "sem_destaques");
    assert.deepEqual(a.descobertas, [{ chave: "custo_anual", mensalCents: 599, anualCents: 7188 }]);
    assert.deepEqual(a.calculosDetalhe.map((c) => c.chave), ["soma_linhas"]);
    // A Protecção faz sentido mesmo assim: o contrato pode ser acompanhado.
    assert.deepEqual(a.continuidade, [{ chave: "juntar_contrato" }]);
  });

  test("descobertas ordenadas por prioridade, com a comparação da próxima factura", () => {
    const a = apresentarDiagnostico(
      base({
        factos: [euros("mensalidade", 4000), euros("descontos", 500), euros("cessacao", 12000)],
        linhas: [
          { descricao: "Pacote", valorCents: 4000, recorrente: true },
          { descricao: "Acerto", valorCents: 740, recorrente: false },
          { descricao: "Crédito", valorCents: -200, recorrente: false },
        ],
        calculos: [
          { chave: "soma_linhas", somaCents: 4540, totalCents: 4740, coincide: false },
          { chave: "diferenca_mensalidade", totalCents: 4740, mensalidadeCents: 4000, diferencaCents: 740 },
          { chave: "dias_fim_fidelizacao", data: "2026-12-01", dias: 40 },
        ],
      }),
    );
    assert.equal(a.estado, "encontrou");
    assert.deepEqual(
      a.descobertas.map((x) => x.chave),
      ["data_proxima", "acima_mensalidade", "cobrancas_pontuais", "descontos", "cessacao"].slice(0, MAX_DESCOBERTAS),
    );
    // Só as cobranças pontuais positivas contam (o crédito não).
    assert.deepEqual(a.descobertas[2], { chave: "cobrancas_pontuais", quantidade: 1, totalCents: 740 });
    assert.deepEqual(a.continuidade, [
      { chave: "aviso_data", tipo: "fidelizacao", data: "2026-12-01", dias: 40 },
      { chave: "comparar_proxima" },
      { chave: "juntar_contrato" },
    ]);
  });

  test("factura com menos do que a mensalidade: a conta fica no detalhe", () => {
    const a = apresentarDiagnostico(base({ calculos: [{ chave: "diferenca_mensalidade", totalCents: 3000, mensalidadeCents: 4000, diferencaCents: -1000 }] }));
    assert.equal(a.calculosDetalhe[0].chave, "diferenca_mensalidade");
    assert.ok(!a.descobertas.some((x) => x.chave === "acima_mensalidade"));
  });

  test("datas: próximas, distantes e passadas", () => {
    const a = apresentarDiagnostico(
      base({
        tipo: "contrato",
        calculos: [
          { chave: "dias_fim_promocao", data: "2026-12-01", dias: 40 },
          { chave: "dias_fim_fidelizacao", data: "2027-12-01", dias: DIAS_DATA_PROXIMA + 1 },
          { chave: "fidelizacao_terminada", data: "2026-01-01" },
        ],
      }),
    );
    assert.deepEqual(
      a.descobertas.map((x) => [x.chave, x.tipo]),
      [
        ["data_proxima", "promocao"],
        ["data_passada", "fidelizacao"],
        ["data_futura", "fidelizacao"],
      ],
    );
    // Um contrato não leva "junte o contrato"; as duas datas futuras levam aviso.
    assert.deepEqual(a.continuidade.map((c) => c.chave), ["aviso_data", "aviso_data"]);
  });

  test("uma data que termina hoje não promete aviso", () => {
    const a = apresentarDiagnostico(base({ calculos: [{ chave: "dias_fim_fidelizacao", data: "2026-10-23", dias: 0 }] }));
    assert.ok(!a.continuidade.some((c) => c.chave === "aviso_data"));
  });

  test("valor por ano das cobranças mensais só num período mensal e sem mensalidade lida", () => {
    const linhas = [
      { descricao: "Internet", valorCents: 2500, recorrente: true },
      { descricao: "Box adicional", valorCents: 599, recorrente: true },
    ];
    const mensal = [dataF("periodo_inicio", "2026-09-01"), dataF("periodo_fim", "2026-09-30")];
    assert.ok(ehPeriodoMensal(mensal));
    const a = apresentarDiagnostico(base({ factos: mensal, linhas }));
    assert.deepEqual(a.descobertas, [{ chave: "recorrentes_anual", quantidade: 2, mensalCents: 3099, anualCents: 37188 }]);
    assert.equal(a.periodoMensal, true);

    const bimestral = [dataF("periodo_inicio", "2026-08-01"), dataF("periodo_fim", "2026-09-30")];
    assert.ok(!ehPeriodoMensal(bimestral));
    assert.deepEqual(apresentarDiagnostico(base({ factos: bimestral, linhas })).descobertas, []);
  });

  test("o que não foi lido fica à parte, nunca como descoberta", () => {
    const a = apresentarDiagnostico(base({ porConfirmar: ["fornecedor", "total"] }));
    assert.deepEqual(a.porConfirmar, ["fornecedor", "total"]);
    assert.deepEqual(a.descobertas, []);
  });

  test("os textos não concluem que algo está errado nem prometem poupanças", async () => {
    const { diagnostico: pt } = await import("../../i18n/mensagens/pt-PT/diagnostico.ts");
    const d = pt.resultado.descobertas;
    const c = pt.conversao.continuidade;
    const textos = [
      ...Object.values(d.significados),
      d.data_proxima.fidelizacao("1 de Janeiro"),
      d.data_proxima.promocao("1 de Janeiro"),
      d.data_futura.fidelizacao("1 de Janeiro"),
      d.data_passada.promocao("1 de Janeiro"),
      d.acima_mensalidade("1,00 €", "2,00 €"),
      d.cobrancas_pontuais(2, "1,00 €"),
      d.descontos("1,00 €"),
      d.cessacao("1,00 €"),
      d.soma_difere("1,00 €", "2,00 €"),
      d.custo_anual("1,00 €", "12,00 €"),
      pt.resultado.encontrou.semDestaques.fatura,
      c.texto,
      c.comparar_proxima,
      c.juntar_contrato,
      ...c.gerais,
    ].join(" ").toLowerCase();
    for (const proibido of ["confirme", "peça", "recomend", "deve ", "indevid", "ilegal", "errad", "poupa", "vai poupar", "tem direito"]) {
      assert.ok(!textos.includes(proibido), proibido);
    }
    // O preço não vive no dicionário (vem de planos.ts).
    assert.ok(!JSON.stringify(c).includes("4,99"));
  });

  test("sem I/O nem IA", () => {
    const c = fonte("./apresentacao.ts");
    for (const proibido of ["import(", "fetch(", "supabase", "claude", "anthropic"]) assert.ok(!c.toLowerCase().includes(proibido), proibido);
  });
});
