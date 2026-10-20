// Electricidade: interrupções do fornecimento e compensações (20/10/2026).
// Selecção das regras jurídicas com as regras REAIS — metadados das 157
// regras de produção a 13/10/2026 (fixtures/regras-producao-2026-10-13.json),
// as 17 de Autoconsumo e as 4 novas de 20261020100000_energia_continuidade_servico.sql,
// como ficarão depois de revistas e activadas. Cenários da auditoria em
// docs/legal/auditoria-interrupcoes-electricidade-2026-10-20.md. `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { problemasDoSetor, SETORES } from "../pedidoCaso.ts";
import { lerRegrasDaMigration } from "./lerRegrasMigration.mjs";
import { PROMPT_SISTEMA, PROMPT_SISTEMA_NOVA_COMUNICACAO, PROMPT_VERSAO } from "./prompt.ts";
import { limiteRegras, MAX_REGRAS_CORTE_FALHA_ENERGIA, MAX_REGRAS_POR_PEDIDO, paraEnvio, selecionarRegras } from "./regras.ts";
import { validarResposta } from "./validacao.ts";

const HOJE = "2026-10-20";
const CORTE = "Corte ou falha de serviço";
const RQS = "Regulamento n.º 826/2023, de 28 de julho — RQS dos Setores Elétrico e do Gás, na redação vigente";

const PRODUCAO = JSON.parse(readFileSync(new URL("./fixtures/regras-producao-2026-10-13.json", import.meta.url), "utf8")).regras.map(
  ([codigo, setor, categoria, diploma, artigo, ativa, revista_em, em_vigor_desde]) => ({
    id: codigo, codigo, setor, categoria, subcategoria: null, titulo: codigo, diploma, artigo,
    resumo: "Resumo aprovado.", condicoes_aplicabilidade: null, fonte_url: "https://diariodarepublica.pt/",
    em_vigor_desde, revogada_em: null, ativa, revista_em,
  }),
);
const activar = (r) => ({ ...r, id: r.codigo, ativa: true, revista_em: HOJE });
const SOLAR = lerRegrasDaMigration(new URL("../../../supabase/migrations/20261013100000_energia_solar_autoconsumo.sql", import.meta.url)).map(activar);
const NOVAS_MIGRATION = lerRegrasDaMigration(new URL("../../../supabase/migrations/20261020100000_energia_continuidade_servico.sql", import.meta.url));
const NOVAS = NOVAS_MIGRATION.map(activar);
const DANOS_MIGRATION = lerRegrasDaMigration(new URL("../../../supabase/migrations/20261020120000_energia_danos_responsabilidade_civil.sql", import.meta.url));
const DANOS = DANOS_MIGRATION.map(activar);
const CODIGOS_DANOS = DANOS.map((r) => r.codigo);
const ANTES = [...PRODUCAO, ...SOLAR];
const DEPOIS = [...ANTES, ...NOVAS, ...DANOS];
const CODIGOS_NOVOS = NOVAS.map((r) => r.codigo);
const regra = (codigo) => [...NOVAS_MIGRATION, ...DANOS_MIGRATION].find((r) => r.codigo === codigo);
const texto = (codigo) => {
  const r = regra(codigo);
  return [r.titulo, r.resumo, r.condicoes_aplicabilidade, r.efeito_juridico, r.provas_necessarias, r.resultado_pretendido].join(" ");
};
const sel = (setor, categoria, regras = DEPOIS) => selecionarRegras({ setor, categoria }, regras, HOJE).map((r) => r.codigo);

