// Resumo mensal da Proteção — `npm test`.
//
// Regras do conteúdo (resumo.ts), e-mail (email/resumoMensal.ts) e envio
// (envio.ts) com dependências falsas que seguem as funções SQL
// protecao_resumo_destinatarios / _reservar / _concluir. A elegibilidade
// (planos e estados) e o RLS estão em
// supabase/tests/database/resumo_mensal.test.sql; o carregamento real dos
// dados, com a service_role, em resumoMensal.contrato.test.mjs.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { mesReferencia, montarResumoMensal } from "./resumo.ts";
import { enviarResumosMensais } from "./envio.ts";
import { assuntoResumoMensal, montarHtmlResumoMensal, montarTextoResumoMensal } from "../email/resumoMensal.ts";

const SITE = "https://portal.dolado.pt";
const MES = "2026-09";
const HOJE = "2026-10-01";
const AGORA = new Date("2026-10-01T09:00:00Z");
const norm = (s) => s.replace(/\s/g, " ");

let n = 0;
function servico(over = {}) {
  n += 1;
  return {
    id: `s${n}`,
    nome: "Vodafone",
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
    ...over,
  };
}

function fatura(registadaEm, over = {}) {
  n += 1;
  return {
    id: `f${n}`,
    dataEmissao: registadaEm.slice(0, 10),
    periodoInicio: null,
    periodoFim: null,
    totalCents: 3640,
    mensalidadeLidaCents: 3640,
    recorrenteCents: null,
    linhas: [],
    dataFimFidelizacao: null,
    emVerificacao: false,
    registadaEm,
    ...over,
  };
}

const data = (valor) => ({ valor, origem: "contrato" });

// ---------------------------------------------------------------------------
describe("mês de referência", () => {
  test("nos primeiros dias do mês, é o mês anterior (em Lisboa)", () => {
    assert.equal(mesReferencia(new Date("2026-10-01T09:00:00Z")).mes, "2026-09");
    assert.equal(mesReferencia(new Date("2027-01-02T09:00:00Z")).mes, "2026-12");
    // 30/09 23:30 UTC já é 1 de outubro em Lisboa (UTC+1).
    assert.equal(mesReferencia(new Date("2026-09-30T23:30:00Z")).mesData, "2026-09-01");
  });

  test("a meio do mês não há mês de referência (nunca envia)", () => {
    assert.equal(mesReferencia(new Date("2026-10-15T09:00:00Z")), null);
  });
});

