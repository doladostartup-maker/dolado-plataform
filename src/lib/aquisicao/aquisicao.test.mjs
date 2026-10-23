// Painel Aquisição e Conversão — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { intervaloAnterior, lerCambio, lerIntervalo, maiorPerda, montarFunil, porUnidade, variacao } from "./regras.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const metricas = (s = {}, c = {}) => ({
  sessoes: { iniciaram: 100, carregaram: 80, concluiram: 70, viram: 60, clicaram_protecao: 20, clicaram_guardar: 5, com_conta: 12, sem_conta_depois_de_ver: 48, ...s },
  documentos: { reservados: 110, carregados: 90, analises_iniciadas: 90, concluidos: 75, falhados: 15, falhas_por_motivo: {}, vistos: 65, passados_ao_monitor: 4 },
  contas: { criadas_ou_ligadas: 12, experimental: 8, checkout: 4, pagas: 2, subscricoes_pagas: 1, ...c },
  por_canal: [],
  por_campanha: [],
  por_pagina_entrada: {},
  por_dispositivo: {},
  por_setor: [],
  serie_diaria: [],
  ia: { por_modelo: [], por_funcionalidade: [], gratuito_usd: 0, gratuito_falhado_usd: 0, total_usd: 0, coorte_usd: 0, serie_diaria: [] },
});

describe("períodos", () => {
  const agora = new Date("2026-10-22T10:00:00Z");
  test("30 dias por omissão, até ao fim de hoje (Lisboa)", () => {
    const i = lerIntervalo({}, agora);
    assert.equal(i.periodo, "30d");
    assert.equal(i.ate.toISOString(), "2026-10-22T23:00:00.000Z");
    assert.equal((i.ate - i.desde) / 86_400_000, 30);
  });
  test("hoje, no Inverno e no Verão", () => {
    assert.equal(lerIntervalo({ periodo: "hoje" }, agora).desde.toISOString(), "2026-10-21T23:00:00.000Z");
    assert.equal(lerIntervalo({ periodo: "hoje" }, new Date("2026-12-05T10:00:00Z")).desde.toISOString(), "2026-12-05T00:00:00.000Z");
  });
  test("personalizado inclui o último dia; inválido ou longo demais volta aos 30 dias", () => {
    const i = lerIntervalo({ periodo: "personalizado", desde: "2026-01-10", ate: "2026-01-11" }, agora);
    assert.equal(i.desde.toISOString(), "2026-01-10T00:00:00.000Z");
    assert.equal(i.ate.toISOString(), "2026-01-12T00:00:00.000Z");
    assert.equal(lerIntervalo({ periodo: "personalizado", desde: "2026-02-10", ate: "2026-01-11" }, agora).periodo, "30d");
    assert.equal(lerIntervalo({ periodo: "personalizado", desde: "2024-01-01", ate: "2026-01-11" }, agora).periodo, "30d");
    assert.equal(lerIntervalo({ periodo: "x'; drop" }, agora).periodo, "30d");
  });
  test("período anterior com a mesma duração, encostado", () => {
    const i = lerIntervalo({ periodo: "7d" }, agora);
    const a = intervaloAnterior(i);
    assert.equal(a.ate.getTime(), i.desde.getTime());
    assert.equal(a.ate - a.desde, i.ate - i.desde);
  });
});

describe("funil", () => {
  test("taxas face à anterior e à entrada; unidades ditas", () => {
    const f = montarFunil(metricas());
    // … viram → clicaram na Protecção (protection_cta_clicked) → conta → checkout → pago.
    assert.deepEqual(f.map((e) => e.id), ["escolheram", "carregaram", "concluiram", "viram", "clicaram_protecao", "conta", "checkout", "pago"]);
    assert.deepEqual(f.map((e) => e.valor), [100, 80, 70, 60, 20, 12, 4, 2]);
    assert.equal(f[0].daAnterior, null);
    assert.equal(f[1].daAnterior, 80);
    assert.equal(f[7].daEntrada, 2);
    assert.equal(f[4].perdidos, 40);
    assert.equal(f[4].unidade, "sessões");
    assert.equal(f[5].unidade, "contas");
  });
  test("maior perda relativa (resultado visto → clique na Protecção)", () => {
    assert.equal(maiorPerda(montarFunil(metricas()))?.id, "clicaram_protecao");
  });
  test("antes da migration do checkout: o passo conta 0, sem erro", () => {
    const m = metricas();
    delete m.contas.checkout;
    assert.equal(montarFunil(m).find((e) => e.id === "checkout")?.valor, 0);
  });
  test("sem dados: nada a dividir por zero, sem 'maior perda' inventada", () => {
    const f = montarFunil(metricas({ iniciaram: 0, carregaram: 0, concluiram: 0, viram: 0, clicaram_protecao: 0 }, { criadas_ou_ligadas: 0, experimental: 0, checkout: 0, pagas: 0 }));
    assert.ok(f.every((e) => e.daEntrada === null));
    assert.equal(maiorPerda(f), null);
  });
  test("comparação com o período anterior", () => {
    const f = montarFunil(metricas(), metricas({ iniciaram: 50 }));
    assert.equal(f[0].anterior, 50);
    assert.equal(variacao(100, 50), 100);
    assert.equal(variacao(10, 0), null);
  });
});

describe("custos", () => {
  test("euros só com taxa e data configuradas", () => {
    assert.equal(lerCambio(undefined, undefined), null);
    assert.equal(lerCambio("0,92", undefined), null);
    assert.deepEqual(lerCambio("0,92", "2026-10-22"), { taxa: 0.92, data: "2026-10-22" });
    assert.equal(lerCambio("abc", "2026-10-22"), null);
  });
  test("custo por unidade sem dividir por zero", () => {
    assert.equal(porUnidade(1, 0), null);
    assert.equal(porUnidade(1, 4), 0.25);
  });
});

describe("segurança", () => {
  const pagina = fonte("../../app/backoffice/aquisicao/page.tsx");
  const sql = fonte("../../../supabase/migrations/20261029090000_aquisicao_metricas.sql");
  test("página só para o admin, com a sessão (nunca a service role)", () => {
    assert.match(pagina, /await requireAdmin\(\)/);
    assert.ok(!pagina.includes("createAdminClient"));
  });
  test("a função recusa quem não é admin e não devolve dados pessoais", () => {
    assert.match(sql, /if not public\.is_admin\(\) then\s+raise exception/);
    assert.match(sql, /revoke execute on function public\.aquisicao_metricas\(timestamptz, timestamptz\) from public, anon/);
    const corpo = sql.slice(sql.indexOf("select jsonb_build_object"));
    for (const proibido of ["email", "nome", "nif", "resultado", "storage_path", "token_hash", "'conta_id'"]) {
      assert.ok(!corpo.includes(`'${proibido.replaceAll("'", "")}'`), proibido);
    }
  });
});
