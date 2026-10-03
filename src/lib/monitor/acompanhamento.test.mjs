// Acompanhamento de serviços — associação, comparação mensal e frases — `npm test`.
// Cenários A–T de docs/especificacoes/PLANO_ACOMPANHAMENTO_SERVICOS.md
// (o pipeline completo contra a base de dados real está em
// acompanhamento.contrato.test.mjs).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  compararFatura,
  componentesFatura,
  fraseEvento,
  fraseVariacaoTotal,
  mesAno,
  padraoObservado,
  resultadoFatura,
  versaoValida,
} from "./acompanhamento.ts";
import {
  avaliarAssociacao,
  escolherServico,
  lerChaveIdentificadores,
  normalizarIdentificador,
  normalizarIdentificadores,
  protegerExtracao,
} from "./identificacao.ts";
import { falhaTransitoria, situacaoDocumento } from "./processamento.ts";

// ---------------------------------------------------------------------------
// Ajudas
// ---------------------------------------------------------------------------

const linha = (descricao, valorCents, categoria = "servico_base", recorrente = true) => ({ descricao, categoria, valorCents, recorrente });

/** Fatura mensal: mensalidade em linhas (+ consumo, desconto, extras). */
function fatura(id, mes, { mensal = 7146, consumo = 0, desconto = 0, extras = [], pontual = 0, ano = 2026 } = {}) {
  const linhas = [linha("Pacote Fibra + TV", mensal + desconto)];
  if (desconto) linhas.push(linha("Desconto promoção", -desconto, "desconto"));
  for (const [d, v] of extras) linhas.push(linha(d, v, "servico_extra"));
  if (consumo) linhas.push(linha("Chamadas fora do pacote", consumo, "consumo", false));
  if (pontual) linhas.push(linha("Portes de envio", pontual, "outro", false));
  const total = linhas.reduce((s, l) => s + l.valorCents, 0);
  const mm = String(mes).padStart(2, "0");
  return {
    id,
    dataEmissao: `${ano}-${mm}-10`,
    periodoInicio: `${ano}-${mm}-01`,
    periodoFim: `${ano}-${mm}-28`,
    totalCents: total,
    mensalidadeLidaCents: null,
    linhas,
  };
}

const versao = (extra = {}) => ({
  id: "v1",
  validoDesde: null,
  validoAte: null,
  mensalidadeCents: 7146,
  descontoCents: null,
  descricaoPromocao: null,
  promocaoInicio: null,
  promocaoFim: null,
  dataFimFidelizacao: null,
  ...extra,
});

// O Intl separa o "€" com um espaço não separável.
const frase = (e) => fraseEvento(e).replace(/\u00a0/g, " ");
const tipos = (eventos) => eventos.map((e) => e.tipo).sort();
const PALAVRAS_DE_CONTRATO = /contrat|deveria|indevid/i;

// Chave dos pseudónimos só para os testes (a real vive na Clever Cloud).
const CHAVE = "chave-de-teste-com-pelo-menos-32-caracteres";

function ids(lidos) {
  return normalizarIdentificadores(lidos, CHAVE);
}
const MARIA = ids([
  { tipo: "nif_titular", valor: "123456789" },
  { tipo: "titular", valor: "Maria José Silva" },
  { tipo: "referencia_conta", valor: "215960347" },
  { tipo: "numero_servico", valor: "+351 912 345 678" },
]);
const OUTRO_CLIENTE = ids([
  { tipo: "nif_titular", valor: "987654321" },
  { tipo: "titular", valor: "João Pereira" },
  { tipo: "referencia_conta", valor: "315204142" },
]);

// ---------------------------------------------------------------------------
// Identificação e associação
// ---------------------------------------------------------------------------

