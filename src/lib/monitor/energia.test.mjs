// Monitor de Protecção — electricidade e gás (energia.ts, comparacaoEnergia.ts,
// frasesEnergia.ts) — `npm test`. Facturas sintéticas, valores escolhidos à
// mão para as contas se poderem verificar de cabeça.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { agruparCamposEnergia, ehCodigoLocal, normalizarEnergia, paraMicro, reconciliar } from "./energia.ts";
import { anteriorComparavel, compararEnergia, decompor } from "./comparacaoEnergia.ts";
import { explicarDecomposicao as explicarBruta, fraseEventoEnergia as fraseEnergiaBruta, lerDecomposicao } from "./frasesEnergia.ts";
import { compararFatura, compararFaturaServico, fraseEvento as fraseEventoBruta, TIPO_ACHADO } from "./acompanhamento.ts";
import { SCHEMA_FATURA, SCHEMA_FATURA_SEM_ENERGIA, energiaAtiva, leituraFatura, validarExtracaoFatura } from "./extracaoFatura.ts";
import { normalizarIdentificador, protegerExtracao } from "./identificacao.ts";

const CHAVE = "k".repeat(40);

// O Intl separa o valor e o "€" com um espaço inseparável: normalizado para comparar.
const sp = (t) => t.replace(/[\u00a0\u202f]/g, " ");
const fraseEvento = (e, idioma) => sp(fraseEventoBruta(e, idioma));
const fraseEventoEnergia = (e, idioma) => sp(fraseEnergiaBruta(e, idioma));
const explicarDecomposicao = (d, idioma) => {
  const x = explicarBruta(d, idioma);
  return { ...x, frase: sp(x.frase), notas: x.notas.map(sp), certezaTexto: sp(x.certezaTexto) };
};
const CPE = "PT0002000012345678AB";

// ---------------------------------------------------------------------------
// Ajudas: um fornecimento normalizado a partir de valores simples
// ---------------------------------------------------------------------------

/** Electricidade simples: kWh × preço + dias × preço/dia + IVA fixo. */
function luz({
  kwh = 200,
  preco = 0.15,
  dias = 30,
  dia = 0.3,
  impostos = 1000,
  descontos = 0,
  acertos = 0,
  servicos = [],
  potencia = 6.9,
  leitura = "real",
  tarifario = "fixo",
  opcao = "simples",
  parcelas = null,
  inicio = "2026-08-01",
  fim = "2026-08-30",
  tipo = "eletricidade",
  local = null,
  total = undefined,
} = {}) {
  const linhas = parcelas ?? [{ periodo: "simples", kwh, preco }];
  const energiaCents = Math.round(linhas.reduce((s, p) => s + p.kwh * p.preco * 100, 0));
  const termoFixoCents = Math.round(dias * dia * 100);
  const servCents = servicos.reduce((s, x) => s + x.valorCents, 0);
  const t = total ?? energiaCents + termoFixoCents + impostos - descontos + acertos + servCents;
  return {
    tipo,
    local,
    localApresentacao: null,
    periodoInicio: inicio,
    periodoFim: fim,
    dias,
    potenciaKva: tipo === "eletricidade" ? potencia : null,
    opcaoHoraria: opcao,
    tipoTarifario: tarifario,
    tipoLeitura: leitura,
    consumoKwh: linhas.reduce((s, p) => s + p.kwh, 0),
    consumoM3: null,
    fatorConversao: null,
    escalao: null,
    termoFixoDiaMicro: Math.round(dia * 1_000_000),
    termoFixoCents,
    energia: linhas.map((p) => ({ periodo: p.periodo, kwh: p.kwh, precoMicro: Math.round(p.preco * 1_000_000), valorCents: Math.round(p.kwh * p.preco * 100) })),
    energiaCents,
    redesCents: null,
    impostosCents: impostos,
    descontosCents: descontos,
    acertosCents: acertos,
    acertoInicio: null,
    acertoFim: null,
    acertoKwh: null,
    servicosAdicionaisCents: servicos.length ? servCents : null,
    servicosAdicionais: servicos,
    totalCents: t,
    reconciliado: true,
    avisos: [],
  };
}

const fatura = (id, energia, extra = {}) => ({
  id,
  dataEmissao: energia[0]?.periodoFim ?? null,
  periodoInicio: energia[0]?.periodoInicio ?? null,
  periodoFim: energia[0]?.periodoFim ?? null,
  totalCents: energia.reduce((s, f) => s + (f.totalCents ?? 0), 0),
  energia,
  ...extra,
});

const AGOSTO = { inicio: "2026-08-01", fim: "2026-08-30" };
const SETEMBRO = { inicio: "2026-08-31", fim: "2026-09-29" };

