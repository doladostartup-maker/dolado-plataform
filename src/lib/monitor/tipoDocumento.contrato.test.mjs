// Alterar o tipo de um documento na revisão — contra a Supabase REAL
// (`npm run test:contrato`, base local recriada das migrations).
//
// Corre a função SQL monitor_documento_alterar_tipo e o pipeline real do
// servidor (alterarTipoDocumento → processarDocumento). A Claude API nunca é
// chamada: sem chave, a nova leitura fica "pendente" (caminho manual); para
// simular a resposta da leitura nova grava-se a extração do tipo novo e lê-se
// de novo ("Ler de novo" no backoffice: processarDocumentoNaRevisao).
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

let admin;
let servidor;
let MODELO;
let VERSAO_FATURA;
let VERSAO_CONTRATO;
let revisor;

const c = (valor, confianca = "high") => ({ valor: String(valor ?? ""), confianca: valor == null || valor === "" ? "not_found" : confianca, pagina: 1, evidencia: "" });

function extracaoFatura({ tipo_documento = "fatura", numero = "FT-1", emissao = "2026-09-10", mensal = 71.46 } = {}) {
  const mes = emissao.slice(0, 7);
  return {
    tipo_documento,
    setor: "telecomunicacoes",
    fornecedor: c("Vodafone Portugal, Comunicações Pessoais, S.A."),
    referencia_contrato: c(""),
    data_emissao: c(emissao),
    periodo_inicio: `${mes}-01`,
    periodo_fim: `${mes}-28`,
    moeda: "EUR",
    total: c(mensal.toFixed(2)),
    mensalidade: c(mensal.toFixed(2)),
    data_fim_fidelizacao: c(null),
    valor_cessacao: c(""),
    data_referencia_cessacao: "",
    identificacao: { titular: "", nif_titular: "", numero_cliente: "", referencia_conta: "215960347", numero_servico: "", numero_fatura: numero },
    linhas: [{ descricao: "Pacote Fibra + TV", categoria: "servico_base", valor: mensal, recorrente: "sim" }],
  };
}

function extracaoContrato({ tipo_documento = "contrato" } = {}) {
  const vazio = c("");
  return {
    tipo_documento,
    setor: "telecomunicacoes",
    fornecedor: c("Vodafone Portugal, Comunicações Pessoais, S.A."),
    data_assinatura: vazio,
    data_ativacao: vazio,
    inicio_na_ativacao: vazio,
    data_inicio: c("2025-04-08"),
    duracao_fidelizacao_meses: vazio,
    data_fim_fidelizacao: c("2027-04-08"),
    data_fim_promocao: vazio,
    descricao_promocao: vazio,
    mensalidade: c("71.46"),
    vantagem: vazio,
    desconto_promocao: vazio,
    data_inicio_promocao: vazio,
    servicos_incluidos: vazio,
    identificacao: { titular: "", nif_titular: "", numero_cliente: "", referencia_conta: "215960347", numero_contrato: "", numero_servico: "" },
  };
}