describe("identificadores", () => {
  test("NIF e titular nunca ficam em texto (pseudónimo HMAC + apresentação mascarada)", () => {
    const nif = normalizarIdentificador("nif_titular", "PT 123 456 789", CHAVE);
    assert.match(nif.valorNormalizado, /^hmac:[0-9a-f]{64}$/);
    assert.equal(nif.valorNormalizado.includes("123456789"), false);
    assert.equal(nif.apresentacao, "NIF terminado em 789");
    assert.equal(normalizarIdentificador("nif_titular", "12345", CHAVE), null);
    const titular = normalizarIdentificador("titular", "Maria J. Silva", CHAVE);
    assert.equal(titular.valorNormalizado, normalizarIdentificador("titular", "MARIA JOSÉ SILVA", CHAVE).valorNormalizado);
    assert.equal(titular.apresentacao, null);
  });

  test("o pseudónimo depende da chave secreta (sem ela não se reconstrói)", () => {
    const a = normalizarIdentificador("nif_titular", "123456789", CHAVE).valorNormalizado;
    const b = normalizarIdentificador("nif_titular", "123456789", "outra-chave-de-teste-com-32-caracteres!").valorNormalizado;
    assert.notEqual(a, b);
  });

  test("sem chave válida, NIF e titular são ignorados (nunca guardados em claro)", () => {
    assert.equal(lerChaveIdentificadores(undefined), null);
    assert.equal(lerChaveIdentificadores("curta"), null);
    assert.equal(lerChaveIdentificadores(CHAVE), CHAVE);
    assert.equal(normalizarIdentificador("nif_titular", "123456789", null), null);
    assert.equal(normalizarIdentificador("titular", "Maria Silva", null), null);
    assert.equal(normalizarIdentificador("referencia_conta", "215960347", null).valorNormalizado, "215960347");
  });

  test("um pseudónimo já calculado é aceite tal como está (leituras protegidas)", () => {
    const p = normalizarIdentificador("nif_titular", "123456789", CHAVE);
    const outraVez = normalizarIdentificador("nif_titular", p.valorNormalizado, null, p.apresentacao);
    assert.deepEqual(outraVez, p);
  });

  test("referências normalizadas (espaços, pontuação, zeros à esquerda, indicativo)", () => {
    assert.equal(normalizarIdentificador("referencia_conta", "0021-5960 347").valorNormalizado, "215960347");
    assert.equal(normalizarIdentificador("numero_servico", "+351 912 345 678").valorNormalizado, "912345678");
    assert.equal(normalizarIdentificador("numero_cliente", "12"), null);
  });
});

describe("leitura gravada sem NIF nem nome do titular em texto", () => {
  const bruto = {
    tipo_documento: "fatura",
    fornecedor: { valor: "Vodafone" },
    identificacao: { titular: "Maria José Silva", nif_titular: "123456789", referencia_conta: "215960347", numero_fatura: "FT 1" },
  };

  test("protegerExtracao substitui NIF e titular e mantém o resto", () => {
    const { resultado, alterado } = protegerExtracao(bruto, CHAVE);
    assert.equal(alterado, true);
    const texto = JSON.stringify(resultado);
    assert.equal(texto.includes("123456789"), false);
    assert.equal(/maria|silva/i.test(texto), false);
    assert.equal(resultado.identificacao.nif_titular_apresentacao, "NIF terminado em 789");
    assert.equal(resultado.identificacao.referencia_conta, "215960347");
    assert.equal(resultado.identificacao.numero_fatura, "FT 1");
    assert.equal(bruto.identificacao.nif_titular, "123456789", "o original não é alterado");
  });

  test("idempotente, e a associação continua a funcionar com a leitura protegida", () => {
    const uma = protegerExtracao(bruto, CHAVE).resultado;
    const duas = protegerExtracao(uma, CHAVE);
    assert.equal(duas.alterado, false);
    assert.deepEqual(duas.resultado, uma);
    const lidos = [
      { tipo: "nif_titular", valor: uma.identificacao.nif_titular, apresentacao: uma.identificacao.nif_titular_apresentacao },
      { tipo: "titular", valor: uma.identificacao.titular },
    ];
    assert.deepEqual(
      normalizarIdentificadores(lidos, null).map((i) => i.valorNormalizado),
      ids([{ tipo: "nif_titular", valor: "123456789" }, { tipo: "titular", valor: "Maria Silva" }]).map((i) => i.valorNormalizado),
    );
  });

  test("sem chave: NIF e titular são removidos da leitura", () => {
    const { resultado } = protegerExtracao(bruto, null);
    assert.equal(resultado.identificacao.nif_titular, "");
    assert.equal(resultado.identificacao.titular, "");
    assert.equal(JSON.stringify(resultado).includes("123456789"), false);
  });

  test("leituras sem identificação ficam iguais", () => {
    const antiga = { tipo_documento: "fatura", total: { valor: "10" } };
    assert.deepEqual(protegerExtracao(antiga, CHAVE), { resultado: antiga, alterado: false });
  });
});

