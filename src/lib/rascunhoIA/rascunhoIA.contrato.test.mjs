// Sugestão do texto pela IA contra a Supabase REAL — `npm run test:contrato`.
//
// Corre o fluxo real (gerarRascunho + criarDependenciasRascunho: PostgREST,
// funções e triggers das migrations) com o modelo substituído por uma
// resposta fixa — a Claude API nunca é chamada. O caso "API indisponível"
// usa a chamada real sem ANTHROPIC_API_KEY. O envio ao cliente usa o mesmo
// código do botão "Enviar ao cliente para revisão" (emitirLinksEEnviarEmail).
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

let admin;
let gerarRascunho;
let criarDependenciasRascunho;
let emitirLinksEEnviarEmail;
let hashConteudo;

const TEXTO =
  "[NOME DO CLIENTE], NIF [NIF].\n\nAssunto: Reclamação — aumento da mensalidade.\n\n" +
  "Venho apresentar reclamação pelo aumento da mensalidade de 30 € para 36 € a partir de setembro de 2026, " +
  "sem comunicação prévia de que tenha conhecimento. Solicito esclarecimento e a reposição do valor anterior.";

function modeloFixo(capturas, resposta = {}) {
  return async (pedido) => {
    capturas.push(pedido);
    return {
      ok: true,
      bruto: { draft: TEXTO, legal_basis: [], missing_information: ["Data de contratação não identificada."], warnings: [], confidence: "medium", ...resposta },
      uso: { modelo: "claude-opus-5-5", tokensEntrada: 1200, tokensSaida: 800, custoUsd: 0.0208, latenciaMs: 5, requestId: `req_${randomUUID()}` },
    };
  };
}

