// Calculadora de Cancelamento pública — `npm test`. Regras do cálculo,
// validação e garantias no código: sem login, sem IA, sem gravação.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { PROBLEMAS, SETORES } from "../pedidoCaso.ts";
import { calculadora as textosPt } from "../../i18n/mensagens/pt-PT/calculadora.ts";
import { calculadora as textosEn } from "../../i18n/mensagens/en-GB/calculadora.ts";
import {
  ERRO_VANTAGEM_AJUDA,
  PRE_PREENCHIMENTO_TRATAR_CASO,
  apresentacaoResultado,
  calcularEncargoCancelamento,
  cenariosPossiveis,
  compararComOperador,
  estimarEncargoCancelamento,
  validarDadosPublicos,
  formatarEuros,
  lerEuros,
  mesesEDias,
  somarMeses,
  validarDados,
} from "./regras.ts";

const ler = (caminho) => readFileSync(new URL(`../../../${caminho}`, import.meta.url), "utf8");

const HOJE = "2026-10-02";

// Primeira fidelização de 24 meses, 6 meses decorridos (1.º ano).
const BASE = {
  dataInicio: "2026-04-02",
  duracaoMeses: "24",
  tipo: "primeira",
  novaInstalacao: "",
  mensalidade: "30,00",
  vantagem: "1000",
  equipamento: "nao",
};

const calc = (alteracoes, hoje = HOJE) => calcularEncargoCancelamento({ ...BASE, ...alteracoes }, hoje);

describe("fidelização terminada", () => {
  test("fim já passou → 0 €, sem mensalidades em falta", () => {
    const r = calc({ dataInicio: "2023-01-10" });
    assert.equal(r.ok, true);
    assert.equal(r.estado, "terminada");
    assert.equal(r.resultadoCentimos, 0);
    assert.equal(r.tempo.dataFim, "2025-01-10");
    assert.equal(r.tempo.mensalidadesEmFalta, 0);
  });

  test("hoje igual à data de fim → terminada", () => {
    const r = calc({ dataInicio: "2024-10-02" });
    assert.equal(r.estado, "terminada");
    assert.equal(r.resultadoCentimos, 0);
  });

  test("contrato anterior a 14/11/2022 já terminado → 0 €", () => {
    const r = calc({ dataInicio: "2021-03-01", tipo: "refidelizacao", novaInstalacao: "nao" });
    assert.equal(r.estado, "terminada");
    assert.equal(r.resultadoCentimos, 0);
  });
});

describe("a partir de 14/11/2022 — primeira fidelização", () => {
  test("1.º ano: limite de 50% das mensalidades em falta", () => {
    const r = calc({});
    assert.equal(r.estado, "calculado");
    assert.equal(r.regime, "a_partir_de_2022_11_14");
    assert.deepEqual(r.tempo.decorrido, { meses: 6, dias: 0 });
    assert.deepEqual(r.tempo.emFalta, { meses: 18, dias: 0 });
    assert.equal(r.tempo.mensalidadesEmFalta, 18);
    assert.equal(r.anoFidelizacao, 1);
    assert.equal(r.percentagemLimite, 50);
    assert.equal(r.limiteMensalidadesCentimos, 27000); // 30 € × 18 × 50%
    // 1000 € × 548 / 731 dias
    assert.equal(r.vantagemProporcionalCentimos, 74966);
    assert.equal(r.resultadoCentimos, 27000);
    assert.equal(r.criterio, "limite");
  });

  test("2.º ano: limite de 30% das mensalidades em falta", () => {
    const r = calc({ dataInicio: "2025-07-02" });
    assert.equal(r.anoFidelizacao, 2);
    assert.equal(r.tempo.mensalidadesEmFalta, 9);
    assert.equal(r.percentagemLimite, 30);
    assert.equal(r.limiteMensalidadesCentimos, 8100); // 30 € × 9 × 30%
    assert.equal(r.resultadoCentimos, 8100);
  });

  test("12 meses completos já contam como 2.º ano", () => {
    const r = calc({ dataInicio: "2025-10-02" });
    assert.equal(r.anoFidelizacao, 2);
    assert.equal(r.percentagemLimite, 30);
    assert.equal(r.tempo.mensalidadesEmFalta, 12);
  });
});