function variacao(eventos) {
  const e = eventos.find((x) => x.tipo === "energia_variacao");
  assert.ok(e, "sem evento energia_variacao");
  return e.dados;
}
const comp = (d, chave) => d.componentes.find((c) => c.chave === chave)?.cents ?? 0;
const somaComponentes = (d) => d.componentes.reduce((s, c) => s + c.cents, 0) + d.arredondamentoCents + d.naoExplicadoCents;

// ---------------------------------------------------------------------------
// 1. Consumo × preço
// ---------------------------------------------------------------------------

describe("decomposição: consumo e preço", () => {
  test("aumento de consumo sem aumento de preço: toda a diferença vem do consumo", () => {
    const ant = fatura("a", [luz({ kwh: 200, ...AGOSTO })]);
    const atu = fatura("b", [luz({ kwh: 260, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.equal(d.diferencaCents, 900); // 60 kWh × 0,15 €
    assert.equal(comp(d, "consumo"), 900);
    assert.equal(comp(d, "preco_energia"), 0);
    assert.equal(somaComponentes(d), d.diferencaCents);
    assert.equal(d.certeza, "alta");
    assert.ok(!ev.some((e) => e.tipo === "energia_preco_alterado"));
    // +30% por dia e +2 kWh/dia: consumo superior (informativo).
    const c = ev.find((e) => e.tipo === "energia_consumo_superior");
    assert.equal(c?.severidade, "info");
    assert.match(fraseEvento(c), /Gastou mais electricidade por dia/);
  });

  test("aumento de preço sem aumento de consumo: diferença do preço e alerta para revisão", () => {
    const ant = fatura("a", [luz({ preco: 0.15, ...AGOSTO })]);
    const atu = fatura("b", [luz({ preco: 0.18, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.equal(d.diferencaCents, 600); // 200 × 0,03
    assert.equal(comp(d, "preco_energia"), 600);
    assert.equal(comp(d, "consumo"), 0);
    const p = ev.find((e) => e.tipo === "energia_preco_alterado");
    assert.equal(p.severidade, "atencao");
    assert.equal(p.montanteCents, 600);
    assert.deepEqual(p.dados.periodos, [{ periodo: "simples", anterior: 150000, atual: 180000 }]);
    assert.equal(TIPO_ACHADO.energia_preco_alterado, "energia_preco_alterado");
    const frase = fraseEvento(p);
    assert.match(frase, /O preço da electricidade por kWh subiu/);
    assert.match(frase, /0,1500 €\/kWh/);
    assert.doesNotMatch(frase, /indevid|ilegal|viol|incumpr/i);
  });

  test("diminuição do consumo com aumento de preço: o total desce, mas a subida do preço é detectada", () => {
    const ant = fatura("a", [luz({ kwh: 300, preco: 0.15, ...AGOSTO })]);
    const atu = fatura("b", [luz({ kwh: 200, preco: 0.17, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.ok(d.diferencaCents < 0);
    assert.equal(comp(d, "consumo"), -1500); // −100 kWh × 0,15
    assert.equal(comp(d, "preco_energia"), 400); // 200 × 0,02
    assert.equal(somaComponentes(d), d.diferencaCents);
    assert.equal(ev.find((e) => e.tipo === "energia_preco_alterado")?.severidade, "atencao");
    const x = explicarDecomposicao(d);
    assert.match(x.frase, /mais baixa/);
    assert.equal(x.doConsumoCents, -1500);
    assert.equal(x.dosPrecosCents, d.diferencaCents + 1500);
  });

  test("preços iguais com arredondamentos de cêntimos não geram alerta", () => {
    const ant = fatura("a", [luz({ preco: 0.1501, ...AGOSTO })]);
    const atu = fatura("b", [luz({ preco: 0.1505, ...SETEMBRO })]);
    assert.ok(!compararEnergia(atu, [ant]).some((e) => e.tipo === "energia_preco_alterado"));
  });
});

// ---------------------------------------------------------------------------
// 2. Número de dias, potência e termo fixo
// ---------------------------------------------------------------------------

describe("componentes fixos normalizados pelos dias", () => {
  test("facturas com números de dias diferentes: a diferença do termo fixo é dos dias", () => {
    const ant = fatura("a", [luz({ dias: 30, kwh: 200, ...AGOSTO })]);
    const atu = fatura("b", [luz({ dias: 33, kwh: 220, inicio: "2026-08-31", fim: "2026-10-02" })]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.equal(comp(d, "dias"), 90); // 3 dias × 0,30 €
    assert.equal(comp(d, "preco_termo_fixo"), 0);
    assert.equal(comp(d, "consumo"), 300);
    assert.equal(d.consumoDiaAnterior, 6.67);
    assert.equal(d.consumoDiaAtual, 6.67);
    // Mesmo consumo por dia: não há "consumo superior".
    assert.ok(!ev.some((e) => e.tipo === "energia_consumo_superior"));
    assert.ok(!ev.some((e) => e.severidade === "atencao"));
    assert.ok(explicarDecomposicao(d).notas.some((n) => /Dias facturados: 33 \(antes: 30\)/.test(n)));
  });

  test("subida do preço diário da potência, com a mesma potência: alerta", () => {
    const ant = fatura("a", [luz({ dia: 0.3, ...AGOSTO })]);
    const atu = fatura("b", [luz({ dia: 0.33, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    assert.equal(comp(variacao(ev), "preco_termo_fixo"), 90);
    const e = ev.find((x) => x.tipo === "energia_termo_fixo_alterado");
    assert.equal(e.severidade, "atencao");
    assert.equal(e.montanteCents, 90);
    assert.match(fraseEvento(e), /preço diário da potência subiu de 0,3000 €\/dia para 0,3300 €\/dia/);
  });

  test("mudança de potência: identificada como potência (não como preço) e para revisão", () => {
    const ant = fatura("a", [luz({ potencia: 6.9, dia: 0.3, ...AGOSTO })]);
    const atu = fatura("b", [luz({ potencia: 10.35, dia: 0.43, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    assert.equal(comp(variacao(ev), "potencia"), 390);
    const e = ev.find((x) => x.tipo === "energia_potencia_alterada");
    assert.equal(e.severidade, "atencao");
    assert.ok(!ev.some((x) => x.tipo === "energia_termo_fixo_alterado"));
    assert.match(fraseEvento(e), /6,9 kVA para 10,35 kVA/);
    // Descer a potência é informativo.
    const desce = compararEnergia(fatura("c", [luz({ potencia: 3.45, dia: 0.2, inicio: "2026-09-30", fim: "2026-10-29" })]), [atu]);
    assert.equal(desce.find((x) => x.tipo === "energia_potencia_alterada").severidade, "info");
  });
});

// ---------------------------------------------------------------------------
// 3. Estruturas tarifárias
// ---------------------------------------------------------------------------

describe("bi-horária, tri-horária e indexado", () => {
  const bi = (vazio, fora, pv = 0.1, pf = 0.2) => [
    { periodo: "vazio", kwh: vazio, preco: pv },
    { periodo: "fora_vazio", kwh: fora, preco: pf },
  ];

  test("bi-horária: consumo e preço por período", () => {
    const ant = fatura("a", [luz({ opcao: "bi_horaria", parcelas: bi(100, 100), ...AGOSTO })]);
    const atu = fatura("b", [luz({ opcao: "bi_horaria", parcelas: bi(150, 100, 0.1, 0.22), ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.equal(comp(d, "consumo"), 500); // +50 kWh de vazio × 0,10
    assert.equal(comp(d, "preco_energia"), 200); // 100 kWh fora de vazio × 0,02
    const p = ev.find((e) => e.tipo === "energia_preco_alterado");
    assert.deepEqual(p.dados.periodos.map((x) => x.periodo), ["fora_vazio"]);
    assert.match(fraseEvento(p), /horas fora de vazio: de 0,2000 €\/kWh para 0,2200 €\/kWh/);
  });

  test("tri-horária com três períodos", () => {
    const tri = (preco) => [
      { periodo: "vazio", kwh: 80, preco: 0.1 },
      { periodo: "cheias", kwh: 100, preco: 0.18 },
      { periodo: "ponta", kwh: 20, preco },
    ];
    const ant = fatura("a", [luz({ opcao: "tri_horaria", parcelas: tri(0.25), ...AGOSTO })]);
    const atu = fatura("b", [luz({ opcao: "tri_horaria", parcelas: tri(0.3), ...SETEMBRO })]);
    const d = variacao(compararEnergia(atu, [ant]));
    assert.equal(comp(d, "preco_energia"), 100); // 20 × 0,05
    assert.equal(d.estruturaCompativel, true);
  });

  test("mudança de simples para bi-horária: preço médio, sem comparar preços unitários, e alteração para verificar", () => {
    const ant = fatura("a", [luz({ kwh: 200, preco: 0.15, ...AGOSTO })]);
    const atu = fatura("b", [luz({ opcao: "bi_horaria", parcelas: bi(100, 100, 0.1, 0.22), ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.equal(d.estruturaCompativel, false);
    // Preço médio: 30,00 € / 200 kWh → 32,00 € / 200 kWh.
    assert.equal(comp(d, "preco_medio_energia"), 200);
    assert.ok(d.componentes.some((c) => c.chave === "preco_medio_energia"));
    assert.equal(d.certeza, "media");
    assert.ok(!ev.some((e) => e.tipo === "energia_preco_alterado"));
    assert.equal(ev.find((e) => e.tipo === "energia_tarifario_alterado")?.severidade, "atencao");
    assert.ok(explicarDecomposicao(d).notas.some((n) => /preço médio por kWh/.test(n)));
  });

  test("tarifário indexado: a variação do preço é informativa, nunca um alerta", () => {
    const ant = fatura("a", [luz({ tarifario: "indexado", preco: 0.12, ...AGOSTO })]);
    const atu = fatura("b", [luz({ tarifario: "indexado", preco: 0.16, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    assert.ok(!ev.some((e) => e.severidade === "atencao"));
    const i = ev.find((e) => e.tipo === "energia_preco_indexado");
    assert.equal(i.severidade, "info");
    assert.match(fraseEvento(i), /tarifário indexado, o preço pode variar/);
    // A diferença continua explicada (preço) — só não é tratada como alteração do contrato.
    assert.equal(comp(variacao(ev), "preco_energia"), 800);
  });

  test("tarifário desconhecido numa das facturas: alerta com certeza média", () => {
    const ant = fatura("a", [luz({ tarifario: null, ...AGOSTO })]);
    const atu = fatura("b", [luz({ tarifario: null, preco: 0.18, ...SETEMBRO })]);
    const p = compararEnergia(atu, [ant]).find((e) => e.tipo === "energia_preco_alterado");
    assert.equal(p.confianca, "media");
  });
});

// ---------------------------------------------------------------------------
// 4. Estimativas e acertos
// ---------------------------------------------------------------------------

describe("estimativas e acertos", () => {
  test("factura estimada: aviso informativo com o próximo passo e certeza média", () => {
    const ant = fatura("a", [luz({ ...AGOSTO })]);
    const atu = fatura("b", [luz({ leitura: "estimada", kwh: 260, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const e = ev.find((x) => x.tipo === "energia_leitura_estimada");
    assert.equal(e.severidade, "info");
    assert.match(fraseEvento(e), /comunique a leitura do contador/);
    assert.equal(variacao(ev).certeza, "media");
    assert.match(fraseEvento(ev.find((x) => x.tipo === "energia_consumo_superior")), /estimado/);
  });

  test("estimativa seguida de acerto: o acerto fica separado e não conta como consumo do período", () => {
    const ant = fatura("a", [luz({ leitura: "estimada", kwh: 150, ...AGOSTO })]);
    const acerto = { ...luz({ kwh: 200, acertos: 2400, ...SETEMBRO }), acertoInicio: "2026-03-01", acertoFim: "2026-08-30", acertoKwh: 160 };
    const atu = fatura("b", [acerto]);
    const ev = compararEnergia(atu, [ant]);
    const d = variacao(ev);
    assert.equal(comp(d, "acertos"), 2400);
    assert.equal(comp(d, "consumo"), 750); // só +50 kWh do período, não os 160 do acerto
    assert.equal(somaComponentes(d), d.diferencaCents);
    const a = ev.find((x) => x.tipo === "energia_acerto");
    assert.equal(a.severidade, "atencao"); // ≥ 20 €
    assert.equal(TIPO_ACHADO.energia_acerto, "energia_acerto_relevante");
    assert.match(fraseEvento(a), /acerto de 24,00 € de períodos anteriores \(01\/03\/2026 a 30\/08\/2026\)/);
  });

  test("acerto pequeno ou a favor do cliente é informativo", () => {
    const atu = fatura("b", [luz({ acertos: -1500, ...SETEMBRO })]);
    const e = compararEnergia(atu, [fatura("a", [luz({ ...AGOSTO })])]).find((x) => x.tipo === "energia_acerto");
    assert.equal(e.severidade, "info");
    assert.match(fraseEvento(e), /devolução de 15,00 €/);
  });

  test("factura de acerto que volta a cobrir dias já facturados não é comparada", () => {
    const ant = fatura("a", [luz({ ...SETEMBRO })]);
    const rectificativa = fatura("b", [luz({ inicio: "2026-08-15", fim: "2026-09-29" })]);
    const ev = compararEnergia(rectificativa, [ant]);
    assert.ok(!ev.some((e) => e.tipo === "energia_variacao"));
    const e = ev.find((x) => x.tipo === "energia_dados_insuficientes");
    assert.equal(e.dados.motivo, "periodo_sobreposto");
    assert.match(fraseEvento(e), /cobre dias que já estavam noutra factura/);
  });
});

// ---------------------------------------------------------------------------
// 5. Factura conjunta, promoções, serviços
// ---------------------------------------------------------------------------

describe("factura conjunta, promoções e serviços adicionais", () => {
  const gas = (o = {}) => ({
    ...luz({ tipo: "gas", kwh: 300, preco: 0.08, dia: 0.12, impostos: 500, ...o }),
    consumoM3: 27.5,
    fatorConversao: 10.9,
    escalao: "2",
  });

  test("electricidade e gás na mesma factura: comparados em separado", () => {
    const ant = fatura("a", [luz({ ...AGOSTO }), gas({ ...AGOSTO })]);
    const atu = fatura("b", [luz({ ...SETEMBRO }), gas({ kwh: 400, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    const variacoes = ev.filter((e) => e.tipo === "energia_variacao");
    assert.equal(variacoes.length, 2);
    const [l, g] = ["eletricidade", "gas"].map((t) => variacoes.find((e) => e.dados.fornecimento === t).dados);
    assert.equal(l.diferencaCents, 0);
    assert.equal(g.diferencaCents, 800); // 100 kWh × 0,08
    assert.equal(comp(g, "consumo"), 800);
    // Chaves diferentes: nunca colidem na base de dados.
    assert.equal(new Set(ev.map((e) => e.chave)).size, ev.length);
    assert.match(fraseEvento(variacoes.find((e) => e.dados.fornecimento === "gas")), /A factura de gás foi 8,00 € mais alta/);
  });

  test("CPE diferente: não é o mesmo fornecimento", () => {
    const ant = fatura("a", [luz({ local: "hmac:" + "a".repeat(64), ...AGOSTO })]);
    const atu = fatura("b", [luz({ local: "hmac:" + "b".repeat(64), ...SETEMBRO })]);
    assert.equal(anteriorComparavel({ fatura: atu, f: atu.energia[0] }, [ant]).par, null);
  });

  test("desconto que desaparece: possível fim de promoção para revisão; com o fim registado no contrato, só informativo", () => {
    const ant = fatura("a", [luz({ descontos: 500, ...AGOSTO })]);
    const atu = fatura("b", [luz({ descontos: 0, ...SETEMBRO })]);
    const ev = compararEnergia(atu, [ant]);
    assert.equal(comp(variacao(ev), "descontos"), 500);
    assert.equal(ev.find((e) => e.tipo === "promocao_em_falta")?.severidade, "atencao");
    const comContrato = compararEnergia(atu, [ant], { promocaoFim: "2026-08-30" });
    assert.ok(!comContrato.some((e) => e.tipo === "promocao_em_falta"));
    assert.equal(comContrato.find((e) => e.tipo === "promocao_terminada")?.severidade, "info");
  });

  test("serviço adicional novo e serviço mais caro: para revisão", () => {
    const ant = fatura("a", [luz({ servicos: [{ descricao: "Assistência Casa", valorCents: 300 }], ...AGOSTO })]);
    const atu = fatura("b", [
      luz({ servicos: [{ descricao: "Assistência Casa", valorCents: 400 }, { descricao: "Seguro Equipamentos", valorCents: 299 }], ...SETEMBRO }),
    ]);
    const ev = compararEnergia(atu, [ant]).filter((e) => e.tipo === "energia_servico_adicional");
    assert.equal(ev.length, 2);
    assert.ok(ev.every((e) => e.severidade === "atencao"));
    assert.match(fraseEvento(ev.find((e) => e.dados.novo)), /“Seguro Equipamentos” \(2,99 €\)/);
    assert.match(fraseEvento(ev.find((e) => !e.dados.novo)), /passou de 3,00 € para 4,00 €/);
  });
});

// ---------------------------------------------------------------------------
// 6. Dados ausentes ou contraditórios
// ---------------------------------------------------------------------------

describe("dados ausentes ou contraditórios", () => {
  test("sem impostos lidos: explicação parcial, sem inventar o valor em falta", () => {
    const a = luz({ ...AGOSTO });
    const b = { ...luz({ kwh: 260, impostos: 1200, ...SETEMBRO }), impostosCents: null };
    const d = decompor({ fatura: fatura("b", [b]), f: b }, { fatura: fatura("a", [a]), f: a });
    assert.equal(d.parcial, true);
    assert.equal(d.certeza, "baixa");
    assert.equal(d.naoExplicadoCents, 200); // os 2 € de IVA a mais ficam "não identificados"
    assert.equal(somaComponentes(d), d.diferencaCents);
    const x = explicarDecomposicao(d);
    assert.equal(x.doConsumoCents, null); // parcial: não se separa consumo/preços
    assert.ok(x.notas.some((n) => /Não conseguimos explicar 2,00 €/.test(n)));
    assert.match(x.certezaTexto, /parcial/);
  });

  test("sem total: nada é comparado", () => {
    const ant = fatura("a", [luz({ ...AGOSTO })]);
    const b = { ...luz({ ...SETEMBRO }), totalCents: null };
    const ev = compararEnergia(fatura("b", [b]), [ant]);
    assert.ok(!ev.some((e) => e.tipo === "energia_variacao"));
    assert.equal(ev.find((e) => e.tipo === "energia_dados_insuficientes")?.dados.motivo, "sem_totais");
  });

  test("componentes que não somam o total: o resto fica à vista, nunca escondido", () => {
    const a = luz({ ...AGOSTO });
    const b = luz({ ...SETEMBRO, total: luz({ ...SETEMBRO }).totalCents + 350 });
    const d = decompor({ fatura: fatura("b", [b]), f: b }, { fatura: fatura("a", [a]), f: a });
    assert.equal(d.naoExplicadoCents, 350);
    assert.equal(d.parcial, true);
  });

  test("diferença até 10 cêntimos é arredondamento", () => {
    const a = luz({ ...AGOSTO });
    const b = luz({ ...SETEMBRO, total: luz({ ...SETEMBRO }).totalCents + 3 });
    const d = decompor({ fatura: fatura("b", [b]), f: b }, { fatura: fatura("a", [a]), f: a });
    assert.equal(d.arredondamentoCents, 3);
    assert.equal(d.parcial, false);
    assert.ok(explicarDecomposicao(d).notas.some((n) => /arredondamentos/.test(n)));
  });

  test("primeira factura: sem comparação nem alertas de comparação", () => {
    const ev = compararEnergia(fatura("a", [luz({ ...AGOSTO })]), []);
    assert.ok(!ev.some((e) => e.tipo === "energia_variacao" || e.severidade === "atencao"));
  });
});

// ---------------------------------------------------------------------------
// 7. Leitura (schema v4) e normalização
// ---------------------------------------------------------------------------

describe("leitura e normalização", () => {
  const campo = (valor, confianca = "high") => ({ valor, confianca, pagina: 1, evidencia: "" });
  const lido = (fornecimento, c, valor, periodo = "", descricao = "") => ({ fornecimento, campo: c, periodo, descricao, valor });
  const extracao = (energia, setor = "eletricidade") => ({
    tipo_documento: "fatura",
    setor,
    fornecedor: campo("EDP Comercial"),
    referencia_contrato: campo("", "not_found"),
    data_emissao: campo("2026-10-05"),
    periodo_inicio: "2026-08-31",
    periodo_fim: "2026-09-29",
    moeda: "EUR",
    total: campo("57.90"),
    mensalidade: campo("", "not_found"),
    data_fim_fidelizacao: campo("", "not_found"),
    valor_cessacao: campo("", "not_found"),
    data_referencia_cessacao: "",
    identificacao: { titular: "", nif_titular: "", numero_cliente: "", referencia_conta: "", numero_servico: "", numero_fatura: "F1" },
    linhas: [],
    energia,
  });
  const listaLuz = [
    lido("eletricidade", "cpe_cui", CPE),
    lido("eletricidade", "dias", "30"),
    lido("eletricidade", "potencia_kva", "6,9"),
    lido("eletricidade", "termo_fixo_dia", "0,3000"),
    lido("eletricidade", "valor_termo_fixo", "9.00"),
    lido("eletricidade", "opcao_horaria", "bi_horaria"),
    lido("eletricidade", "tipo_tarifario", "fixo"),
    lido("eletricidade", "tipo_leitura", "real"),
    lido("eletricidade", "energia_kwh", "100", "vazio"),
    lido("eletricidade", "energia_preco_kwh", "0,1000", "vazio"),
    lido("eletricidade", "energia_valor", "10.00", "vazio"),
    lido("eletricidade", "energia_kwh", "130", "fora_vazio"),
    lido("eletricidade", "energia_preco_kwh", "0,2000", "fora_vazio"),
    lido("eletricidade", "energia_valor", "26.00", "fora_vazio"),
    lido("eletricidade", "valor_impostos", "10.91"),
    lido("eletricidade", "valor_descontos", "0"),
    lido("eletricidade", "valor_acertos", "0"),
    lido("eletricidade", "servico_adicional", "1.99", "", "Assistência Lar"),
    lido("eletricidade", "total", "57.90"),
  ];

  test("lista de campos → fornecimento normalizado e reconciliado", () => {
    const [f] = normalizarEnergia(listaLuz, "eletricidade", 5790);
    assert.equal(f.tipo, "eletricidade");
    assert.equal(f.local, null); // CPE em claro nunca passa (só o pseudónimo)
    assert.equal(f.potenciaKva, 6.9);
    assert.equal(f.termoFixoDiaMicro, 300000);
    assert.equal(f.consumoKwh, 230);
    assert.equal(f.opcaoHoraria, "bi_horaria");
    assert.deepEqual(f.energia.map((p) => p.periodo), ["vazio", "fora_vazio"]);
    assert.equal(f.energiaCents, 3600);
    assert.deepEqual(f.servicosAdicionais, [{ descricao: "Assistência Lar", valorCents: 199 }]);
    assert.equal(f.reconciliado, true); // 36,00 + 9,00 + 10,91 + 1,99 = 57,90
    assert.equal(reconciliar({ ...f, totalCents: 6000 }), false);
  });

  test("o mesmo período em duas linhas (mudança de preço a meio) dá duas parcelas", () => {
    const g = agruparCamposEnergia([
      lido("eletricidade", "energia_kwh", "50", "simples"),
      lido("eletricidade", "energia_preco_kwh", "0.15", "simples"),
      lido("eletricidade", "energia_kwh", "60", "simples"),
      lido("eletricidade", "energia_preco_kwh", "0.17", "simples"),
    ]);
    assert.equal(g[0].parcelas_energia.length, 2);
  });

  test("validarExtracaoFatura: energia na fatura, CPE pseudonimizado como identificador cpe", () => {
    const protegida = protegerExtracao(extracao(listaLuz), CHAVE).resultado;
    const entradaCpe = protegida.energia.find((x) => x.campo === "cpe_cui");
    assert.match(entradaCpe.valor, /^hmac:[0-9a-f]{64}$/);
    assert.equal(protegida.energia.find((x) => x.campo === "cpe_cui_apresentacao").valor, "terminado em 78AB");
    assert.ok(!JSON.stringify(protegida).includes(CPE));
    const r = validarExtracaoFatura(protegida, "2026-10-21");
    assert.equal(r.ok, true);
    assert.equal(r.fatura.energia.length, 1);
    assert.equal(r.fatura.energia[0].local, entradaCpe.valor);
    const id = r.identificacao.find((i) => i.tipo === "cpe");
    assert.equal(id.valor, entradaCpe.valor);
    assert.equal(id.apresentacao, "terminado em 78AB");
  });

  test("factura conjunta: um fornecimento por tipo, cada um com o seu total", () => {
    const lista = [
      ...listaLuz,
      lido("gas", "consumo_kwh", "300"),
      lido("gas", "consumo_m3", "27,5"),
      lido("gas", "fator_conversao", "10,9"),
      lido("gas", "escalao", "2"),
      lido("gas", "total", "40.00"),
    ];
    const fs = normalizarEnergia(lista, "eletricidade", 9790);
    assert.deepEqual(fs.map((f) => [f.tipo, f.totalCents]), [["eletricidade", 5790], ["gas", 4000]]);
    assert.equal(fs[1].consumoM3, 27.5);
  });

  test("outros sectores e leituras antigas (fatura_v3) não têm energia", () => {
    assert.deepEqual(normalizarEnergia(listaLuz, "telecomunicacoes", 100), []);
    const { energia, ...v3 } = extracao(listaLuz);
    void energia;
    const r = validarExtracaoFatura(v3, "2026-10-21");
    assert.equal(r.ok, true);
    assert.deepEqual(r.fatura.energia, []);
  });

  test("valores inválidos são postos de parte com aviso", () => {
    const [f] = normalizarEnergia(
      [lido("eletricidade", "energia_kwh", "abc", "simples"), lido("eletricidade", "energia_preco_kwh", "9", "simples"), lido("eletricidade", "periodo_inicio", "2026-09-30"), lido("eletricidade", "periodo_fim", "2026-09-01")],
      "eletricidade",
      null,
    );
    assert.ok(f.avisos.includes("preco_energia_invalido"));
    assert.ok(f.avisos.includes("periodo_invertido"));
    assert.equal(f.periodoInicio, null);
  });

  test("preços em micro-euros", () => {
    assert.equal(paraMicro("0,1658"), 165800);
    assert.equal(paraMicro("0.274123"), 274123);
    assert.equal(paraMicro(""), null);
  });

  test("schema: interruptor desligado por omissão (fatura_v3); a v4 cabe no limite de propriedades", () => {
    assert.equal(energiaAtiva(undefined), false);
    assert.equal(energiaAtiva("1"), true);
    assert.equal(leituraFatura(false).schemaVersao, "fatura_v3");
    assert.equal(leituraFatura(true).schemaVersao, "fatura_v4");
    assert.ok(!("energia" in SCHEMA_FATURA_SEM_ENERGIA.properties));
    assert.ok(!SCHEMA_FATURA_SEM_ENERGIA.required.includes("energia"));
    assert.ok(SCHEMA_FATURA.required.includes("energia"));
    assert.ok(!leituraFatura(false).prompt.includes('Bloco "energia"'));
  });
});

// ---------------------------------------------------------------------------
// 8. CPE/CUI: minimização e compatibilidade com valores antigos
// ---------------------------------------------------------------------------

describe("CPE e CUI só como pseudónimo", () => {
  test("reconhece o formato", () => {
    assert.equal(ehCodigoLocal(CPE), true);
    assert.equal(ehCodigoLocal("PT 0002 0000 1234 5678 AB"), true);
    assert.equal(ehCodigoLocal("912345678"), false);
  });

  test("CPE em claro guardado antes desta versão coincide com o pseudónimo novo", () => {
    const antigo = normalizarIdentificador("cpe", CPE, CHAVE); // valor guardado em claro, convertido ao comparar
    const novo = normalizarIdentificador("cpe", protegerExtracao({ energia: [{ fornecimento: "eletricidade", campo: "cpe_cui", valor: CPE }] }, CHAVE).resultado.energia[0].valor, CHAVE, "terminado em 78AB");
    assert.equal(antigo.valorNormalizado, novo.valorNormalizado);
    // Também quando o CPE vinha como "número do serviço".
    assert.equal(normalizarIdentificador("numero_servico", CPE, CHAVE).valorNormalizado, antigo.valorNormalizado);
  });

  test("número do serviço com CPE é protegido na leitura; sem chave, o CPE é descartado", () => {
    const r = protegerExtracao({ identificacao: { numero_servico: CPE } }, CHAVE).resultado;
    assert.match(r.identificacao.numero_servico, /^hmac:/);
    assert.equal(r.identificacao.numero_servico_apresentacao, "terminado em 78AB");
    const semChave = protegerExtracao({ identificacao: { numero_servico: CPE } }, null).resultado;
    assert.equal(semChave.identificacao.numero_servico, "");
    // Um telefone continua como estava.
    assert.equal(protegerExtracao({ identificacao: { numero_servico: "912345678" } }, CHAVE).alterado, false);
  });
});

// ---------------------------------------------------------------------------
// 9. Integração com o acompanhamento e regressão das telecomunicações
// ---------------------------------------------------------------------------

describe("acompanhamento: energia e telecomunicações", () => {
  const telecom = (id, mensalidade, data) => ({
    id,
    dataEmissao: data,
    periodoInicio: null,
    periodoFim: null,
    totalCents: mensalidade,
    mensalidadeLidaCents: null,
    linhas: [{ descricao: "Pacote Fibra", categoria: "servico_base", valorCents: mensalidade, recorrente: true }],
  });

  test("telecomunicações: compararFaturaServico dá exactamente o mesmo que compararFatura", () => {
    const ant = telecom("t1", 4000, "2026-08-05");
    const atu = telecom("t2", 4640, "2026-09-05");
    assert.deepEqual(compararFaturaServico(atu, [ant], null), compararFatura(atu, [ant], null));
    assert.ok(compararFaturaServico(atu, [ant], null).some((e) => e.tipo === "mensalidade_alterada"));
  });

  test("energia: eventos energia_* sem os eventos de mensalidade das telecomunicações", () => {
    const comoServico = (f) => ({ ...f, mensalidadeLidaCents: null, linhas: [] });
    const ant = comoServico(fatura("a", [luz({ ...AGOSTO })]));
    const atu = comoServico(fatura("b", [luz({ preco: 0.18, ...SETEMBRO })]));
    const ev = compararFaturaServico(atu, [ant], null);
    assert.ok(ev.some((e) => e.tipo === "energia_variacao"));
    assert.ok(!ev.some((e) => e.tipo.startsWith("mensalidade") || e.tipo === "dados_insuficientes"));
    assert.equal(ev.find((e) => e.tipo === "energia_preco_alterado").confianca, "alta");
    assert.equal(compararFaturaServico(ant, [], null).find((e) => e.tipo === "primeira_fatura")?.severidade, "info");
  });

  test("factura de energia lida antes da v4 (sem fornecimentos) segue a comparação de sempre", () => {
    const antiga = { ...telecom("e1", 5000, "2026-08-05"), energia: [] };
    assert.deepEqual(compararFaturaServico(antiga, [], null), compararFatura(antiga, [], null));
  });

  test("decomposição guardada no evento é lida de volta para o portal", () => {
    const ev = compararEnergia(fatura("b", [luz({ kwh: 260, ...SETEMBRO })]), [fatura("a", [luz({ ...AGOSTO })])]);
    const guardado = JSON.parse(JSON.stringify(ev.find((e) => e.tipo === "energia_variacao").dados));
    const d = lerDecomposicao(guardado);
    assert.equal(d.diferencaCents, 900);
    assert.equal(lerDecomposicao({ componentes: "x" }), null);
    assert.match(fraseEventoEnergia({ tipo: "energia_variacao", montanteCents: 900, dados: guardado }), /mais alta do que a anterior: consumo de energia \+9,00 €/);
    assert.match(fraseEventoEnergia({ tipo: "energia_variacao", montanteCents: 900, dados: guardado }, "en-GB"), /The electricity bill was €9\.00 higher/);
  });

  test("nenhuma frase de energia conclui responsabilidade jurídica", () => {
    const ant = fatura("a", [luz({ descontos: 500, servicos: [], ...AGOSTO })]);
    const atu = fatura("b", [luz({ preco: 0.2, dia: 0.4, potencia: 10.35, acertos: 3000, servicos: [{ descricao: "Seguro", valorCents: 500 }], ...SETEMBRO })]);
    for (const e of compararEnergia(atu, [ant])) {
      for (const idioma of ["pt-PT", "en-GB"]) {
        assert.doesNotMatch(fraseEvento(e, idioma), /indevid|ilegal|viol|incumpr|tem direito|unlawful|breach|entitled/i, e.tipo);
      }
    }
  });
});

