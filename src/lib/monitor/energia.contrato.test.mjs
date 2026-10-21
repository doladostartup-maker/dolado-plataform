// Electricidade e gás contra a Supabase REAL — `npm run test:contrato`.
//
// Pipeline real do servidor com MONITOR_ENERGIA_ATIVO=1 (leitura fatura_v4):
// associação pelo CPE pseudonimizado, gravação de faturas_monitor.energia,
// comparação (energia_v1) com eventos e achados, e o que o cliente vê com a
// própria sessão (RLS). A Claude API nunca é chamada: cada documento já tem
// a leitura gravada, que o servidor reutiliza.
//
// Fora de `npm run test:contrato` fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const CPE = "PT0002000012345678AB";

let admin;
let servidor;
let MODELO;
let VERSAO;
let interruptorAntes;

const c = (valor, confianca = "high") => ({ valor: String(valor ?? ""), confianca: valor == null || valor === "" ? "not_found" : confianca, pagina: 1, evidencia: "" });
const lido = (campo, valor, periodo = "", descricao = "") => ({ fornecimento: "eletricidade", campo, periodo, descricao, valor: String(valor) });

/** Factura de electricidade simples: kWh × preço + 30 dias × 0,30 € + IVA 10 €. */
function extracaoLuz({ numero, inicio, fim, kwh, preco }) {
  const energia = Math.round(kwh * preco * 100) / 100;
  const total = (energia + 9 + 10).toFixed(2);
  return {
    tipo_documento: "fatura",
    setor: "eletricidade",
    fornecedor: c("EDP Comercial - Comercialização de Energia, S.A."),
    referencia_contrato: c(""),
    data_emissao: c(fim),
    periodo_inicio: inicio,
    periodo_fim: fim,
    moeda: "EUR",
    total: c(total),
    mensalidade: c(""),
    data_fim_fidelizacao: c(""),
    valor_cessacao: c(""),
    data_referencia_cessacao: "",
    identificacao: { titular: "", nif_titular: "", numero_cliente: "", referencia_conta: "", numero_servico: "", numero_fatura: numero },
    linhas: [],
    energia: [
      lido("cpe_cui", CPE),
      lido("periodo_inicio", inicio),
      lido("periodo_fim", fim),
      lido("dias", 30),
      lido("potencia_kva", "6,9"),
      lido("termo_fixo_dia", "0,3000"),
      lido("valor_termo_fixo", "9.00"),
      lido("opcao_horaria", "simples"),
      lido("tipo_tarifario", "fixo"),
      lido("tipo_leitura", "real"),
      lido("energia_kwh", kwh, "simples"),
      lido("energia_preco_kwh", preco, "simples"),
      lido("energia_valor", energia.toFixed(2), "simples"),
      lido("valor_impostos", "10.00"),
      lido("valor_descontos", "0"),
      lido("valor_acertos", "0"),
      lido("total", total),
    ],
  };
}

async function criarCliente() {
  const email = `energia-${randomUUID()}@teste.invalid`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw error;
  await admin.from("user_access").upsert({ user_id: data.user.id, subscription_plan: "protecao", subscription_status: "active" });
  return { id: data.user.id, email, password };
}