describe("a partir de 14/11/2022 — refidelização", () => {
  test("sem nova instalação: sempre 30%, mesmo no 1.º ano", () => {
    const r = calc({ tipo: "refidelizacao", novaInstalacao: "nao" });
    assert.equal(r.anoFidelizacao, 1);
    assert.equal(r.percentagemLimite, 30);
    assert.equal(r.limiteMensalidadesCentimos, 16200); // 30 € × 18 × 30%
    assert.equal(r.resultadoCentimos, 16200);
  });

  test("com nova instalação: 50% no 1.º ano, 30% no 2.º", () => {
    const ano1 = calc({ tipo: "refidelizacao", novaInstalacao: "sim" });
    assert.equal(ano1.percentagemLimite, 50);
    assert.equal(ano1.resultadoCentimos, 27000);
    const ano2 = calc({ tipo: "refidelizacao", novaInstalacao: "sim", dataInicio: "2025-07-02" });
    assert.equal(ano2.percentagemLimite, 30);
    assert.equal(ano2.resultadoCentimos, 8100);
  });
});

describe("MIN(A, B)", () => {
  test("vantagem proporcional inferior ao limite → vale a vantagem", () => {
    const r = calc({ vantagem: "240" });
    assert.equal(r.vantagemProporcionalCentimos, 17992); // 240 € × 548 / 731
    assert.equal(r.limiteMensalidadesCentimos, 27000);
    assert.equal(r.resultadoCentimos, 17992);
    assert.equal(r.criterio, "vantagem");
  });

  test("limite inferior à vantagem proporcional → vale o limite", () => {
    const r = calc({ vantagem: "500" });
    assert.ok(r.vantagemProporcionalCentimos > r.limiteMensalidadesCentimos);
    assert.equal(r.resultadoCentimos, r.limiteMensalidadesCentimos);
    assert.equal(r.criterio, "limite");
  });

  test("valores iguais", () => {
    // 1.º dia: A = V; B = 10 € × 12 × 50% = 60 €
    const r = calc({ dataInicio: HOJE, duracaoMeses: "12", mensalidade: "10", vantagem: "60" });
    assert.equal(r.vantagemProporcionalCentimos, 6000);
    assert.equal(r.limiteMensalidadesCentimos, 6000);
    assert.equal(r.criterio, "iguais");
  });
});

describe("contratos anteriores a 14/11/2022", () => {
  const HOJE_ANTIGO = "2022-06-01";

  test("primeira fidelização: só a vantagem proporcional, sem limite de 50%/30%", () => {
    const r = calc({ dataInicio: "2021-06-01", vantagem: "100", mensalidade: "1" }, HOJE_ANTIGO);
    assert.equal(r.regime, "anterior_a_2022_11_14");
    assert.equal(r.vantagemProporcionalCentimos, 5000); // 365 / 730 dias
    assert.equal(r.limiteMensalidadesCentimos, null);
    assert.equal(r.percentagemLimite, null);
    assert.equal(r.resultadoCentimos, 5000);
    assert.equal(r.criterio, "so_vantagem");
  });

  test("refidelização sem nova instalação: MIN(A, 30% das mensalidades em falta), confirmado pela ANACOM", () => {
    // N = 12; B = 10 € × 12 × 30% = 36 €; A = 50 € → vale o limite
    const r = calc({ dataInicio: "2021-06-01", tipo: "refidelizacao", novaInstalacao: "nao", vantagem: "100", mensalidade: "10" }, HOJE_ANTIGO);
    assert.equal(r.estado, "calculado");
    assert.equal(r.regime, "anterior_a_2022_11_14");
    assert.equal(r.vantagemProporcionalCentimos, 5000);
    assert.equal(r.percentagemLimite, 30);
    assert.equal(r.limiteMensalidadesCentimos, 3600);
    assert.equal(r.resultadoCentimos, 3600);
    assert.equal(r.criterio, "limite");
    // 30% também no 1.º ano da refidelização
    const ano1 = calc({ dataInicio: "2022-01-01", tipo: "refidelizacao", novaInstalacao: "nao" }, HOJE_ANTIGO);
    assert.equal(ano1.anoFidelizacao, 1);
    assert.equal(ano1.percentagemLimite, 30);
  });

  test("refidelização com nova instalação: só a vantagem proporcional", () => {
    const r = calc({ dataInicio: "2021-06-01", tipo: "refidelizacao", novaInstalacao: "sim", vantagem: "100", mensalidade: "1" }, HOJE_ANTIGO);
    assert.equal(r.limiteMensalidadesCentimos, null);
    assert.equal(r.resultadoCentimos, 5000);
    assert.equal(r.criterio, "so_vantagem");
  });

  test("14/11/2022 já é o regime novo; 13/11/2022 ainda não", () => {
    assert.equal(calc({ dataInicio: "2022-11-14" }, "2023-01-01").regime, "a_partir_de_2022_11_14");
    assert.equal(calc({ dataInicio: "2022-11-13" }, "2023-01-01").regime, "anterior_a_2022_11_14");
  });
});

