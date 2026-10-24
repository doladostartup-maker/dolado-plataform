// DoLado Empresas — Fase 6B: motivos de revisão (D3), classificação dos
// resultados e validação do registo da revisão (`npm test`).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { MOTIVOS_REVISAO, TEXTO_MOTIVO_REVISAO, motivosRevisao, validarRevisao } from "./revisao.ts";
import { TEXTO_CLASSIFICACAO, classificarResultado } from "./classificacao.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");

const NADA = {
  dentroPeriodoObrigatorio: false,
  confiancaBaixa: false,
  decididoPelaEmpresa: false,
  diferencaPotencial: false,
  sectorNovo: false,
  fornecedorNovo: false,
  totalDiferenteSoma: false,
  primeiraFaturaServico: false,
};

describe("motivos de revisão (D3)", () => {
  test("nos primeiros 30 dias, sempre", () => {
    assert.deepEqual(motivosRevisao({ ...NADA, dentroPeriodoObrigatorio: true }), ["periodo_inicial"]);
  });
  test("depois, só por excepção", () => {
    assert.deepEqual(motivosRevisao(NADA), []);
    for (const [facto, motivo] of [
      ["confiancaBaixa", "confianca_baixa"],
      ["decididoPelaEmpresa", "associacao_cliente"],
      ["diferencaPotencial", "diferenca_potencial"],
      ["sectorNovo", "sector_novo"],
      ["fornecedorNovo", "fornecedor_novo"],
      ["totalDiferenteSoma", "total_soma_linhas"],
      ["primeiraFaturaServico", "primeira_fatura_servico"],
    ]) {
      assert.deepEqual(motivosRevisao({ ...NADA, [facto]: true }), [motivo], facto);
    }
  });
  test("a lista de motivos é a mesma da base de dados e todos têm texto", () => {
    const sql = ler("supabase/migrations/20261105090000_empresas_revisao.sql");
    const naBd = [...sql.match(/where m not in \(([^)]*)\)/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    assert.deepEqual([...naBd].sort(), [...MOTIVOS_REVISAO].sort());
    for (const m of MOTIVOS_REVISAO) assert.ok(TEXTO_MOTIVO_REVISAO[m], m);
  });
});

describe("registo da revisão", () => {
  test("minutos inteiros, resultado conhecido, tipo de erro numa correcção", () => {
    assert.equal(validarRevisao({ minutos: "5", resultado: "confirmado", tipoErro: "", nota: "" }).ok, true);
    assert.equal(validarRevisao({ minutos: "", resultado: "confirmado", tipoErro: "", nota: "" }).ok, false);
    assert.equal(validarRevisao({ minutos: "601", resultado: "confirmado", tipoErro: "", nota: "" }).ok, false);
    assert.equal(validarRevisao({ minutos: "5", resultado: "talvez", tipoErro: "", nota: "" }).ok, false);
    assert.match(validarRevisao({ minutos: "5", resultado: "corrigido", tipoErro: "", nota: "" }).erro, /tipo de erro/);
    assert.deepEqual(validarRevisao({ minutos: "12", resultado: "corrigido", tipoErro: "extracao_valor", nota: " x " }), {
      ok: true,
      minutos: 12,
      resultado: "corrigido",
      tipoErro: "extracao_valor",
      nota: "x",
    });
  });
});

describe("classificação dos resultados", () => {
  const base = { valorLido: true, confiancaBaixa: false, diferencaPotencial: false, contratual: false, temContrato: true, revisaoNecessaria: false, revisto: false };
  test("facto lido e sem revisão pendente: confirmado por evidência documental", () => {
    assert.deepEqual(classificarResultado(base), { classificacao: "facto_confirmado", provisorio: false });
  });
  test("revisão pendente: provisório", () => {
    assert.deepEqual(classificarResultado({ ...base, revisaoNecessaria: true }), { classificacao: "facto_confirmado", provisorio: true });
    assert.deepEqual(classificarResultado({ ...base, revisaoNecessaria: true, revisto: true }), { classificacao: "facto_confirmado", provisorio: false });
  });
  test("diferença potencial ou leitura incerta por rever: requer verificação", () => {
    assert.equal(classificarResultado({ ...base, diferencaPotencial: true }).classificacao, "requer_verificacao");
    assert.equal(classificarResultado({ ...base, confiancaBaixa: true }).classificacao, "requer_verificacao");
    assert.equal(classificarResultado({ ...base, diferencaPotencial: true, revisto: true }).classificacao, "facto_confirmado");
  });
  test("sem contrato, as verificações contratuais ficam provisórias", () => {
    assert.deepEqual(classificarResultado({ ...base, contratual: true, temContrato: false, revisto: true }), {
      classificacao: "requer_verificacao",
      provisorio: true,
    });
  });
  test("valor não lido: informação insuficiente", () => {
    assert.equal(classificarResultado({ ...base, valorLido: false }).classificacao, "informacao_insuficiente");
  });
  test("nunca uma conclusão sobre a lei", () => {
    const textos = [...Object.values(TEXTO_CLASSIFICACAO), ...Object.values(TEXTO_MOTIVO_REVISAO)].join(" ");
    assert.doesNotMatch(textos, /irregular|indevid|ilegal|ilícit|viola/i);
  });
});

describe("pipeline e backoffice", () => {
  test("o pipeline marca a revisão das empresas e as ocorrências", () => {
    const s = ler("src/lib/monitor/servidor.ts");
    assert.match(s, /if \(empresa && !repetido\) \{\s*await marcarRevisaoEmpresa/);
    assert.match(s, /decididoPelaEmpresa: a\.papel === "cliente"/);
    assert.match(s, /gravarMotivosRevisao\(admin, documentoId, \["analise_manual"\]\)/);
    assert.match(s, /ocorrenciaEmpresa\(admin, ctx, "erro_extracao"/);
  });
  test("documento ilegível marcado pelo admin não conta para a quota", () => {
    assert.match(ler("src/lib/monitor/servidor.ts"), /estado === "ilegivel" && \(await contextoEmpresa\(admin, documentoId\)\)\) await quotaEmpresa\(admin, documentoId, "libertada"\)/);
  });
  test("o portal mostra «em verificação» enquanto a revisão está pendente", () => {
    assert.match(ler("src/app/[idioma]/empresa/documentos/page.tsx"), /estadoDocumentoEmpresa\(d, m\.revisao_necessaria && !m\.revisto_em\)/);
  });
});
