// DoLado Empresas — Fase 5: ciclo de pagamento manual (`npm test`). Datas,
// prazos (espelho da base de dados), medição, avisos e verificações estáticas.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  ACOES_ADMIN,
  PRAZOS_CICLO,
  avisoAindaValido,
  dataPorExtenso,
  diasEntre,
  fimDoPeriodo,
  medicaoPagamentos,
  mensagemTransicao,
  precoSemIva,
  prazosDoVencimento,
  somarDias,
} from "./ciclo.ts";
import { ASSUNTOS_AVISO_CICLO, montarHtmlAvisoCiclo } from "../email/empresas.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");
const MIGRATION = ler("supabase/migrations/20261103090000_empresas_ciclo.sql");

describe("datas do ciclo", () => {
  test("aniversário: dia 31 → último dia do mês, sem deriva", () => {
    assert.equal(fimDoPeriodo("2026-01-31", 1), "2026-02-28");
    assert.equal(fimDoPeriodo("2026-01-31", 2), "2026-03-31");
    assert.equal(fimDoPeriodo("2026-01-31", 3), "2026-04-30");
    assert.equal(fimDoPeriodo("2028-01-31", 1), "2028-02-29", "ano bissexto");
    assert.equal(fimDoPeriodo("2026-03-15", 12), "2027-03-15");
    assert.equal(fimDoPeriodo("2026-12-15", 1), "2027-01-15", "muda de ano");
  });
  test("somar e contar dias", () => {
    assert.equal(somarDias("2026-02-28", 7), "2026-03-07");
    assert.equal(somarDias("2026-12-30", 3), "2027-01-02");
    assert.equal(diasEntre("2026-02-28", "2026-03-07"), 7);
  });
  test("prazos de uma mensalidade vencida (os mesmos do teste pgTAP)", () => {
    assert.deepEqual(prazosDoVencimento("2026-02-28"), { suspensaEm: "2026-03-07", canceladaEm: "2026-04-06" });
    assert.deepEqual(prazosDoVencimento("2026-03-31"), { suspensaEm: "2026-04-07", canceladaEm: "2026-05-07" });
  });
  test("data por extenso com o mês em maiúscula", () => {
    assert.equal(dataPorExtenso("2026-10-23"), "23 de Outubro de 2026");
  });
});

describe("espelho da base de dados", () => {
  test("prazos iguais a empresa_prazos()", () => {
    const valor = (chave) => Number(MIGRATION.match(new RegExp(`'${chave}', (\\d+)`))[1]);
    assert.deepEqual(
      {
        avisoVencimentoDias: valor("aviso_vencimento_dias"),
        suspensaoDias: valor("suspensao_dias"),
        cancelamentoDias: valor("cancelamento_dias"),
        consultaDias: valor("consulta_dias"),
        eliminacaoDias: valor("eliminacao_dias"),
      },
      { ...PRAZOS_CICLO },
    );
  });
  test("cada tipo de aviso da base de dados tem assunto e e-mail", () => {
    const lista = MIGRATION.match(/tipo text not null check \(tipo in \(([^)]*)\)\)/)[1];
    const tipos = [...lista.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    assert.deepEqual([...tipos].sort(), Object.keys(ASSUNTOS_AVISO_CICLO).sort());
    const periodo = { inicio: "28 de Fevereiro de 2026", fim: "31 de Março de 2026", valor: "49,00 € + IVA", referencia: "FT <1>" };
    for (const t of tipos) {
      const html = montarHtmlAvisoCiclo(t, { nome: "Loja <X>", periodo, suspensaEm: "7 de Março de 2026", consultaAte: "1 de Maio de 2026", eliminacaoEm: "1 de Agosto de 2026" });
      assert.match(html, /Loja &lt;X&gt;/, t);
      assert.doesNotMatch(html, /<X>|FT <1>/, `${t}: escapado`);
    }
  });
  test("acções do admin com os estados de empresa_admin_transicao", () => {
    assert.match(MIGRATION, /p_acao = 'suspender' and v_estado in \('ativa', 'pagamento_em_atraso'\)/);
    assert.match(MIGRATION, /p_acao = 'reativar' and v_estado in \('suspensa', 'pagamento_em_atraso'\)/);
    assert.match(MIGRATION, /p_acao = 'cancelar' and v_estado in \('ativa', 'pagamento_em_atraso', 'suspensa'\)/);
    assert.deepEqual([...ACOES_ADMIN.suspender.estados], ["ativa", "pagamento_em_atraso"]);
    assert.deepEqual([...ACOES_ADMIN.reativar.estados], ["suspensa", "pagamento_em_atraso"]);
    assert.deepEqual([...ACOES_ADMIN.cancelar.estados], ["ativa", "pagamento_em_atraso", "suspensa"]);
  });
});