describe("equipamento subsidiado", () => {
  test("não altera o valor — só fica assinalado", () => {
    const sem = calc({});
    const com = calc({ equipamento: "sim" });
    assert.equal(com.equipamento, true);
    assert.equal(sem.equipamento, false);
    assert.equal(com.resultadoCentimos, sem.resultadoCentimos);
  });
});

describe("valores limite", () => {
  test("no 1.º dia: R = D, N = D, A = V", () => {
    const r = calc({ dataInicio: HOJE, vantagem: "123,45" });
    assert.equal(r.tempo.mensalidadesEmFalta, 24);
    assert.equal(r.vantagemProporcionalCentimos, 12345);
  });

  test("no último dia: N = 1 e nunca mais do que a duração", () => {
    const r = calc({ dataInicio: "2024-10-03" });
    assert.equal(r.estado, "calculado");
    assert.equal(r.tempo.mensalidadesEmFalta, 1);
    assert.deepEqual(r.tempo.emFalta, { meses: 0, dias: 1 });
    assert.ok(r.vantagemProporcionalCentimos <= 100000);
  });

  test("mensalidade e vantagem a 0 → 0 €, nunca negativo", () => {
    assert.equal(calc({ mensalidade: "0" }).resultadoCentimos, 0);
    assert.equal(calc({ vantagem: "0" }).resultadoCentimos, 0);
  });

  test("valores arredondados ao cêntimo (inteiros em cêntimos)", () => {
    const r = calc({ mensalidade: "33,33", vantagem: "99,99", dataInicio: "2026-03-17", duracaoMeses: "18" });
    for (const v of [r.vantagemProporcionalCentimos, r.limiteMensalidadesCentimos, r.resultadoCentimos]) {
      assert.ok(Number.isInteger(v) && v >= 0);
    }
  });
});

describe("dados inválidos", () => {
  const erros = (alteracoes) => validarDados({ ...BASE, ...alteracoes }, HOJE);

  test("data de início no futuro, inválida ou demasiado antiga", () => {
    assert.ok(erros({ dataInicio: "2026-10-03" }).dataInicio);
    assert.ok(erros({ dataInicio: "2026-02-30" }).dataInicio);
    assert.ok(erros({ dataInicio: "" }).dataInicio);
    assert.ok(erros({ dataInicio: "1999-12-31" }).dataInicio);
    assert.equal(erros({ dataInicio: HOJE }).dataInicio, undefined);
  });

  test("duração tem de ser um inteiro entre 1 e 24", () => {
    for (const d of ["0", "-3", "1.5", "abc", "", "25"]) assert.ok(erros({ duracaoMeses: d }).duracaoMeses, d);
    for (const d of ["1", "24"]) assert.equal(erros({ duracaoMeses: d }).duracaoMeses, undefined);
  });

  test("mensalidade e vantagem: sem negativos, até 2 casas decimais, com limite máximo", () => {
    for (const v of ["-5", "abc", "", "10,999", "1000,01"]) assert.ok(erros({ mensalidade: v }).mensalidade, v);
    for (const v of ["-1", "abc", "", "10000,01"]) assert.ok(erros({ vantagem: v }).vantagem, v);
  });

  test("escolhas obrigatórias; nova instalação só na refidelização", () => {
    assert.ok(erros({ tipo: "" }).tipo);
    assert.ok(erros({ equipamento: "" }).equipamento);
    assert.ok(erros({ tipo: "refidelizacao", novaInstalacao: "" }).novaInstalacao);
    assert.equal(erros({ tipo: "primeira", novaInstalacao: "" }).novaInstalacao, undefined);
  });

  test("dados inválidos não dão resultado", () => {
    const r = calc({ duracaoMeses: "0", mensalidade: "-1" });
    assert.equal(r.ok, false);
    assert.ok(r.erros.duracaoMeses && r.erros.mensalidade);
  });
});