describe("Regras novas da continuidade de serviço", () => {
  test("4 regras, inactivas e por rever, sem duplicar regras existentes", () => {
    assert.deepEqual(CODIGOS_NOVOS.sort(), ["ENE_ASSISTENCIA_AVARIA_83", "ENE_CONTINUIDADE_PADROES_24", "ENE_CONTINUIDADE_PAGAMENTO_106", "ENE_CONTINUIDADE_RESP_CIVIL_10"]);
    const existentes = new Set(ANTES.map((r) => r.codigo));
    for (const r of NOVAS_MIGRATION) {
      assert.equal(r.ativa, false, r.codigo);
      assert.equal(r.revista_em, null, r.codigo);
      assert.equal(r.revista_por, null, r.codigo);
      assert.ok(!existentes.has(r.codigo), `${r.codigo} já existe`);
      assert.equal(r.setor, "Energia");
      assert.equal(r.categoria, "Qualidade de serviço");
      assert.equal(r.diploma, RQS, "mesmo diploma das regras do RQS já revistas");
      assert.ok(r.fonte_url.startsWith("https://www.erse.pt/"), r.codigo);
      assert.ok(r.resumo.length <= 4000 && (r.condicoes_aplicabilidade ?? "").length <= 2000, `${r.codigo}: limites da tabela`);
      assert.ok(r.efeito_juridico.length <= 1500 && r.provas_necessarias.length <= 2000 && r.resultado_pretendido.length <= 1000, r.codigo);
    }
    // Nenhuma regra de Energia já existente trata da continuidade de serviço (lacuna;
    // AGUA_INTERRUPCAO_* são do sector da água).
    assert.ok(!ANTES.some((r) => r.setor === "Energia" && /CONTINUIDADE|INTERRUP/.test(r.codigo)));
  });

  test("antes de revistas e activadas, nunca chegam à IA", () => {
    const inactivas = [...ANTES, ...NOVAS_MIGRATION.map((r) => ({ ...r, id: r.codigo }))];
    for (const setor of SETORES) for (const p of problemasDoSetor(setor)) {
      const e = sel(setor, p, inactivas);
      assert.deepEqual(e.filter((c) => CODIGOS_NOVOS.includes(c)), [], `${setor} / ${p}`);
    }
  });

  test("texto sem conclusões de responsabilidade e na ortografia tradicional", () => {
    for (const c of CODIGOS_NOVOS) {
      const t = texto(c);
      assert.doesNotMatch(t, /\b(violou|ilegal|má-fé|fraude|abusiv)/i, c);
      assert.doesNotMatch(t, /\b(excecion|atualiz|efetu|diret[ao]|elétric|afetad|aspeto)/i, `${c}: grafia do Acordo de 1990 (fora do nome oficial do diploma)`);
    }
  });
});

