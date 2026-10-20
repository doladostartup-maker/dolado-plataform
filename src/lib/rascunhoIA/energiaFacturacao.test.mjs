// Energia e Gás — selecção das regras jurídicas por tipo de problema
// (perfilEnergia.ts) com as regras REAIS: metadados das 157 regras de
// produção a 13/10/2026 (fixtures/regras-producao-2026-10-13.json), as 17
// regras solares e as 2 regras novas de
// 20261020140000_energia_fidelizacao_denuncia.sql (criadas inactivas e
// activadas por 20261020140100_ativar_regras_…, revistas por Thiago a
// 20/10/2026; aqui também o estado antes da activação). `npm test`.
// Cenários: docs/legal/auditoria-energia-facturacao-contratacao-2026-10-20.md (F).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  PROBLEMA_COBRANCA_APOS_CANCELAMENTO,
  PROBLEMA_CONTRATO_NAO_ACEITE,
  PROBLEMA_FACTURA_ACERTO,
  PROBLEMAS_AUTOCONSUMO,
  problemasDoSetor,
  SETORES,
} from "../pedidoCaso.ts";
import { construirContexto } from "./contexto.ts";
import { lerRegrasDaMigration } from "./lerRegrasMigration.mjs";
import { essenciaisEnergia, MAX_REGRAS_ENERGIA, usaPerfilEnergia } from "./perfilEnergia.ts";
import { CATEGORIAS_POR_PROBLEMA, regraAplicavelAoSetor, regraEmVigor, selecionarRegras } from "./regras.ts";

const HOJE = "2026-10-20";

const PRODUCAO = JSON.parse(readFileSync(new URL("./fixtures/regras-producao-2026-10-13.json", import.meta.url), "utf8")).regras.map(
  ([codigo, setor, categoria, diploma, artigo, ativa, revista_em, em_vigor_desde]) => ({
    id: codigo, codigo, setor, categoria, subcategoria: null, titulo: codigo, diploma, artigo,
    resumo: "Resumo aprovado.", condicoes_aplicabilidade: null, fonte_url: "https://www.erse.pt/",
    em_vigor_desde, revogada_em: null, ativa, revista_em,
  }),
);
const SOLARES = lerRegrasDaMigration(new URL("../../../supabase/migrations/20261013100000_energia_solar_autoconsumo.sql", import.meta.url)).map(
  (r) => ({ ...r, id: r.codigo, ativa: true, revista_em: "2026-10-13" }),
);
const NOVAS_MIGRATION = lerRegrasDaMigration(new URL("../../../supabase/migrations/20261020140000_energia_fidelizacao_denuncia.sql", import.meta.url));
const NOVAS_ATIVAS = NOVAS_MIGRATION.map((r) => ({ ...r, id: r.codigo, ativa: true, revista_em: "2026-10-21" }));

/** Antes da activação (regras novas inactivas). */
const HOJE_PRODUCAO = [...PRODUCAO, ...SOLARES, ...NOVAS_MIGRATION.map((r) => ({ ...r, id: r.codigo }))];
/** Depois de revistas e activadas as 2 regras novas (estado em produção). */
const DEPOIS_REVISAO = [...PRODUCAO, ...SOLARES, ...NOVAS_ATIVAS];

const sel = (setor, problema, forma = null, regras = DEPOIS_REVISAO) =>
  selecionarRegras({ setor, categoria: problema, detalhes: forma ? { forma_contratacao: forma } : null }, regras, HOJE).map((r) => r.codigo);

const contem = (lista, codigos, msg) => {
  for (const c of codigos) assert.ok(lista.includes(c), `${msg}: falta ${c}\n${lista.join(", ")}`);
};
const naoContem = (lista, codigos, msg) => {
  for (const c of codigos) assert.ok(!lista.includes(c), `${msg}: não devia ter ${c}\n${lista.join(", ")}`);
};
const dl24 = (lista) => lista.filter((c) => c.startsWith("DIST_"));

