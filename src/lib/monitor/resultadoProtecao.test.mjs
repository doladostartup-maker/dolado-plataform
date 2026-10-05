// Resultado da Proteção apresentado ao cliente — `npm test`.
// "Primeiro verificamos a sua situação atual. Depois continuamos atentos."
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as R from "./resultadoProtecao.ts";

const { dataCurta, dataExtenso } = R;
// O formatador de euros usa um espaço não separável antes de "€".
const limpo = (x) => JSON.parse(JSON.stringify(x).replace(/\u00a0/g, " "));
const resultadoServico = (...a) => limpo(R.resultadoServico(...a));
const resultadoGeral = (...a) => limpo(R.resultadoGeral(...a));
const situacaoDe = (...a) => limpo(R.situacaoDe(...a));

const HOJE = "2026-10-05";

const linha = (descricao, valorCents, categoria = "servico_base", recorrente = true) => ({ descricao, categoria, valorCents, recorrente });

function fatura(id, mes, { mensal = 3990, desconto = 0, consumo = 0, emVerificacao = false, linhas } = {}) {
  const mm = String(mes).padStart(2, "0");
  const ls = linhas ?? [linha("Pacote Fibra + TV", mensal + desconto)];
  if (!linhas && desconto) ls.push(linha("Desconto promoção", -desconto, "desconto"));
  if (!linhas && consumo) ls.push(linha("Chamadas fora do pacote", consumo, "consumo", false));
  return {
    id,
    dataEmissao: `2026-${mm}-04`,
    periodoInicio: `2026-${mm}-01`,
    periodoFim: `2026-${mm}-28`,
    totalCents: ls.reduce((s, l) => s + l.valorCents, 0),
    mensalidadeLidaCents: null,
    linhas: ls,
    emVerificacao,
    registadaEm: `2026-${mm}-04T10:00:00Z`,
  };
}

const evento = (faturaId, tipo, extra = {}) => ({
  faturaId,
  tipo,
  base: "historico",
  severidade: "ok",
  montanteCents: null,
  dados: {},
  achadoId: null,
  criadoEm: "2026-10-04T10:00:05Z",
  ...extra,
});

const documento = (id, tipo, extra = {}) => ({
  id,
  tipo,
  estado: "processado",
  etapa: "concluido",
  etapaEm: "2026-10-04T10:00:10Z",
  criadoEm: "2026-10-04T09:59:50Z",
  ...extra,
});

function servico(extra = {}) {
  return {
    id: "s1",
    nome: "MEO",
    setor: "telecomunicacoes",
    terminado: false,
    campos: {},
    mensalidadeContratadaCents: null,
    descontoContratadoCents: null,
    porConfirmar: { campos: [], doContrato: false },
    faturas: [],
    eventos: [],
    achados: [],
    documentos: [],
    alertas: [],
    ...extra,
  };
}

const texto = (r) => JSON.stringify(r);

describe("datas", () => {
  test("por extenso e curtas, em Lisboa", () => {
    assert.equal(dataExtenso("2027-01-14"), "14 de janeiro de 2027");
    assert.equal(dataExtenso("2026-10-04", HOJE), "4 de outubro");
    assert.equal(dataCurta("2026-10-04T10:00:00Z", HOJE), "4 out.");
    assert.equal(dataCurta("2025-12-04", HOJE), "4 dez. 2025");
    // 23h30 UTC de 31/12 já é 1 de janeiro? Não: Lisboa está em UTC+0 no inverno.
    assert.equal(dataCurta("2026-07-31T23:30:00Z", HOJE), "1 ago.");
  });
});