describe("associação de documentos a serviços", () => {
  const servicoMaria = { id: "s1", fornecedorChave: "vodafone", ids: MARIA };

  test("A. primeira fatura sem serviços: cria um serviço novo", () => {
    const d = escolherServico({ fornecedorChave: "vodafone", ids: MARIA }, []);
    assert.equal(d.acao, "novo_servico");
  });

  test("B. fatura do mesmo serviço (NIF e conta iguais): confirmada", () => {
    const r = avaliarAssociacao({ fornecedorChave: "vodafone", ids: MARIA }, servicoMaria);
    assert.equal(r.estado, "confirmada");
    assert.ok(r.confianca >= 0.9);
    assert.ok(r.motivos.includes("O NIF do titular é o mesmo"));
    assert.equal(escolherServico({ fornecedorChave: "vodafone", ids: MARIA }, [servicoMaria]).acao, "associar");
  });

  test("H. mesmo fornecedor, fatura de outro cliente: conflito", () => {
    const r = avaliarAssociacao({ fornecedorChave: "vodafone", ids: OUTRO_CLIENTE }, servicoMaria);
    assert.equal(r.estado, "conflito");
    assert.ok(r.conflitos.includes("O NIF do titular é diferente"));
    assert.ok(r.conflitos.includes("O número de cliente, de conta ou de contrato é diferente"));
  });

  test("40. caso real: fatura Vodafone de outro cliente carregada na página do contrato → não associa", () => {
    const d = escolherServico({ fornecedorChave: "vodafone", ids: OUTRO_CLIENTE }, [servicoMaria], "s1");
    assert.equal(d.acao, "perguntar");
    assert.equal(d.resultado.estado, "conflito");
    // Carregada na lista: vai para um serviço novo, nunca para o da Maria.
    assert.equal(escolherServico({ fornecedorChave: "vodafone", ids: OUTRO_CLIENTE }, [servicoMaria]).acao, "novo_servico");
  });

  test("I. mesmo cliente, outro número de serviço/contrato: não associa automaticamente", () => {
    const outroServico = ids([
      { tipo: "nif_titular", valor: "123456789" },
      { tipo: "numero_servico", valor: "961111111" },
    ]);
    const r = avaliarAssociacao({ fornecedorChave: "vodafone", ids: outroServico }, servicoMaria);
    assert.equal(r.estado, "possivel");
    assert.ok(r.conflitos.includes("O número do serviço é diferente"));
    assert.equal(escolherServico({ fornecedorChave: "vodafone", ids: outroServico }, [servicoMaria], "s1").acao, "perguntar");
  });

  test("Q. fatura sem identificadores suficientes: possível (o cliente decide)", () => {
    const r = avaliarAssociacao({ fornecedorChave: "vodafone", ids: [] }, servicoMaria);
    assert.equal(r.estado, "possivel");
    assert.ok(r.conflitos.some((c) => /suficientes/.test(c)));
    const d = escolherServico({ fornecedorChave: "vodafone", ids: [] }, [servicoMaria]);
    assert.equal(d.acao, "perguntar");
    assert.equal(d.servicoId, "s1");
  });

  test("fornecedor diferente: conflito, mesmo com o mesmo NIF", () => {
    assert.equal(avaliarAssociacao({ fornecedorChave: "meo", ids: MARIA }, servicoMaria).estado, "conflito");
  });

  test("escolhido no upload mas pertence a outro serviço: sugere a alternativa confirmada", () => {
    const outro = { id: "s2", fornecedorChave: "vodafone", ids: OUTRO_CLIENTE };
    const d = escolherServico({ fornecedorChave: "vodafone", ids: OUTRO_CLIENTE }, [servicoMaria, outro], "s1");
    assert.equal(d.acao, "perguntar");
    assert.equal(d.alternativaId, "s2");
  });

  test("M. contrato carregado depois das faturas: associa ao serviço existente (sem duplicar)", () => {
    const contrato = ids([
      { tipo: "nif_titular", valor: "123456789" },
      { tipo: "referencia_contrato", valor: "215960347" },
    ]);
    const d = escolherServico({ fornecedorChave: "vodafone", ids: contrato }, [servicoMaria]);
    assert.deepEqual([d.acao, d.servicoId], ["associar", "s1"]);
  });

  test("dois serviços com a mesma identificação: pergunta em vez de escolher", () => {
    const d = escolherServico({ fornecedorChave: "vodafone", ids: MARIA }, [servicoMaria, { ...servicoMaria, id: "s3" }]);
    assert.equal(d.acao, "perguntar");
  });
});