describe("Regras novas (20261020140000)", () => {
  test("2 regras de Energia, inactivas, por rever, nas categorias do perfil", () => {
    assert.deepEqual(NOVAS_MIGRATION.map((r) => r.codigo).sort(), ["ENE_DENUNCIA_SEM_ENCARGOS_81", "ENE_FIDELIZACAO_INDEMNIZACAO_19"]);
    const existentes = new Set(PRODUCAO.map((r) => r.codigo));
    for (const r of NOVAS_MIGRATION) {
      assert.equal(r.ativa, false, r.codigo);
      assert.equal(r.revista_em, null, r.codigo);
      assert.equal(r.setor, "Energia", r.codigo);
      assert.ok(!existentes.has(r.codigo), `${r.codigo} já existe`);
      assert.match(r.diploma, /^Regulamento n\.º 827\/2023/);
      assert.ok(r.fonte_url.startsWith("https://www.erse.pt/"));
      // O resumo não conclui pelo caso concreto.
      assert.match(r.resumo, /análise concreta|a todo o tempo/);
    }
    assert.equal(NOVAS_MIGRATION.find((r) => r.codigo === "ENE_FIDELIZACAO_INDEMNIZACAO_19").categoria, "Fidelização");
    assert.equal(NOVAS_MIGRATION.find((r) => r.codigo === "ENE_DENUNCIA_SEM_ENCARGOS_81").categoria, "Cancelamento");
  });

  test("a migration de activação activa exactamente estas 2, com data de revisão", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/20261020140100_ativar_regras_energia_fidelizacao_denuncia.sql", import.meta.url), "utf8");
    const codigos = [...sql.matchAll(/'(ENE_[A-Z0-9_]+)'/g)].map((m) => m[1]).sort();
    assert.deepEqual(codigos, NOVAS_MIGRATION.map((r) => r.codigo).sort());
    assert.match(sql, /ativa = true, revista_em = '2026-10-20', revista_por = 'Thiago Pereira'/);
  });

  test("inactivas: nunca chegam à IA antes da revisão", () => {
    for (const p of problemasDoSetor("Energia")) {
      naoContem(sel("Energia", p, null, HOJE_PRODUCAO), ["ENE_FIDELIZACAO_INDEMNIZACAO_19", "ENE_DENUNCIA_SEM_ENCARGOS_81"], p);
    }
  });
});

describe("Facturação e cobrança (cenários F)", () => {
  test("F1 — Energia, factura de acerto com estimativas: Lei 23/96 e leituras primeiro; sem caução", () => {
    const e = sel("Energia", PROBLEMA_FACTURA_ACERTO);
    contem(e, ["SPE_ACERTO_6M", "SPE_PRESCRICAO_6M", "SPE_ACERTO_EXCESSO", "SPE_ONUS_PROVA", "ENE_LEITURA_REAL_PREVALECE_42",
      "ENE_ESTIMATIVA_ESCOLHA_42", "ENE_FATURA_ATRASO_FRACIONAR_44", "ENE_RECLAM_FAT_SUSPENDE_CORTE_64"], "F1");
    naoContem(e, ["ENE_CAUCAO_CONSUMIDOR_23", "ENE_CHAMADA_GRAVADA_243", "ENE_CORTE_PREAVISO_79"], "F1");
    assert.equal(e[0], "SPE_ACERTO_6M");
  });

  test("F1 — Gás, factura de acerto: regras do gás e Lei 23/96; nenhuma de Energia", () => {
    const e = sel("Gás", PROBLEMA_FACTURA_ACERTO);
    contem(e, ["SPE_ACERTO_6M", "SPE_PRESCRICAO_6M", "GAS_LEITURA_ESTIMATIVA_42", "GAS_FATURACAO_PERIODICIDADE_44", "GAS_RECLAM_FAT_CORTE_RQS_64"], "F1 gás");
    assert.ok(!e.some((c) => c.startsWith("ENE_")), e.join(", "));
  });

  test("F2/F6 — Energia, cobrança indevida: prescrição, ónus da prova, serviços não pedidos e devolução do excesso", () => {
    const e = sel("Energia", "Cobrança indevida");
    contem(e, ["SPE_ONUS_PROVA", "SPE_PRESCRICAO_6M", "SPE_ACERTO_EXCESSO", "CONS_NAO_SOLICITADO_9", "PCD_NAO_SOLICITADO_12",
      "ENE_SERVICOS_ADICIONAIS_17", "ENE_RECLAM_FAT_SUSPENDE_CORTE_64"], "F2");
  });

  test("F3 — serviço adicional cobrado sem ter sido pedido: RRC art. 17.º chega à IA", () => {
    contem(sel("Energia", "Cobrança indevida"), ["ENE_SERVICOS_ADICIONAIS_17", "CONS_NAO_SOLICITADO_9"], "F3");
  });

  test("F4 — Energia, aviso de corte: fora do perfil (critério geral, como antes)", () => {
    assert.equal(usaPerfilEnergia("Energia", "Corte ou falha de serviço"), false);
    contem(sel("Energia", "Corte ou falha de serviço"), ["ENE_CORTE_PREAVISO_79", "ENE_RECLAM_FAT_SUSPENDE_CORTE_64", "SPE_PREAVISO_CORTE_20D"], "F4");
  });

  test("F5 — Gás, facturas do comercializador antigo depois da mudança", () => {
    const e = sel("Gás", PROBLEMA_COBRANCA_APOS_CANCELAMENTO);
    contem(e, ["GAS_MUDANCA_COMERCIALIZADOR_242", "GAS_DENUNCIA_SEM_ENCARGOS_81", "SPE_PRESCRICAO_6M", "SPE_ONUS_PROVA", "GAS_CAUCAO_23_27"], "F5");
  });

  test("F6 — Energia, cobrança depois de sair: factura final, denúncia (depois da revisão), caução", () => {
    const e = sel("Energia", PROBLEMA_COBRANCA_APOS_CANCELAMENTO);
    contem(e, ["ENE_MUDANCA_FATURA_FINAL_6S_242", "ENE_DENUNCIA_SEM_ENCARGOS_81", "SPE_PRESCRICAO_6M", "ENE_CAUCAO_RESTITUICAO_27"], "F6");
    contem(sel("Energia", PROBLEMA_COBRANCA_APOS_CANCELAMENTO, null, HOJE_PRODUCAO), ["ENE_MUDANCA_FATURA_FINAL_6S_242", "SPE_PRESCRICAO_6M"], "F6 hoje");
  });
});