describe("auxiliares", () => {
  test("somarMeses limita ao último dia do mês", () => {
    assert.equal(somarMeses("2026-01-31", 1), "2026-02-28");
    assert.equal(somarMeses("2027-12-15", 3), "2028-03-15");
  });

  test("mesesEDias", () => {
    assert.deepEqual(mesesEDias("2026-01-15", "2026-03-20"), { meses: 2, dias: 5 });
    assert.deepEqual(mesesEDias("2026-10-02", "2026-10-02"), { meses: 0, dias: 0 });
  });

  test("lerEuros e formatarEuros", () => {
    assert.equal(lerEuros("29,99"), 2999);
    assert.equal(lerEuros("29.9"), 2990);
    assert.equal(lerEuros(" 30 € "), 3000);
    assert.equal(lerEuros("-1"), null);
    assert.match(formatarEuros(8000), /^80,00\s€$/);
  });
});

describe("garantias", () => {
  test("pré-preenchimento usa valores das listas de Tratar o meu caso", () => {
    assert.ok(SETORES.includes(PRE_PREENCHIMENTO_TRATAR_CASO.setor));
    assert.ok(PROBLEMAS.includes(PRE_PREENCHIMENTO_TRATAR_CASO.problema));
  });

  test("a página corre só no browser: sem Supabase, sem IA, sem pedidos de rede", () => {
    const fonte = ler("src/components/calculadora-v2/CalculadoraV2.tsx") + ler("src/lib/calculadoraCancelamento/regras.ts");
    for (const proibido of ["supabase", "anthropic", "fetch(", "localStorage", "\"use server\""]) {
      assert.ok(!fonte.toLowerCase().includes(proibido.toLowerCase()), proibido);
    }
  });

  test("página pública, fora do portal e sem sessão", () => {
    const middleware = ler("src/middleware.ts");
    assert.equal(middleware.match(/"\/calculadora-cancelamento"/g)?.length, 2);
  });
});

// ---------------------------------------------------------------------------
// Calculadora pública (14/10/2026): vantagem e tipo de fidelização opcionais
// ---------------------------------------------------------------------------

// Exemplo do pedido: mensalidade 40 €, 24 meses, 16 decorridos → 8 em falta, 2.º ano.
const PUB = {
  dataInicio: "2025-06-02",
  duracaoMeses: "24",
  primeiraVez: "sim",
  novaInstalacao: "",
  mensalidade: "40",
  conheceVantagem: "nao_sei",
  vantagem: "",
  equipamento: "nao",
  valorOperador: "",
};

const pub = (alteracoes, hoje = HOJE) => estimarEncargoCancelamento({ ...PUB, ...alteracoes }, hoje);
// 1.º ano (6 meses decorridos, 18 em falta).
const ANO1 = { dataInicio: "2026-04-02" };

