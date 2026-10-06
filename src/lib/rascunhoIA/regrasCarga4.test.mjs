// Carga jurídica 4 (Gás, Compras & Reembolsos, Ginásios) e âmbito da Lei
// n.º 23/96 — testes da seleção com as regras REAIS da migration
// (supabase/migrations/20261006140000_regras_juridicas_carga4.sql), lidas do
// ficheiro. `npm test`. As garantias na base de dados (todas inativas, campos
// preenchidos, nunca reescreve regras revistas) estão em
// supabase/tests/database/regras_carga4.test.sql.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { isServicoPublicoEssencial, PROBLEMAS, problemasDoSetor, SETORES } from "../pedidoCaso.ts";
import { CATEGORIAS_POR_PROBLEMA, regraAplicavelAoSetor, regraDaLeiServicosPublicosEssenciais, selecionarRegras } from "./regras.ts";

const HOJE = "2026-10-06";
const MIGRATION = new URL("../../../supabase/migrations/20261006140000_regras_juridicas_carga4.sql", import.meta.url);

const COLUNAS = [
  "codigo", "setor", "categoria", "subcategoria", "titulo", "diploma", "artigo", "resumo",
  "condicoes_aplicabilidade", "fonte_url", "em_vigor_desde", "revogada_em", "ativa", "revista_em", "revista_por",
  "efeito_juridico", "provas_necessarias", "resultado_pretendido", "palavras_chave",
];