describe("Contratação (cenários C) e forma de contratação", () => {
  test("C1 — mudança não autorizada por telefone: aceitação expressa, gravação, DL 24/2014 art. 5.º", () => {
    const e = sel("Energia", "Mudança de comercializador", "distancia");
    contem(e, ["ENE_ACEITACAO_EXPRESSA_20", "ENE_CHAMADA_GRAVADA_243", "DIST_TELEFONE_5", "CONS_NAO_SOLICITADO_9", "ENE_MUDANCA_GRATUITA_3S_242"], "C1");
    naoContem(e, ["DIST_FORA_ESTAB_FORMA_9"], "C1 (à distância)");
  });

  test("C2 — contrato assinado em casa, quer desistir: livre resolução e forma do contrato fora do estabelecimento", () => {
    const e = sel("Energia", "Cancelamento recusado", "domicilio");
    contem(e, ["ENE_DENUNCIA_SEM_ENCARGOS_81", "DIST_LIVRE_RESOLUCAO", "DIST_FORA_ESTAB_FORMA_9", "DIST_SERVICO_15"], "C2");
    naoContem(e, ["DIST_TELEFONE_5", "DIST_CONFIRMACAO_6"], "C2 (domicílio não é à distância)");
    // Mesmo antes da revisão das regras novas, a livre resolução chega.
    contem(sel("Energia", "Cancelamento recusado", "domicilio", HOJE_PRODUCAO), ["DIST_LIVRE_RESOLUCAO", "DIST_FORA_ESTAB_FORMA_9"], "C2 hoje");
  });

  test("contrato feito na loja: nenhuma regra do DL 24/2014", () => {
    for (const p of [PROBLEMA_CONTRATO_NAO_ACEITE, "Cancelamento recusado", "Mudança de comercializador"]) {
      assert.deepEqual(dl24(sel("Energia", p, "estabelecimento")), [], p);
    }
  });

  test("\"Não sei\" ou sem resposta: o DL 24/2014 pode chegar (a pessoa confirma na revisão)", () => {
    for (const forma of ["nao_sei", null]) {
      contem(sel("Energia", PROBLEMA_CONTRATO_NAO_ACEITE, forma), ["DIST_TELEFONE_5", "DIST_LIVRE_RESOLUCAO"], String(forma));
    }
  });

  test("C3 — penalização de uma fidelização de 24 meses: limite de 12 meses, contrapartida e indemnização", () => {
    const e = sel("Energia", "Fidelização ou penalização");
    contem(e, ["ENE_FIDELIZACAO_CONTRAPARTIDA_19", "ENE_FIDELIZACAO_MAX_12M_19", "ENE_FIDELIZACAO_INDEMNIZACAO_19", "ENE_DENUNCIA_SEM_ENCARGOS_81"], "C3");
  });

  test("C4 — aumento durante a fidelização: alteração de condições e art. 19.º", () => {
    contem(sel("Energia", "Aumento de mensalidade"), ["ENE_ALT_CONTRATO_68", "ENE_FIDELIZACAO_PRECO_19", "PCD_ACAO_ENGANOSA_7"], "C4");
  });

  test("C5 — condições diferentes das anunciadas / contrato não aceite", () => {
    const e = sel("Energia", PROBLEMA_CONTRATO_NAO_ACEITE, "nao_sei");
    contem(e, ["ENE_ACEITACAO_EXPRESSA_20", "ENE_CHAMADA_GRAVADA_243", "CONS_NAO_SOLICITADO_9", "PCD_NAO_SOLICITADO_12", "PCD_ACAO_ENGANOSA_7"], "C5");
  });

  test("C6 — Gás, contrato não aceite: regras do gás, nunca de Energia", () => {
    const e = sel("Gás", PROBLEMA_CONTRATO_NAO_ACEITE, "distancia");
    contem(e, ["GAS_ACEITACAO_EXPRESSA_20", "DIST_TELEFONE_5"], "C6");
    assert.ok(!e.some((c) => c.startsWith("ENE_")), e.join(", "));
  });
});

