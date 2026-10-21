// Área do parceiro (/portal/parceiro) — leitura do resumo, e-mail e regras
// estáticas (`npm test`). A base de dados tem os próprios testes em
// supabase/tests/database/area_parceiro.test.sql.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { areaParceiroAtiva, GRUPOS_COMISSAO, lerResumoArea, porReceberCents, temOportunidades } from "./area.ts";
import { montarEmailAcessoArea } from "../email/parceiros.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

const RESUMO = {
  parceiro: { nome: "Consultora", estado: "ativo", data_inicio: "2026-10-20" },
  codigos: ["AREA2345", "invalido", 3],
  condicoes: { comissao_protecao_cents: 500, comissao_caso_protecao_cents: 800, mensalidades_necessarias: 3, minimo_pagamento_cents: 2500 },
  contas_associadas: 4,
  conversoes: { protecao: 2, caso_protecao: 1 },
  comissoes: {
    pendente: { quantidade: 1, valor_cents: 500 },
    em_verificacao: { quantidade: 0, valor_cents: 0 },
    elegivel: { quantidade: 1, valor_cents: 800 },
    aprovada: { quantidade: 1, valor_cents: 500 },
    paga: { quantidade: 2, valor_cents: 1000 },
    anulada: { quantidade: 0, valor_cents: 0 },
  },
  oportunidades: { em_curso: 0, ganhas: 0, perdidas: 0 },
  pagamentos: [
    { pago_em: "2026-10-01", referencia: "TRF-1", total_cents: 1000, iva_cents: 230, total_transferido_cents: 1230, documento_parceiro: "FR 1", comissoes: 2 },
    { pago_em: null, referencia: "sem data" },
  ],
};

describe("Área do parceiro", () => {
  test("desligada por omissão", () => {
    assert.equal(areaParceiroAtiva(undefined), false);
    assert.equal(areaParceiroAtiva("0"), false);
    assert.equal(areaParceiroAtiva("1"), true);
  });

  test("lê o resumo e descarta valores inválidos", () => {
    const r = lerResumoArea(RESUMO);
    assert.ok(r);
    assert.deepEqual(r.codigos, ["AREA2345"]);
    assert.equal(r.contasAssociadas, 4);
    assert.deepEqual(r.conversoes, { protecao: 2, casoProtecao: 1 });
    assert.equal(r.condicoes?.mensalidades, 3);
    assert.equal(r.pagamentos.length, 1);
    assert.equal(r.pagamentos[0].transferidoCents, 1230);
    assert.equal(porReceberCents(r), 1300);
    assert.equal(temOportunidades(r), false);
    assert.deepEqual(Object.keys(r.comissoes), [...GRUPOS_COMISSAO]);
  });

  test("sem acesso (null), sem parceiro ou com estado desconhecido → null", () => {
    assert.equal(lerResumoArea(null), null);
    assert.equal(lerResumoArea([]), null);
    assert.equal(lerResumoArea({ parceiro: { nome: "X", estado: "em_negociacao" } }), null);
  });

  test("grupos em falta contam como zero", () => {
    const r = lerResumoArea({ parceiro: { nome: "X", estado: "suspenso" } });
    assert.ok(r);
    assert.equal(r.comissoes.paga.quantidade, 0);
    assert.equal(r.condicoes, null);
  });

  test("e-mail de acesso: ligação ao portal, sem dados de clientes, escapado", () => {
    const e = montarEmailAcessoArea({ idioma: "pt-PT", url: "https://portal.dolado.pt/login?next=%2Fportal%2Fparceiro&x=<b>" });
    assert.match(e.assunto, /área de parceiro/);
    assert.ok(!e.html.includes("<b>"));
    assert.match(e.texto, /portal\.dolado\.pt\/login/);
    const en = montarEmailAcessoArea({ idioma: "en-GB", url: "https://portal.dolado.pt/en/login" });
    assert.match(en.assunto, /partner area/);
  });

  test("o portal lê só com a sessão (nunca a service role) e só pela função do resumo", () => {
    const servidor = ler("./areaServidor.ts");
    assert.ok(!/createAdminClient|service_role/.test(servidor.replace(/\/\/.*$/gm, "")));
    assert.match(servidor, /rpc\("parceiro_area_resumo"\)/);
    const pagina = ler("../../app/[idioma]/portal/parceiro/page.tsx");
    assert.ok(!/createAdminClient/.test(pagina));
    assert.match(pagina, /areaParceiroAtiva\(\)\) notFound\(\)/);
  });

  test("dar e retirar o acesso: admin primeiro, service role depois", () => {
    const acoes = ler("../../app/backoffice/parceiros/actions.ts");
    for (const [ini, fim] of [
      ["export async function concederAreaParceiro", "export async function revogarAreaParceiro"],
      ["export async function revogarAreaParceiro", "// Oportunidades B2B"],
    ]) {
      const corpo = acoes.slice(acoes.indexOf(ini), acoes.indexOf(fim));
      assert.ok(corpo.indexOf("requireAdmin()") > -1 && corpo.indexOf("requireAdmin()") < corpo.indexOf("createAdminClient()"), ini);
    }
  });
});