describe("primeira utilização", () => {
  test("A. primeira fatura sem contrato: resultado imediato, tudo certo", () => {
    const f = fatura("f1", 10, { desconto: 1000 });
    const r = resultadoServico(
      servico({ faturas: [f], eventos: [evento("f1", "primeira_fatura", { severidade: "info" })], documentos: [documento("d1", "fatura")] }),
      HOJE,
    );
    assert.equal(r.estado, "verificado");
    assert.equal(r.titulo, "Já verificámos a sua primeira fatura");
    assert.equal(r.conclusao, "Está tudo certo por agora.");
    assert.equal(r.primeira, true);
    assert.equal(r.encontramos, "Nenhum problema neste momento");
    assert.deepEqual(
      r.verificacoes.map((v) => v.rotulo),
      ["Mensalidade", "Desconto", "Cobranças em duplicado"],
    );
    assert.equal(r.verificacoes[0].valor, "39,90 €");
    assert.equal(r.verificacoes[0].detalhe, "Valor de referência para as próximas faturas.");
    assert.ok(r.atentos.some((a) => a.texto === "Alterações à mensalidade de 39,90 €"));
    assert.ok(r.atentos.some((a) => a.texto === "Que o desconto de 10,00 € continua a ser aplicado"));
    assert.match(r.seguinte, /referência para acompanhar alterações futuras/);
    assert.equal(r.documentoVerificado, "a fatura de outubro de 2026");
    assert.equal(r.ultimaVerificacao, "2026-10-04T10:00:10Z");
    // Sem contrato nunca se fala de valores "contratados".
    assert.doesNotMatch(texto(r.verificacoes) + r.texto + texto(r.atentos), /contrat/i);
    // O que ainda não sabemos é dito, sem inventar.
    assert.ok(r.lacunas.includes("Não conseguimos confirmar se este serviço tem fidelização, nem quando termina."));
    assert.ok(r.lacunas.includes("Não conseguimos confirmar até quando se aplica o desconto."));
    assert.deepEqual(
      r.historico.map((h) => h.texto),
      ["Verificámos a primeira fatura (outubro de 2026) — tudo certo."],
    );
  });

  test("B. primeiro documento ainda a ser lido", () => {
    const r = resultadoServico(servico({ documentos: [documento("d1", "fatura", { estado: "pendente", etapa: "a_ler" })] }), HOJE);
    assert.equal(r.estado, "em_analise");
    assert.equal(r.titulo, "Estamos a verificar por si");
    assert.deepEqual(r.verificacoes, []);
    assert.equal(r.encontramos, null);
  });

  test("C. documento que a DoLado vai verificar à mão", () => {
    const r = resultadoServico(servico({ documentos: [documento("d1", "fatura", { estado: "a_rever" })] }), HOJE);
    assert.equal(r.estado, "a_rever");
    assert.equal(r.titulo, "Estamos a verificar o seu documento");
  });

  test("D. contrato lido, condições por confirmar", () => {
    const r = resultadoServico(
      servico({ porConfirmar: { campos: ["mensalidade_cents", "data_fim_fidelizacao"], doContrato: true }, documentos: [documento("d1", "contrato")] }),
      HOJE,
    );
    assert.equal(r.estado, "por_confirmar");
    assert.equal(r.titulo, "Lemos o seu contrato");
    assert.equal(r.confirmar, true);
    assert.match(r.texto, /só as usamos depois da sua confirmação/);
  });

  test("E. contrato confirmado, ainda sem faturas", () => {
    const r = resultadoServico(
      servico({
        campos: {
          mensalidade_cents: { valor: 3990, origem: "contrato" },
          data_fim_promocao: { valor: "2027-01-14", origem: "contrato" },
          data_fim_fidelizacao: { valor: "2027-03-14", origem: "contrato" },
        },
        mensalidadeContratadaCents: 3990,
        descontoContratadoCents: 1000,
        documentos: [documento("d1", "contrato")],
      }),
      HOJE,
    );
    assert.equal(r.estado, "verificado");
    assert.equal(r.titulo, "Já verificámos o seu contrato");
    assert.equal(r.seguinte, "Quando recebermos uma fatura, vamos comparar o que está a ser cobrado com estas condições.");
    assert.deepEqual(
      r.atentos.map((a) => a.texto),
      [
        "Fim da promoção a 14 de janeiro de 2027",
        "Fim da fidelização a 14 de março de 2027",
        "Alterações à mensalidade de 39,90 €",
        "Que o desconto de 10,00 € continua a ser aplicado",
      ],
    );
    assert.equal(r.proxima.tipo, "promocao");
    assert.deepEqual(r.lacunas, []);
    assert.equal(r.documentoVerificado, "o contrato");
    assert.deepEqual(
      r.historico.map((h) => h.texto),
      ["Lemos o contrato e identificámos as condições a acompanhar."],
    );
  });

  test("F. serviço indicado à mão, sem documentos", () => {
    const r = resultadoServico(servico({ campos: { data_fim_fidelizacao: { valor: "2027-03-14", origem: "cliente" } } }), HOJE);
    assert.equal(r.titulo, "Registámos as condições que indicou");
    assert.equal(r.verificacoes[0].detalhe, "Indicado por si");
  });

  test("G. fatura sem mensalidade identificada: informação incompleta, sem inventar", () => {
    const f = fatura("f1", 10, { linhas: [] });
    const r = resultadoServico(
      servico({ faturas: [f], eventos: [evento("f1", "dados_insuficientes", { severidade: "info" })], documentos: [documento("d1", "fatura")] }),
      HOJE,
    );
    assert.equal(r.estado, "verificado");
    assert.equal(r.conclusao, null);
    assert.match(r.texto, /Não conseguimos identificar a mensalidade/);
    assert.ok(!r.verificacoes.some((v) => v.rotulo === "Mensalidade"));
    assert.ok(!r.atentos.some((a) => a.texto.startsWith("Alterações à mensalidade")));
    assert.match(r.historico[0].texto, /não conseguimos identificar a mensalidade/);
  });
});