describe("calculadora pública — tipo de fidelização", () => {
  test("fidelização inicial no 1.º ano: limite de 50% das mensalidades em falta", () => {
    const r = pub({ ...ANO1 });
    assert.equal(r.estado, "calculado");
    assert.equal(r.anoFidelizacao, 1);
    assert.deepEqual(r.limitesMensalidades, [{ cenario: "geral", percentagem: 50, centimos: 36000 }]); // 40 × 18 × 50%
    assert.equal(r.resultadoCentimos, 36000);
  });

  test("fidelização inicial no 2.º ano: 40 € × 8 × 30% = 96 €", () => {
    const r = pub({});
    assert.equal(r.anoFidelizacao, 2);
    assert.equal(r.tempo.mensalidadesEmFalta, 8);
    assert.deepEqual(r.limitesMensalidades, [{ cenario: "geral", percentagem: 30, centimos: 9600 }]);
    assert.equal(r.resultadoCentimos, 9600);
  });

  test("refidelização sem nova instalação: 30% mesmo no 1.º ano", () => {
    const r = pub({ ...ANO1, primeiraVez: "nao", novaInstalacao: "nao" });
    assert.deepEqual(r.limitesMensalidades, [{ cenario: "refidelizacao_sem_instalacao", percentagem: 30, centimos: 21600 }]);
    assert.equal(r.resultadoCentimos, 21600);
  });

  test("refidelização com nova instalação: regra geral (50% no 1.º ano)", () => {
    const r = pub({ ...ANO1, primeiraVez: "nao", novaInstalacao: "sim" });
    assert.equal(r.limitesMensalidades[0].percentagem, 50);
    assert.equal(r.resultadoCentimos, 36000);
  });

  test("cenários possíveis a partir das respostas", () => {
    assert.deepEqual(cenariosPossiveis({ primeiraVez: "sim", novaInstalacao: "" }), ["geral"]);
    assert.deepEqual(cenariosPossiveis({ primeiraVez: "nao", novaInstalacao: "sim" }), ["geral"]);
    assert.deepEqual(cenariosPossiveis({ primeiraVez: "nao", novaInstalacao: "nao" }), ["refidelizacao_sem_instalacao"]);
    assert.deepEqual(cenariosPossiveis({ primeiraVez: "nao", novaInstalacao: "nao_sei" }), ["geral", "refidelizacao_sem_instalacao"]);
    assert.deepEqual(cenariosPossiveis({ primeiraVez: "nao_sei", novaInstalacao: "" }), ["geral", "refidelizacao_sem_instalacao"]);
  });

  test("tipo “Não sei” no 1.º ano: mostra o limite mais alto (50%), parcial, e os dois limites", () => {
    for (const respostas of [{ primeiraVez: "nao_sei" }, { primeiraVez: "nao", novaInstalacao: "nao_sei" }]) {
      const r = pub({ ...ANO1, ...respostas, conheceVantagem: "sim", vantagem: "1000" });
      assert.equal(r.completo, false);
      assert.deepEqual(r.faltam, ["tipo"]);
      assert.equal(r.resultadoCentimos, 36000);
      assert.deepEqual(r.limitesMensalidades.map((l) => l.percentagem), [50, 30]);
      assert.equal(r.criterio, null);
    }
  });

  test("tipo “Não sei” no 2.º ano: não muda o resultado → não falta", () => {
    const r = pub({ primeiraVez: "nao_sei", conheceVantagem: "sim", vantagem: "1000" });
    assert.equal(r.completo, true);
    assert.deepEqual(r.faltam, []);
    assert.equal(r.resultadoCentimos, 9600);
  });

  test("tipo “Não sei” com vantagem abaixo dos dois limites: o resultado é o mesmo → completo", () => {
    const r = pub({ ...ANO1, primeiraVez: "nao_sei", conheceVantagem: "sim", vantagem: "100" });
    assert.equal(r.completo, true);
    assert.equal(r.resultadoCentimos, r.vantagemProporcionalCentimos);
    assert.equal(r.criterio, "vantagem");
  });
});

