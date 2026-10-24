// DoLado Empresas — Fase 6A: pipeline real do Monitor com documentos de
// empresa, contra a Supabase REAL (`npm run test:contrato`). Como em
// acompanhamento.contrato.test.mjs, a Claude API nunca é chamada: cada
// documento já tem a leitura gravada, que o servidor reutiliza.
//
// Prova: duas lojas da mesma empresa (mesmo fornecedor e NIPC) — cada
// factura na sua instalação só com o número de conta; sem identificador
// nunca é automático; identificador de outra loja → pergunta; quota
// consumida só com resultado útil e libertada em repetida/fora do âmbito;
// limite de serviços; conta de empresa sem instalação → revisão.
//
// Fora de `npm run test:contrato` fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

let admin;
let servidor;
let MODELO;
let VERSAO_FATURA;

const c = (valor, confianca = "high") => ({ valor: String(valor ?? ""), confianca: valor == null || valor === "" ? "not_found" : confianca, pagina: 1, evidencia: "" });

function extracaoFatura({ conta = "", numero, emissao, setor = "telecomunicacoes", mensal = 39.9 }) {
  const mes = emissao.slice(0, 7);
  return {
    tipo_documento: "fatura",
    setor,
    fornecedor: c("Vodafone Portugal, Comunicações Pessoais, S.A."),
    referencia_contrato: c(""),
    data_emissao: c(emissao),
    periodo_inicio: `${mes}-01`,
    periodo_fim: `${mes}-28`,
    moeda: "EUR",
    total: c(mensal.toFixed(2)),
    mensalidade: c(mensal.toFixed(2)),
    data_fim_fidelizacao: c(""),
    valor_cessacao: c(""),
    data_referencia_cessacao: "",
    identificacao: { titular: "Loja do Bairro Lda", nif_titular: "500000000", numero_cliente: "", referencia_conta: conta, numero_servico: "", numero_fatura: numero },
    linhas: [{ descricao: "Pacote Empresas", categoria: "servico_base", valor: mensal, recorrente: "sim" }],
  };
}

function nipcAleatorio() {
  const base = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(base[i]) * (9 - i);
  const resto = soma % 11;
  return `${base}${resto < 2 ? 0 : 11 - resto}`;
}

async function rpc(nome, args) {
  const { data, error } = await admin.rpc(nome, args);
  if (error) throw error;
  return data;
}

/** Empresa activa com duas instalações. */
async function empresaAtiva() {
  const { data: conta } = await admin.auth.admin.createUser({ email: `emp-${randomUUID()}@teste.invalid`, email_confirm: true });
  const { data: adm } = await admin.auth.admin.createUser({ email: `adm-${randomUUID()}@teste.invalid`, email_confirm: true });
  await admin.from("utilizadores").update({ role: "admin" }).eq("id", adm.user.id);
  const nif = nipcAleatorio();
  assert.equal(await rpc("empresa_registar", { p_user: conta.user.id, p_nome: "Loja do Bairro", p_tipo_entidade: "sociedade", p_nif: nif, p_responsavel: "Ana" }), "registada");
  const { data: org } = await admin.from("organizacoes").select("id").eq("nif", nif).single();
  // As vagas do piloto: liberta as organizações activas de testes anteriores.
  await admin.from("organizacoes").update({ estado: "aprovada" }).eq("id", org.id);
  const ativacao = await rpc("empresa_activar", { p_org: org.id, p_admin: adm.user.id, p_referencia: "FT T" });
  assert.equal(ativacao, "ativa");
  const centro = (await rpc("empresa_criar_instalacao", { p_user: conta.user.id, p_nome: "Centro", p_morada: null })).id;
  const norte = (await rpc("empresa_criar_instalacao", { p_user: conta.user.id, p_nome: "Norte", p_morada: null })).id;
  return { user: conta.user.id, org: org.id, centro, norte };
}

