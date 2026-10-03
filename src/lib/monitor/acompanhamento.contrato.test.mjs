// Acompanhamento de serviços contra a Supabase REAL — `npm run test:contrato`
// (scripts/test-contrato.mjs recria a base local a partir das migrations).
//
// Corre o pipeline real do servidor (processarDocumento → associação →
// registo → comparação → eventos/achados), as funções SQL, os triggers e o
// PostgREST. A Claude API nunca é chamada: cada documento já tem a extração
// gravada (mesmo modelo/schema/prompt), que o servidor reutiliza — como numa
// segunda leitura do mesmo documento.
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

// ---------------------------------------------------------------------------
// Extrações (formato v3/v4, como a Claude API as devolve)
// ---------------------------------------------------------------------------
const c = (valor, confianca = "high") => ({ valor: String(valor ?? ""), confianca: valor == null || valor === "" ? "not_found" : confianca, pagina: 1, evidencia: "" });

function extracaoFatura({ nif, titular = "Maria Silva", conta, numero, emissao, mensal = 71.46, consumo = 0, fimFidelizacao = null, fornecedor = "Vodafone Portugal, Comunicações Pessoais, S.A." }) {
  const linhas = [{ descricao: "Pacote Fibra + TV", categoria: "servico_base", valor: mensal, recorrente: "sim" }];
  if (consumo) linhas.push({ descricao: "Chamadas fora do pacote", categoria: "consumo", valor: consumo, recorrente: "nao" });
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  const mes = emissao.slice(0, 7);
  return {
    tipo_documento: "fatura",
    setor: "telecomunicacoes",
    fornecedor: c(fornecedor),
    referencia_contrato: c(""),
    data_emissao: c(emissao),
    periodo_inicio: `${mes}-01`,
    periodo_fim: `${mes}-28`,
    moeda: "EUR",
    total: c(total.toFixed(2)),
    mensalidade: c(mensal.toFixed(2)),
    data_fim_fidelizacao: c(fimFidelizacao),
    valor_cessacao: c(""),
    data_referencia_cessacao: "",
    identificacao: { titular: nif ? titular : "", nif_titular: nif ?? "", numero_cliente: "", referencia_conta: conta ?? "", numero_servico: "", numero_fatura: numero ?? "" },
    linhas,
  };
}

function extracaoContrato({ nif, conta, mensal = 71.46, fimFidelizacao = "2027-04-08" }) {
  const vazio = c("");
  return {
    tipo_documento: "contrato",
    setor: "telecomunicacoes",
    fornecedor: c("Vodafone Portugal, Comunicações Pessoais, S.A."),
    data_assinatura: vazio,
    data_ativacao: vazio,
    inicio_na_ativacao: vazio,
    data_inicio: c("2025-04-08"),
    duracao_fidelizacao_meses: vazio,
    data_fim_fidelizacao: c(fimFidelizacao),
    data_fim_promocao: vazio,
    descricao_promocao: vazio,
    mensalidade: c(mensal.toFixed(2)),
    vantagem: vazio,
    desconto_promocao: vazio,
    data_inicio_promocao: vazio,
    servicos_incluidos: vazio,
    identificacao: { titular: "Maria Silva", nif_titular: nif, numero_cliente: "", referencia_conta: conta ?? "", numero_contrato: "", numero_servico: "" },
  };
}