describe("calculadora pública — vantagem associada à fidelização", () => {
  test("“Não sei”: calcula o limite pelas mensalidades, parcial, e diz que falta a vantagem", () => {
    const r = pub({ conheceVantagem: "nao_sei" });
    assert.equal(r.ok, true);
    assert.equal(r.completo, false);
    assert.deepEqual(r.faltam, ["vantagem"]);
    assert.equal(r.vantagemProporcionalCentimos, null);
    assert.equal(r.resultadoCentimos, 9600);
    assert.equal(r.criterio, null);
    assert.equal(apresentacaoResultado(r), "parcial");
  });

  test("“Não sei” ignora um valor de vantagem deixado no campo (mesmo inválido)", () => {
    const r = pub({ conheceVantagem: "nao_sei", vantagem: "abc" });
    assert.equal(r.ok, true);
    assert.equal(r.vantagemProporcionalCentimos, null);
  });

  test("conhece a vantagem: resultado completo com MIN(A, B)", () => {
    const r = pub({ conheceVantagem: "sim", vantagem: "240" });
    assert.equal(r.completo, true);
    assert.deepEqual(r.faltam, []);
    assert.equal(apresentacaoResultado(r), "completo");
  });

  test("vantagem proporcional inferior ao limite → vale a vantagem (240 € × 243/730 dias ≈ 79,89 €)", () => {
    const r = pub({ conheceVantagem: "sim", vantagem: "240" });
    assert.equal(r.vantagemProporcionalCentimos, 7989);
    assert.equal(r.limitesMensalidades[0].centimos, 9600);
    assert.equal(r.resultadoCentimos, 7989);
    assert.equal(r.criterio, "vantagem");
  });

  test("limite pelas mensalidades inferior à vantagem proporcional → vale o limite", () => {
    const r = pub({ conheceVantagem: "sim", vantagem: "600" });
    assert.ok(r.vantagemProporcionalCentimos > 9600);
    assert.equal(r.resultadoCentimos, 9600);
    assert.equal(r.criterio, "limite");
  });

  test("“Ajude-me a encontrar” com o valor → conta como conhecido", () => {
    const r = pub({ conheceVantagem: "ajuda", vantagem: "240" });
    assert.equal(r.completo, true);
    assert.equal(r.resultadoCentimos, 7989);
  });

  test("“Ajude-me a encontrar” sem valor → pede o valor ou “Não encontro este valor” (nunca bloqueia)", () => {
    const r = pub({ conheceVantagem: "ajuda", vantagem: "" });
    assert.equal(r.ok, false);
    assert.equal(r.erros.vantagem, ERRO_VANTAGEM_AJUDA);
    assert.equal(pub({ conheceVantagem: "nao_sei", vantagem: "" }).ok, true);
  });

  test("com a vantagem e o tipo conhecidos dá o mesmo que a regra completa (usada pelo Monitor)", () => {
    const tipos = [
      [{ primeiraVez: "sim" }, { tipo: "primeira", novaInstalacao: "" }],
      [{ primeiraVez: "nao", novaInstalacao: "sim" }, { tipo: "refidelizacao", novaInstalacao: "sim" }],
      [{ primeiraVez: "nao", novaInstalacao: "nao" }, { tipo: "refidelizacao", novaInstalacao: "nao" }],
    ];
    for (const dataInicio of ["2021-06-01", "2022-11-14", "2025-06-02", "2026-04-02", HOJE]) {
      for (const [publico, completo] of tipos) {
        for (const vantagem of ["0", "60", "240", "999,99"]) {
          const hoje = dataInicio === "2021-06-01" ? "2022-06-01" : HOJE;
          const a = pub({ dataInicio, ...publico, conheceVantagem: "sim", vantagem }, hoje);
          const b = calcularEncargoCancelamento({ ...BASE, dataInicio, ...completo, mensalidade: "40", vantagem }, hoje);
          assert.equal(a.completo, true);
          assert.equal(a.resultadoCentimos, b.resultadoCentimos, `${dataInicio} ${JSON.stringify(publico)} ${vantagem}`);
        }
      }
    }
  });
});

describe("calculadora pública — contratos anteriores a 14/11/2022", () => {
  const HOJE_ANTIGO = "2022-06-01";
  const ANTIGO = { dataInicio: "2021-06-01", mensalidade: "10" };

  test("regra geral sem a vantagem: não há limite calculável (sem_limite), nunca um valor inventado", () => {
    const r = pub({ ...ANTIGO }, HOJE_ANTIGO);
    assert.equal(r.estado, "sem_limite");
    assert.equal(r.completo, false);
    assert.deepEqual(r.faltam, ["vantagem"]);
    assert.equal("resultadoCentimos" in r, false);
  });

  test("renovação sem nova instalação sem a vantagem: limite de 30% (parcial)", () => {
    const r = pub({ ...ANTIGO, primeiraVez: "nao", novaInstalacao: "nao" }, HOJE_ANTIGO);
    assert.equal(r.estado, "calculado");
    assert.equal(r.completo, false);
    assert.equal(r.resultadoCentimos, 3600); // 10 € × 12 × 30%
  });

  test("tipo e vantagem desconhecidos: sem_limite, com os dois dados em falta", () => {
    const r = pub({ ...ANTIGO, primeiraVez: "nao_sei" }, HOJE_ANTIGO);
    assert.equal(r.estado, "sem_limite");
    assert.deepEqual(r.faltam, ["vantagem", "tipo"]);
  });

  test("tipo desconhecido com a vantagem: até à vantagem proporcional (o maior dos cenários)", () => {
    const r = pub({ ...ANTIGO, primeiraVez: "nao_sei", conheceVantagem: "sim", vantagem: "100" }, HOJE_ANTIGO);
    assert.equal(r.completo, false);
    assert.deepEqual(r.faltam, ["tipo"]);
    assert.equal(r.resultadoCentimos, 5000);
    assert.equal(r.cenarioSoVantagem, true);
  });
});