async function criarConta({ role = "cliente" } = {}) {
  const email = `tipo-${randomUUID()}@teste.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: randomUUID() });
  if (error) throw error;
  const id = data.user.id;
  if (role === "admin") {
    const { error: e } = await admin.from("utilizadores").update({ role: "admin" }).eq("id", id);
    if (e) throw e;
  } else {
    await admin.from("user_access").upsert({ user_id: id, subscription_plan: "protecao", subscription_status: "active" });
  }
  return id;
}

const CONTEUDO = "%PDF-1.4 contrato de teste " + randomUUID();

/** Documento carregado (ficheiro no Storage), com ou sem leitura gravada. */
async function documento(utilizadorId, tipo, extracao, versao, contratoId = null) {
  const caminho = `${utilizadorId}/${randomUUID()}.pdf`;
  const { error: erroUpload } = await admin.storage
    .from("documentos-monitor")
    .upload(caminho, new Blob([CONTEUDO], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (erroUpload) throw erroUpload;
  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({ utilizador_id: utilizadorId, contrato_id: contratoId, tipo, storage_path: caminho, mime_type: "application/pdf", etapa: "concluido" })
    .select("id")
    .single();
  if (error) throw error;
  if (extracao) await gravarLeitura(doc.id, extracao, versao);
  return { id: doc.id, caminho };
}

async function gravarLeitura(documentoId, extracao, versao) {
  const { error } = await admin
    .from("extracoes_documento")
    .insert({ documento_id: documentoId, modelo: MODELO, schema_versao: versao.schema, prompt_versao: versao.prompt, estado: "sucesso", resultado: extracao });
  if (error) throw error;
}

async function lerDoc(id) {
  const { data } = await admin.from("documentos_monitor").select("*").eq("id", id).single();
  return data;
}

async function conteudo(caminho) {
  const { data, error } = await admin.storage.from("documentos-monitor").download(caminho);
  if (error) throw error;
  return await data.text();
}

async function contagens(utilizadorId) {
  const [docs, casos, pedidos, acesso, grants] = await Promise.all([
    admin.from("documentos_monitor").select("id", { count: "exact", head: true }).eq("utilizador_id", utilizadorId),
    admin.from("casos").select("id", { count: "exact", head: true }).eq("utilizador_id", utilizadorId),
    admin.from("pedidos_caso").select("id", { count: "exact", head: true }).eq("user_id", utilizadorId),
    admin.from("user_access").select("subscription_plan, subscription_status, case_credits, avulso_credits").eq("user_id", utilizadorId).maybeSingle(),
    admin.from("case_credit_grants").select("id", { count: "exact", head: true }).eq("user_id", utilizadorId),
  ]);
  return { docs: docs.count, casos: casos.count, pedidos: pedidos.count, acesso: acesso.data, grants: grants.count };
}

describe("alterar o tipo de um documento (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  before(async () => {
    // Nunca chamar a Claude API real nestes testes.
    delete process.env.ANTHROPIC_API_KEY;
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    servidor = await import("@/lib/monitor/servidor");
    ({ MODELO_DOCUMENTOS: MODELO } = await import("@/lib/claude"));
    const f = await import("@/lib/monitor/extracaoFatura");
    const ct = await import("@/lib/monitor/extracaoContrato");
    VERSAO_FATURA = { schema: f.SCHEMA_FATURA_VERSAO, prompt: f.PROMPT_FATURA_VERSAO };
    VERSAO_CONTRATO = { schema: ct.SCHEMA_CONTRATO_VERSAO, prompt: ct.PROMPT_CONTRATO_VERSAO };
    revisor = await criarConta({ role: "admin" });
  });

  test("Fatura → Contrato: contrato enviado como fatura, leitura falhada, corrigido e lido de novo", async () => {
    const cliente = await criarConta();
    // A leitura como fatura viu um contrato: "não é uma fatura" → por rever.
    const { id, caminho } = await documento(cliente, "fatura", extracaoFatura({ tipo_documento: "contrato" }), VERSAO_FATURA);
    const r0 = await servidor.processarDocumentoNaRevisao(id);
    assert.equal(r0.estado, "a_rever");
    assert.equal(r0.detalhe, "nao_e_fatura");
    const antes = await contagens(cliente);

    const r = await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "contrato", por: revisor });
    assert.equal(r.ok, true);
    assert.equal(r.tipoAnterior, "fatura");
    // A leitura antiga não é reutilizada: o documento é lido de novo (sem chave → caminho manual).
    assert.equal(r.processamento.estado, "pendente");
    assert.equal(r.processamento.motivo, "api_nao_configurada");

    let doc = await lerDoc(id);
    assert.equal(doc.tipo, "contrato");
    assert.equal(doc.tipo_indicado, "fatura", "o tipo indicado pelo cliente não muda");
    assert.equal(doc.storage_path, caminho);
    const { data: leituras } = await admin.from("extracoes_documento").select("estado, invalidada_em, schema_versao").eq("documento_id", id);
    assert.deepEqual(leituras.map((l) => l.estado), ["invalidada"]);
    assert.ok(leituras[0].invalidada_em);

    const { data: auditoria } = await admin.from("documentos_tipo_alteracoes").select("*").eq("documento_id", id);
    assert.equal(auditoria.length, 1);
    assert.equal(auditoria[0].tipo_anterior, "fatura");
    assert.equal(auditoria[0].tipo_novo, "contrato");
    assert.equal(auditoria[0].alterado_por, revisor);
    assert.equal(auditoria[0].utilizador_id, cliente);
    assert.equal(auditoria[0].leituras_invalidadas, 1);
    assert.ok(Date.now() - Date.parse(auditoria[0].created_at) < 60_000);

    // A leitura nova (como contrato) é registada pelo pipeline de contratos.
    await gravarLeitura(id, extracaoContrato(), VERSAO_CONTRATO);
    const r2 = await servidor.processarDocumentoNaRevisao(id);
    assert.equal(r2.estado, "processado");
    doc = await lerDoc(id);
    assert.equal(doc.associacao_estado, "novo_servico");
    const { data: propostas } = await admin.from("contratos_campos").select("campo, origem, estado").eq("documento_id", id);
    assert.ok(propostas.some((p) => p.campo === "mensalidade_cents" && p.origem === "contrato" && p.estado === "proposto"));
    const { count: faturas } = await admin.from("faturas_monitor").select("id", { count: "exact", head: true }).eq("documento_id", id);
    assert.equal(faturas, 0);

    // Ficheiro original intacto; nada de casos, pedidos, casos disponíveis nem documentos novos.
    assert.equal(await conteudo(caminho), CONTEUDO);
    assert.deepEqual(await contagens(cliente), antes);
  });

  test("Contrato → Fatura: valores propostos postos de parte e fatura registada no mesmo serviço", async () => {
    const cliente = await criarConta();
    const { id, caminho } = await documento(cliente, "contrato", extracaoContrato(), VERSAO_CONTRATO);
    const r0 = await servidor.processarDocumentoNaRevisao(id);
    assert.equal(r0.estado, "processado");
    const servico = r0.contratoId;
    const antes = await contagens(cliente);

    const r = await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "fatura", por: revisor });
    assert.equal(r.ok, true);
    const { data: campos } = await admin.from("contratos_campos").select("estado").eq("documento_id", id);
    assert.ok(campos.length > 0);
    assert.ok(campos.every((c) => c.estado === "rejeitado" || c.estado === "substituido"), "nada da leitura antiga fica em uso");
    const { data: auditoria } = await admin.from("documentos_tipo_alteracoes").select("tipo_anterior, tipo_novo, valores_retirados, contrato_id").eq("documento_id", id).single();
    assert.equal(auditoria.tipo_anterior, "contrato");
    assert.equal(auditoria.tipo_novo, "fatura");
    assert.equal(auditoria.contrato_id, servico);
    assert.ok(auditoria.valores_retirados > 0);

    await gravarLeitura(id, extracaoFatura(), VERSAO_FATURA);
    const r2 = await servidor.processarDocumentoNaRevisao(id);
    assert.notEqual(r2.estado, "pendente");
    assert.equal(r2.contratoId, servico, "fica no mesmo serviço");
    const { data: fatura } = await admin.from("faturas_monitor").select("numero_fatura, total_cents").eq("documento_id", id).single();
    assert.deepEqual(fatura, { numero_fatura: "FT-1", total_cents: 7146 });

    assert.equal(await conteudo(caminho), CONTEUDO);
    assert.deepEqual(await contagens(cliente), antes);
  });

  test("fatura já registada passa a contrato: fatura e eventos retirados, histórico recalculado", async () => {
    const cliente = await criarConta();
    const a = await documento(cliente, "fatura", extracaoFatura({ numero: "FT-1", emissao: "2026-08-10" }), VERSAO_FATURA);
    const ra = await servidor.processarDocumentoNaRevisao(a.id);
    const servico = ra.contratoId;
    const b = await documento(cliente, "fatura", extracaoFatura({ numero: "FT-2", emissao: "2026-09-10" }), VERSAO_FATURA, servico);
    await servidor.processarDocumentoNaRevisao(b.id);
    const { count: eventosAntes } = await admin.from("eventos_servico").select("id", { count: "exact", head: true }).eq("contrato_id", servico).is("substituido_em", null);
    assert.ok(eventosAntes >= 2);

    const r = await servidor.alterarTipoDocumento({ documentoId: a.id, novoTipo: "contrato", por: revisor });
    assert.equal(r.ok, true);
    const { count: faturaA } = await admin.from("faturas_monitor").select("id", { count: "exact", head: true }).eq("documento_id", a.id);
    assert.equal(faturaA, 0);
    const { data: auditoria } = await admin.from("documentos_tipo_alteracoes").select("fatura_removida").eq("documento_id", a.id).single();
    assert.equal(auditoria.fatura_removida, true);
    // A fatura que sobra passa a ser a primeira do serviço.
    const { data: eventos } = await admin.from("eventos_servico").select("tipo, fatura_id").eq("contrato_id", servico).is("substituido_em", null);
    assert.deepEqual(eventos.map((e) => e.tipo), ["primeira_fatura"]);
    assert.equal(await conteudo(a.caminho), CONTEUDO);
  });

  test("processamento inicial falhou por completo (sem leitura): o tipo muda e o documento volta a ser lido", async () => {
    const cliente = await criarConta();
    const { id } = await documento(cliente, "fatura", null);
    const r0 = await servidor.processarDocumentoNaRevisao(id);
    assert.equal(r0.estado, "pendente");
    await admin.from("documentos_monitor").update({ estado: "a_rever", etapa: "falhou" }).eq("id", id);

    const r = await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "contrato", por: revisor });
    assert.equal(r.ok, true);
    const doc = await lerDoc(id);
    assert.equal(doc.tipo, "contrato");
    assert.equal(doc.estado, "pendente");
    // Sem chave: caminho manual, sem erro para o cliente (fica com a DoLado).
    assert.equal(doc.etapa, "concluido");
    const { data: auditoria } = await admin.from("documentos_tipo_alteracoes").select("leituras_invalidadas").eq("documento_id", id).single();
    assert.equal(auditoria.leituras_invalidadas, 0);

    await gravarLeitura(id, extracaoContrato(), VERSAO_CONTRATO);
    assert.equal((await servidor.processarDocumentoNaRevisao(id)).estado, "processado");
  });

  test("recusas: mesmo tipo, tipo inválido, revisor sem papel admin e dados já confirmados — sem auditoria", async () => {
    const cliente = await criarConta();
    const { id } = await documento(cliente, "contrato", extracaoContrato(), VERSAO_CONTRATO);
    const r0 = await servidor.processarDocumentoNaRevisao(id);

    assert.deepEqual(await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "contrato", por: revisor }), { ok: false, erro: "mesmo_tipo" });
    assert.deepEqual(await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "desconhecido", por: revisor }), { ok: false, erro: "tipo_invalido" });
    assert.deepEqual(await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "fatura", por: cliente }), { ok: false, erro: "erro" });
    assert.deepEqual(await servidor.alterarTipoDocumento({ documentoId: randomUUID(), novoTipo: "fatura", por: revisor }), { ok: false, erro: "nao_encontrado" });

    // O cliente confirmou os valores lidos: nada se desfaz automaticamente.
    const { data: propostas } = await admin.from("contratos_campos").select("id").eq("contrato_id", r0.contratoId).eq("estado", "proposto");
    const { error } = await admin.rpc("monitor_campos_decidir", {
      p_utilizador: cliente,
      p_contrato: r0.contratoId,
      p_decisoes: propostas.map((p) => ({ campo_id: p.id, acao: "aceitar" })),
    });
    if (error) throw error;
    assert.deepEqual(await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "fatura", por: revisor }), { ok: false, erro: "dados_decididos" });

    const doc = await lerDoc(id);
    assert.equal(doc.tipo, "contrato");
    const { count } = await admin.from("documentos_tipo_alteracoes").select("id", { count: "exact", head: true }).eq("documento_id", id);
    assert.equal(count, 0);
    const { data: leituras } = await admin.from("extracoes_documento").select("estado").eq("documento_id", id);
    assert.deepEqual(leituras.map((l) => l.estado), ["sucesso"]);
  });

  test("auditoria só de inserção e tipo indicado imutável", async () => {
    const cliente = await criarConta();
    const { id } = await documento(cliente, "fatura", null);
    await servidor.alterarTipoDocumento({ documentoId: id, novoTipo: "contrato", por: revisor });
    const { data: linha } = await admin.from("documentos_tipo_alteracoes").select("id").eq("documento_id", id).single();
    const { error: erroAuditoria } = await admin.from("documentos_tipo_alteracoes").update({ tipo_novo: "fatura" }).eq("id", linha.id);
    assert.ok(erroAuditoria, "a auditoria não pode ser alterada");
    const { error: erroTipo } = await admin.from("documentos_monitor").update({ tipo_indicado: "contrato" }).eq("id", id);
    assert.ok(erroTipo, "o tipo indicado pelo cliente não pode ser alterado");
  });
});