// ---------------------------------------------------------------------------
describe("conteúdo do resumo", () => {
  test("cliente sem documentos no mês recebe um resumo válido", () => {
    const r = montarResumoMensal([servico({ faturas: [fatura("2026-08-10T10:00:00Z")] })], MES, HOJE);
    assert.equal(r.estado, "tudo_acompanhado");
    assert.match(r.introducao, /^Em setembro não recebemos documentos novos, mas a DoLado continuou a acompanhar o seu serviço\./);
    assert.equal(r.contagens.faturas, 0);
    assert.ok(!r.atividade.some((l) => /fatura/.test(l)), "sem métricas de faturas inventadas");
    assert.deepEqual(r.atividade, ["1 serviço acompanhado"]);
  });

  test("cliente sem serviços recebe um resumo válido, sem secção de alterações", () => {
    const r = montarResumoMensal([], MES, HOJE);
    assert.equal(r.estado, "sem_servicos");
    assert.equal(r.semAlteracoes, null);
    assert.deepEqual(r.atividade, []);
    const html = montarHtmlResumoMensal(r, `${SITE}/portal/contratos`);
    assert.ok(!html.includes("Alterações detetadas"));
    assert.match(html, /Adicionar um documento/);
  });

  test("sem alterações: mensagem correta e 'Tudo acompanhado'", () => {
    const r = montarResumoMensal(
      [servico({ faturas: [fatura("2026-09-05T10:00:00Z"), fatura("2026-09-20T10:00:00Z")], documentos: [] })],
      MES,
      HOJE,
    );
    assert.equal(r.estado, "tudo_acompanhado");
    assert.equal(r.estadoTitulo, "Tudo acompanhado");
    assert.equal(r.semAlteracoes, "Não detetámos alterações que exijam a sua atenção em setembro.");
    assert.equal(r.introducao, "Em setembro, a DoLado verificou 2 faturas. Não detetámos nenhuma alteração que exija a sua atenção.");
    assert.ok(r.atividade.includes("2 faturas verificadas"));
    assert.match(r.estadoTexto, /Com base nos documentos e nas datas que nos indicou/);
  });

  test("com alterações: mostra só as situações comunicadas no mês, com os valores reais", () => {
    const f = fatura("2026-09-05T10:00:00Z");
    const s = servico({
      faturas: [f],
      achados: [
        { id: "a1", faturaId: f.id, tipo: "aumento_nao_explicado", texto: "Texto livre da DoLado", comunicadoEm: "2026-09-12T10:00:00Z" },
        { id: "a0", faturaId: null, tipo: "linha_nova", texto: "De agosto", comunicadoEm: "2026-08-20T10:00:00Z" },
      ],
      eventos: [
        { faturaId: f.id, tipo: "mensalidade_alterada", base: "historico", severidade: "atencao", montanteCents: 640, dados: { anterior: 3000, atual: 3640 }, achadoId: "a1", criadoEm: "2026-09-05T10:00:00Z" },
      ],
    });
    const r = montarResumoMensal([s], MES, HOJE);
    assert.equal(r.estado, "atencao");
    assert.deepEqual(r.alteracoes.map(norm), ["Vodafone: um aumento de 6,40 € na mensalidade (comunicado a 12 de setembro)"]);
    assert.equal(r.semAlteracoes, null);
    assert.match(r.introducao, /Detetámos 1 situação que merece a sua atenção\.$/);
    // O texto livre do achado não vai no resumo (só a forma curta gerada pelo código).
    assert.ok(!JSON.stringify(r).includes("Texto livre da DoLado"));
  });

  test("alteração em verificação: nunca 'não detetámos'", () => {
    const r = montarResumoMensal([servico({ faturas: [fatura("2026-09-05T10:00:00Z", { emVerificacao: true })] })], MES, HOJE);
    assert.equal(r.estado, "em_verificacao");
    assert.ok(!/Não detetámos/.test(JSON.stringify(r)));
    assert.match(r.semAlteracoes, /Estamos a verificar uma alteração/);
  });

  test("condições por confirmar pedem a confirmação do cliente", () => {
    const r = montarResumoMensal([servico({ porConfirmar: { campos: ["mensalidade_cents"], doContrato: true } })], MES, HOJE);
    assert.equal(r.estado, "por_confirmar");
  });

  test("datas futuras aparecem corretamente; passadas e de serviços terminados não", () => {
    const r = montarResumoMensal(
      [
        servico({ campos: { data_fim_promocao: data("2027-03-14"), data_fim_fidelizacao: data("2026-09-01") }, faturas: [fatura("2026-09-05T10:00:00Z")] }),
        servico({ nome: "EDP", setor: "energia", terminado: true, campos: { data_fim_fidelizacao: data("2026-12-01") } }),
      ],
      MES,
      HOJE,
    );
    assert.deepEqual(r.acompanhamento, ["Vodafone — fim da promoção a 14 de março de 2027", "Comparação de faturas — Vodafone"]);
    assert.equal(r.proximaData, "Vodafone: a promoção termina a 14 de março de 2027. Avisamo-lo por e-mail antes dessa data.");
    assert.equal(r.contagens.alertasDatas, 1);
    assert.match(r.introducao, /manteve 1 alerta de datas ativo/);
  });

  test("data próxima (até 30 dias): aviso na própria data", () => {
    const r = montarResumoMensal([servico({ campos: { data_fim_fidelizacao: data("2026-10-20") } })], MES, HOJE);
    assert.equal(r.proximaData, "Vodafone: a fidelização termina a 20 de outubro de 2026. Avisamo-lo por e-mail nessa data.");
  });

  test("sem data conhecida não inventa nenhuma", () => {
    const r = montarResumoMensal([servico({ faturas: [fatura("2026-09-05T10:00:00Z")] })], MES, HOJE);
    assert.equal(r.proximaData, "Neste momento não há nenhuma data que exija a sua atenção.");
    assert.equal(r.contagens.alertasDatas, 0);
    const html = montarHtmlResumoMensal(r, `${SITE}/portal/contratos`);
    assert.ok(!/termina a/.test(html));
    assert.ok(!/fim da (promoção|fidelização)/.test(html));
  });

  test("conta contratos lidos e avisos enviados no mês", () => {
    const r = montarResumoMensal(
      [
        servico({
          documentos: [
            { id: "d1", tipo: "contrato", estado: "processado", etapa: "concluido", etapaEm: "2026-09-03T10:00:00Z", criadoEm: "2026-09-03T09:00:00Z" },
            { id: "d2", tipo: "contrato", estado: "a_rever", etapa: "concluido", etapaEm: "2026-09-04T10:00:00Z", criadoEm: "2026-09-04T09:00:00Z" },
          ],
          alertas: [
            { regra: "promocao_60d", dataAlvo: "2026-11-15", enviadoEm: "2026-09-16T08:00:00Z" },
            { regra: "promocao_30d", dataAlvo: "2026-11-15", enviadoEm: "2026-10-16T08:00:00Z" },
          ],
        }),
      ],
      MES,
      HOJE,
    );
    assert.equal(r.contagens.contratos, 1);
    assert.equal(r.contagens.avisos, 1);
    assert.ok(r.atividade.includes("1 contrato lido"));
    assert.ok(r.atividade.includes("1 aviso de data enviado por e-mail"));
  });
});