// ---------------------------------------------------------------------------
// Preparação
// ---------------------------------------------------------------------------
async function criarCliente() {
  const email = `monitor-${randomUUID()}@teste.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: randomUUID() });
  if (error) throw error;
  const id = data.user.id;
  await admin.from("user_access").upsert({ user_id: id, subscription_plan: "protecao", subscription_status: "active" });
  return id;
}

/** Documento carregado e já lido: ficheiro no Storage + extração gravada. */
async function documento(utilizadorId, tipo, extracao, contratoId = null) {
  const caminho = `${utilizadorId}/${randomUUID()}.pdf`;
  const { error: erroUpload } = await admin.storage
    .from("documentos-monitor")
    .upload(caminho, new Blob(["%PDF-1.4 teste"], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (erroUpload) throw erroUpload;
  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({ utilizador_id: utilizadorId, contrato_id: contratoId, tipo, storage_path: caminho, mime_type: "application/pdf" })
    .select("id")
    .single();
  if (error) throw error;
  const v = tipo === "contrato" ? VERSAO_CONTRATO : VERSAO_FATURA;
  const { error: erroExtracao } = await admin
    .from("extracoes_documento")
    .insert({ documento_id: doc.id, modelo: MODELO, schema_versao: v.schema, prompt_versao: v.prompt, estado: "sucesso", resultado: extracao });
  if (erroExtracao) throw erroExtracao;
  return doc.id;
}

async function processar(utilizadorId, tipo, extracao, contratoId = null) {
  const id = await documento(utilizadorId, tipo, extracao, contratoId);
  const r = await servidor.processarDocumento(id);
  const { data: doc } = await admin.from("documentos_monitor").select("*").eq("id", id).single();
  return { id, r, doc };
}

async function aceitarTudo(utilizadorId, contratoId) {
  const { data: propostas } = await admin.from("contratos_campos").select("id").eq("contrato_id", contratoId).in("estado", ["proposto", "em_conflito"]);
  const { error } = await admin.rpc("monitor_campos_decidir", {
    p_utilizador: utilizadorId,
    p_contrato: contratoId,
    p_decisoes: (propostas ?? []).map((p) => ({ campo_id: p.id, acao: "aceitar" })),
  });
  if (error) throw error;
}

async function eventosAtivos(contratoId) {
  const { data } = await admin
    .from("eventos_servico")
    .select("fatura_id, tipo, base, severidade, montante_cents")
    .eq("contrato_id", contratoId)
    .is("substituido_em", null);
  return data ?? [];
}

const MARIA = { nif: "123456789", conta: "215960347" };
const OUTRO = { nif: "987654321", conta: "315204142" };

describe("acompanhamento de serviços (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  before(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    servidor = await import("@/lib/monitor/servidor");
    ({ MODELO_DOCUMENTOS: MODELO } = await import("@/lib/claude"));
    const f = await import("@/lib/monitor/extracaoFatura");
    const ct = await import("@/lib/monitor/extracaoContrato");
    VERSAO_FATURA = { schema: f.SCHEMA_FATURA_VERSAO, prompt: f.PROMPT_FATURA_VERSAO };
    VERSAO_CONTRATO = { schema: ct.SCHEMA_CONTRATO_VERSAO, prompt: ct.PROMPT_CONTRATO_VERSAO };
  });

  test("40. contrato Vodafone + fatura Vodafone de OUTRO cliente: nada é alterado e não há “Usar este”", async () => {
    const maria = await criarCliente();
    const contrato = await processar(maria, "contrato", extracaoContrato(MARIA));
    assert.equal(contrato.doc.associacao_estado, "novo_servico");
    const servico = contrato.r.contratoId;
    await aceitarTudo(maria, servico);
    const { data: camposAntes } = await admin.from("contratos_campos").select("id, campo, valor, estado").eq("contrato_id", servico).order("id");

    // Carregada na página do contrato (contrato_id escolhido no upload).
    const outra = await processar(maria, "fatura", extracaoFatura({ ...OUTRO, titular: "João Pereira", numero: "FT-9", emissao: "2026-08-18", mensal: 53.96 }), servico);
    assert.equal(outra.doc.contrato_id, null, "a fatura não fica no serviço");
    assert.equal(outra.doc.associacao_estado, "conflito");
    assert.equal(outra.doc.associacao_sugerida, servico);
    assert.ok(outra.doc.associacao_conflitos.includes("O NIF do titular é diferente"));

    // A leitura gravada já não tem o NIF nem o nome do titular em texto.
    const { data: leituras } = await admin.from("extracoes_documento").select("resultado").in("documento_id", [contrato.id, outra.id]);
    for (const l of leituras) {
      const texto = JSON.stringify(l.resultado);
      assert.equal(/123456789|987654321|Maria Silva|João Pereira/.test(texto), false, "NIF/titular em claro na leitura");
      assert.match(l.resultado.identificacao.nif_titular, /^hmac:[0-9a-f]{64}$/);
    }
    const { data: idsServico } = await admin.from("servicos_identificadores").select("tipo, valor_normalizado").eq("contrato_id", servico);
    assert.ok(idsServico.some((i) => i.tipo === "nif_titular" && i.valor_normalizado.startsWith("hmac:")));

    const { data: camposDepois } = await admin.from("contratos_campos").select("id, campo, valor, estado").eq("contrato_id", servico).order("id");
    assert.deepEqual(camposDepois, camposAntes, "nenhum dado do contrato foi alterado nem proposto");
    const { count: faturas } = await admin.from("faturas_monitor").select("id", { count: "exact", head: true }).eq("contrato_id", servico);
    assert.equal(faturas, 0);
    const { data: servicoDepois } = await admin.from("contratos_monitorizados").select("mensalidade_cents, estado").eq("id", servico).single();
    assert.equal(servicoDepois.mensalidade_cents, 7146);
    assert.notEqual(servicoDepois.estado, "a_confirmar");

    // "Adicionar como novo serviço": decisão explícita e auditada.
    const r = await servidor.concluirAssociacao({ documentoId: outra.id, utilizadorId: maria, decisao: "novo_servico", papel: "cliente", por: maria });
    assert.equal(r.ok, true);
    assert.notEqual(r.servicoId, servico);
    const { data: auditoria } = await admin.from("associacoes_documento").select("decisao, papel, decidido_por, estado_associacao").eq("documento_id", outra.id);
    assert.deepEqual(auditoria, [{ decisao: "novo_servico", papel: "cliente", decidido_por: maria, estado_associacao: "novo_servico" }]);
    assert.deepEqual((await eventosAtivos(r.servicoId)).map((e) => e.tipo), ["primeira_fatura"]);
    // Segundo clique: não regista outra vez.
    const repetido = await servidor.concluirAssociacao({ documentoId: outra.id, utilizadorId: maria, decisao: "novo_servico", papel: "cliente", por: maria });
    assert.deepEqual(repetido, { ok: false, erro: "nao_encontrado" });
  });

  test("J/L/R. faturas do mesmo cliente: associadas, comparadas com o contrato e sem duplicados", async () => {
    const maria = await criarCliente();
    const { r: rc } = await processar(maria, "contrato", extracaoContrato(MARIA));
    await aceitarTudo(maria, rc.contratoId);

    const setembro = await processar(maria, "fatura", extracaoFatura({ ...MARIA, numero: "FT-1", emissao: "2026-09-10" }));
    assert.equal(setembro.doc.contrato_id, rc.contratoId);
    assert.equal(setembro.doc.associacao_estado, "confirmada");
    const outubro = await processar(maria, "fatura", extracaoFatura({ ...MARIA, numero: "FT-2", emissao: "2026-10-10", consumo: 5 }));
    assert.equal(outubro.doc.contrato_id, rc.contratoId);

    const eventos = await eventosAtivos(rc.contratoId);
    const out = eventos.filter((e) => e.fatura_id !== null && e.base).map((e) => `${e.tipo}:${e.base}`).sort();
    assert.ok(out.includes("consumo_adicional:historico"));
    assert.equal(eventos.filter((e) => e.tipo === "mensalidade_conforme").length, 2, "J/L. mensalidade conforme nas duas faturas");
    assert.equal(eventos.some((e) => e.tipo === "diferenca_preco_contrato"), false, "L. consumo não é diferença de preço");

    // R. a mesma fatura outra vez (outro ficheiro, mesmo número).
    const outraVez = await processar(maria, "fatura", extracaoFatura({ ...MARIA, numero: "FT-2", emissao: "2026-10-10", consumo: 5 }));
    assert.equal(outraVez.r.repetido, true);
    const { count } = await admin.from("faturas_monitor").select("id", { count: "exact", head: true }).eq("contrato_id", rc.contratoId);
    assert.equal(count, 2);

    // Uma fatura nunca compete com o contrato: fim de fidelização diferente
    // → evento para revisão, sem proposta nem conflito no contrato.
    const nov = await processar(maria, "fatura", extracaoFatura({ ...MARIA, numero: "FT-3", emissao: "2026-11-10", fimFidelizacao: "2027-12-31" }));
    assert.equal(nov.doc.contrato_id, rc.contratoId);
    const { count: conflitos } = await admin.from("contratos_campos").select("id", { count: "exact", head: true }).eq("contrato_id", rc.contratoId).in("estado", ["proposto", "em_conflito"]);
    assert.equal(conflitos, 0);
    const { data: achados } = await admin.from("achados_monitor").select("tipo, estado").eq("contrato_id", rc.contratoId);
    assert.deepEqual(achados, [{ tipo: "fidelizacao_diferente", estado: "detetado" }]);
    const { data: fatNov } = await admin.from("faturas_monitor").select("em_verificacao").eq("documento_id", nov.id).single();
    assert.equal(fatNov.em_verificacao, true);
  });

  test("A/B/C/D/M. só faturas, depois o contrato: mesmo serviço e comparação retroativa", async () => {
    const cliente = await criarCliente();
    const meses = ["2026-07-10", "2026-08-10", "2026-09-10"];
    let servico = null;
    for (const [i, emissao] of meses.entries()) {
      const f = await processar(cliente, "fatura", extracaoFatura({ ...MARIA, numero: `F-${i}`, emissao }));
      servico ??= f.doc.contrato_id;
      assert.equal(f.doc.contrato_id, servico, "todas as faturas no mesmo serviço");
    }
    // A fatura não cria condições contratuais.
    const { count: versoes } = await admin.from("contratos_versoes").select("id", { count: "exact", head: true }).eq("contrato_id", servico);
    assert.equal(versoes, 0);
    const { data: s } = await admin.from("contratos_monitorizados").select("fornecedor, mensalidade_cents").eq("id", servico).single();
    assert.deepEqual(s, { fornecedor: "Vodafone", mensalidade_cents: null });

    // D. quarta fatura com +3 €: alteração (para revisão).
    await processar(cliente, "fatura", extracaoFatura({ ...MARIA, numero: "F-3", emissao: "2026-10-10", mensal: 74.46 }));
    let eventos = await eventosAtivos(servico);
    assert.ok(eventos.some((e) => e.tipo === "mensalidade_alterada" && e.severidade === "atencao" && e.montante_cents === 300));
    assert.ok(eventos.every((e) => e.base === "historico"));

    // M. contrato carregado na lista: junta-se ao mesmo serviço.
    const contrato = await processar(cliente, "contrato", extracaoContrato({ ...MARIA, mensal: 74.46 }));
    assert.equal(contrato.doc.contrato_id, servico);
    const { count: servicos } = await admin.from("contratos_monitorizados").select("id", { count: "exact", head: true }).eq("utilizador_id", cliente);
    assert.equal(servicos, 1);

    // Condições confirmadas → comparação retroativa (sem IA).
    await aceitarTudo(cliente, servico);
    const r = await servidor.recalcularAcompanhamento(admin, servico);
    assert.equal(r.faturas, 4);
    eventos = await eventosAtivos(servico);
    assert.equal(eventos.filter((e) => e.tipo === "diferenca_preco_contrato").length, 3, "julho–setembro abaixo do valor contratual");
    assert.ok(eventos.some((e) => e.tipo === "mensalidade_conforme"), "outubro conforme o contrato");
    const { count: substituidos } = await admin.from("eventos_servico").select("id", { count: "exact", head: true }).eq("contrato_id", servico).not("substituido_em", "is", null);
    assert.ok(substituidos > 0, "os eventos anteriores ficam guardados");
    const { data: achados } = await admin.from("achados_monitor").select("tipo, estado").eq("contrato_id", servico);
    assert.ok(achados.some((a) => a.tipo === "mensalidade_alterada" && a.estado === "obsoleto"), "o aumento deixou de ser uma situação por rever");
  });

  test("Q/I. fatura sem identificação ou de outro número: o cliente decide (associação explícita)", async () => {
    const cliente = await criarCliente();
    const primeira = await processar(cliente, "fatura", extracaoFatura({ ...MARIA, numero: "Q-1", emissao: "2026-08-10" }));
    const servico = primeira.doc.contrato_id;

    const semIds = await processar(cliente, "fatura", extracaoFatura({ numero: "Q-2", emissao: "2026-09-10" }));
    assert.equal(semIds.doc.contrato_id, null);
    assert.equal(semIds.doc.associacao_estado, "possivel");
    assert.equal(semIds.doc.associacao_sugerida, servico);

    const r = await servidor.concluirAssociacao({ documentoId: semIds.id, utilizadorId: cliente, decisao: "associar_mesmo_assim", papel: "cliente", por: cliente });
    assert.equal(r.servicoId, servico);
    const { data: doc } = await admin.from("documentos_monitor").select("contrato_id, associacao_estado").eq("id", semIds.id).single();
    assert.deepEqual(doc, { contrato_id: servico, associacao_estado: "manual" });

    // I. mesmo NIF, outra conta: não associa sozinho.
    const outraConta = await processar(cliente, "fatura", extracaoFatura({ nif: MARIA.nif, conta: "999888777", numero: "Q-3", emissao: "2026-10-10" }));
    assert.equal(outraConta.doc.contrato_id, null);
    assert.equal(outraConta.doc.associacao_estado, "possivel");

    // Cancelar apaga o documento (ficheiro primeiro).
    assert.equal(await servidor.cancelarDocumentoPorAssociar(outraConta.id, cliente), true);
    const { count } = await admin.from("documentos_monitor").select("id", { count: "exact", head: true }).eq("id", outraConta.id);
    assert.equal(count, 0);
  });
});
