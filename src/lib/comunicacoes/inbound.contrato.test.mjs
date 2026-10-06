// Receção de respostas contra a Supabase REAL — `npm run test:contrato`.
//
// Corre o código real do servidor (criarDependenciasInbound: PostgREST,
// funções, triggers e Storage das migrations) com a API do Resend
// substituída (obter o e-mail, listar e descarregar anexos) — o Resend
// nunca é chamado. A análise pela IA corre com o modelo substituído. Cobre o ciclo: reclamação autorizada e enviada → a
// aguardar resposta → e-mail recebido → em análise → decisão → nova
// comunicação só com autorização → enviada → a aguardar resposta; e o
// isolamento por cliente (RLS) com sessões reais.
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const PDF = new TextEncoder().encode("%PDF-1.7\n%contrato\n");

let admin;
let processarEventoResend;
let gerarAnaliseIA;
let gerarAnalise;
let criarDependenciasAnalise;
let criarDependenciasInbound;
let enderecoRespostaDoCaso;
let gerarToken;
let hashToken;
let hashConteudo;

async function conta() {
  const email = `inbound-${randomUUID()}@teste.invalid`;
  const password = `Pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw error;
  return { userId: data.user.id, email, password };
}

async function sessao({ email, password }) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

async function rpc(nome, args) {
  const { data, error } = await admin.rpc(nome, args);
  if (error) throw error;
  return data;
}

/** Versão autorizada pelo cliente e enviada à empresa (o fluxo de sempre). */
async function enviar(casoId, conteudo, referencia = null) {
  const textoId = await rpc("texto_guardar", { p_caso_id: casoId, p_conteudo: conteudo, p_admin: null });
  const rever = gerarToken();
  await rpc("texto_emitir_links", {
    p_texto_id: textoId,
    p_hash_rever: hashToken(rever),
    p_hash_alterar: hashToken(gerarToken()),
    p_expira_em: new Date(Date.now() + 864e5).toISOString(),
  });
  const semAutorizacao = await rpc("texto_registar_envio", {
    p_texto_id: textoId, p_conteudo_sha256: hashConteudo(conteudo), p_destinatario: "Operadora", p_canal: "email", p_resultado: null, p_admin: null,
  });
  assert.equal(semAutorizacao.resultado, "nao_autorizado", "nunca enviado sem autorização explícita da versão");
  assert.equal((await rpc("texto_autorizar_por_link", { p_hash: hashToken(rever) })).resultado, "autorizado");
  const r = await rpc("texto_registar_envio", {
    p_texto_id: textoId, p_conteudo_sha256: hashConteudo(conteudo), p_destinatario: "Operadora", p_canal: "livro_reclamacoes_eletronico",
    p_resultado: null, p_admin: null, p_referencia: referencia,
  });
  assert.equal(r.resultado, "enviado");
  return textoId;
}

async function casoEnviado() {
  const c = await conta();
  const { data: caso, error } = await admin
    .from("casos")
    .insert({ utilizador_id: c.userId, nome: "Cliente Teste", email: c.email, empresa: "Operadora Contrato", descricao: "Aumento", status: "Em investigação" })
    .select("id")
    .single();
  if (error) throw error;
  await enviar(caso.id, "Reclamação: aumento da mensalidade.", "LRE-123");
  const endereco = await enderecoRespostaDoCaso(caso.id);
  return { ...c, casoId: caso.id, endereco };
}

/** O "Resend": e-mails recebidos e anexos que a API devolveria. */
function depsFalsas(emails, { ficheiros = {} } = {}) {
  const deps = criarDependenciasInbound();
  deps.obterEmail = async (id) => (emails.has(id) ? { ok: true, email: emails.get(id).email } : { ok: false, motivo: "nao_encontrado" });
  deps.listarAnexos = async (id) => emails.get(id)?.anexos ?? [];
  deps.transferirAnexo = async (url) => {
    if (!ficheiros[url]) throw new Error("url desconhecido");
    return ficheiros[url];
  };
  deps.notificar = async () => undefined;
  deps.agendarAnalise = () => undefined;
  deps.log = () => undefined;
  return deps;
}

function email(id, endereco, extra = {}, anexos = []) {
  return {
    email: {
      id,
      from: "Apoio <apoio@operadora.test>",
      to: [endereco],
      cc: [],
      bcc: [],
      reply_to: [],
      received_for: [],
      subject: "Re: reclamação LRE-123",
      text: "Analisámos a sua reclamação.",
      html: "<p>Analisámos</p><script>alert(1)</script>",
      headers: {},
      message_id: `<${id}@operadora.test>`,
      created_at: new Date().toISOString(),
      authentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
      attachments: anexos.map((a) => ({ id: a.id, filename: a.filename, content_type: a.content_type, size: a.size })),
      ...extra,
    },
    anexos,
  };
}

function evento(id, endereco) {
  return { type: "email.received", data: { email_id: id, to: [endereco], from: "apoio@operadora.test", subject: "Re: reclamação", created_at: new Date().toISOString() } };
}

describe("receção de respostas (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  before(async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANALISE_RESPOSTA_IA_ATIVO;
    process.env.RESPOSTAS_DOMINIO = "respostas.dolado.test";
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    ({ processarEventoResend } = await import("@/lib/comunicacoes/inbound"));
    ({ gerarAnaliseIA, criarDependenciasAnalise } = await import("@/lib/analiseResposta/servidor"));
    ({ gerarAnalise } = await import("@/lib/analiseResposta/gerar"));
    ({ criarDependenciasInbound, enderecoRespostaDoCaso } = await import("@/lib/comunicacoes/servidor"));
    ({ gerarToken, hashToken, hashConteudo } = await import("@/lib/textoCasoTokens"));
  });

  test("ciclo completo: enviado → resposta recebida → em análise → nova comunicação autorizada → a aguardar resposta", async () => {
    const c = await casoEnviado();
    assert.match(c.endereco, /^caso-[a-z2-7]{6}-[a-z2-7]{26}@respostas\.dolado\.test$/);
    assert.equal(await enderecoRespostaDoCaso(c.casoId), c.endereco, "o endereço do caso não muda");
    let { data: caso } = await admin.from("casos").select("status").eq("id", c.casoId).single();
    assert.equal(caso.status, "Aguardando operador");

    const id = randomUUID();
    const anexos = [
      { id: "a1", filename: "decisao.pdf", content_type: "application/pdf", size: PDF.length, download_url: "https://cdn.resend.test/a1" },
      { id: "a2", filename: "x.exe", content_type: "application/octet-stream", size: 3, download_url: "https://cdn.resend.test/a2" },
    ];
    const emails = new Map([[id, email(id, c.endereco, {}, anexos)]]);
    const deps = depsFalsas(emails, { ficheiros: { "https://cdn.resend.test/a1": PDF } });
    const r = await processarEventoResend(evento(id, c.endereco), "evt_1", deps);
    assert.equal(r.status, 200);
    assert.equal(r.resultados[0].resultado, "aceite");

    ({ data: caso } = await admin.from("casos").select("status").eq("id", c.casoId).single());
    assert.equal(caso.status, "Resposta em análise");
    const { data: com } = await admin.from("casos_comunicacoes_recebidas").select("*").eq("caso_id", c.casoId).single();
    assert.equal(com.provider, "resend");
    assert.equal(com.provider_message_id, id);
    assert.equal(com.estado_processamento, "processada");
    assert.equal(com.corpo_html, "<p>Analisámos</p><script>alert(1)</script>");
    assert.doesNotMatch(com.corpo_apresentacao, /script|alert/);
    const { data: ax } = await admin.from("casos_comunicacoes_anexos").select("*").eq("comunicacao_id", com.id).order("indice");
    assert.deepEqual(ax.map((a) => a.estado), ["guardado", "rejeitado"]);
    const { data: ficheiro } = await admin.storage.from("comunicacoes-casos").download(ax[0].storage_path);
    assert.equal(new Uint8Array(await ficheiro.arrayBuffer()).length, PDF.length);

    // Reenvio do webhook (mesmo e-mail, outro evento): um só registo lógico.
    const r2 = await processarEventoResend(evento(id, c.endereco), "evt_2", deps);
    assert.equal(r2.resultados[0].resultado, "duplicado");
    const { count } = await admin.from("casos_comunicacoes_recebidas").select("id", { count: "exact", head: true }).eq("caso_id", c.casoId);
    assert.equal(count, 1);
    const { data: registos } = await admin.from("comunicacoes_inbound_registos").select("resultado").eq("provider_message_id", id).order("created_at");
    assert.deepEqual(registos.map((x) => x.resultado), ["aceite", "duplicado"]);

    // Decisão humana: preparar nova resposta → nova comunicação, só com autorização.
    const d = await rpc("caso_decidir_analise", {
      p_caso_id: c.casoId, p_comunicacao_id: com.id, p_decisao: "preparar_nova_resposta", p_classificacao: "resposta_negativa",
      p_resumo: "Recusa sem fundamento.", p_mensagem_cliente: null, p_tipo_encaminhamento: null, p_pedido: null, p_instrucoes: null, p_prazo: null,
      p_analise_ia_id: null, p_admin: c.userId,
    });
    assert.equal(d.estado, "Em investigação");
    await enviar(c.casoId, "Nova comunicação: contestação.");
    ({ data: caso } = await admin.from("casos").select("status").eq("id", c.casoId).single());
    assert.equal(caso.status, "Aguardando operador");
    const { count: envios } = await admin.from("casos_textos_envios").select("id", { count: "exact", head: true }).eq("caso_id", c.casoId);
    assert.equal(envios, 2);
  });

  test("endereço inventado: quarentena (nunca descartado nem associado a outro caso)", async () => {
    const c = await casoEnviado();
    const inventado = "caso-aaaaaa-aaaaaaaaaaaaaaaaaaaaaaaaaa@respostas.dolado.test";
    const id = randomUUID();
    const r = await processarEventoResend(evento(id, inventado), "evt_q", depsFalsas(new Map()));
    assert.equal(r.resultados[0].resultado, "quarentena");
    await processarEventoResend(evento(id, inventado), "evt_q", depsFalsas(new Map()));
    const { data: q } = await admin.from("comunicacoes_nao_associadas").select("motivo, destinatarios").eq("provider_message_id", id);
    assert.deepEqual(q, [{ motivo: "endereco_inexistente", destinatarios: [inventado] }]);
    const { count } = await admin.from("casos_comunicacoes_recebidas").select("id", { count: "exact", head: true }).eq("caso_id", c.casoId);
    assert.equal(count, 0);
    const { data: caso } = await admin.from("casos").select("status").eq("id", c.casoId).single();
    assert.equal(caso.status, "Aguardando operador");
  });

  test("12/13. ANALISE_RESPOSTA_IA_ATIVO: com 0 não chama a IA; com 1 gera a análise (modelo substituído)", async () => {
    const c = await casoEnviado();
    const id = randomUUID();
    await processarEventoResend(evento(id, c.endereco), null, depsFalsas(new Map([[id, email(id, c.endereco)]])));
    const { data: com } = await admin.from("casos_comunicacoes_recebidas").select("id").eq("provider_message_id", id).single();

    process.env.ANALISE_RESPOSTA_IA_ATIVO = "0";
    assert.deepEqual(await gerarAnaliseIA(com.id, { origem: "automatico", adminId: null }), { estado: "desativado" });
    const { count: nenhuma } = await admin.from("casos_analises_ia").select("id", { count: "exact", head: true }).eq("comunicacao_id", com.id);
    assert.equal(nenhuma, 0);

    process.env.ANALISE_RESPOSTA_IA_ATIVO = "1";
    const resposta = {
      tipo_mensagem: "resposta_negativa", resumo: "Recusa.", respondeu_ao_pedido: "nao", resultado_aparente: "Recusa.", aceite: [], recusado: ["Reembolso"],
      fundamentacao_empresa: [], pontos_nao_respondidos: [], contradicoes_ou_problemas: [], informacao_necessaria: [],
      proximo_passo_sugerido: "preparar_nova_resposta", proximo_passo_explicacao: "Contestar.", requer_intervencao_cliente: false,
      requer_nova_resposta: true, confianca: "medium", avisos: [],
    };
    const deps = {
      ...criarDependenciasAnalise(),
      chamarModelo: async () => ({ ok: true, bruto: resposta, uso: { modelo: "claude-opus-5-5", tokensEntrada: 10, tokensSaida: 10, custoUsd: 0.0002, latenciaMs: 1, requestId: null } }),
    };
    const r = await gerarAnalise(com.id, { origem: "automatico", adminId: null }, deps);
    assert.equal(r.estado, "gerado");
    const { data: a } = await admin.from("casos_analises_ia").select("estado, resposta").eq("comunicacao_id", com.id).single();
    assert.equal(a.estado, "gerado");
    assert.equal(a.resposta.tipo_mensagem, "resposta_negativa");
    // A IA não decide: a mensagem continua por analisar e o caso em análise.
    const { data: depois } = await admin.from("casos_comunicacoes_recebidas").select("estado_analise").eq("id", com.id).single();
    assert.equal(depois.estado_analise, "por_analisar");
    delete process.env.ANALISE_RESPOSTA_IA_ATIVO;
  });

  test("RLS com sessões reais: o cliente vê o estado e a cronologia, nunca mensagens (nem as de outro cliente)", async () => {
    const a = await casoEnviado();
    const b = await casoEnviado();
    const id = randomUUID();
    await processarEventoResend(evento(id, a.endereco), null, depsFalsas(new Map([[id, email(id, a.endereco)]])));
    const sa = await sessao(a);
    const sb = await sessao(b);
    for (const s of [sa, sb]) {
      const { data: msgs } = await s.from("casos_comunicacoes_recebidas").select("id");
      assert.deepEqual(msgs ?? [], []);
      const { data: ends } = await s.from("casos_enderecos_resposta").select("local_part");
      assert.deepEqual(ends ?? [], []);
      const { data: quar } = await s.from("comunicacoes_nao_associadas").select("id");
      assert.deepEqual(quar ?? [], []);
    }
    const { data: casoA } = await sa.from("casos").select("status").eq("id", a.casoId).single();
    assert.equal(casoA.status, "Resposta em análise");
    const { data: eventosA } = await sa.from("casos_eventos").select("tipo").eq("caso_id", a.casoId);
    assert.ok(eventosA.some((e) => e.tipo === "em_analise_dolado"));
    const { data: casoAporB } = await sb.from("casos").select("id").eq("id", a.casoId);
    assert.deepEqual(casoAporB, []);
    const { data: eventosAporB } = await sb.from("casos_eventos").select("tipo").eq("caso_id", a.casoId);
    assert.deepEqual(eventosAporB, []);
    // Manipulação do id do caso: o cliente não chama as funções nem muda o estado.
    const { error: erroRpc } = await sb.rpc("caso_confirmar_resolucao", { p_caso_id: a.casoId, p_utilizador: b.userId, p_resolvido: true, p_admin: null });
    assert.ok(erroRpc);
    await sa.from("casos").update({ status: "Resolvido" }).eq("id", a.casoId);
    const { data: depois } = await admin.from("casos").select("status").eq("id", a.casoId).single();
    assert.equal(depois.status, "Resposta em análise");
    // Ficheiros: o cliente não lê o bucket das comunicações.
    const { data: lista } = await sa.storage.from("comunicacoes-casos").list(a.casoId);
    assert.deepEqual(lista ?? [], []);
  });
});
