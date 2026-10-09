// Resumo mensal da Proteção contra a Supabase REAL — `npm run test:contrato`.
//
// Corre as dependências reais (dependenciasResumoMensal: funções SQL
// protecao_resumo_*, carregarEntradasServicos com a service_role) com um
// envio de e-mail falso. Prova que, sem RLS, cada resumo só tem os dados da
// própria conta (serviços, avisos, eventos) e que eventos "atencao" por
// comunicar nunca entram; e que uma segunda execução não reenvia.
//
// Usa um ano aleatório no futuro como mês de referência: não colide com
// outros dados da base local. Fora de `npm run test:contrato` fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

let admin;
let carregarEntradasServicos;
let dependenciasResumoMensal;
let enviarResumosMensais;
let snapshotDeSubscricao;
let criarDependenciasWebhook;

const ANO = 2100 + Math.floor(Math.random() * 800);
const AGORA = new Date(`${ANO}-03-01T10:00:00Z`);
const MES_DATA = `${ANO}-02-01`;
const SITE = "https://portal.dolado.pt";

/** Conta com a subscrição gravada pelo caminho real do webhook (snapshotDeSubscricao → gravarSubscricao). */
async function criarCliente(plano = "protecao", inicioSubscricao = `${ANO - 1}-06-15T10:00:00Z`) {
  const email = `resumo-${randomUUID()}@teste.invalid`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw error;
  const id = data.user.id;
  let subscricao = null;
  if (plano !== "none") {
    subscricao = `sub_resumo_${randomUUID().replaceAll("-", "")}`;
    const inicio = Math.floor(Date.parse(inicioSubscricao) / 1000);
    const snapshot = snapshotDeSubscricao({
      id: subscricao,
      object: "subscription",
      customer: `cus_resumo_${randomUUID().replaceAll("-", "")}`,
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      start_date: inicio,
      metadata: {},
      items: { data: [{ price: { id: "price_teste" }, current_period_start: inicio, current_period_end: inicio + 30 * 86400 }] },
    });
    await criarDependenciasWebhook().gravarSubscricao(snapshot, inicio);
  }
  const { error: e2 } = await admin.from("user_access").upsert({
    user_id: id,
    subscription_plan: plano,
    subscription_status: plano === "none" ? null : "active",
    stripe_subscription_id: subscricao,
  });
  if (e2) throw e2;
  return { id, email, password, subscricao };
}

async function servico(utilizadorId, fornecedor, campo, data) {
  const { data: c, error } = await admin
    .from("contratos_monitorizados")
    .insert({ utilizador_id: utilizadorId, setor: "telecomunicacoes", fornecedor })
    .select("id")
    .single();
  if (error) throw error;
  const { error: e2 } = await admin.rpc("monitor_campo_definir", { p_contrato: c.id, p_campo: campo, p_valor: data, p_origem: "cliente" });
  if (e2) throw e2;
  return c.id;
}

async function inserir(tabela, linha) {
  const { data, error } = await admin.from(tabela).insert(linha).select("id").single();
  if (error) throw error;
  return data.id;
}