// ---------------------------------------------------------------------------
describe("e-mail", () => {
  test("assunto, secções, versão em texto e escape dos nomes", () => {
    const r = montarResumoMensal(
      [servico({ nome: "<b>Operador</b>", campos: { data_fim_promocao: data("2027-03-14") }, faturas: [fatura("2026-09-05T10:00:00Z")] })],
      MES,
      HOJE,
    );
    assert.equal(assuntoResumoMensal(r), "A sua Proteção em setembro");
    const html = montarHtmlResumoMensal(r, `${SITE}/portal/contratos`);
    assert.ok(!html.includes("<b>Operador</b>"));
    assert.ok(html.includes("&lt;b&gt;Operador&lt;/b&gt;"));
    for (const t of ["O que acompanhámos em setembro", "Alterações detetadas", "A sua Proteção continua ativa", "Próxima data relevante", "Tudo acompanhado"]) {
      assert.ok(html.includes(t), t);
    }
    assert.match(html, /viewport/);
    const texto = montarTextoResumoMensal(r, `${SITE}/portal/contratos`);
    assert.match(texto, /Próxima data relevante\n<b>Operador<\/b>: a promoção termina a 14 de março de 2027/);
    assert.match(texto, /https:\/\/portal\.dolado\.pt\/portal\/contratos/);
  });

  test("texto em português europeu, sem promessas nem frases a evitar", () => {
    const textos = [
      montarResumoMensal([], MES, HOJE),
      montarResumoMensal([servico({ faturas: [fatura("2026-09-05T10:00:00Z")] })], MES, HOJE),
      montarResumoMensal([servico()], MES, HOJE),
    ].map((r) => montarTextoResumoMensal(r, SITE) + montarHtmlResumoMensal(r, SITE));
    for (const t of textos) {
      assert.ok(!/\bemail\b|você|factura|detectámos|garantimos|não aconteceu nada|não fizemos nada/i.test(t.replace(/mailto:[^"]+|contacto@dolado\.pt/g, "")));
    }
  });
});

// ---------------------------------------------------------------------------
// Envio, com dependências falsas que seguem as funções SQL.
// ---------------------------------------------------------------------------
describe("envio", () => {
  let contas; // utilizador_id → { email, protecao, servicos }
  let linhas; // `${uid}|${mes}` → { id, estado, tentativas, erro, conteudo }
  let emails;
  let falharBrevo; // uid → erro a lançar

  function deps() {
    return {
      async destinatarios(mesData) {
        return [...contas.entries()]
          .filter(([uid, c]) => {
            const l = linhas.get(`${uid}|${mesData}`);
            return c.protecao && !(l && (l.estado !== "falhou" || l.tentativas >= 3));
          })
          .map(([uid, c]) => ({ utilizador_id: uid, email: c.email }));
      },
      async reservar(uid, mesData) {
        if (!contas.get(uid)?.protecao) return null;
        const k = `${uid}|${mesData}`;
        const l = linhas.get(k);
        if (!l) {
          linhas.set(k, { id: k, estado: "reservado", tentativas: 1 });
          return k;
        }
        if (l.estado === "falhou" && l.tentativas < 3) {
          Object.assign(l, { estado: "reservado", tentativas: l.tentativas + 1, erro: null });
          return k;
        }
        return null;
      },
      async carregarServicos(uid) {
        const c = contas.get(uid);
        if (c.falharDados) throw Object.assign(new Error("x"), { code: "57014" });
        return c.servicos;
      },
      async enviarEmail(destinatario, assunto, html, texto) {
        const uid = [...contas.entries()].find(([, c]) => c.email === destinatario)?.[0];
        if (falharBrevo.has(uid)) throw falharBrevo.get(uid);
        emails.push({ destinatario, assunto, html, texto });
      },
      async concluir(id, c) {
        const l = [...linhas.values()].find((x) => x.id === id);
        if (l.estado !== "reservado") return;
        if (c.enviado) Object.assign(l, { estado: "enviado", conteudo: c.conteudo });
        else Object.assign(l, { estado: "falhou", erro: c.erro, tentativas: c.repetir ? l.tentativas : 3 });
      },
    };
  }

  beforeEach(() => {
    contas = new Map();
    linhas = new Map();
    emails = [];
    falharBrevo = new Map();
  });

  const conta = (uid, servicos = [], protecao = true) => contas.set(uid, { email: `${uid}@teste.invalid`, protecao, servicos });

  test("Proteção e Caso + Proteção ativas recebem; contas sem Proteção (Avulso, cancelada, sem plano) não", async () => {
    // A elegibilidade por plano/estado é decidida na SQL (testada em pgTAP);
    // aqui: o envio só sai para quem a SQL devolve e reserva.
    conta("protecao");
    conta("caso_protecao");
    conta("avulso", [], false);
    conta("cancelada", [], false);
    conta("sem_plano", [], false);
    const r = await enviarResumosMensais(deps(), SITE, AGORA);
    assert.deepEqual(r, { foraDaJanela: false, mes: "2026-09", enviados: 2, falhados: 0, ignorados: 0 });
    assert.deepEqual(emails.map((e) => e.destinatario).sort(), ["caso_protecao@teste.invalid", "protecao@teste.invalid"]);
    assert.equal(emails[0].assunto, "A sua Proteção em setembro");
    assert.ok(emails[0].texto.length > 0, "envia também a versão em texto");
  });

  test("Proteção perdida entre a lista e o envio: a reserva recusa e nada sai", async () => {
    conta("a");
    const d = deps();
    const lista = await d.destinatarios("2026-09-01");
    contas.get("a").protecao = false;
    d.destinatarios = async () => lista;
    const r = await enviarResumosMensais(d, SITE, AGORA);
    assert.equal(r.enviados, 0);
    assert.equal(r.ignorados, 1);
    assert.equal(emails.length, 0);
  });

  test("o job não envia duas vezes o mesmo mês (nem com execuções sobrepostas)", async () => {
    conta("a");
    await Promise.all([enviarResumosMensais(deps(), SITE, AGORA), enviarResumosMensais(deps(), SITE, AGORA)]);
    await enviarResumosMensais(deps(), SITE, new Date("2026-10-02T09:00:00Z"));
    assert.equal(emails.length, 1);
    assert.equal(linhas.get("a|2026-09-01").estado, "enviado");
    assert.equal(linhas.get("a|2026-09-01").conteudo.mes, "2026-09");
  });

  test("fora da janela de envio não faz nada", async () => {
    conta("a");
    assert.deepEqual(await enviarResumosMensais(deps(), SITE, new Date("2026-10-15T09:00:00Z")), { foraDaJanela: true });
    assert.equal(emails.length, 0);
    assert.equal(linhas.size, 0);
  });

  test("falha da Brevo fica registada e é tentada de novo (até 3 vezes)", async () => {
    conta("a");
    falharBrevo.set("a", Object.assign(new Error("Brevo recusou o envio"), { code: "brevo_502" }));
    const r1 = await enviarResumosMensais(deps(), SITE, AGORA);
    assert.equal(r1.falhados, 1);
    assert.deepEqual({ ...linhas.get("a|2026-09-01") }, { id: "a|2026-09-01", estado: "falhou", tentativas: 1, erro: "brevo_502" });

    falharBrevo.clear();
    const r2 = await enviarResumosMensais(deps(), SITE, new Date("2026-10-02T09:00:00Z"));
    assert.equal(r2.enviados, 1);
    assert.equal(linhas.get("a|2026-09-01").estado, "enviado");
    assert.equal(linhas.get("a|2026-09-01").tentativas, 2);
  });

  test("ao fim de 3 recusas, deixa de tentar", async () => {
    conta("a");
    falharBrevo.set("a", Object.assign(new Error("x"), { code: "brevo_400" }));
    for (const dia of ["01", "02", "03", "04"]) await enviarResumosMensais(deps(), SITE, new Date(`2026-10-${dia}T09:00:00Z`));
    assert.equal(linhas.get("a|2026-09-01").tentativas, 3);
    assert.equal(linhas.get("a|2026-09-01").estado, "falhou");
  });

  test("envio de resultado incerto (tempo esgotado) não é repetido automaticamente", async () => {
    conta("a");
    falharBrevo.set("a", Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }));
    await enviarResumosMensais(deps(), SITE, AGORA);
    assert.equal(linhas.get("a|2026-09-01").erro, "envio_incerto");
    assert.equal(linhas.get("a|2026-09-01").tentativas, 3);
    falharBrevo.clear();
    await enviarResumosMensais(deps(), SITE, new Date("2026-10-02T09:00:00Z"));
    assert.equal(emails.length, 0);
  });

  test("a falha de um cliente não bloqueia os restantes", async () => {
    conta("a");
    conta("b");
    conta("c");
    contas.get("b").falharDados = true;
    const r = await enviarResumosMensais(deps(), SITE, AGORA);
    assert.equal(r.enviados, 2);
    assert.equal(r.falhados, 1);
    assert.equal(linhas.get("b|2026-09-01").erro, "dados_57014");
    assert.equal(linhas.get("b|2026-09-01").estado, "falhou");
  });

  test("os dados de um cliente nunca aparecem no resumo de outro", async () => {
    conta("a", [servico({ nome: "Operadora Alfa", campos: { data_fim_promocao: data("2027-01-10") }, faturas: [fatura("2026-09-05T10:00:00Z")] })]);
    conta("b", [servico({ nome: "Operadora Beta", campos: { data_fim_fidelizacao: data("2027-06-30") }, faturas: [fatura("2026-09-07T10:00:00Z")] })]);
    await enviarResumosMensais(deps(), SITE, AGORA);
    const para = (uid) => emails.find((e) => e.destinatario === `${uid}@teste.invalid`);
    assert.ok(para("a").html.includes("Operadora Alfa") && !para("a").html.includes("Operadora Beta"));
    assert.ok(para("b").html.includes("Operadora Beta") && !para("b").html.includes("Operadora Alfa"));
    assert.ok(!para("a").texto.includes("30 de junho de 2027"));
    assert.ok(!JSON.stringify(linhas.get("a|2026-09-01").conteudo).includes("Beta"));
  });
});