describe("Cenários: o que cada regra diz (a IA só cita com as condições verificadas)", () => {
  const PADROES = "ENE_CONTINUIDADE_PADROES_24";
  const PAGAMENTO = "ENE_CONTINUIDADE_PAGAMENTO_106";

  test("interrupção curta sem incumprimento comprovado: breves não contam; uma só interrupção não basta", () => {
    assert.match(texto(PADROES), /interrupções breves \(de 1 segundo a 3 minutos\)/);
    assert.match(texto(PADROES), /acidentais longas \(mais de 3 minutos\)/);
    assert.match(texto(PADROES), /uma interrupção isolada, mesmo longa, não basta/);
  });

  test("interrupções repetidas e duração acumulada: padrões do Anexo I (BT, continente) e pedido de esclarecimento", () => {
    assert.match(texto(PADROES), /zona A — 10 interrupções ou 6 horas; zona B — 11 interrupções ou 9 horas; zona C — 15 interrupções ou 14 horas/);
    assert.match(texto(PADROES), /contagem é anual \(ano civil\) e por instalação/);
    assert.match(texto(PADROES), /formular um pedido de esclarecimento sobre os indicadores individuais/);
    assert.match(texto(PADROES), /não concluir que um padrão foi ultrapassado sem esses dados/);
  });

  test("evento excepcional reconhecido: não conta nem dá compensação (apagão de 28/04/2025)", () => {
    assert.match(texto(PADROES), /excluindo as resultantes de eventos excepcionais aprovados pela ERSE/);
    assert.match(texto(PADROES), /apagão ibérico de 28\/04\/2025 foi classificado como evento excepcional/);
    assert.match(texto(PAGAMENTO), /nomeadamente eventos excepcionais no sector eléctrico/);
  });

  test("interrupção programada: só não conta se avisada com a antecedência regulamentar", () => {
    assert.match(texto(PADROES), /interrupções previstas, isto é, aquelas de que os clientes foram informados com a antecedência mínima regulamentar/);
    assert.match(texto(PADROES), /pelo menos 36 horas/);
    assert.match(texto(PADROES), /sem a divulgação exigida é acidental/);
  });

  test("interrupção imputável ao cliente e avaria na instalação interior", () => {
    assert.match(texto(PADROES), /por acordo com o cliente ou por facto imputável ao cliente/);
    assert.match(texto(PADROES), /instalação interior do cliente .* não é, em princípio, uma interrupção da rede/);
    assert.match(texto("ENE_ASSISTENCIA_AVARIA_83"), /quem pode ter direito a compensação é o operador/);
  });

  test("compensação devida e não creditada: crédito automático, prazos e reclamação", () => {
    assert.match(texto(PAGAMENTO), /sem qualquer pedido do cliente/);
    assert.match(texto(PAGAMENTO), /até 12 de Março do ano seguinte/);
    assert.match(texto(PAGAMENTO), /primeira factura emitida depois de passarem 30 dias/);
    assert.match(texto(PAGAMENTO), /não creditada: reclamar ao comercializador/);
    assert.match(texto(PAGAMENTO), /Não calcular valores no texto/);
  });

  test("compensação já recebida: não pedir de novo", () => {
    assert.match(texto(PAGAMENTO), /já creditada: não a pedir de novo/);
  });

  test("não confundir com a qualidade de serviço comercial (artigo 104.º, 45 dias)", () => {
    assert.match(texto(PAGAMENTO), /Diferente das compensações de qualidade de serviço comercial \(artigo 104\.º, prazo de 45 dias\)/);
  });

  test("danos materiais: pedido separado, com prova, sem concluir responsabilidade", () => {
    const t = texto("ENE_CONTINUIDADE_RESP_CIVIL_10");
    assert.match(t, /não prejudicam o regime da responsabilidade civil/);
    assert.match(t, /prova do dano, do seu valor e da sua relação com a falha/);
    assert.match(t, /Não concluir quem é responsável nem que a indemnização é devida/);
    assert.match(t, /Só quando o cliente indicar um dano concreto/);
  });

  test("informação insuficiente: o prompt manda pedir esclarecimento em vez de afirmar o direito", () => {
    for (const p of [PROMPT_SISTEMA, PROMPT_SISTEMA_NOVA_COMUNICACAO]) {
      assert.match(p, /não afirmes que o direito existe: formula um pedido de esclarecimento/);
      assert.match(p, /Não confundas uma compensação prevista em regulamento .* com uma indemnização por danos/);
    }
    assert.equal(PROMPT_VERSAO, "reclamacao_v5");
  });
});

describe("Selecção das regras", () => {
  test("Energia + Corte ou falha: as 4 regras novas, sem perder nenhuma das enviadas hoje", () => {
    const antes = sel("Energia", CORTE, ANTES);
    const depois = sel("Energia", CORTE);
    assert.equal(antes.length, MAX_REGRAS_CORTE_FALHA_ENERGIA, "o limite próprio já se aplica às regras actuais");
    for (const c of [...CODIGOS_NOVOS, ...CODIGOS_DANOS]) assert.ok(depois.includes(c), `falta ${c}\n${depois.join(", ")}`);
    const hoje = antes.slice(0, MAX_REGRAS_POR_PEDIDO); // o que era enviado com o limite antigo
    for (const c of hoje) assert.ok(depois.includes(c), `perdeu ${c}`);
    for (const c of ["ENE_CORTE_PREAVISO_79", "ENE_ELEC_REDUCAO_ANTES_CORTE_78", "ENE_QUALIDADE_COMPENSACAO_104", "ENE_RECLAMACAO_COMPENSACAO_61", "ENE_RECLAMACAO_PRAZO_60", "SPE_PREAVISO_CORTE_20D"]) {
      assert.ok(depois.includes(c), `falta ${c}`);
    }
    assert.ok(depois.length <= MAX_REGRAS_CORTE_FALHA_ENERGIA);
  });

  test("o limite próprio é só para Energia + Corte ou falha", () => {
    assert.equal(limiteRegras({ setor: "Energia", categoria: CORTE }), 18);
    for (const setor of SETORES) for (const p of [...problemasDoSetor(setor), null]) {
      if (setor === "Energia" && p === CORTE) continue;
      assert.equal(limiteRegras({ setor, categoria: p }), MAX_REGRAS_POR_PEDIDO, `${setor} / ${p}`);
    }
  });

  test("as regras novas não chegam a outros sectores, aos casos solares nem a outros tipos de Energia com categorias próprias", () => {
    for (const setor of SETORES.filter((s) => s !== "Energia")) for (const p of problemasDoSetor(setor)) {
      assert.deepEqual(sel(setor, p).filter((c) => [...CODIGOS_NOVOS, ...CODIGOS_DANOS].includes(c)), [], `${setor} / ${p}`);
    }
    for (const p of problemasDoSetor("Energia").filter((x) => x !== CORTE && x !== "Outro")) {
      assert.deepEqual(sel("Energia", p).filter((c) => [...CODIGOS_NOVOS, ...CODIGOS_DANOS].includes(c)), [], `Energia / ${p}`);
    }
  });

  test("os outros sectores e tipos ficam exactamente como estavam", () => {
    for (const setor of [...SETORES, null]) for (const p of [...(setor ? problemasDoSetor(setor) : []), null]) {
      if (setor === "Energia" && (p === CORTE || p === "Outro" || p === null)) continue;
      assert.deepEqual(sel(setor, p), sel(setor, p, ANTES), `${setor} / ${p}`);
    }
  });
});