// ---------------------------------------------------------------------------
// Componentes da fatura
// ---------------------------------------------------------------------------

describe("componentes da fatura", () => {
  test("mensalidade recorrente ≠ total: consumos e pontuais à parte", () => {
    const c = componentesFatura(fatura("f", 10, { consumo: 500, pontual: 250, desconto: 2900 }));
    assert.equal(c.mensalidadeCents, 7146);
    assert.equal(c.descontoCents, 2900);
    assert.equal(c.consumosCents, 500);
    assert.equal(c.pontuaisCents, 250);
  });

  test("sem linhas: usa a mensalidade escrita na fatura (ou o recorrente antigo)", () => {
    assert.equal(componentesFatura({ id: "x", linhas: [], mensalidadeLidaCents: 5396 }).mensalidadeCents, 5396);
    assert.equal(componentesFatura({ id: "x", linhas: [], mensalidadeLidaCents: null, recorrenteCents: 2743 }).mensalidadeCents, 2743);
  });
});

// ---------------------------------------------------------------------------
// Sem contrato: comparação com as faturas anteriores
// ---------------------------------------------------------------------------

describe("sem contrato (nível 1)", () => {
  const jul = fatura("jul", 7);
  const ago = fatura("ago", 8);
  const set = fatura("set", 9);

  test("A. primeira fatura: sem meses para comparar", () => {
    const e = compararFatura(set, [], null);
    assert.deepEqual(tipos(e), ["primeira_fatura"]);
    assert.equal(frase(e[0]), "Primeira fatura analisada. Ainda não temos meses anteriores suficientes para comparar.");
  });

  test("B. segunda fatura igual: mensalidade mantém-se", () => {
    const e = compararFatura(ago, [jul], null);
    assert.deepEqual(tipos(e), ["mensalidade_mantida"]);
    assert.equal(resultadoFatura(e), "ok");
    assert.match(frase(e[0]), /mantém-se igual à do mês anterior \(71,46/);
  });

  test("C. três faturas iguais: padrão recorrente", () => {
    const e = compararFatura(set, [jul, ago], null);
    assert.equal(e[0].dados.consecutivas, 3);
    assert.match(frase(e[0]), /3\.ª fatura consecutiva com a mesma mensalidade/);
    const p = padraoObservado([jul, ago, set]);
    assert.equal(p.mensalidadeHabitualCents, 7146);
    assert.equal(p.trechos.length, 1);
    assert.equal(p.trechos[0].faturas, 3);
  });

  test("D. quarta fatura com +3 €: alteração detetada (para revisão)", () => {
    const out = fatura("out", 10, { mensal: 7446 });
    const e = compararFatura(out, [jul, ago, set], null);
    const alt = e.find((x) => x.tipo === "mensalidade_alterada");
    assert.equal(alt.severidade, "atencao");
    assert.equal(alt.montanteCents, 300);
    assert.equal(frase(alt), "A mensalidade recorrente aumentou 3,00 € face ao mês anterior (de 71,46 € para 74,46 €).");
    // Histórico preservado: até setembro 71,46 €, desde outubro 74,46 €.
    const p = padraoObservado([jul, ago, set, out]);
    assert.deepEqual(p.trechos.map((t) => [t.valorCents, t.faturas]), [[7146, 3], [7446, 1]]);
    assert.equal(p.mensalidadeHabitualCents, 7146);
  });

  test("D'. o novo valor repete-se: segunda fatura consecutiva com este novo valor", () => {
    const out = fatura("out", 10, { mensal: 7446 });
    const nov = fatura("nov", 11, { mensal: 7446 });
    const e = compararFatura(nov, [jul, ago, set, out], null);
    assert.deepEqual(tipos(e), ["mensalidade_mantida"]);
    assert.equal(frase(e[0]), "É a 2.ª fatura consecutiva com este novo valor (74,46 €).");
  });

  test("E/F. total superior mas mensalidade igual: não é aumento, é consumo adicional", () => {
    const out = fatura("out", 10, { consumo: 500 });
    const e = compararFatura(out, [jul, ago, set], null);
    assert.equal(e.some((x) => x.tipo === "mensalidade_alterada"), false);
    assert.deepEqual(tipos(e), ["consumo_adicional", "mensalidade_mantida"]);
    assert.equal(frase(e.find((x) => x.tipo === "consumo_adicional")), "Esta fatura inclui 5,00 € de consumo adicional.");
    assert.equal(fraseVariacaoTotal(out, set).replace(/\u00a0/g, " "), "Esta fatura é 5,00 € superior à anterior devido a consumo adicional.");
    assert.equal(resultadoFatura(e), "info");
  });

  test("G. desconto presente vários meses e depois ausente", () => {
    const comDesconto = [fatura("a", 5, { desconto: 2900 }), fatura("b", 6, { desconto: 2900 })];
    const e1 = compararFatura(fatura("c", 7, { desconto: 2900 }), comDesconto, null);
    assert.equal(frase(e1.find((x) => x.tipo === "promocao_aplicada")), "O desconto de 29,00 € continua a ser aplicado.");

    const semDesconto = fatura("d", 8, { mensal: 10046 }); // 71,46 + 29,00
    const e2 = compararFatura(semDesconto, [...comDesconto, fatura("c", 7, { desconto: 2900 })], null);
    const falta = e2.find((x) => x.tipo === "promocao_em_falta");
    assert.equal(falta.severidade, "atencao");
    assert.equal(falta.base, "historico");
    assert.equal(frase(falta), "O desconto de 29,00 € que aparecia na fatura anterior deixou de aparecer nesta fatura.");
    // O aumento da mensalidade é o próprio desconto: não aparece duas vezes.
    assert.equal(e2.some((x) => x.tipo === "mensalidade_alterada"), false);
  });

  test("cobrança recorrente nova: um evento (sem duplicar com o aumento)", () => {
    const out = fatura("out", 10, { extras: [["Sport TV", 499]] });
    const e = compararFatura(out, [jul, ago, set], null);
    const nova = e.find((x) => x.tipo === "cobranca_recorrente_nova");
    assert.equal(nova.severidade, "atencao");
    assert.equal(frase(nova), "Encontrámos uma cobrança nova de 4,99 € (“Sport TV”).");
    assert.equal(e.some((x) => x.tipo === "mensalidade_alterada"), false);
  });

  test("R. outra fatura do mesmo período: possível duplicado", () => {
    const dup = { ...fatura("set2", 9), id: "set2" };
    const e = compararFatura(dup, [jul, ago, set], null);
    assert.ok(e.some((x) => x.tipo === "possivel_duplicado" && x.dados.outra_fatura === "set"));
  });

  test("sem contrato a linguagem nunca fala do contrato nem de cobranças indevidas", () => {
    const cenarios = [
      compararFatura(set, [], null),
      compararFatura(fatura("o", 10, { mensal: 7446, consumo: 500, pontual: 300 }), [jul, ago, set], null),
      compararFatura(fatura("o", 10, { mensal: 6000 }), [jul, ago, set], null),
      compararFatura(fatura("d", 8, { mensal: 10046 }), [fatura("a", 7, { desconto: 2900 })], null),
      compararFatura(fatura("e", 8, { desconto: 1000 }), [fatura("a", 7, { desconto: 2900 })], null),
      compararFatura(fatura("e", 8, { extras: [["Extra", 500]] }), [jul], null),
    ].flat();
    for (const e of cenarios) {
      assert.equal(e.base, "historico", `${e.tipo} devia ser do histórico`);
      assert.equal(PALAVRAS_DE_CONTRATO.test(frase(e)), false, frase(e));
    }
  });
});

// ---------------------------------------------------------------------------
// Com contrato: fatura × versão do contrato
// ---------------------------------------------------------------------------

describe("com contrato (nível 3)", () => {
  test("J. fatura conforme o contrato", () => {
    const e = compararFatura(fatura("set", 9), [], versao());
    assert.deepEqual(tipos(e), ["mensalidade_conforme"]);
    assert.equal(resultadoFatura(e), "ok");
    assert.equal(frase(e[0]), "A mensalidade mantém-se conforme o contrato (71,46 €).");
  });

  test("K. mensalidade diferente do contrato: para revisão", () => {
    const e = compararFatura(fatura("set", 9, { mensal: 7446 }), [], versao());
    const d = e.find((x) => x.tipo === "diferenca_preco_contrato");
    assert.equal(d.severidade, "atencao");
    assert.equal(d.montanteCents, 300);
    assert.equal(frase(d), "A mensalidade recorrente (74,46 €) ficou 3,00 € acima do valor contratual (71,46 €).");
  });

  test("L. contrato + consumo adicional: mensalidade conforme e consumo explicado", () => {
    const e = compararFatura(fatura("set", 9, { consumo: 500 }), [], versao());
    assert.deepEqual(tipos(e), ["consumo_adicional", "mensalidade_conforme"]);
    assert.equal(e.some((x) => x.tipo === "diferenca_preco_contrato"), false);
  });

  test("desconto contratual aplicado / em falta", () => {
    const v = versao({ mensalidadeCents: 10046, descontoCents: 2900, promocaoFim: "2027-03-31" });
    const ok = compararFatura(fatura("set", 9, { desconto: 2900 }), [], v);
    assert.equal(frase(ok.find((x) => x.tipo === "promocao_aplicada")), "O desconto contratual de 29,00 € foi aplicado.");
    const falta = compararFatura(fatura("set", 9, { mensal: 10046 }), [], v);
    const f = falta.find((x) => x.tipo === "promocao_em_falta");
    assert.equal(f.severidade, "atencao");
    assert.equal(frase(f), "Não encontrámos o desconto de 29,00 € previsto no contrato.");
  });

  test("fim de fidelização indicado na fatura diferente do contrato: para revisão, nunca substitui", () => {
    const f = { ...fatura("set", 9), dataFimFidelizacao: "2027-06-30" };
    const e = compararFatura(f, [], versao({ dataFimFidelizacao: "2027-04-08" }));
    const d = e.find((x) => x.tipo === "fidelizacao_diferente");
    assert.equal(d.severidade, "atencao");
    assert.match(frase(d), /30\/06\/2027.*08\/04\/2027/);
  });

  test("N/O/P. duas versões do contrato: cada fatura com a versão válida no seu período", () => {
    const v1 = versao({ id: "v1", validoAte: "2026-06-30" });
    const v2 = versao({ id: "v2", validoDesde: "2026-07-01", mensalidadeCents: 7446 });
    const maio = fatura("mai", 5);
    const agosto = fatura("ago", 8, { mensal: 7446 });
    assert.equal(versaoValida([v1, v2], maio).id, "v1");
    assert.equal(versaoValida([v1, v2], agosto).id, "v2");
    assert.deepEqual(tipos(compararFatura(maio, [], versaoValida([v1, v2], maio))), ["mensalidade_conforme"]);
    const e = compararFatura(agosto, [maio], versaoValida([v1, v2], agosto));
    assert.deepEqual(tipos(e), ["mensalidade_conforme"]);
    assert.equal(e[0].contratoVersaoId, "v2");
  });

  test("M. reanálise retroativa: o aumento passa a ser explicado pelo contrato", () => {
    const anteriores = [fatura("mar", 3), fatura("abr", 4), fatura("mai", 5)];
    const junho = fatura("jun", 6, { mensal: 7646 });
    const antes = compararFatura(junho, anteriores, null);
    assert.ok(antes.some((e) => e.tipo === "mensalidade_alterada" && e.base === "historico"));
    // O contrato prevê 76,46 € a partir de junho (fim de uma promoção de 5 €).
    const vs = [versao({ id: "v1", validoAte: "2026-05-31" }), versao({ id: "v2", validoDesde: "2026-06-01", mensalidadeCents: 7646 })];
    const depois = compararFatura(junho, anteriores, versaoValida(vs, junho));
    assert.deepEqual(tipos(depois), ["mensalidade_conforme"]);
    // As chaves mudam: os eventos (e achados) antigos ficam substituídos, nunca reescritos.
    assert.notEqual(antes[0].chave, depois[0].chave);
  });

  test("chaves estáveis: a mesma comparação dá as mesmas chaves (idempotência)", () => {
    const f = fatura("out", 10, { mensal: 7446, consumo: 300 });
    const a = compararFatura(f, [fatura("set", 9)], null).map((e) => e.chave);
    const b = compararFatura(f, [fatura("set", 9)], null).map((e) => e.chave);
    assert.deepEqual(a, b);
  });
});

// ---------------------------------------------------------------------------
// Falhas da IA (S, T): nunca bloqueiam nem mostram erros técnicos
// ---------------------------------------------------------------------------

describe("falhas da leitura", () => {
  test("S. erro da API: falha transitória, o cliente pode tentar de novo", () => {
    assert.equal(falhaTransitoria("erro_api"), true);
    const s = situacaoDocumento({ etapa: "falhou", etapa_atualizada_em: new Date().toISOString(), estado: "pendente", contrato_id: null }, Date.now());
    assert.deepEqual(s, { tipo: "nao_concluido", podeRepetir: true });
  });

  test("T. limite de tempo: sem avanço há mais de 3 minutos → não concluído, pode repetir", () => {
    const ha5min = new Date(Date.now() - 5 * 60_000).toISOString();
    const s = situacaoDocumento({ etapa: "a_ler", etapa_atualizada_em: ha5min, estado: "pendente", contrato_id: null }, Date.now());
    assert.deepEqual(s, { tipo: "nao_concluido", podeRepetir: true });
  });

  test("sem chave da API: caminho manual, sem convite a repetir", () => {
    assert.equal(falhaTransitoria("api_nao_configurada"), false);
  });
});

test("mês por extenso", () => {
  assert.equal(mesAno("2026-10-03"), "Outubro 2026");
  assert.equal(mesAno(null), "Data desconhecida");
});