/** Lê as tuplas do `insert … values (…), (…) on conflict` (só literais simples). */
function lerCarga() {
  const sql = readFileSync(MIGRATION, "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
  const corpo = sql.slice(sql.indexOf(") values") + ") values".length, sql.indexOf("on conflict (codigo)"));
  const linhas = [];
  let i = 0;
  const espacos = () => {
    while (i < corpo.length && /[\s,]/.test(corpo[i])) i++;
  };
  const texto = () => {
    let s = "";
    i++; // '
    for (;;) {
      if (corpo[i] === "'" && corpo[i + 1] === "'") {
        s += "'";
        i += 2;
      } else if (corpo[i] === "'") {
        i++;
        return s;
      } else {
        s += corpo[i++];
      }
    }
  };
  const valor = () => {
    espacos();
    if (corpo[i] === "'") return texto();
    if (corpo.startsWith("null", i)) return (i += 4), null;
    if (corpo.startsWith("false", i)) return (i += 5), false;
    if (corpo.startsWith("true", i)) return (i += 4), true;
    if (corpo.startsWith("array[", i)) {
      i += 6;
      const lista = [];
      for (;;) {
        espacos();
        if (corpo[i] === "]") return i++, lista;
        lista.push(texto());
      }
    }
    throw new Error(`Valor inesperado em ${i}: ${corpo.slice(i, i + 40)}`);
  };
  for (;;) {
    espacos();
    if (i >= corpo.length) break;
    assert.equal(corpo[i], "(", `tupla em ${i}`);
    i++;
    const linha = {};
    for (const c of COLUNAS) linha[c] = valor();
    espacos();
    assert.equal(corpo[i], ")", `fim da tupla ${linha.codigo}`);
    i++;
    linhas.push(linha);
  }
  return linhas;
}

const CARGA = lerCarga();
const porCodigo = Object.fromEntries(CARGA.map((r) => [r.codigo, r]));

/** As regras como ficarão depois de revistas e ativadas por Thiago/advogada. */
const revistas = CARGA.map((r, n) => ({ ...r, id: `c4-${n}`, ativa: true, revista_em: "2026-10-07" }));

// Regras das cargas 1–3 (só o necessário para a seleção), como estão em produção.
function existente(codigo, setor, categoria, diploma) {
  return {
    id: codigo, codigo, setor, categoria, subcategoria: null, titulo: codigo, diploma, artigo: "Artigo 1.º",
    resumo: "Resumo de teste aprovado.", condicoes_aplicabilidade: null, fonte_url: "https://diariodarepublica.pt/",
    em_vigor_desde: null, revogada_em: null, ativa: true, revista_em: "2026-10-06",
  };
}
const LEI_23_96 = "Lei n.º 23/96, de 26 de julho — Lei dos Serviços Públicos Essenciais";
const PRODUCAO = [
  existente("SPE_PRESCRICAO_6M", null, "Cobrança", LEI_23_96),
  existente("SPE_ONUS_PROVA", null, "Prova", LEI_23_96),
  existente("SPE_ACERTO_6M", null, "Faturação", LEI_23_96),
  existente("SPE_PREAVISO_CORTE_20D", null, "Suspensão", LEI_23_96),
  existente("SPE_ARBITRAGEM_NECESSARIA", null, "Resolução de conflitos", LEI_23_96),
  existente("CONS_NAO_SOLICITADO_9", null, "Cobrança", "Lei n.º 24/96, de 31 de julho — Lei de Defesa do Consumidor"),
  existente("LRE_RESPOSTA_15DU", null, "Reclamação", "Decreto-Lei n.º 156/2005, de 15 de setembro"),
  existente("DIST_LIVRE_RESOLUCAO", null, "Contrato", "Decreto-Lei n.º 24/2014, de 14 de fevereiro"),
  existente("ENE_FIDELIZACAO_MAX_12M_19", "Energia", "Fidelização", "Regulamento n.º 827/2023"),
  existente("ENE_ELEC_REDUCAO_ANTES_CORTE_78", "Energia", "Suspensão", "Regulamento n.º 827/2023"),
  existente("ENE_MUDANCA_GRATUITA_3S_242", "Energia", "Mudança de comercializador", "Regulamento n.º 827/2023"),
  existente("ENE_ELEC_TARIFA_SOCIAL_AUTO_201", "Energia", "Tarifa social", "Decreto-Lei n.º 15/2022"),
  existente("TEL_CESSACAO_ENCARGOS_136", "Telecomunicações", "Fidelização", "Lei n.º 16/2022"),
];
const TODAS = [...PRODUCAO, ...revistas];
const codigos = (setor, categoria, regras = TODAS) => selecionarRegras({ setor, categoria }, regras, HOJE).map((r) => r.codigo);

// ---------------------------------------------------------------------------
describe("carga jurídica 4 — conteúdo", () => {
  test("45 regras: 21 de Gás, 15 de Compras, 7 de Ginásios, 2 gerais; códigos únicos", () => {
    const conta = (s) => CARGA.filter((r) => r.setor === s).length;
    assert.equal(CARGA.length, 45);
    assert.equal(conta("Gás"), 21);
    assert.equal(conta("Compras & Reembolsos"), 15);
    assert.equal(conta("Ginásios"), 7);
    assert.equal(conta(null), 2);
    assert.equal(new Set(CARGA.map((r) => r.codigo)).size, CARGA.length);
    for (const r of PRODUCAO) assert.ok(!porCodigo[r.codigo], `não reescreve ${r.codigo}`);
  });

  test("11. nenhuma regra nova entra ativa ou revista", () => {
    for (const r of CARGA) {
      assert.equal(r.ativa, false, r.codigo);
      assert.equal(r.revista_em, null, r.codigo);
      assert.equal(r.revista_por, null, r.codigo);
    }
    // Inativas, nunca chegam à IA.
    assert.deepEqual(selecionarRegras({ setor: "Gás", categoria: "Outro" }, CARGA.map((r, n) => ({ ...r, id: `x${n}` })), HOJE), []);
  });

  test("12. diploma, artigo, fonte oficial e campos de apoio preenchidos", () => {
    for (const r of CARGA) {
      assert.ok(r.diploma.length >= 3, r.codigo);
      assert.ok(r.artigo, r.codigo);
      assert.match(r.fonte_url, /^https:\/\/(diariodarepublica\.pt|www\.erse\.pt)\//, r.codigo);
      assert.ok(r.efeito_juridico && r.provas_necessarias && r.resultado_pretendido, r.codigo);
      assert.ok(r.palavras_chave.length > 0, r.codigo);
      assert.ok(SETORES.includes(r.setor) || r.setor === null, r.codigo);
    }
  });

  test("Gás: gás natural, GPL canalizado e gás de garrafa distinguidos; sem regras só de eletricidade", () => {
    for (const r of CARGA.filter((r) => r.setor === "Gás")) {
      assert.match(r.codigo, /^GAS_/);
      assert.match(r.condicoes_aplicabilidade, /garrafa/, r.codigo);
      assert.match(r.condicoes_aplicabilidade, /confirmar na revisão/, r.codigo);
      assert.doesNotMatch(`${r.resumo} ${r.condicoes_aplicabilidade}`, /1,15 kVA|Baixa Tensão Normal|BTN/, r.codigo);
    }
    assert.match(porCodigo.GAS_TARIFA_SOCIAL_DL101.condicoes_aplicabilidade, /Só gás natural/);
  });

  test("4. regras do DL 84/2021 exigem vendedor profissional e excluem vendas entre particulares", () => {
    const dl84 = CARGA.filter((r) => r.diploma.startsWith("Decreto-Lei n.º 84/2021"));
    assert.equal(dl84.length, 11);
    for (const r of dl84) {
      assert.match(r.condicoes_aplicabilidade, /profissional/, r.codigo);
      assert.match(r.condicoes_aplicabilidade, /Não aplicar a vendas entre particulares/, r.codigo);
      assert.equal(r.em_vigor_desde, "2022-01-01", r.codigo);
    }
  });

  test("5. livre resolução só à distância ou fora do estabelecimento; compra em loja sem direito geral", () => {
    assert.match(porCodigo.COMPRA_LR_BENS_INICIO_10.condicoes_aplicabilidade, /à distância/);
    assert.match(porCodigo.COMPRA_LR_BENS_INICIO_10.resumo, /Não se aplica a compras presenciais/);
    const loja = porCodigo.COMPRA_LOJA_SEM_LR_2;
    assert.match(loja.titulo, /não há direito legal geral/);
    assert.match(loja.resumo, /não é um direito legal geral/);
    assert.doesNotMatch(loja.resumo, /tem direito a devolver/);
  });

  test("6. exceções à livre resolução enviadas com as regras de livre resolução", () => {
    for (const setor of ["Compras & Reembolsos", "Ginásios"]) {
      const enviadas = codigos(setor, setor === "Ginásios" ? "Cancelamento recusado" : "Devolução ou reembolso em falta");
      assert.ok(enviadas.includes("DIST_EXCECOES_17"), setor);
    }
    assert.match(porCodigo.DIST_EXCECOES_17.condicoes_aplicabilidade, /Ginásios: não decidir automaticamente/);
  });

  test("7. e 8. falta de conformidade e direito de rejeição não se confundem com livre resolução", () => {
    for (const c of ["COMPRA_CONFORMIDADE_5_7", "COMPRA_DIREITOS_CONFORMIDADE_15", "COMPRA_REJEICAO_30D_16"]) {
      assert.equal(porCodigo[c].categoria, "Conformidade", c);
    }
    assert.match(porCodigo.COMPRA_REJEICAO_30D_16.resumo, /não se confunde com a livre resolução/);
    assert.match(porCodigo.COMPRA_DIREITOS_CONFORMIDADE_15.resumo, /não pode escolher livremente/);
  });

  test("9. cláusulas de ginásio: possível cláusula abusiva, nunca conclusão automática", () => {
    const ccg = CARGA.filter((r) => r.codigo.startsWith("GIN_CCG_"));
    assert.equal(ccg.length, 3);
    for (const r of ccg) {
      // O que a IA recebe (resumo) tem de trazer a cautela.
      assert.match(r.resumo, /possível cláusula abusiva, que necessita de análise concreta/, r.codigo);
      assert.match(r.resumo, /não permite concluir que a cláusula é ilegal/, r.codigo);
      assert.match(r.efeito_juridico, /^Possível cláusula abusiva — necessita de análise concreta/, r.codigo);
      assert.doesNotMatch(r.efeito_juridico, /\bé (nula|ilegal|proibida)\b/, r.codigo);
    }
  });

  test("Ginásios: sem regras de cancelamento por doença, gravidez, desemprego ou mudança de casa", () => {
    for (const r of CARGA.filter((r) => r.setor === "Ginásios")) {
      assert.doesNotMatch(`${r.titulo} ${r.resumo}`, /doença|gravidez|desemprego|mudança de residência/i, r.codigo);
    }
  });
});

// ---------------------------------------------------------------------------
describe("Lei n.º 23/96 — só para serviços públicos essenciais", () => {
  test("lista positiva de setores", () => {
    for (const s of ["Telecomunicações", "Energia", "Gás", "Água"]) assert.equal(isServicoPublicoEssencial(s), true, s);
    for (const s of ["Compras & Reembolsos", "Ginásios", "", null, undefined, "Correios", "Transportes"]) {
      assert.equal(isServicoPublicoEssencial(s), false, String(s));
    }
  });

  test("identificação pelo diploma (e pelo código como reforço)", () => {
    assert.equal(regraDaLeiServicosPublicosEssenciais({ codigo: "X_1", diploma: LEI_23_96 }), true);
    assert.equal(regraDaLeiServicosPublicosEssenciais({ codigo: "NOVA_1", diploma: "Lei n.º 23/96, de 26 de julho" }), true);
    assert.equal(regraDaLeiServicosPublicosEssenciais({ codigo: "SPE_X", diploma: "Lei dos Serviços Públicos Essenciais" }), true);
    assert.equal(regraDaLeiServicosPublicosEssenciais({ codigo: "CONS_X", diploma: "Lei n.º 24/96, de 31 de julho" }), false);
    assert.equal(regraDaLeiServicosPublicosEssenciais({ codigo: "DIST_X", diploma: "Decreto-Lei n.º 24/2014" }), false);
  });

  test("regras gerais da Lei 23/96 nunca chegam a Compras nem a Ginásios", () => {
    for (const setor of ["Compras & Reembolsos", "Ginásios"]) {
      for (const problema of problemasDoSetor(setor)) {
        const enviadas = codigos(setor, problema);
        assert.ok(!enviadas.some((c) => c.startsWith("SPE_")), `${setor} / ${problema}: ${enviadas}`);
      }
    }
    // Nem a casos sem setor.
    assert.ok(!codigos(null, "Cobrança indevida").some((c) => c.startsWith("SPE_")));
  });

  test("3. e 13. continuam a chegar aos serviços públicos essenciais; as outras gerais não mudam", () => {
    for (const setor of ["Telecomunicações", "Energia", "Gás", "Água"]) {
      assert.ok(codigos(setor, "Cobrança indevida").includes("SPE_PRESCRICAO_6M"), setor);
      assert.ok(codigos(setor, "Cobrança indevida").includes("CONS_NAO_SOLICITADO_9"), setor);
    }
    for (const setor of ["Compras & Reembolsos", "Ginásios"]) {
      assert.ok(codigos(setor, "Cobrança indevida").includes("CONS_NAO_SOLICITADO_9"), setor);
    }
    assert.equal(regraAplicavelAoSetor(PRODUCAO[0], "Água"), true);
  });
});

// ---------------------------------------------------------------------------
describe("carga jurídica 4 — seleção por setor", () => {
  test("1. regras de Gás chegam a casos de Gás", () => {
    assert.ok(codigos("Gás", "Fidelização ou penalização").includes("GAS_FIDELIZACAO_MAX_12M_19"));
    assert.ok(codigos("Gás", "Corte ou falha de serviço").includes("GAS_CORTE_DIA_UTIL_79"));
    assert.ok(codigos("Gás", "Mudança de comercializador").includes("GAS_MUDANCA_COMERCIALIZADOR_242"));
    assert.ok(codigos("Gás", "Tarifa social").includes("GAS_TARIFA_SOCIAL_DL101"));
  });

  test("2. regras de Energia (incluindo as só de eletricidade) nunca chegam ao Gás; as de Gás nunca chegam à Energia", () => {
    for (const problema of problemasDoSetor("Gás")) {
      assert.ok(!codigos("Gás", problema).some((c) => c.startsWith("ENE_")), problema);
      assert.ok(!codigos("Energia", problema).some((c) => c.startsWith("GAS_")), problema);
    }
  });

  test("regras de Compras e Ginásios ficam no seu setor", () => {
    for (const setor of SETORES) {
      for (const problema of problemasDoSetor(setor)) {
        const enviadas = codigos(setor, problema);
        if (setor !== "Compras & Reembolsos") assert.ok(!enviadas.some((c) => c.startsWith("COMPRA_")), `${setor} / ${problema}`);
        if (setor !== "Ginásios") assert.ok(!enviadas.some((c) => c.startsWith("GIN_")), `${setor} / ${problema}`);
        assert.ok(enviadas.length <= 12);
      }
    }
  });

  test("10. ginásios: as únicas regras de contratação à distância são as gerais DIST_*, com a condição da forma de contratação", () => {
    const enviadas = codigos("Ginásios", "Cancelamento recusado");
    assert.ok(enviadas.includes("DIST_LIVRE_RESOLUCAO"));
    assert.ok(!enviadas.some((c) => /^GIN_.*(LR|DISTANCIA|LIVRE)/.test(c)));
    for (const c of enviadas.filter((c) => c.startsWith("DIST_") && porCodigo[c])) {
      assert.match(porCodigo[c].condicoes_aplicabilidade, /à distância/, c);
    }
  });

  test("cada regra da carga é alcançável por algum tipo de problema do seu setor (sem depender só de \"Outro\")", () => {
    for (const r of revistas) {
      const setores = r.setor ? [r.setor] : SETORES;
      const alcancavel = setores.some((s) =>
        problemasDoSetor(s)
          .filter((p) => p !== "Outro")
          .some((p) => selecionarRegras({ setor: s, categoria: p }, [r], HOJE).length === 1),
      );
      assert.ok(alcancavel, r.codigo);
    }
  });

  test("todos os tipos de problema têm categorias na tabela", () => {
    for (const p of PROBLEMAS) if (p !== "Outro") assert.ok(CATEGORIAS_POR_PROBLEMA[p], p);
  });
});