describe("Validação da sugestão", () => {
  const enviadas = NOVAS.filter((r) => r.codigo !== "ENE_ASSISTENCIA_AVARIA_83").map(paraEnvio);
  const resposta = (draft, legal_basis) => ({ draft, legal_basis, missing_information: [], warnings: [], confidence: "medium" });
  const DRAFT =
    "Exmos. Senhores, eu, [NOME DO CLIENTE], titular do contrato [N.º DE CLIENTE OU CONTRATO], venho expor que, durante 2025, a minha instalação teve várias interrupções do fornecimento. " +
    "Nos termos do Regulamento n.º 826/2023, artigos 23.º e 24.º, solicito informação sobre os indicadores individuais de continuidade do ano e, se o padrão tiver sido ultrapassado, o crédito da compensação.";

  test("citar o RQS com as regras enviadas é aceite", () => {
    const v = validarResposta(resposta(DRAFT, [{ rule_id: "ENE_CONTINUIDADE_PADROES_24", reason: "Várias interrupções relatadas; pedido de esclarecimento." }]), enviadas);
    assert.equal(v.ok, true, JSON.stringify(v));
  });

  test("uma regra que não foi enviada é recusada", () => {
    const v = validarResposta(resposta(DRAFT, [{ rule_id: "ENE_ASSISTENCIA_AVARIA_83", reason: "x" }]), enviadas);
    assert.deepEqual([v.ok, v.motivo], [false, "regra_nao_fornecida"]);
  });

  test("um diploma que não está nas regras enviadas (ex.: Código Civil por número) é recusado", () => {
    const v = validarResposta(resposta(`${DRAFT} Nos termos do Decreto-Lei n.º 47344/66, peço a indemnização.`, []), enviadas);
    assert.deepEqual([v.ok, v.motivo], [false, "legislacao_nao_fornecida"]);
  });
});