describe("continuamos atentos", () => {
  test("H. nova fatura sem alterações", () => {
    const f1 = fatura("f1", 9);
    const f2 = fatura("f2", 10);
    const r = resultadoServico(
      servico({
        faturas: [f1, f2],
        eventos: [evento("f1", "primeira_fatura", { severidade: "info" }), evento("f2", "mensalidade_mantida", { dados: { mensalidade: 3990, consecutivas: 2 } })],
        documentos: [documento("d1", "fatura"), documento("d2", "fatura")],
      }),
      HOJE,
    );
    assert.equal(r.titulo, "Continua tudo certo");
    assert.equal(r.texto, "Comparámos a fatura de outubro de 2026 com as faturas anteriores e não encontrámos alterações relevantes.");
    assert.equal(r.verificacoes.find((v) => v.rotulo === "Mensalidade").detalhe, "Igual à fatura anterior.");
    assert.ok(r.verificacoes.some((v) => v.rotulo === "Cobranças novas" && v.valor === "Nenhuma face às faturas anteriores"));
    assert.deepEqual(
      r.historico.map((h) => h.texto),
      ["Comparámos a fatura de outubro de 2026 — sem alterações relevantes.", "Verificámos a primeira fatura (setembro de 2026) — tudo certo."],
    );
  });

  test("I. com contrato e fatura conforme", () => {
    const r = resultadoServico(
      servico({
        campos: { mensalidade_cents: { valor: 3990, origem: "contrato" } },
        mensalidadeContratadaCents: 3990,
        faturas: [fatura("f1", 9), fatura("f2", 10)],
        eventos: [evento("f2", "mensalidade_conforme", { base: "contrato" })],
        documentos: [documento("c1", "contrato"), documento("d1", "fatura"), documento("d2", "fatura")],
      }),
      HOJE,
    );
    assert.match(r.texto, /com as condições do contrato e com as faturas anteriores/);
    assert.equal(r.verificacoes[0].rotulo, "Mensalidade do contrato");
    assert.equal(r.verificacoes[0].detalhe, "A fatura de outubro de 2026 está de acordo com este valor.");
    assert.match(r.seguinte, /comparar as próximas faturas com o contrato/);
  });

  test("J. alteração em verificação: calma, sem afirmar que não encontrámos nada", () => {
    const r = resultadoServico(
      servico({
        faturas: [fatura("f1", 9), fatura("f2", 10, { mensal: 4630, emVerificacao: true })],
        eventos: [],
        documentos: [documento("d1", "fatura"), documento("d2", "fatura")],
      }),
      HOJE,
    );
    assert.equal(r.estado, "em_verificacao");
    assert.equal(r.titulo, "Estamos a verificar uma alteração");
    assert.match(r.texto, /Não precisa de fazer nada por agora/);
    assert.ok(!r.verificacoes.some((v) => /duplicado|novas/.test(v.rotulo)));
    assert.equal(r.encontramos, "Uma alteração em verificação pela DoLado");
    assert.match(r.historico[0].texto, /estamos a verificar uma alteração/);
  });

  test("K. dados da fatura por confirmar não escondem o resultado", () => {
    const r = resultadoServico(
      servico({ faturas: [fatura("f1", 10)], porConfirmar: { campos: ["data_fim_fidelizacao"], doContrato: false }, documentos: [documento("d1", "fatura")] }),
      HOJE,
    );
    assert.equal(r.estado, "verificado");
    assert.equal(r.confirmar, true);
    // A fidelização lida na fatura está por confirmar: não é uma lacuna.
    assert.ok(!r.lacunas.some((l) => /fidelização/.test(l)));
  });

  test("L. avisos enviados entram no histórico", () => {
    const r = resultadoServico(
      servico({
        campos: { data_fim_promocao: { valor: "2026-11-30", origem: "contrato" } },
        documentos: [documento("c1", "contrato")],
        alertas: [{ regra: "promocao_60d", dataAlvo: "2026-11-30", enviadoEm: "2026-10-01T08:00:00Z" }],
      }),
      HOJE,
    );
    assert.ok(r.historico.some((h) => h.texto === "Avisámo-lo por e-mail do fim da promoção (30 de novembro)."));
  });

  test("M. serviço terminado: nada a acompanhar", () => {
    const r = resultadoServico(servico({ terminado: true, faturas: [fatura("f1", 10)], documentos: [documento("d1", "fatura")] }), HOJE);
    assert.deepEqual(r.atentos, []);
    assert.equal(r.seguinte, null);
  });
});

