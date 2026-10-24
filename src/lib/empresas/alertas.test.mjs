// DoLado Empresas — Fase 8: alertas, factura em falta e resumo mensal
// (regras, e-mails e regras estáticas) — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  RESUMO_EMPRESA_MODELO,
  agoraLisboa,
  assuntoPrazo,
  assuntoResumo,
  fraseQuando,
  horaDeAlertas,
  lerConteudoResumo,
  mesDoResumo,
  montarResumoEmpresa,
  notaPreaviso,
  seccoesResumo,
} from "./alertas.ts";
import { montarHtmlAchadoEmpresa, montarHtmlFacturaEmFalta, montarHtmlPrazoEmpresa, montarHtmlResumoEmpresa } from "../email/empresas.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");
const data = (iso) => `[${iso}]`;

describe("quando envia", () => {
  test("hora de Lisboa (Verão e Inverno)", () => {
    assert.deepEqual(agoraLisboa(new Date("2026-07-01T06:30:00Z")), { hoje: "2026-07-01", mes: "2026-07", dia: 1, hora: 7 });
    assert.deepEqual(agoraLisboa(new Date("2026-12-31T23:30:00Z")), { hoje: "2026-12-31", mes: "2026-12", dia: 31, hora: 23 });
  });
  test("alertas só entre as 8h e as 21h", () => {
    assert.equal(horaDeAlertas(7), false);
    assert.equal(horaDeAlertas(8), true);
    assert.equal(horaDeAlertas(20), true);
    assert.equal(horaDeAlertas(21), false);
  });
  test("resumo do mês anterior, dias 1 a 5 a partir das 9h", () => {
    assert.equal(mesDoResumo({ hoje: "2026-11-01", dia: 1, hora: 9 }), "2026-10-01");
    assert.equal(mesDoResumo({ hoje: "2027-01-03", dia: 3, hora: 15 }), "2026-12-01");
    assert.equal(mesDoResumo({ hoje: "2026-11-01", dia: 1, hora: 8 }), null);
    assert.equal(mesDoResumo({ hoje: "2026-11-06", dia: 6, hora: 10 }), null);
  });
});

describe("textos dos alertas", () => {
  test("assunto e frase do prazo", () => {
    assert.equal(assuntoPrazo("fidelizacao_60d", 45), "A fidelização de um serviço termina dentro de 45 dias");
    assert.equal(assuntoPrazo("promocao_fim", 0), "A promoção de um serviço termina hoje");
    assert.equal(fraseQuando(1, "2 de Novembro de 2026"), "termina amanhã, a 2 de Novembro de 2026");
  });
  test("pré-aviso: dias que faltam para comunicar ao fornecedor", () => {
    assert.match(notaPreaviso("fidelizacao_60d", 90, 110), /nos próximos 20 dias/);
    assert.match(notaPreaviso("fidelizacao_30d", 60, 30), /pode já ter passado/);
    assert.equal(notaPreaviso("promocao_60d", 90, 110), null);
    assert.equal(notaPreaviso("fidelizacao_60d", null, 50), null);
  });
  test("e-mails: escape do que vem dos documentos e do backoffice; sem «Tratar o meu caso»", () => {
    const prazo = montarHtmlPrazoEmpresa({
      organizacao: "<b>X</b>",
      fidelizacao: true,
      servico: "Tel <script>",
      instalacao: "Loja & Cª",
      quando: "termina dentro de 45 dias",
      descricaoPromocao: null,
      notaPreaviso: null,
      assunto: "A",
    });
    assert.doesNotMatch(prazo, /<script>|<b>X/);
    assert.match(prazo, /Loja &amp; Cª/);
    assert.match(prazo, /\/empresa\/alertas/);
    const achado = montarHtmlAchadoEmpresa({ fornecedor: "F", texto: "Linha <i>1</i>\n\nLinha 2" });
    assert.doesNotMatch(achado, /<i>1/);
    assert.doesNotMatch(achado, /Tratar o meu caso|\/portal\/contratos/);
    assert.match(achado, /\/empresa\/alertas/);
    assert.match(montarHtmlFacturaEmFalta({ organizacao: "X", servico: "S", instalacao: null, ultima: "5 de Outubro de 2026" }), /\/empresa\/documentos/);
  });
});

const servicos = [
  { id: "a", setor: "telecomunicacoes", fornecedor: "Tel", instalacao_id: "i1", data_fim_fidelizacao: "2026-11-20", data_fim_promocao: null },
  { id: "b", setor: "eletricidade", fornecedor: "Ene", instalacao_id: "i2", data_fim_fidelizacao: null, data_fim_promocao: null },
];
const instalacoes = [
  { id: "i1", nome: "Loja" },
  { id: "i2", nome: "Armazém" },
];
const f = (id, contrato_id, mes, total_cents, extra = {}) => ({ id, contrato_id, periodo_inicio: `${mes}-01`, periodo_fim: null, data_emissao: null, total_cents, ...extra });

