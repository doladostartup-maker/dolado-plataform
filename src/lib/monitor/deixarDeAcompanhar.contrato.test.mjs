// "Deixar de acompanhar" contra a Supabase REAL — `npm run test:contrato`.
//
// Serviços criados pelo pipeline real (processarDocumento → associação com
// decisão registada → identificadores → faturas, eventos, achados), apagados
// por apagarServicoAcompanhado — o mesmo código da Server Action. Antes da
// correção de 05/10/2026 o DELETE falhava em "Registo só de inserção
// (associacoes_documento)". A Claude API nunca é chamada (extração gravada).
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const BUCKET = "documentos-monitor";

let admin;
let servidor;
let MODELO;
let VERSAO_FATURA;
let VERSAO_CONTRATO;

const c = (valor, confianca = "high") => ({ valor: String(valor ?? ""), confianca: valor == null || valor === "" ? "not_found" : confianca, pagina: 1, evidencia: "" });

const VODAFONE = "Vodafone Portugal, Comunicações Pessoais, S.A.";

function extracaoFatura({ nif, conta, numero, emissao, mensal = 71.46, fimFidelizacao = null, fornecedor = VODAFONE }) {
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
    total: c(mensal.toFixed(2)),
    mensalidade: c(mensal.toFixed(2)),
    data_fim_fidelizacao: c(fimFidelizacao),
    valor_cessacao: c(""),
    data_referencia_cessacao: "",
    identificacao: { titular: "Maria Silva", nif_titular: nif, numero_cliente: "", referencia_conta: conta, numero_servico: "", numero_fatura: numero },
    linhas: [{ descricao: "Pacote Fibra + TV", categoria: "servico_base", valor: mensal, recorrente: "sim" }],
  };
}

function extracaoContrato({ nif, conta, fornecedor = VODAFONE }) {
  const vazio = c("");
  return {
    tipo_documento: "contrato",
    setor: "telecomunicacoes",
    fornecedor: c(fornecedor),
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
    identificacao: { titular: "Maria Silva", nif_titular: nif, numero_cliente: "", referencia_conta: conta, numero_contrato: "", numero_servico: "" },
  };
}