describe("encontrámos algo", () => {
  const achado = { id: "a1", faturaId: "f2", tipo: "mensalidade_alterada", texto: "A mensalidade passou de 39,90 € para 46,30 €.", comunicadoEm: "2026-10-04T15:00:00Z" };
  const eventoAchado = evento("f2", "mensalidade_alterada", {
    severidade: "atencao",
    montanteCents: 640,
    dados: { anterior: 3990, atual: 4630, sentido: "aumento" },
    achadoId: "a1",
  });

  test("N. aumento comunicado: antes, agora, diferença e ponte para o tratamento", () => {
    const r = resultadoServico(
      servico({
        faturas: [fatura("f1", 9), fatura("f2", 10, { mensal: 4630 })],
        eventos: [eventoAchado],
        achados: [achado],
        documentos: [documento("d1", "fatura"), documento("d2", "fatura")],
      }),
      HOJE,
    );
    assert.equal(r.estado, "encontramos");
    assert.equal(r.titulo, "Encontrámos algo que merece a sua atenção");
    const [s] = r.situacoes;
    assert.equal(s.resumo, "A sua mensalidade aumentou 6,40 € relativamente ao valor que estávamos a acompanhar.");
    assert.deepEqual(s.valores, {
      antes: { rotulo: "Antes", valor: "39,90 €" },
      agora: { rotulo: "Agora", valor: "46,30 €" },
      diferenca: { rotulo: "Diferença", valor: "+6,40 €/mês" },
    });
    assert.equal(s.texto, achado.texto);
    assert.equal(s.problema, "Aumento de mensalidade");
    assert.match(s.causas, /Nem sempre é um erro/);
    assert.equal(r.historico[0].texto, "Detetámos um aumento de 6,40 € na mensalidade na fatura de outubro de 2026.");
    assert.equal(r.historico[0].tom, "atencao");
  });

  test("O. situação antiga sai do destaque, mas fica no histórico", () => {
    const antigo = { ...achado, faturaId: "f1", comunicadoEm: "2026-06-01T10:00:00Z" };
    const r = resultadoServico(
      servico({
        faturas: [fatura("f1", 5), fatura("f2", 10)],
        eventos: [{ ...eventoAchado, faturaId: "f1" }],
        achados: [antigo],
        documentos: [documento("d1", "fatura"), documento("d2", "fatura")],
      }),
      HOJE,
    );
    assert.equal(r.estado, "verificado");
    assert.deepEqual(r.situacoes, []);
    assert.ok(r.historico.some((h) => h.tom === "atencao" && /aumento de 6,40 €/.test(h.texto)));
  });

  test("P. situações sem dados da comparação: só o texto revisto", () => {
    const s = situacaoDe(
      { id: "a2", faturaId: "f1", tipo: "cessacao_divergente", texto: "O valor indicado é superior à estimativa.", comunicadoEm: "2026-10-04T10:00:00Z" },
      [],
      { id: "s1", nome: "MEO" },
    );
    assert.equal(s.resumo, null);
    assert.equal(s.valores, null);
    assert.equal(s.problema, "Fidelização ou penalização");
  });

  test("Q. desconto em falta face ao contrato", () => {
    const s = situacaoDe(
      { id: "a3", faturaId: "f1", tipo: "promocao_em_falta", texto: "…", comunicadoEm: "2026-10-04T10:00:00Z" },
      [evento("f1", "promocao_em_falta", { base: "contrato", severidade: "atencao", montanteCents: 1000, dados: { desconto: 1000 }, achadoId: "a3" })],
      { id: "s1", nome: "MEO" },
    );
    assert.equal(s.resumo, "O desconto de 10,00 € previsto no seu contrato não aparece na fatura.");
    assert.equal(s.valores.diferenca.valor, "+10,00 €/mês");
  });
});