describe("calculadora pública — valor indicado pela operadora", () => {
  test("125 € face a um limite de 96 € → superior", () => {
    const r = pub({ valorOperador: "125" });
    assert.deepEqual(r.operador, { resultado: "superior", operadorCentimos: 12500, limiteCentimos: 9600 });
  });

  test("tolerância de 2 € ou 5%: próximo; abaixo → inferior", () => {
    assert.equal(compararComOperador(9700, 9600).resultado, "proximo");
    assert.equal(compararComOperador(9400, 9600).resultado, "proximo");
    assert.equal(compararComOperador(5000, 9600).resultado, "inferior");
    assert.equal(compararComOperador(110000, 100000).resultado, "superior"); // 5% de 1000 € = 50 €
    assert.equal(compararComOperador(104000, 100000).resultado, "proximo");
  });

  test("compara com o valor apresentado (no parcial, o limite)", () => {
    const r = pub({ conheceVantagem: "sim", vantagem: "240", valorOperador: "96" });
    assert.equal(r.operador.limiteCentimos, 7989);
    assert.equal(r.operador.resultado, "superior");
  });

  test("fidelização terminada: qualquer valor acima da tolerância é superior a 0 €", () => {
    const r = pub({ dataInicio: "2023-01-10", valorOperador: "50" });
    assert.equal(r.estado, "terminada");
    assert.equal(r.operador.resultado, "superior");
  });

  test("opcional: vazio → sem comparação", () => {
    assert.equal(pub({}).operador, null);
  });
});

describe("calculadora pública — validação", () => {
  const erros = (alteracoes) => validarDadosPublicos({ ...PUB, ...alteracoes }, HOJE);

  test("validações de sempre mantêm-se (datas, duração, mensalidade, equipamento)", () => {
    assert.ok(erros({ dataInicio: "2026-10-03" }).dataInicio);
    assert.ok(erros({ duracaoMeses: "25" }).duracaoMeses);
    assert.ok(erros({ mensalidade: "-5" }).mensalidade);
    assert.ok(erros({ mensalidade: "" }).mensalidade);
    assert.ok(erros({ equipamento: "" }).equipamento);
  });

  test("escolhas obrigatórias; nova instalação só quando a fidelização não é a primeira", () => {
    assert.ok(erros({ primeiraVez: "" }).primeiraVez);
    assert.ok(erros({ primeiraVez: "nao", novaInstalacao: "" }).novaInstalacao);
    assert.equal(erros({ primeiraVez: "nao_sei", novaInstalacao: "" }).novaInstalacao, undefined);
    assert.ok(erros({ conheceVantagem: "" }).conheceVantagem);
  });

  test("vantagem: obrigatória e validada só quando a pessoa diz que a conhece", () => {
    for (const v of ["", "-1", "abc", "10000,01", "1,999"]) assert.ok(erros({ conheceVantagem: "sim", vantagem: v }).vantagem, v);
    assert.deepEqual(erros({ conheceVantagem: "nao_sei", vantagem: "" }), {});
  });

  test("valor da operadora: opcional, mas validado quando preenchido", () => {
    for (const v of ["-1", "abc", "10000,01"]) assert.ok(erros({ valorOperador: v }).valorOperador, v);
    assert.equal(erros({ valorOperador: "" }).valorOperador, undefined);
    assert.equal(erros({ valorOperador: "125,50" }).valorOperador, undefined);
  });

  test("todas as mensagens de validação existem nos dois dicionários", () => {
    const casos = [{ primeiraVez: "" }, { conheceVantagem: "ajuda" }, { conheceVantagem: "sim", vantagem: "x" }, { conheceVantagem: "sim", vantagem: "20000" }, { valorOperador: "x" }, { valorOperador: "20000" }];
    for (const c of casos) {
      for (const msg of Object.values(erros(c))) {
        assert.ok(msg in textosPt.erros, msg);
        assert.ok(msg in textosEn.erros, msg);
      }
    }
  });
});