async function criarCaso() {
  const email = `rascunho-${randomUUID()}@teste.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: randomUUID() });
  if (error) throw error;
  const userId = data.user.id;
  const { data: caso, error: e } = await admin
    .from("casos")
    .insert({
      utilizador_id: userId,
      nome: "Joana Pereira Teste",
      email,
      telefone: "912345678",
      sector: "Telecomunicações",
      empresa: "Operadora Contrato",
      problema_tipo: "Aumento de mensalidade",
      descricao: "Sou a Joana Pereira (joana@exemplo.pt). A mensalidade subiu de 30 € para 36 € em setembro.",
      momento_cliente: "Ainda não reclamei",
      status: "Novo",
    })
    .select("id")
    .single();
  if (e) throw e;
  return { casoId: caso.id, userId };
}

describe("sugestão do texto pela IA (Supabase real)", { skip: !ATIVO && "só com npm run test:contrato" }, () => {
  before(async () => {
    // Nunca chamar a API real nestes testes.
    delete process.env.ANTHROPIC_API_KEY;
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    ({ gerarRascunho } = await import("@/lib/rascunhoIA/gerar"));
    ({ criarDependenciasRascunho } = await import("@/lib/rascunhoIA/servidor"));
    ({ emitirLinksEEnviarEmail } = await import("@/lib/textoCasoServidor"));
    ({ hashConteudo } = await import("@/lib/textoCasoTokens"));
  });

  const deps = (extra = {}) => ({ ...criarDependenciasRascunho(), ativo: () => true, ...extra });

  test("1/9/10. caso normal: rascunho por rever no texto do caso, nada enviado nem aprovado", async () => {
    const { casoId } = await criarCaso();
    const capturas = [];
    const r = await gerarRascunho(casoId, { origem: "automatico", adminId: null }, deps({ chamarModelo: modeloFixo(capturas) }));
    assert.equal(r.estado, "gerado");
    assert.equal(r.aplicacao, "aplicado");

    // Contexto sem dados pessoais desnecessários.
    const mensagem = capturas[0].mensagem;
    for (const proibido of ["Joana", "Pereira", "joana@exemplo.pt", "912345678", "@teste.invalid"]) {
      assert.ok(!mensagem.includes(proibido), `a IA não recebe ${proibido}`);
    }
    assert.ok(mensagem.includes("Operadora Contrato"));

    const { data: geracao } = await admin.from("casos_rascunhos_ia").select("*").eq("id", r.geracaoId).single();
    assert.equal(geracao.estado, "gerado");
    assert.equal(geracao.modelo, "claude-opus-5-5");
    assert.equal(geracao.prompt_versao, "reclamacao_v2");
    assert.match(geracao.contexto_sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(geracao.resposta.missing_information, ["Data de contratação não identificada."]);

    const { data: textos } = await admin.from("casos_textos").select("*").eq("caso_id", casoId);
    assert.equal(textos.length, 1);
    assert.deepEqual([textos[0].estado, textos[0].origem, textos[0].revisto_em, textos[0].conteudo], ["rascunho", "ia", null, TEXTO]);
    const { count: links } = await admin.from("casos_textos_links").select("id", { count: "exact", head: true }).eq("caso_id", casoId);
    const { count: eventos } = await admin.from("casos_eventos").select("id", { count: "exact", head: true }).eq("caso_id", casoId);
    assert.equal(links, 0, "nenhum link enviado ao cliente");
    assert.equal(eventos, 0, "nada no histórico do cliente");

    const { data: uso } = await admin.from("uso_api_claude").select("funcionalidade").eq("request_id", geracao.request_id);
    assert.deepEqual(uso, [{ funcionalidade: "rascunho_reclamacao" }], "custo conta para o orçamento partilhado");

    // 10. O botão "Enviar ao cliente" é recusado pela base de dados antes da revisão.
    await assert.rejects(emitirLinksEEnviarEmail(textos[0].id));

    // Depois da revisão humana, segue o fluxo normal (o e-mail falha sem Brevo — não importa aqui).
    const { data: revisao } = await admin.rpc("texto_marcar_revisto", {
      p_texto_id: textos[0].id,
      p_conteudo_sha256: hashConteudo(TEXTO),
      p_admin: null,
    });
    assert.equal(revisao.resultado, "invalido", "revisão exige uma pessoa identificada");
  });

  test("2. API indisponível (sem chave): o caso fica intacto e o texto é preparado à mão", async () => {
    const { casoId } = await criarCaso();
    const r = await gerarRascunho(casoId, { origem: "automatico", adminId: null }, deps());
    assert.deepEqual([r.estado, r.motivo], ["falhou", "api_nao_configurada"]);
    const { data: caso } = await admin.from("casos").select("id, status").eq("id", casoId).single();
    assert.equal(caso.status, "Novo");
    const { count } = await admin.from("casos_textos").select("id", { count: "exact", head: true }).eq("caso_id", casoId);
    assert.equal(count, 0);
    const { data: g } = await admin.from("casos_rascunhos_ia").select("estado, erro").eq("caso_id", casoId).single();
    assert.deepEqual(g, { estado: "falhou", erro: "api_nao_configurada" });
    // A automática não se repete (ex.: reenvio do webhook); o admin pode tentar de novo.
    assert.deepEqual(await gerarRascunho(casoId, { origem: "automatico", adminId: null }, deps()), { estado: "ignorado" });
  });

  test("8. regenerar não destrói a edição humana", async () => {
    const { casoId } = await criarCaso();
    await gerarRascunho(casoId, { origem: "automatico", adminId: null }, deps({ chamarModelo: modeloFixo([]) }));
    const editado = `${TEXTO}\n\nCom os melhores cumprimentos.`;
    const { error } = await admin.rpc("texto_guardar", { p_caso_id: casoId, p_conteudo: editado, p_admin: null });
    assert.equal(error, null);

    const r = await gerarRascunho(casoId, { origem: "manual", adminId: null }, deps({ chamarModelo: modeloFixo([], { draft: `${TEXTO} Nova versão sugerida.` }) }));
    assert.equal(r.aplicacao, "requer_confirmacao");
    const { data: textos } = await admin.from("casos_textos").select("versao, conteudo").eq("caso_id", casoId);
    assert.deepEqual(textos, [{ versao: 1, conteudo: editado }]);
  });

  test("6. regra não fornecida: nada chega ao texto do caso", async () => {
    const { casoId } = await criarCaso();
    const r = await gerarRascunho(
      casoId,
      { origem: "automatico", adminId: null },
      deps({ chamarModelo: modeloFixo([], { legal_basis: [{ rule_id: "INVENTADA-01", reason: "x" }] }) }),
    );
    assert.deepEqual([r.estado, r.motivo], ["falhou", "regra_nao_fornecida"]);
    const { count } = await admin.from("casos_textos").select("id", { count: "exact", head: true }).eq("caso_id", casoId);
    assert.equal(count, 0);
  });
});