describe("resultado geral", () => {
  test("R. sem serviços: começar pela situação atual", () => {
    const g = resultadoGeral([]);
    assert.equal(g.estado, "sem_dados");
    assert.equal(g.titulo, "Comece pela sua situação atual");
  });

  test("S. um só serviço: o resultado é o do serviço", () => {
    const r = resultadoServico(servico({ faturas: [fatura("f1", 10)], documentos: [documento("d1", "fatura")] }), HOJE);
    const g = resultadoGeral([r]);
    assert.equal(g.titulo, "Já verificámos a sua primeira fatura");
    assert.equal(g.pontos, r.verificacoes.length);
  });

  test("T. vários serviços: o que precisa de atenção primeiro", () => {
    const bem = resultadoServico(servico({ id: "s2", nome: "EDP", setor: "eletricidade", faturas: [fatura("g1", 10)], documentos: [documento("e1", "fatura")] }), HOJE);
    const mal = resultadoServico(
      servico({
        faturas: [fatura("f1", 9), fatura("f2", 10, { mensal: 4630 })],
        eventos: [evento("f2", "mensalidade_alterada", { severidade: "atencao", montanteCents: 640, dados: { anterior: 3990, atual: 4630 }, achadoId: "a1" })],
        achados: [{ id: "a1", faturaId: "f2", tipo: "mensalidade_alterada", texto: "…", comunicadoEm: "2026-10-04T15:00:00Z" }],
        documentos: [documento("d1", "fatura"), documento("d2", "fatura")],
      }),
      HOJE,
    );
    const g = resultadoGeral([bem, mal]);
    assert.equal(g.estado, "encontramos");
    assert.equal(g.texto, "Há uma situação no serviço MEO que a DoLado reviu antes de lha mostrar. Nos restantes serviços, está tudo certo.");
    assert.equal(g.situacoes.length, 1);
    assert.equal(g.servicosVerificados, 2);

    const tudoBem = resultadoGeral([bem, resultadoServico(servico({ faturas: [fatura("f1", 10)], documentos: [documento("d1", "fatura")] }), HOJE)]);
    assert.equal(tudoBem.titulo, "Continua tudo certo");
    assert.equal(tudoBem.texto, "Verificámos os seus 2 serviços e não encontrámos nada que exija a sua atenção neste momento.");
  });
});