describe("resumo mensal (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  let a;
  let b;
  let avulso;
  let novo;
  let contratoA;

  before(async () => {
    ({ createAdminClient: admin } = await import("@/lib/supabase/admin"));
    admin = admin();
    ({ carregarEntradasServicos } = await import("@/lib/monitor/protecaoCliente"));
    ({ dependenciasResumoMensal } = await import("@/lib/resumoMensal/servidor"));
    ({ enviarResumosMensais } = await import("@/lib/resumoMensal/envio"));
    ({ snapshotDeSubscricao } = await import("@/lib/stripe/webhook"));
    ({ criarDependenciasWebhook } = await import("@/lib/stripe/webhookDependencias"));

    a = await criarCliente("protecao");
    b = await criarCliente("caso_protecao");
    avulso = await criarCliente("none");
    // Conta já existente que só subscreveu no mês seguinte ao de referência.
    novo = await criarCliente("protecao", `${ANO}-03-01T08:00:00Z`);

    contratoA = await servico(a.id, "Operadora Alfa", "data_fim_promocao", `${ANO + 1}-01-10`);
    const contratoB = await servico(b.id, "Operadora Beta", "data_fim_fidelizacao", `${ANO + 1}-06-30`);

    // Avisos de datas enviados: um de cada conta.
    await inserir("contratos_alertas_envios", { contrato_id: contratoA, regra: "promocao_60d", data_alvo: `${ANO + 1}-01-10`, enviado_em: `${ANO}-02-10T08:00:00Z` });
    await inserir("contratos_alertas_envios", { contrato_id: contratoB, regra: "fidelizacao_60d", data_alvo: `${ANO + 1}-06-30`, enviado_em: `${ANO}-02-11T08:00:00Z` });

    // Conta A: uma situação comunicada no mês e outra ainda por rever.
    const comunicado = await inserir("achados_monitor", {
      contrato_id: contratoA,
      utilizador_id: a.id,
      tipo: "aumento_nao_explicado",
      estado: "comunicado",
      versao_regra: "teste",
      chave_idempotencia: randomUUID(),
      texto_cliente: "Texto revisto",
      comunicado_em: `${ANO}-02-12T10:00:00Z`,
    });
    const porRever = await inserir("achados_monitor", {
      contrato_id: contratoA,
      utilizador_id: a.id,
      tipo: "linha_nova",
      estado: "detetado",
      versao_regra: "teste",
      chave_idempotencia: randomUUID(),
    });
    for (const [achado, tipo, dados] of [
      [comunicado, "mensalidade_alterada", { anterior: 3000, atual: 3640 }],
      [porRever, "cobranca_recorrente_nova", { descricao: "SEGREDO POR REVER" }],
    ]) {
      await inserir("eventos_servico", {
        contrato_id: contratoA,
        utilizador_id: a.id,
        tipo,
        base: "historico",
        severidade: "atencao",
        dados,
        versao_regra: "teste",
        chave: randomUUID(),
        achado_id: achado,
      });
    }
  });

  test("o webhook grava o início da subscrição (subscription.start_date)", async () => {
    const { data } = await admin.from("stripe_subscriptions").select("start_date").eq("stripe_subscription_id", novo.subscricao).single();
    assert.equal(new Date(data.start_date).toISOString(), `${ANO}-03-01T08:00:00.000Z`);
  });

  test("com a service_role, cada conta só lê os próprios dados (como no portal)", async () => {
    const entradas = await carregarEntradasServicos(admin, a.id);
    assert.equal(entradas.length, 1);
    assert.equal(entradas[0].id, contratoA);
    assert.deepEqual(entradas[0].alertas.map((x) => x.regra), ["promocao_60d"], "só os avisos dos serviços da conta");
    assert.deepEqual(entradas[0].eventos.map((e) => e.tipo), ["mensalidade_alterada"], "evento 'atencao' por comunicar fica de fora");
    assert.equal(entradas[0].achados.length, 1);
  });

  test("com a sessão do cliente (RLS) lê exatamente o mesmo que a service_role", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, { auth: { persistSession: false } });
    const { error } = await cliente.auth.signInWithPassword({ email: a.email, password: a.password });
    if (error) throw error;
    assert.deepEqual(await carregarEntradasServicos(cliente, a.id), await carregarEntradasServicos(admin, a.id));
  });

  test("envia um resumo por conta com Proteção, só com os dados dessa conta, e não repete", async () => {
    const emails = [];
    const deps = dependenciasResumoMensal({ enviarEmail: async (destinatario, assunto, html, texto) => emails.push({ destinatario, assunto, html, texto }) });
    const r = await enviarResumosMensais(deps, SITE, AGORA);
    assert.equal(r.foraDaJanela, false);

    const para = (email) => emails.filter((e) => e.destinatario === email);
    assert.equal(para(a.email).length, 1);
    assert.equal(para(b.email).length, 1);
    assert.equal(para(avulso.email).length, 0, "conta sem Proteção não recebe");
    assert.equal(para(novo.email).length, 0, "Proteção subscrita depois do mês de referência: não recebe");

    const ea = para(a.email)[0];
    assert.equal(ea.assunto, "A sua Proteção em fevereiro");
    assert.ok(ea.texto.includes("Operadora Alfa") && !ea.texto.includes("Operadora Beta"));
    assert.ok(!ea.texto.includes("SEGREDO POR REVER"));
    assert.match(ea.texto.replace(/\s/g, " "), /um aumento de 6,40 € na mensalidade/);
    assert.match(ea.texto, /1 aviso de data enviado por e-mail/);
    const eb = para(b.email)[0];
    assert.ok(eb.texto.includes("Operadora Beta") && !eb.texto.includes("Operadora Alfa"));

    const { data: linhas } = await admin
      .from("protecao_resumos_mensais")
      .select("utilizador_id, estado, conteudo, modelo_versao")
      .eq("mes_referencia", MES_DATA)
      .in("utilizador_id", [a.id, b.id, avulso.id]);
    assert.equal(linhas.length, 2);
    for (const l of linhas) {
      assert.equal(l.estado, "enviado");
      assert.equal(l.modelo_versao, "resumo_v2");
      assert.ok(!JSON.stringify(l.conteudo).includes("@"), "a fotografia não guarda e-mails");
    }

    emails.length = 0;
    await enviarResumosMensais(deps, SITE, new Date(`${ANO}-03-02T10:00:00Z`));
    assert.equal(para(a.email).length + para(b.email).length, 0, "segunda execução não reenvia");
  });
});