/** Carregamento como no portal (empresa_registar_documento) + leitura gravada. */
async function carregar(e, instalacao, extracao, configuracao = false) {
  const caminho = `${e.user}/${randomUUID()}.pdf`;
  const { error: erroUpload } = await admin.storage
    .from("documentos-monitor")
    .upload(caminho, new Blob([`%PDF-1.4 ${randomUUID()}`], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (erroUpload) throw erroUpload;
  const r = await rpc("empresa_registar_documento", {
    p_user: e.user,
    p_instalacao: instalacao,
    p_tipo: "fatura",
    p_configuracao_inicial: configuracao,
    p_storage_path: caminho,
    p_nome_ficheiro: "f.pdf",
    p_mime: "application/pdf",
  });
  assert.equal(r.resultado, "registado");
  const { error } = await admin.from("extracoes_documento").insert({
    documento_id: r.documento_id,
    modelo: MODELO,
    schema_versao: VERSAO_FATURA.schema,
    prompt_versao: VERSAO_FATURA.prompt,
    estado: "sucesso",
    resultado: extracao,
  });
  if (error) throw error;
  const resultado = await servidor.processarDocumento(r.documento_id);
  const { data: doc } = await admin.from("documentos_monitor").select("*").eq("id", r.documento_id).single();
  const { data: meta } = await admin.from("empresa_documentos").select("estado_quota").eq("documento_id", r.documento_id).single();
  return { id: r.documento_id, r: resultado, doc, quota: meta.estado_quota };
}

async function instalacaoDoServico(servicoId) {
  const { data } = await admin.from("contratos_monitorizados").select("instalacao_id").eq("id", servicoId).single();
  return data.instalacao_id;
}

describe("DoLado Empresas — Monitor (Supabase real)", { skip: !ATIVO && "só em npm run test:contrato", timeout: 120_000 }, () => {
  before(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    servidor = await import("@/lib/monitor/servidor");
    ({ MODELO_DOCUMENTOS: MODELO } = await import("@/lib/claude"));
    const f = await import("@/lib/monitor/extracaoFatura");
    VERSAO_FATURA = { schema: f.leituraFatura().schemaVersao, prompt: f.leituraFatura().promptVersao };
    // Vagas do piloto (5): os testes criam organizações activas.
    await admin.from("organizacoes").update({ estado: "cancelada" }).in("estado", ["ativa", "pagamento_em_atraso", "suspensa"]);
  });

  test("duas lojas, mesmo fornecedor e NIPC: associação estrita e quota", async () => {
    const e = await empresaAtiva();

    // 1. Loja Centro, conta 215960347 → serviço novo no Centro; quota consumida.
    const a = await carregar(e, e.centro, extracaoFatura({ conta: "215960347", numero: "A1", emissao: "2026-08-10" }));
    assert.equal(a.doc.associacao_estado, "novo_servico");
    assert.equal(await instalacaoDoServico(a.doc.contrato_id), e.centro);
    assert.equal(a.quota, "consumida");

    // 2. Loja Norte, conta 315204142 → serviço novo no Norte (nada é adivinhado).
    const b = await carregar(e, e.norte, extracaoFatura({ conta: "315204142", numero: "B1", emissao: "2026-08-12" }));
    assert.equal(b.doc.associacao_estado, "novo_servico");
    assert.notEqual(b.doc.contrato_id, a.doc.contrato_id);
    assert.equal(await instalacaoDoServico(b.doc.contrato_id), e.norte);

    // 3. Centro, conta 215960347 outra vez → associada ao serviço do Centro.
    const c2 = await carregar(e, e.centro, extracaoFatura({ conta: "215960347", numero: "A2", emissao: "2026-09-10" }));
    assert.equal(c2.doc.contrato_id, a.doc.contrato_id);
    assert.equal(c2.doc.associacao_estado, "confirmada");

    // 4. Centro, sem número de conta (só fornecedor e NIPC) → pergunta; a
    //    quota fica reservada até à decisão.
    const d = await carregar(e, e.centro, extracaoFatura({ conta: "", numero: "A3", emissao: "2026-10-10" }));
    assert.equal(d.doc.contrato_id, null);
    assert.equal(d.doc.associacao_estado, "possivel");
    assert.equal(d.doc.associacao_sugerida, a.doc.contrato_id);
    assert.equal(d.quota, "reservada");
    const decisao = await servidor.concluirAssociacao({ documentoId: d.id, utilizadorId: e.user, decisao: "associar_mesmo_assim", papel: "cliente", por: e.user });
    assert.equal(decisao.ok, true);
    const { data: depois } = await admin.from("empresa_documentos").select("estado_quota").eq("documento_id", d.id).single();
    assert.equal(depois.estado_quota, "consumida");

    // 5. Norte com a conta da loja Centro → pergunta (serviço noutra instalação).
    const outra = await carregar(e, e.norte, extracaoFatura({ conta: "215960347", numero: "A4", emissao: "2026-11-10" }));
    assert.equal(outra.doc.contrato_id, null);
    assert.ok(outra.doc.associacao_conflitos.includes("O serviço com esta identificação está noutra instalação"));
    // A empresa não consegue pô-la num serviço de outra instalação.
    const errada = await servidor.concluirAssociacao({ documentoId: outra.id, utilizadorId: e.user, decisao: "associar_mesmo_assim", papel: "cliente", por: e.user });
    assert.deepEqual(errada, { ok: false, erro: "servico_invalido" });

    // 6. Factura repetida (mesmo número) → não cria outro mês; quota libertada.
    const rep = await carregar(e, e.centro, extracaoFatura({ conta: "215960347", numero: "A2", emissao: "2026-09-10" }));
    assert.equal(rep.r.repetido, true);
    assert.equal(rep.quota, "libertada");

    // 7. Gás → fora do âmbito automático: análise manual, quota libertada.
    const gas = await carregar(e, e.centro, extracaoFatura({ conta: "415204143", numero: "G1", emissao: "2026-08-20", setor: "gas" }));
    assert.equal(gas.r.motivo, "fora_do_ambito");
    assert.equal(gas.doc.estado, "a_rever");
    assert.equal(gas.doc.contrato_id, null);
    assert.equal(gas.quota, "libertada");

    // Sem custo de saída nem achado de cessação nas empresas.
    const { count: cessacao } = await admin.from("achados_monitor").select("id", { count: "exact", head: true }).eq("tipo", "cessacao_divergente").in("contrato_id", [a.doc.contrato_id, b.doc.contrato_id]);
    assert.equal(cessacao, 0);
  });

  test("revisão D3: tudo nos primeiros 30 dias; depois, só por excepção", async () => {
    const e = await empresaAtiva();
    const revisao = async (id) =>
      (await admin.from("empresa_documentos").select("revisao_necessaria, revisao_motivos").eq("documento_id", id).single()).data;

    const primeira = await carregar(e, e.centro, extracaoFatura({ conta: "815204147", numero: "R1", emissao: "2026-08-10" }));
    const r1 = await revisao(primeira.id);
    assert.equal(r1.revisao_necessaria, true);
    for (const m of ["periodo_inicial", "sector_novo", "fornecedor_novo", "primeira_fatura_servico"]) assert.ok(r1.revisao_motivos.includes(m), m);

    // Depois dos 30 dias: uma factura normal do mesmo serviço não precisa de revisão.
    await admin.from("organizacoes").update({ revisao_obrigatoria_ate: new Date(Date.now() - 86_400_000).toISOString() }).eq("id", e.org);
    const segunda = await carregar(e, e.centro, extracaoFatura({ conta: "815204147", numero: "R2", emissao: "2026-09-10" }));
    assert.equal(segunda.doc.contrato_id, primeira.doc.contrato_id);
    assert.deepEqual(await revisao(segunda.id), { revisao_necessaria: false, revisao_motivos: [] });

    // Associação decidida pela empresa → revisão.
    const semId = await carregar(e, e.centro, extracaoFatura({ conta: "", numero: "R3", emissao: "2026-10-10" }));
    await servidor.concluirAssociacao({ documentoId: semId.id, utilizadorId: e.user, decisao: "associar_mesmo_assim", papel: "cliente", por: e.user });
    assert.ok((await revisao(semId.id)).revisao_motivos.includes("associacao_cliente"));

    // Fora do âmbito → análise manual.
    const gas = await carregar(e, e.centro, extracaoFatura({ conta: "915204148", numero: "R4", emissao: "2026-08-20", setor: "gas" }));
    assert.deepEqual((await revisao(gas.id)).revisao_motivos, ["analise_manual"]);
  });

  test("limite de serviços do plano", async () => {
    const e = await empresaAtiva();
    await admin.from("organizacoes").update({ limite_servicos: 1 }).eq("id", e.org);
    const primeiro = await carregar(e, e.centro, extracaoFatura({ conta: "515204144", numero: "L1", emissao: "2026-08-01" }));
    assert.equal(primeiro.doc.associacao_estado, "novo_servico");
    const segundo = await carregar(e, e.norte, extracaoFatura({ conta: "615204145", numero: "L2", emissao: "2026-08-02" }));
    assert.equal(segundo.r.motivo, "limite_servicos");
    assert.equal(segundo.doc.contrato_id, null);
    assert.equal(segundo.quota, "libertada");
  });

  test("conta de empresa sem instalação registada nunca segue o caminho dos particulares", async () => {
    const e = await empresaAtiva();
    const caminho = `${e.user}/${randomUUID()}.pdf`;
    await admin.storage.from("documentos-monitor").upload(caminho, new Blob(["%PDF-1.4 x"], { type: "application/pdf" }), { contentType: "application/pdf" });
    const { data: doc } = await admin.from("documentos_monitor").insert({ utilizador_id: e.user, tipo: "fatura", storage_path: caminho, mime_type: "application/pdf" }).select("id").single();
    await admin.from("extracoes_documento").insert({ documento_id: doc.id, modelo: MODELO, schema_versao: VERSAO_FATURA.schema, prompt_versao: VERSAO_FATURA.prompt, estado: "sucesso", resultado: extracaoFatura({ conta: "715204146", numero: "X1", emissao: "2026-08-01" }) });
    const r = await servidor.processarDocumento(doc.id);
    assert.equal(r.motivo, "empresa_sem_contexto");
    const { count } = await admin.from("contratos_monitorizados").select("id", { count: "exact", head: true }).eq("utilizador_id", e.user);
    assert.equal(count, 0, "nenhum serviço criado");
  });
});