describe("Danos em aparelhos e outros bens (Código Civil)", () => {
  const CC = "Código Civil — Decreto-Lei n.º 47344/66, de 25 de Novembro, na redacção vigente";
  test("2 regras, inactivas e por rever, Energia / Qualidade de serviço, sem duplicados", () => {
    assert.deepEqual(CODIGOS_DANOS.sort(), ["ENE_DANOS_CULPA_CC_798", "ENE_DANOS_INSTALACAO_CC_509"]);
    const existentes = new Set([...ANTES, ...NOVAS].map((r) => r.codigo));
    for (const r of DANOS_MIGRATION) {
      assert.deepEqual([r.ativa, r.revista_em, r.revista_por], [false, null, null], r.codigo);
      assert.ok(!existentes.has(r.codigo), r.codigo);
      assert.deepEqual([r.setor, r.categoria, r.diploma], ["Energia", "Qualidade de serviço", CC]);
      assert.ok(r.resumo.length <= 4000 && r.condicoes_aplicabilidade.length <= 2000 && r.efeito_juridico.length <= 1500, r.codigo);
      const t = texto(r.codigo);
      assert.doesNotMatch(t, /\b(violou|ilegal|má-fé|fraude|abusiv)/i, r.codigo);
      assert.doesNotMatch(t, /\b(excecion|atualiz|efetu|diret[ao]|elétric|afetad|aspeto|redação)/i, r.codigo);
    }
  });

  test("artigo 509.º: risco de quem dirige a instalação, excepções e utensílios", () => {
    const t = texto("ENE_DANOS_INSTALACAO_CC_509");
    assert.match(t, /independentemente de culpa/);
    assert.match(t, /de acordo com as regras técnicas em vigor e em perfeito estado de conservação/);
    assert.match(t, /causa exterior independente do funcionamento e utilização da coisa/);
    assert.match(t, /danos causados por utensílios de uso de energia não são reparáveis nos termos desta disposição/);
    assert.match(t, /não é o mesmo que o evento excepcional do RQS/);
    assert.match(t, /Não concluir a responsabilidade/);
  });

  test("artigos 798.º/799.º e 483.º: culpa presumida só no contrato; ≠ compensação regulamentar", () => {
    const t = texto("ENE_DANOS_CULPA_CC_798");
    assert.match(t, /incumbe ao devedor provar que a falta de cumprimento/);
    assert.match(t, /só vale numa relação contratual/);
    assert.match(t, /Distinguir sempre da compensação regulamentar do RQS/);
    assert.match(t, /Não concluir que houve culpa/);
  });

  test("citar o Código Civil só é aceite quando a regra foi enviada", () => {
    const resposta = (draft) => ({ draft, legal_basis: [{ rule_id: "ENE_DANOS_INSTALACAO_CC_509", reason: "Aparelhos avariados após sobretensão." }], missing_information: [], warnings: [], confidence: "medium" });
    const draft =
      "Exmos. Senhores, eu, [NOME DO CLIENTE], venho expor que, após o restabelecimento do fornecimento a [DATA], vários aparelhos deixaram de funcionar. " +
      "Nos termos do artigo 509.º do Código Civil (Decreto-Lei n.º 47344/66), solicito a análise da situação e a indemnização dos danos.";
    assert.equal(validarResposta(resposta(draft), DANOS.map(paraEnvio)).ok, true);
    assert.equal(validarResposta(resposta(draft), NOVAS.map(paraEnvio)).ok, false);
  });
});

describe("Migration de activação e correcção da 104.º", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20261020110000_ativar_continuidade_corrigir_104.sql", import.meta.url), "utf8");
  test("activa exactamente as 4 regras da continuidade, com data e revisor", () => {
    const lista = sql.match(/v_codigos text\[\] := array\[([^\]]+)\]/)[1].match(/'([A-Z0-9_]+)'/g).map((c) => c.slice(1, -1));
    assert.deepEqual(lista.sort(), [...CODIGOS_NOVOS].sort());
    assert.match(sql, /set ativa = true, revista_em = '2026-10-20', revista_por = 'Thiago Pereira'/);
    for (const c of CODIGOS_DANOS) assert.ok(!sql.includes(c), `${c} não é activada aqui`);
  });
  test("corrige a 104.º com nova data de revisão na mesma alteração (não a desactiva)", () => {
    const update = sql.slice(sql.indexOf("set titulo = 'Compensações de qualidade de serviço comercial"), sql.indexOf("where codigo = 'ENE_QUALIDADE_COMPENSACAO_104'"));
    assert.match(update, /revista_em = '2026-10-20'/);
    assert.match(update, /Não aplicar às compensações por incumprimento dos padrões individuais de continuidade de serviço/);
    assert.match(update, /ENE_CONTINUIDADE_PAGAMENTO_106/);
    assert.doesNotMatch(update, /\bresumo\b|\bdiploma\b|\bartigo =/, "só título, subcategoria e condições");
  });
});
