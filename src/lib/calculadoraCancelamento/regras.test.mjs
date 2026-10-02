// Calculadora de Cancelamento pública — `npm test`. Regras do cálculo,
// validação e garantias no código: sem login, sem IA, sem gravação.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { PROBLEMAS, SETORES } from "../pedidoCaso.ts";
import {
  PRE_PREENCHIMENTO_TRATAR_CASO,
  calcularEncargoCancelamento,
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

  test("refidelização: não calculável automaticamente (com ou sem nova instalação)", () => {
    for (const novaInstalacao of ["sim", "nao"]) {
      const r = calc({ dataInicio: "2021-06-01", tipo: "refidelizacao", novaInstalacao }, HOJE_ANTIGO);
      assert.equal(r.ok, true);
      assert.equal(r.estado, "nao_calculavel");
      assert.match(r.motivo, /14 de novembro de 2022/);
    }
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
    const fonte = ler("src/components/landing/CalculadoraCancelamentoPublica.tsx") + ler("src/lib/calculadoraCancelamento/regras.ts");
    for (const proibido of ["supabase", "anthropic", "fetch(", "localStorage", "\"use server\""]) {
      assert.ok(!fonte.toLowerCase().includes(proibido.toLowerCase()), proibido);
    }
  });

  test("página pública, fora do portal e sem sessão", () => {
    const middleware = ler("src/middleware.ts");
    assert.equal(middleware.match(/"\/calculadora-cancelamento"/g)?.length, 2);
  });
});
