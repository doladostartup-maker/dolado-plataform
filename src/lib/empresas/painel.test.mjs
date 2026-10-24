// DoLado Empresas — Fase 7: agregações do painel (meses incompletos, sem
// histórico, base do IVA) e regras estáticas do portal (`npm test`).
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  BASE_IVA,
  avisoDoEstado,
  despesasPorMes,
  eurosComIva,
  evolucao,
  mesDaFatura,
  ordenarHistorico,
  porInstalacao,
  porSector,
  proximosPrazos,
  quandoPrazo,
  rotuloMes,
} from "./painel.ts";
import { classificarFatura } from "./classificacao.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");

let n = 0;
const fatura = (contrato_id, mes, total_cents, extra = {}) => ({
  id: `f${++n}`,
  contrato_id,
  periodo_inicio: `${mes}-01`,
  periodo_fim: `${mes}-28`,
  data_emissao: `${mes}-05`,
  total_cents,
  ...extra,
});

describe("despesas por mês", () => {
  test("sem facturas: nenhum mês e histórico insuficiente", () => {
    const meses = despesasPorMes([], "2026-10");
    assert.deepEqual(meses, []);
    assert.deepEqual(evolucao(meses), { suficiente: false });
  });

  test("soma por mês e mês actual nunca é completo", () => {
    const meses = despesasPorMes([fatura("a", "2026-09", 1000), fatura("b", "2026-09", 2500), fatura("a", "2026-10", 1100)], "2026-10");
    assert.deepEqual(
      meses.map((m) => [m.mes, m.totalCents, m.faturas, m.completo]),
      [
        ["2026-09", 3500, 2, true],
        ["2026-10", 1100, 1, false],
      ],
    );
  });

  test("mês sem a factura de um serviço activo fica incompleto e fora da evolução", () => {
    const faturas = [
      fatura("a", "2026-06", 1000),
      fatura("b", "2026-06", 2000),
      fatura("a", "2026-07", 1000), // falta a de b
      fatura("a", "2026-08", 1200),
      fatura("b", "2026-08", 2000),
    ];
    const meses = despesasPorMes(faturas, "2026-10");
    assert.deepEqual(
      meses.map((m) => m.completo),
      [true, false, true],
    );
    const evo = evolucao(meses);
    assert.equal(evo.suficiente, true);
    assert.equal(evo.anterior.mes, "2026-06");
    assert.equal(evo.atual.mes, "2026-08");
    assert.equal(evo.diferencaCents, 200);
  });

  test("serviço novo não torna incompletos os meses anteriores à sua primeira factura", () => {
    const meses = despesasPorMes([fatura("a", "2026-07", 1000), fatura("a", "2026-08", 1000), fatura("b", "2026-08", 500)], "2026-10");
    assert.deepEqual(
      meses.map((m) => m.completo),
      [true, true],
    );
  });

  test("um só mês completo: histórico insuficiente", () => {
    assert.deepEqual(evolucao(despesasPorMes([fatura("a", "2026-09", 1000)], "2026-10")), { suficiente: false });
  });

  test("facturas sem total ou sem data não entram; sem período usa a emissão", () => {
    const meses = despesasPorMes(
      [
        fatura("a", "2026-09", null),
        { id: "x", contrato_id: "a", periodo_inicio: null, periodo_fim: null, data_emissao: null, total_cents: 900 },
        { id: "y", contrato_id: "a", periodo_inicio: null, periodo_fim: null, data_emissao: "2026-08-20", total_cents: 700 },
      ],
      "2026-10",
    );
    assert.deepEqual(
      meses.map((m) => [m.mes, m.totalCents]),
      [["2026-08", 700]],
    );
    assert.equal(mesDaFatura({ periodo_inicio: null, data_emissao: "2026-08-20" }), "2026-08");
  });

  test("no máximo 12 meses, os mais recentes", () => {
    const mes = (i) => `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
    const faturas = Array.from({ length: 15 }, (_, i) => fatura("a", mes(i), 100));
    const meses = despesasPorMes(faturas, "2026-10");
    assert.equal(meses.length, 12);
    assert.equal(meses[meses.length - 1].mes, "2026-03");
  });
});

describe("distribuição e comparação", () => {
  const servicos = [
    { id: "a", setor: "telecomunicacoes", fornecedor: "X", instalacao_id: "i1", data_fim_fidelizacao: null, data_fim_promocao: null },
    { id: "b", setor: "eletricidade", fornecedor: "Y", instalacao_id: "i2", data_fim_fidelizacao: null, data_fim_promocao: null },
    { id: "c", setor: null, fornecedor: null, instalacao_id: null, data_fim_fidelizacao: null, data_fim_promocao: null },
  ];
  const instalacoes = [
    { id: "i1", nome: "Loja" },
    { id: "i2", nome: "Armazém" },
  ];
  const faturas = [fatura("a", "2026-09", 1000), fatura("b", "2026-09", 3000), fatura("c", "2026-09", 50), fatura("b", "2026-05", 9999)];

  test("por sector, só nos meses indicados, do maior para o menor", () => {
    assert.deepEqual(
      porSector(faturas, servicos, ["2026-09"]).map((p) => [p.nome, p.totalCents]),
      [
        ["Electricidade", 3000],
        ["Telecomunicações", 1000],
        ["Outro", 50],
      ],
    );
  });

  test("por instalação, com os serviços sem instalação à parte", () => {
    assert.deepEqual(
      porInstalacao(faturas, servicos, instalacoes, ["2026-09"]).map((p) => [p.nome, p.totalCents]),
      [
        ["Armazém", 3000],
        ["Loja", 1000],
        ["Sem instalação", 50],
      ],
    );
  });
});

describe("prazos, histórico e apresentação", () => {
  test("próximos prazos dentro da janela, ordenados", () => {
    const servicos = [
      { id: "a", setor: "telecomunicacoes", fornecedor: "X", instalacao_id: null, data_fim_fidelizacao: "2026-12-01", data_fim_promocao: "2026-10-24" },
      { id: "b", setor: "eletricidade", fornecedor: "Y", instalacao_id: null, data_fim_fidelizacao: "2026-10-01", data_fim_promocao: "2027-06-01" },
    ];
    assert.deepEqual(
      proximosPrazos(servicos, "2026-10-24").map((p) => [p.servicoId, p.tipo, p.dias]),
      [
        ["a", "promocao", 0],
        ["a", "fidelizacao", 38],
      ],
    );
    assert.equal(proximosPrazos(servicos, "2026-10-24", 365).length, 3);
    assert.equal(quandoPrazo(0), "hoje");
    assert.equal(quandoPrazo(1), "amanhã");
    assert.equal(quandoPrazo(12), "daqui a 12 dias");
  });

  test("histórico do mais recente para o mais antigo, sem entradas vazias", () => {
    const h = ordenarHistorico([{ data: "2026-09-01T10:00:00Z", texto: "a" }, null, { data: "2026-10-01T10:00:00Z", texto: "b" }, { data: "", texto: "c" }]);
    assert.deepEqual(
      h.map((e) => e.texto),
      ["b", "a"],
    );
  });

  test("valores sempre com a base do IVA", () => {
    assert.equal(BASE_IVA, "com IVA");
    assert.match(eurosComIva(123456), /^1\s?234,56\s€ com IVA$/);
    assert.equal(rotuloMes("2026-10"), "Out. 2026");
  });

  test("avisos do estado da conta", () => {
    assert.equal(avisoDoEstado("ativa"), null);
    assert.equal(avisoDoEstado("pagamento_em_atraso").tom, "atencao");
    assert.match(avisoDoEstado("suspensa").texto, /não carregar documentos novos/);
    assert.equal(avisoDoEstado("cancelada").tom, "info");
  });

  test("classificação das facturas na lista", () => {
    assert.deepEqual(classificarFatura({ total_cents: 1000, em_verificacao: false }, false), { classificacao: "facto_confirmado", provisorio: false });
    assert.deepEqual(classificarFatura({ total_cents: 1000, em_verificacao: true }, false), { classificacao: "requer_verificacao", provisorio: false });
    assert.deepEqual(classificarFatura({ total_cents: null }, false), { classificacao: "informacao_insuficiente", provisorio: false });
    assert.equal(classificarFatura({ total_cents: 1000 }, true).provisorio, true);
  });
});

describe("portal da empresa: regras estáticas", () => {
  const pasta = "src/app/[idioma]/empresa";
  const ficheiros = (dir) =>
    readdirSync(join(RAIZ, dir)).flatMap((f) => {
      const c = join(dir, f);
      return statSync(join(RAIZ, c)).isDirectory() ? ficheiros(c) : [c];
    });
  const paginas = ficheiros(pasta).filter((f) => f.endsWith("page.tsx"));

  test("todas as secções da navegação existem", () => {
    for (const s of ["instalacoes", "servicos", "documentos", "alertas", "historico", "definicoes"]) {
      assert.ok(paginas.includes(join(pasta, s, "page.tsx")), s);
    }
  });

  test("nenhuma página do portal lê com a service role", () => {
    for (const f of paginas) {
      assert.doesNotMatch(ler(f), /createAdminClient|supabase\/admin/, f);
    }
    for (const f of ["src/lib/empresas/portalServidor.ts", "src/lib/empresas/portalSessao.ts", "src/lib/empresas/painel.ts"]) {
      assert.doesNotMatch(ler(f), /createAdminClient|supabase\/admin/, f);
    }
  });

  test("todas as páginas exigem a sessão da empresa", () => {
    for (const f of paginas) {
      assert.match(ler(f), /portalEmpresa\(|requireEmpresa\(/, f);
    }
  });

  test("o backoffice usa as mesmas agregações do portal", () => {
    const ficha = ler("src/app/backoffice/empresas/[id]/page.tsx");
    assert.match(ficha, /from "@\/lib\/empresas\/painel"/);
    assert.match(ficha, /carregarDadosPortal/);
  });
});