describe("calculadora pública — arredondamentos", () => {
  test("todos os valores em cêntimos inteiros, nunca negativos", () => {
    for (const vantagem of ["", "99,99", "0,01", "333,33"]) {
      for (const primeiraVez of ["sim", "nao_sei"]) {
        const r = pub({ mensalidade: "33,33", dataInicio: "2026-03-17", duracaoMeses: "18", primeiraVez, conheceVantagem: vantagem ? "sim" : "nao_sei", vantagem });
        const valores = [r.resultadoCentimos, r.vantagemProporcionalCentimos ?? 0, ...r.limitesMensalidades.map((l) => l.centimos)];
        for (const v of valores) assert.ok(Number.isInteger(v) && v >= 0, String(v));
      }
    }
  });

  test("arredondamento ao cêntimo: 33,33 € × 17 × 50% = 283,305 € → 283,31 €", () => {
    const r = pub({ mensalidade: "33,33", dataInicio: "2026-03-17", duracaoMeses: "18" });
    assert.equal(r.tempo.mensalidadesEmFalta, 12);
    // 1.º ano: 33,33 × 12 × 50% = 199,98 €
    assert.equal(r.resultadoCentimos, 19998);
    const r2 = pub({ mensalidade: "33,33", dataInicio: "2026-03-17", duracaoMeses: "18" }, "2026-04-20");
    assert.equal(r2.tempo.mensalidadesEmFalta, 17);
    assert.equal(r2.resultadoCentimos, Math.round((3333 * 17 * 50) / 100)); // 283,305 → 283,31
    assert.equal(r2.resultadoCentimos, 28331);
  });

  test("mensalidade 0 sem a vantagem: 0 € é definitivo (MIN(A, 0) = 0)", () => {
    const r = pub({ mensalidade: "0" });
    assert.equal(r.resultadoCentimos, 0);
    assert.equal(r.completo, true);
  });
});

describe("calculadora pública — um resultado parcial nunca é apresentado como definitivo", () => {
  test("completo só sem dados em falta; parcial sempre com o que falta", () => {
    for (const primeiraVez of ["sim", "nao", "nao_sei"]) {
      for (const novaInstalacao of ["sim", "nao", "nao_sei"]) {
        for (const conheceVantagem of ["sim", "nao_sei"]) {
          for (const [dataInicio, hoje] of [["2026-04-02", HOJE], ["2025-06-02", HOJE], ["2021-06-01", "2022-06-01"]]) {
            const r = pub({ dataInicio, primeiraVez, novaInstalacao, conheceVantagem, vantagem: conheceVantagem === "sim" ? "500" : "" }, hoje);
            assert.equal(r.ok, true);
            if (r.estado === "terminada") continue;
            if (r.completo) {
              assert.deepEqual(r.faltam, []);
              assert.equal(apresentacaoResultado(r), "completo");
            } else {
              assert.ok(r.faltam.length > 0);
              assert.notEqual(apresentacaoResultado(r), "completo");
              if (r.estado === "calculado") assert.equal(r.criterio, null);
            }
            if (conheceVantagem === "nao_sei" && r.estado === "calculado" && r.resultadoCentimos > 0) assert.equal(r.completo, false);
          }
        }
      }
    }
  });

  test("os textos do resultado parcial dizem “até” e nunca “valor máximo estimado” nem “terá de pagar”", () => {
    for (const t of [textosPt.resultado, textosEn.resultado]) {
      assert.match(t.tituloParcial, /até|up to/);
      assert.doesNotMatch(t.tituloParcial, /máximo estimado|maximum estimated/i);
      assert.doesNotMatch(t.parcialVantagem, /terá de pagar|will have to pay/i);
    }
    assert.match(textosPt.resultado.parcialVantagem, /poderá ser inferior/);
    assert.match(textosPt.resultado.tituloCompleto, /Valor máximo estimado/);
  });

  test("a página escolhe o título por apresentacaoResultado (o parcial nunca usa o título do completo)", () => {
    const fonte = ler("src/components/calculadora-v2/CalculadoraV2.tsx");
    assert.match(fonte, /apresentacaoResultado\(resultado\)/);
    assert.match(fonte, /modo === "completo" \? t\.tituloCompleto : modo === "parcial" \? t\.tituloParcial/);
  });

  test("sem “multa” nem conclusões de ilegalidade nos textos", () => {
    const pt = JSON.stringify(textosPt, (_k, v) => (typeof v === "function" ? v("X", "Y", 30) : v));
    assert.doesNotMatch(pt, /multa|ilegal/i);
    assert.match(textosPt.resultado.operadorSuperior("125,00 €", "96,00 €"), /não significa, por si só, que a cobrança seja indevida/);
  });
});