describe("preço, medição e avisos", () => {
  test("mensalidade sem IVA (excepção B2B)", () => {
    assert.equal(precoSemIva(4900).replace(/\s/g, " "), "49,00 € + IVA");
  });
  test("medição: mensalidades pagas, receita e dias de atraso", () => {
    const m = medicaoPagamentos([
      { numero: 1, inicio: "2026-01-31", fim: "2026-02-28", valor_cents: 4900, estado_pagamento: "pago", pago_em: "2026-01-31T10:00:00Z", referencia_factura: "A" },
      { numero: 2, inicio: "2026-02-28", fim: "2026-03-31", valor_cents: 4900, estado_pagamento: "pago", pago_em: "2026-03-05T10:00:00Z", referencia_factura: "B" },
      { numero: 3, inicio: "2026-03-31", fim: "2026-04-30", valor_cents: 4900, estado_pagamento: "anulado", pago_em: null, referencia_factura: null },
    ]);
    assert.deepEqual(m, { periodosPagos: 2, receitaCents: 9800, diasAtraso: 5 });
  });
  test("aviso com mais de 3 dias já não sai", () => {
    const agora = Date.parse("2026-10-23T12:00:00Z");
    assert.equal(avisoAindaValido("2026-10-21T12:00:00Z", agora), true);
    assert.equal(avisoAindaValido("2026-10-20T11:00:00Z", agora), false);
  });
  test("mensagens das transições", () => {
    assert.equal(mensagemTransicao("ativa").ok, true);
    assert.equal(mensagemTransicao("pagamento_em_falta").ok, false);
    assert.equal(mensagemTransicao("desconhecido").ok, false);
  });
  test("e-mails do ciclo: prazos certos e nenhum preço com IVA incluído", () => {
    const html = montarHtmlAvisoCiclo("atraso", {
      nome: "L",
      periodo: { inicio: "28 de Fevereiro de 2026", fim: "31 de Março de 2026", valor: "49,00 € + IVA", referencia: null },
      suspensaEm: "7 de Março de 2026",
    });
    assert.match(html, /venceu a 28 de Fevereiro de 2026/);
    assert.match(html, /até 7 de Março de 2026/);
    assert.doesNotMatch(montarHtmlAvisoCiclo("a_vencer", { nome: "L", periodo: { inicio: "x", fim: "y", valor: "49,00 € + IVA", referencia: null } }), /IVA incluído/);
  });
});

describe("estático", () => {
  test("o ciclo corre no pg_cron sem HTTP; os avisos pela rota com segredo", () => {
    assert.match(MIGRATION, /cron\.schedule\('empresas-ciclo-diario', '30 5 \* \* \*', \$\$ select public\.empresa_ciclo_diario\(\); \$\$\)/);
    assert.match(MIGRATION, /'empresas-avisos'[\s\S]*empresas_avisos_cron_secret/);
    const rota = ler("src/app/api/internal/empresas-avisos/route.ts");
    assert.match(rota, /EMPRESAS_AVISOS_CRON_SECRET/);
    assert.match(rota, /status: 401/);
  });
  test("as acções do cliente e do admin usam os guardas", () => {
    const cliente = ler("src/app/[idioma]/empresa/actions.ts");
    assert.match(cliente, /pedirCancelamento[\s\S]*requireEmpresa\(/);
    assert.match(cliente, /retirarCancelamento[\s\S]*requireEmpresa\(/);
    const admin = ler("src/app/backoffice/empresas/actions.ts");
    assert.equal((admin.match(/export async function \w+/g) ?? []).length, (admin.match(/await requireAdmin\(\)/g) ?? []).length);
  });
  test("o cancelamento pelo cliente exige confirmação explícita", () => {
    assert.match(ler("src/app/[idioma]/empresa/actions.ts"), /formData\.get\("confirmar"\) !== "on"/);
    assert.match(ler("src/app/[idioma]/empresa/definicoes/page.tsx"), /name="confirmar" required/);
  });
  test("nada do ciclo toca no user_access nem no Stripe", () => {
    for (const f of ["src/lib/empresas/ciclo.ts", "src/lib/empresas/avisosServidor.ts", "src/app/backoffice/empresas/actions.ts", "src/app/[idioma]/empresa/actions.ts"]) {
      assert.doesNotMatch(ler(f), /user_access|stripe/i, f);
    }
    assert.doesNotMatch(MIGRATION, /user_access|stripe/i);
  });
});