describe("Invariantes do perfil", () => {
  const TIPOS_PERFIL = [...new Set(problemasDoSetor("Energia").concat(problemasDoSetor("Gás")))].filter((p) => usaPerfilEnergia("Energia", p));

  test("só Energia e Gás, e nunca corte, tarifa social, outro ou painéis solares", () => {
    for (const setor of SETORES.filter((s) => s !== "Energia" && s !== "Gás")) {
      for (const p of problemasDoSetor(setor)) assert.equal(usaPerfilEnergia(setor, p), false, `${setor} / ${p}`);
    }
    for (const p of ["Corte ou falha de serviço", "Tarifa social", "Outro", ...PROBLEMAS_AUTOCONSUMO]) {
      assert.equal(usaPerfilEnergia("Energia", p), false, p);
    }
    assert.ok(TIPOS_PERFIL.length >= 8);
  });

  test("todos os códigos essenciais existem na base jurídica (produção ou migrations)", () => {
    const todos = new Set(DEPOIS_REVISAO.map((r) => r.codigo));
    for (const p of TIPOS_PERFIL) for (const c of essenciaisEnergia(p)) assert.ok(todos.has(c), `${p}: ${c}`);
  });

  test("limite, sector, vigência e Autoconsumo", () => {
    for (const setor of ["Energia", "Gás"]) {
      for (const p of TIPOS_PERFIL) {
        for (const forma of [null, "nao_sei", "estabelecimento", "domicilio", "distancia", "fora_estabelecimento"]) {
          const enviadas = selecionarRegras({ setor, categoria: p, detalhes: forma ? { forma_contratacao: forma } : null }, DEPOIS_REVISAO, HOJE);
          const msg = `${setor} / ${p} / ${forma}`;
          assert.ok(enviadas.length > 0 && enviadas.length <= MAX_REGRAS_ENERGIA, msg);
          assert.equal(new Set(enviadas.map((r) => r.codigo)).size, enviadas.length, msg);
          for (const r of enviadas) {
            assert.ok(regraEmVigor(r, HOJE), `${msg}: ${r.codigo}`);
            assert.ok(regraAplicavelAoSetor(r, setor), `${msg}: ${r.codigo}`);
            assert.ok(!["Autoconsumo", "CAER", "Crédito coligado"].includes(r.categoria), `${msg}: ${r.codigo}`);
          }
        }
      }
    }
  });

  test("os tipos novos têm categorias na tabela (formulário do backoffice)", () => {
    for (const p of [PROBLEMA_FACTURA_ACERTO, PROBLEMA_CONTRATO_NAO_ACEITE, PROBLEMA_COBRANCA_APOS_CANCELAMENTO]) {
      assert.ok(CATEGORIAS_POR_PROBLEMA[p]?.length > 0, p);
    }
  });

  test("Telecomunicações e Água: o mesmo tipo de problema segue o critério geral", () => {
    // Sem regras de Energia nem de Gás, e no máximo 12.
    for (const setor of ["Telecomunicações", "Água"]) {
      const e = sel(setor, "Cobrança indevida");
      assert.ok(e.length <= 12);
      assert.ok(!e.some((c) => c.startsWith("ENE_") || c.startsWith("GAS_")), setor);
    }
  });
});

describe("Contexto enviado à IA", () => {
  const caso = (problema_tipo, detalhes_caso, sector = "Energia") => ({
    id: "c1", utilizador_id: null, nome: "Maria Silva", sector, empresa: "EDP", problema_tipo, tipo_problema: null,
    descricao: "Mudaram-me de comercializador sem eu pedir.", momento_cliente: "Ainda não reclamei", data_fim_fidelidade: null,
    created_at: "2026-10-20T10:00:00Z", detalhes_caso,
  });

  test("contratação de Energia/Gás leva a forma de contratação em texto simples", () => {
    const c = construirContexto(caso("Mudança de comercializador", { forma_contratacao: "distancia" }), []);
    assert.match(c.pedido_do_cliente.forma_de_contratacao, /à distância/);
    assert.equal(c.pedido_do_cliente.paineis_solares, undefined);
    const sem = construirContexto(caso(PROBLEMA_CONTRATO_NAO_ACEITE, null, "Gás"), []);
    assert.equal(sem.pedido_do_cliente.forma_de_contratacao, "não indicado pelo cliente");
  });

  test("outros casos não levam a forma de contratação", () => {
    assert.equal(construirContexto(caso(PROBLEMA_FACTURA_ACERTO, null), []).pedido_do_cliente.forma_de_contratacao, undefined);
    assert.equal(construirContexto(caso("Cancelamento recusado", { forma_contratacao: "domicilio" }, "Telecomunicações"), []).pedido_do_cliente.forma_de_contratacao, undefined);
  });
});