async function processar(utilizadorId, extracao) {
  const caminho = `${utilizadorId}/${randomUUID()}.pdf`;
  const { error: erroUpload } = await admin.storage
    .from("documentos-monitor")
    .upload(caminho, new Blob(["%PDF-1.4 teste"], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (erroUpload) throw erroUpload;
  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({ utilizador_id: utilizadorId, tipo: "fatura", storage_path: caminho, mime_type: "application/pdf" })
    .select("id")
    .single();
  if (error) throw error;
  const { error: erroExtracao } = await admin
    .from("extracoes_documento")
    .insert({ documento_id: doc.id, modelo: MODELO, schema_versao: VERSAO.schema, prompt_versao: VERSAO.prompt, estado: "sucesso", resultado: extracao });
  if (erroExtracao) throw erroExtracao;
  const r = await servidor.processarDocumento(doc.id);
  return { id: doc.id, r };
}

describe("electricidade e gás (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  before(async () => {
    interruptorAntes = process.env.MONITOR_ENERGIA_ATIVO;
    process.env.MONITOR_ENERGIA_ATIVO = "1";
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    servidor = await import("@/lib/monitor/servidor");
    ({ MODELO_DOCUMENTOS: MODELO } = await import("@/lib/claude"));
    const f = await import("@/lib/monitor/extracaoFatura");
    const v = f.leituraFatura();
    assert.equal(v.schemaVersao, "fatura_v4");
    VERSAO = { schema: v.schemaVersao, prompt: v.promptVersao };
  });
  after(() => {
    if (interruptorAntes === undefined) delete process.env.MONITOR_ENERGIA_ATIVO;
    else process.env.MONITOR_ENERGIA_ATIVO = interruptorAntes;
  });

  test("duas facturas: mesma instalação pelo CPE, energia gravada, diferença explicada e subida de preço para revisão", async () => {
    const cliente = await criarCliente();
    const agosto = await processar(cliente.id, extracaoLuz({ numero: "FE-1", inicio: "2026-08-01", fim: "2026-08-30", kwh: 200, preco: 0.15 }));
    const setembro = await processar(cliente.id, extracaoLuz({ numero: "FE-2", inicio: "2026-08-31", fim: "2026-09-29", kwh: 200, preco: 0.18 }));
    const servico = agosto.r.contratoId;
    assert.ok(servico);
    assert.equal(setembro.r.contratoId, servico, "associada pelo CPE (pseudónimo)");

    // CPE nunca em claro: nem na leitura gravada, nem nos identificadores, nem na factura.
    const { data: leituras } = await admin.from("extracoes_documento").select("resultado").in("documento_id", [agosto.id, setembro.id]);
    for (const l of leituras) assert.equal(JSON.stringify(l.resultado).includes(CPE), false);
    const { data: ids } = await admin.from("servicos_identificadores").select("tipo, valor_normalizado, apresentacao").eq("contrato_id", servico);
    const cpe = ids.find((i) => i.tipo === "cpe");
    assert.match(cpe.valor_normalizado, /^hmac:[0-9a-f]{64}$/);
    assert.equal(cpe.apresentacao, "terminado em 78AB");

    const { data: faturas } = await admin.from("faturas_monitor").select("id, energia, em_verificacao").eq("contrato_id", servico).order("data_emissao");
    assert.equal(faturas.length, 2);
    assert.equal(faturas[1].energia[0].tipo, "eletricidade");
    assert.equal(faturas[1].energia[0].energia[0].precoMicro, 180000);
    assert.equal(JSON.stringify(faturas).includes(CPE), false);
    assert.equal(faturas[1].em_verificacao, true, "subida de preço à espera da revisão da DoLado");

    const { data: eventos } = await admin
      .from("eventos_servico")
      .select("fatura_id, tipo, severidade, montante_cents, confianca, versao_regra, dados")
      .eq("contrato_id", servico)
      .is("substituido_em", null);
    const variacao = eventos.find((e) => e.fatura_id === faturas[1].id && e.tipo === "energia_variacao");
    assert.equal(variacao.dados.diferencaCents, 600);
    assert.deepEqual(variacao.dados.componentes, [{ chave: "preco_energia", cents: 600 }]);
    assert.equal(variacao.versao_regra, "energia_v1");
    const preco = eventos.find((e) => e.tipo === "energia_preco_alterado");
    assert.equal(preco.severidade, "atencao");
    assert.equal(preco.montante_cents, 600);
    assert.ok(!eventos.some((e) => e.tipo.startsWith("mensalidade")), "sem eventos de mensalidade das telecomunicações");

    const { data: achados } = await admin.from("achados_monitor").select("tipo, estado, evidencia").eq("contrato_id", servico);
    assert.deepEqual(achados.map((a) => [a.tipo, a.estado]), [["energia_preco_alterado", "detetado"]]);
    assert.match(achados[0].evidencia.texto_proposto, /O preço da electricidade por kWh subiu/);

    // O cliente, com a própria sessão: vê a explicação, não vê a subida por rever.
    const { createClient } = await import("@supabase/supabase-js");
    const sessao = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, { auth: { persistSession: false } });
    const { error: erroLogin } = await sessao.auth.signInWithPassword({ email: cliente.email, password: cliente.password });
    assert.equal(erroLogin, null);
    const { data: vistos } = await sessao.from("eventos_servico").select("tipo").eq("contrato_id", servico).is("substituido_em", null);
    assert.ok(vistos.some((e) => e.tipo === "energia_variacao"));
    assert.ok(!vistos.some((e) => e.tipo === "energia_preco_alterado"));

    // Reanálise (ex.: contrato adicionado depois): mesmo resultado, mesmo achado.
    await servidor.recalcularAcompanhamento(admin, servico);
    const { count } = await admin.from("achados_monitor").select("id", { count: "exact", head: true }).eq("contrato_id", servico);
    assert.equal(count, 1);
  });
});