describe("resumo mensal (resumo_empresa_v1)", () => {
  test("mês completo, com o anterior completo: diferença", () => {
    const c = montarResumoEmpresa(
      { organizacao: "Um", instalacoes, servicos, faturas: [f("1", "a", "2026-09", 1000), f("2", "b", "2026-09", 5000), f("3", "a", "2026-10", 1200), f("4", "b", "2026-10", 5000)], achados: [] },
      "2026-10",
      "2026-11-01",
    );
    assert.equal(RESUMO_EMPRESA_MODELO, "resumo_empresa_v1");
    assert.deepEqual(c.despesa, { totalCents: 6200, completo: true });
    assert.deepEqual(c.anterior, { mes: "2026-09", totalCents: 6000 });
    assert.deepEqual(c.porInstalacao.map((p) => p.nome), ["Armazém", "Loja"]);
    assert.equal(c.facturas, 2);
    assert.deepEqual(c.prazos.map((p) => p.servico), ["Tel · Telecomunicações · Loja"]);
    const texto = seccoesResumo(c, data).flatMap((s) => s.linhas).join("\n");
    assert.match(texto, /Mais 2,00\s€ com IVA do que em Set\. 2026/);
    assert.match(texto, /não encontrámos alterações/);
    assert.match(texto, /Fim da fidelização: \[2026-11-20\]/);
  });

  test("factura em falta no mês (com facturas antes e depois): incompleto, sem comparação; as posteriores não entram no total", () => {
    const c = montarResumoEmpresa(
      { organizacao: "Um", instalacoes, servicos, faturas: [f("1", "a", "2026-09", 1000), f("2", "b", "2026-09", 5000), f("3", "a", "2026-10", 1200), f("8", "b", "2026-11", 5000), f("9", "a", "2026-11", 999)], achados: [] },
      "2026-10",
      "2026-11-01",
    );
    assert.deepEqual(c.despesa, { totalCents: 1200, completo: false });
    assert.equal(c.anterior, null);
    assert.match(seccoesResumo(c, data)[0].linhas[0], /ainda sem as facturas de todos os serviços/);
  });

  test("com factura em verificação nunca diz «não encontrámos»; situações comunicadas só do mês", () => {
    const c = montarResumoEmpresa(
      {
        organizacao: "Um",
        instalacoes,
        servicos,
        faturas: [f("1", "a", "2026-10", 1000, { em_verificacao: true })],
        achados: [{ comunicado_em: "2026-10-20T10:00:00Z" }, { comunicado_em: "2026-09-02T10:00:00Z" }],
      },
      "2026-10",
      "2026-11-01",
    );
    assert.equal(c.situacoes, 1);
    const texto = seccoesResumo(c, data).flatMap((s) => s.linhas).join("\n");
    assert.doesNotMatch(texto, /não encontrámos/);
    assert.match(texto, /1 factura está em verificação/);
    assert.match(texto, /Comunicámos 1 situação/);
  });

  test("sem facturas do mês", () => {
    const c = montarResumoEmpresa({ organizacao: "Um", instalacoes, servicos: [], faturas: [], achados: [] }, "2026-10", "2026-11-01");
    const linhas = seccoesResumo(c, data).flatMap((s) => s.linhas);
    assert.ok(linhas.includes("Ainda não recebemos facturas de Outubro de 2026."));
    assert.doesNotMatch(linhas.join("\n"), /não encontrámos/);
  });

  test("leitura defensiva do conteúdo gravado e e-mail com escape", () => {
    assert.equal(lerConteudoResumo(null), null);
    assert.equal(lerConteudoResumo({ mes: "2026-10" }), null);
    const c = lerConteudoResumo({ mes: "2026-10", facturas: 3, porInstalacao: [{ nome: "L", totalCents: 1 }, { x: 1 }], prazos: [{ tipo: "outro" }] });
    assert.equal(c.porInstalacao.length, 1);
    assert.equal(c.prazos.length, 0);
    assert.equal(assuntoResumo("2026-10"), "O resumo da Protecção Empresas de Outubro de 2026");
    const html = montarHtmlResumoEmpresa({ assunto: "A", organizacao: "<x>", seccoes: [{ titulo: "T", linhas: ["<y>"] }], href: "https://portal.dolado.pt/empresa/resumos/2026-10" });
    assert.doesNotMatch(html, /<x>|<y>/);
  });
});

describe("regras estáticas", () => {
  test("a Edge Function e a lista dos particulares não mudam", () => {
    assert.doesNotMatch(ler("supabase/functions/verificar-monitor-datas/index.ts"), /empresa/i);
    assert.doesNotMatch(ler("supabase/migrations/20261106090000_empresas_alertas.sql"), /function public\.monitor_alertas_pendentes|protecao_resumos_mensais \(/);
  });
  test("os alertas das empresas saem pela rota das empresas, com reserva", () => {
    const rota = ler("src/app/api/internal/empresas-avisos/route.ts");
    assert.match(rota, /enviarPrazosEmpresas/);
    assert.match(rota, /enviarResumosEmpresas/);
    const servidor = ler("src/lib/empresas/alertasServidor.ts");
    for (const r of ["monitor_reservar_alerta", "empresa_alerta_reservar", "empresa_resumo_reservar"]) assert.match(servidor, new RegExp(r));
  });
  test("situação comunicada a uma conta de empresa usa o modelo das empresas", () => {
    const accao = ler("src/app/backoffice/monitor/achados/actions.ts");
    assert.match(accao, /tipo_conta === "empresa"/);
    assert.match(accao, /montarHtmlAchadoEmpresa/);
  });
  test("páginas dos resumos com a sessão da empresa, sem service role", () => {
    for (const p of ["src/app/[idioma]/empresa/resumos/page.tsx", "src/app/[idioma]/empresa/resumos/[mes]/page.tsx"]) {
      const s = ler(p);
      assert.match(s, /portalEmpresa\(/);
      assert.doesNotMatch(s, /createAdminClient/);
    }
  });
});