async function criarCliente() {
  const email = `deixar-${randomUUID()}@teste.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: randomUUID() });
  if (error) throw error;
  const id = data.user.id;
  const { error: e } = await admin.from("user_access").upsert({
    user_id: id,
    subscription_plan: "caso_protecao",
    subscription_status: "active",
    case_credits: 3,
    stripe_customer_id: `cus_teste_${id.slice(0, 8)}`,
    stripe_subscription_id: `sub_teste_${id.slice(0, 8)}`,
  });
  if (e) throw e;
  return id;
}

async function processar(utilizadorId, tipo, extracao) {
  const caminho = `${utilizadorId}/${randomUUID()}.pdf`;
  const { error: erroUpload } = await admin.storage
    .from(BUCKET)
    .upload(caminho, new Blob(["%PDF-1.4 teste " + randomUUID()], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (erroUpload) throw erroUpload;
  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({ utilizador_id: utilizadorId, tipo, storage_path: caminho, mime_type: "application/pdf" })
    .select("id")
    .single();
  if (error) throw error;
  const v = tipo === "contrato" ? VERSAO_CONTRATO : VERSAO_FATURA;
  const { error: erroExtracao } = await admin
    .from("extracoes_documento")
    .insert({ documento_id: doc.id, modelo: MODELO, schema_versao: v.schema, prompt_versao: v.prompt, estado: "sucesso", resultado: extracao });
  if (erroExtracao) throw erroExtracao;
  const r = await servidor.processarDocumento(doc.id);
  const { data: lido } = await admin.from("documentos_monitor").select("contrato_id").eq("id", doc.id).single();
  return { id: doc.id, caminho, r, contratoId: lido.contrato_id };
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

/** Serviço com contrato confirmado, 2 faturas (uma com achado) e decisões de associação. */
async function servicoCompleto(cliente, ids) {
  const contrato = await processar(cliente, "contrato", extracaoContrato(ids));
  assert.ok(contrato.contratoId);
  await aceitarTudo(cliente, contrato.contratoId);
  const f1 = await processar(cliente, "fatura", extracaoFatura({ ...ids, numero: `FT-${ids.conta}-1`, emissao: "2026-08-10" }));
  const f2 = await processar(cliente, "fatura", extracaoFatura({ ...ids, numero: `FT-${ids.conta}-2`, emissao: "2026-09-10", fimFidelizacao: "2027-12-31" }));
  assert.equal(f1.contratoId, contrato.contratoId);
  assert.equal(f2.contratoId, contrato.contratoId);
  return { id: contrato.contratoId, caminhos: [contrato.caminho, f1.caminho, f2.caminho] };
}

async function existeFicheiro(caminho) {
  const { data } = await admin.storage.from(BUCKET).download(caminho);
  return !!data;
}

async function contar(tabela, coluna, valor) {
  const { count, error } = await admin.from(tabela).select("*", { count: "exact", head: true }).eq(coluna, valor);
  if (error) throw error;
  return count;
}

async function acesso(cliente) {
  const { data } = await admin
    .from("user_access")
    .select("subscription_plan, subscription_status, case_credits, avulso_credits, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", cliente)
    .single();
  return data;
}

// Regista todos os pedidos HTTP feitos durante a operação: só a Supabase
// local pode ser chamada (nunca o Stripe, nem a Claude API, nem a Brevo).
const fetchOriginal = globalThis.fetch;
let pedidos = [];
let falhar = null;
function intercetar() {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const metodo = (init?.method ?? "GET").toUpperCase();
    pedidos.push({ url, metodo });
    if (falhar?.(url, metodo)) return new Response(JSON.stringify({ message: "falha simulada" }), { status: 500, headers: { "content-type": "application/json" } });
    return fetchOriginal(input, init);
  };
}

describe("deixar de acompanhar até ao último serviço (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  before(async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    servidor = await import("@/lib/monitor/servidor");
    ({ MODELO_DOCUMENTOS: MODELO } = await import("@/lib/claude"));
    const f = await import("@/lib/monitor/extracaoFatura");
    const ct = await import("@/lib/monitor/extracaoContrato");
    VERSAO_FATURA = { schema: f.SCHEMA_FATURA_VERSAO, prompt: f.PROMPT_FATURA_VERSAO };
    VERSAO_CONTRATO = { schema: ct.SCHEMA_CONTRATO_VERSAO, prompt: ct.PROMPT_CONTRATO_VERSAO };
    intercetar();
  });

  after(() => {
    globalThis.fetch = fetchOriginal;
  });

  test("2 serviços → 1 → 0, Proteção/casos/Stripe intactos, depois um serviço novo", async () => {
    const cliente = await criarCliente();
    const a = await servicoCompleto(cliente, { nif: "123456789", conta: "215960347" });
    const b = await servicoCompleto(cliente, { nif: "123456789", conta: "315204142", fornecedor: "MEO - Serviços de Comunicações e Multimédia, S.A." });
    assert.notEqual(a.id, b.id, "dois serviços distintos");
    assert.ok((await contar("associacoes_documento", "contrato_id", b.id)) > 0, "o serviço tem decisões de associação (o que falhava)");
    assert.ok((await contar("achados_monitor", "contrato_id", b.id)) > 0, "o serviço tem achados por rever");
    const acessoAntes = await acesso(cliente);

    pedidos = [];
    const r1 = await servidor.apagarServicoAcompanhado(a.id, cliente);
    assert.deepEqual(r1, { ok: true, restantes: 1, ficheirosPorApagar: 0 });
    for (const caminho of a.caminhos) assert.equal(await existeFicheiro(caminho), false, "ficheiros do 1.º serviço apagados");
    for (const caminho of b.caminhos) assert.equal(await existeFicheiro(caminho), true, "ficheiros do outro serviço intactos");

    const r2 = await servidor.apagarServicoAcompanhado(b.id, cliente);
    assert.deepEqual(r2, { ok: true, restantes: 0, ficheirosPorApagar: 0 }, "o último serviço apaga-se e restam 0");
    for (const caminho of b.caminhos) assert.equal(await existeFicheiro(caminho), false);

    const local = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
    assert.deepEqual(pedidos.filter((p) => !p.url.startsWith(local)), [], "nenhum pedido fora da Supabase (Stripe incluído)");

    assert.equal(await contar("contratos_monitorizados", "utilizador_id", cliente), 0);
    for (const t of ["documentos_monitor", "faturas_monitor", "eventos_servico", "achados_monitor", "servicos_identificadores", "contratos_versoes", "associacoes_documento"]) {
      assert.equal(await contar(t, "utilizador_id", cliente), 0, `${t} sem registos órfãos`);
    }
    for (const id of [a.id, b.id]) assert.equal(await contar("contratos_alertas_envios", "contrato_id", id), 0);
    const { data: pendentes, error } = await admin.rpc("monitor_alertas_pendentes", { p_hoje: "2027-02-07" });
    assert.ifError(error);
    assert.equal(pendentes.filter((p) => p.contrato_id === a.id || p.contrato_id === b.id).length, 0, "sem alertas pendentes");

    assert.deepEqual(await acesso(cliente), acessoAntes, "plano, estado, casos disponíveis e IDs do Stripe inalterados");

    // Repetir (duplo clique): nada para apagar, sem erro.
    assert.deepEqual(await servidor.apagarServicoAcompanhado(b.id, cliente), { ok: false, erro: "nao_encontrado" });

    // Com 0 serviços, uma fatura nova cria um serviço novo.
    const nova = await processar(cliente, "fatura", extracaoFatura({ nif: "123456789", conta: "215960347", numero: "FT-NOVA", emissao: "2026-09-20" }));
    assert.ok(nova.contratoId, "serviço novo criado");
    assert.equal(await contar("contratos_monitorizados", "utilizador_id", cliente), 1);
  });

  test("outro cliente não consegue apagar o serviço", async () => {
    const dono = await criarCliente();
    const outro = await criarCliente();
    const s = await processar(dono, "fatura", extracaoFatura({ nif: "123456789", conta: "215960347", numero: "FT-X", emissao: "2026-09-10" }));
    assert.deepEqual(await servidor.apagarServicoAcompanhado(s.contratoId, outro), { ok: false, erro: "nao_encontrado" });
    assert.equal(await contar("contratos_monitorizados", "id", s.contratoId), 1);
    assert.equal(await existeFicheiro(s.caminho), true);
  });

  test("falha da base de dados: nada é apagado (nem os ficheiros)", async () => {
    const cliente = await criarCliente();
    const s = await servicoCompleto(cliente, { nif: "123456789", conta: "215960347" });
    falhar = (url, metodo) => metodo === "DELETE" && url.includes("/rest/v1/contratos_monitorizados");
    try {
      assert.deepEqual(await servidor.apagarServicoAcompanhado(s.id, cliente), { ok: false, erro: "falhou" });
    } finally {
      falhar = null;
    }
    assert.equal(await contar("contratos_monitorizados", "id", s.id), 1, "o serviço continua");
    assert.equal(await contar("documentos_monitor", "contrato_id", s.id), 3, "os documentos continuam");
    for (const caminho of s.caminhos) assert.equal(await existeFicheiro(caminho), true, "os ficheiros continuam");
  });

  test("falha do Storage depois da base de dados: o serviço sai na mesma; os ficheiros ficam para a limpeza de órfãos", async () => {
    const cliente = await criarCliente();
    const s = await servicoCompleto(cliente, { nif: "123456789", conta: "215960347" });
    falhar = (url, metodo) => metodo === "DELETE" && url.includes("/storage/v1/object/");
    let r;
    try {
      r = await servidor.apagarServicoAcompanhado(s.id, cliente);
    } finally {
      falhar = null;
    }
    assert.deepEqual(r, { ok: true, restantes: 0, ficheirosPorApagar: 3 });
    assert.equal(await contar("contratos_monitorizados", "id", s.id), 0);
    assert.equal(await contar("documentos_monitor", "utilizador_id", cliente), 0, "sem registos: os ficheiros são órfãos (monitor_ficheiros_orfaos)");
    for (const caminho of s.caminhos) assert.equal(await existeFicheiro(caminho), true);
    await admin.storage.from(BUCKET).remove(s.caminhos);
  });
});
