// Links de revisão do texto contra a Supabase REAL — `npm run test:contrato`
// (scripts/test-contrato.mjs recria a base local a partir das migrations).
//
// Corre o código real do servidor: `consultarLink` (o que as páginas
// /texto/rever e /texto/alterar chamam no GET) e as Server Actions
// `autorizarPorLink` / `pedirAlteracoesPorLink` (o POST dos botões), pelo
// PostgREST, com uma transação por pedido — por isso os pedidos em paralelo
// são concorrência real, ao contrário do pgTAP (uma só transação).
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

let admin;
let consultarLink;
let autorizarPorLink;
let pedirAlteracoesPorLink;
let gerarToken;
let hashToken;
let hashConteudo;

const INICIAL = { resultado: null };

function form(campos) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}
const autorizar = (token) => autorizarPorLink(INICIAL, form({ token }));
const pedirAlteracoes = (token, mensagem) => pedirAlteracoesPorLink(INICIAL, form({ token, mensagem }));

/** Caso com conta e uma versão à espera de aprovação; devolve os tokens puros (como no e-mail). */
async function casoComTexto({ conteudo = "Texto v1", expiraEm = new Date(Date.now() + 14 * 864e5) } = {}) {
  const email = `texto-${randomUUID()}@teste.invalid`;
  const { data: conta, error: erroConta } = await admin.auth.admin.createUser({ email, email_confirm: true, password: randomUUID() });
  if (erroConta) throw erroConta;
  const casoId = randomUUID();
  const { error: erroCaso } = await admin
    .from("casos")
    .insert({ id: casoId, utilizador_id: conta.user.id, nome: "Cliente", email, descricao: "caso", empresa: "Operadora X", status: "Em investigação" });
  if (erroCaso) throw erroCaso;
  const textoId = await novaVersao(casoId, conteudo);
  const tokens = await emitir(textoId, expiraEm);
  return { casoId, textoId, utilizadorId: conta.user.id, ...tokens };
}

async function novaVersao(casoId, conteudo) {
  const { data, error } = await admin.rpc("texto_guardar", { p_caso_id: casoId, p_conteudo: conteudo, p_admin: null });
  if (error) throw error;
  return data;
}

async function emitir(textoId, expiraEm = new Date(Date.now() + 14 * 864e5)) {
  const rever = gerarToken();
  const alterar = gerarToken();
  const { error } = await admin.rpc("texto_emitir_links", {
    p_texto_id: textoId,
    p_hash_rever: hashToken(rever),
    p_hash_alterar: hashToken(alterar),
    p_expira_em: expiraEm.toISOString(),
  });
  if (error) throw error;
  return { rever, alterar };
}

/** Tudo o que uma decisão do cliente poderia mudar, para comparar antes/depois. */
async function retrato(casoId) {
  const [texto, autorizacoes, pedidos, links, eventos, caso] = await Promise.all([
    admin.from("casos_textos").select("id, versao, estado, autorizado_em, alteracoes_solicitadas_em").eq("caso_id", casoId).order("versao"),
    admin.from("casos_textos_autorizacoes").select("id, texto_id, conteudo_sha256, metodo, link_id").eq("caso_id", casoId),
    admin.from("casos_textos_pedidos_alteracao").select("id").eq("caso_id", casoId),
    admin.from("casos_textos_links").select("id, usado_em, invalidado_em").eq("caso_id", casoId).order("created_at"),
    admin.from("casos_eventos").select("tipo").eq("caso_id", casoId).order("created_at"),
    admin.from("casos").select("status, data_envio_reclamacao").eq("id", casoId).single(),
  ]);
  return {
    textos: texto.data,
    autorizacoes: autorizacoes.data,
    pedidos: pedidos.data,
    links: links.data,
    eventos: eventos.data.map((e) => e.tipo),
    caso: caso.data,
  };
}

/** Outro token válido no formato, com um carácter trocado. */
function adulterar(token) {
  const i = Math.floor(token.length / 2);
  return token.slice(0, i) + (token[i] === "A" ? "B" : "A") + token.slice(i + 1);
}

describe("links de revisão do texto (contrato)", { skip: !ATIVO && "só em npm run test:contrato" }, () => {
  before(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    ({ consultarLink } = await import("@/lib/textoCasoServidor"));
    ({ autorizarPorLink, pedirAlteracoesPorLink } = await import("@/app/[idioma]/texto/actions"));
    ({ gerarToken, hashToken, hashConteudo } = await import("@/lib/textoCasoTokens"));
  });

  test("1/2/11. scanner de e-mail: abrir os dois links (GET) várias vezes não decide nada", async () => {
    const c = await casoComTexto();
    const antes = await retrato(c.casoId);

    for (let i = 0; i < 5; i++) {
      const rever = await consultarLink(c.rever, "rever_autorizar");
      const alterar = await consultarLink(c.alterar, "pedir_alteracoes");
      assert.equal(rever.situacao, "valido");
      assert.equal(rever.conteudo, "Texto v1", "a página mostra o texto exato da versão");
      assert.equal(alterar.situacao, "valido");
    }
    // Pedidos em paralelo, como um gateway que visita todos os links de uma vez.
    await Promise.all(Array.from({ length: 6 }, (_, i) => consultarLink(i % 2 ? c.rever : c.alterar, i % 2 ? "rever_autorizar" : "pedir_alteracoes")));

    const depois = await retrato(c.casoId);
    assert.deepEqual(depois, antes, "nada mudou: estado, autorizações, pedidos, links e histórico");
    assert.equal(depois.textos[0].estado, "aguardando_aprovacao");
    assert.equal(depois.autorizacoes.length, 0);
    assert.equal(depois.pedidos.length, 0);
    assert.ok(depois.links.every((l) => l.usado_em === null), "os links não são consumidos pela visualização");
  });

  test("3. POST válido regista a autorização, presa ao cliente, ao caso, à versão e ao hash", async () => {
    const c = await casoComTexto({ conteudo: "Texto a autorizar" });
    const r = await autorizar(c.rever);
    assert.equal(r.resultado, "autorizado");
    assert.ok(r.autorizadoEm);

    const { data: a } = await admin.from("casos_textos_autorizacoes").select("*").eq("caso_id", c.casoId).single();
    assert.equal(a.texto_id, c.textoId);
    assert.equal(a.conteudo_sha256, hashConteudo("Texto a autorizar"));
    assert.equal(a.utilizador_id, c.utilizadorId);
    assert.equal(a.metodo, "link_seguro");
    assert.ok(a.link_id, "guarda o link usado");
    assert.ok(a.autorizado_em);

    const s = await retrato(c.casoId);
    assert.equal(s.textos[0].estado, "autorizado");
    assert.deepEqual(s.eventos.filter((e) => e === "texto_autorizado"), ["texto_autorizado"]);
    assert.equal((await consultarLink(c.rever, "rever_autorizar")).situacao, "ja_autorizado", "voltar ao link mostra o estado, sem ações");
  });

  test("4. POST repetido é idempotente: \"já autorizado\", sem duplicar", async () => {
    const c = await casoComTexto();
    assert.equal((await autorizar(c.rever)).resultado, "autorizado");
    const antes = await retrato(c.casoId);
    for (let i = 0; i < 3; i++) {
      const r = await autorizar(c.rever);
      assert.equal(r.resultado, "ja_autorizado");
      assert.ok(r.autorizadoEm, "mostra quando foi autorizado");
    }
    assert.deepEqual(await retrato(c.casoId), antes);
  });

  test("5. dez POST simultâneos: uma única autorização e um único evento", async () => {
    const c = await casoComTexto();
    const resultados = await Promise.all(Array.from({ length: 10 }, () => autorizar(c.rever)));
    const contagem = resultados.reduce((m, r) => ({ ...m, [r.resultado]: (m[r.resultado] ?? 0) + 1 }), {});
    assert.deepEqual(contagem, { autorizado: 1, ja_autorizado: 9 });

    const s = await retrato(c.casoId);
    assert.equal(s.autorizacoes.length, 1);
    assert.equal(s.eventos.filter((e) => e === "texto_autorizado").length, 1);
    assert.equal(s.textos[0].estado, "autorizado");
  });

  // Antes de 20261004120000_texto_links_ordem_bloqueios.sql dava deadlock: um
  // dos clientes via "erro".
  test("5. autorizar e pedir alterações ao mesmo tempo: só uma decisão, sem erros", async () => {
    for (let i = 0; i < 10; i++) {
      const c = await casoComTexto();
      const [a, p] = await Promise.all([autorizar(c.rever), pedirAlteracoes(c.alterar, "Corrijam a data.")]);
      const s = await retrato(c.casoId);
      const ganhou = a.resultado === "autorizado" ? "autorizado" : "alteracoes_solicitadas";
      assert.ok(
        (a.resultado === "autorizado" && p.resultado === "ja_autorizado") ||
          (p.resultado === "pedido_registado" && a.resultado === "alteracoes_pedidas"),
        `resultados coerentes: ${a.resultado} / ${p.resultado}`,
      );
      assert.equal(s.textos[0].estado, ganhou);
      assert.equal(s.autorizacoes.length + s.pedidos.length, 1, "nunca as duas decisões");
    }
  });

  test("6. link expirado: a página não mostra o texto e o POST não autoriza", async () => {
    const c = await casoComTexto({ expiraEm: new Date(Date.now() + 1500) });
    await new Promise((r) => setTimeout(r, 2500));
    const pagina = await consultarLink(c.rever, "rever_autorizar");
    assert.equal(pagina.situacao, "expirado");
    assert.equal(pagina.conteudo ?? null, null);
    assert.equal((await autorizar(c.rever)).resultado, "expirado");
    assert.equal((await pedirAlteracoes(c.alterar, "x")).resultado, "expirado");
    const s = await retrato(c.casoId);
    assert.equal(s.autorizacoes.length + s.pedidos.length, 0);
    assert.equal(s.textos[0].estado, "aguardando_aprovacao");
  });

  test("7. token adulterado ou mal formado: não revela dados e não autoriza", async () => {
    const c = await casoComTexto();
    for (const falso of [adulterar(c.rever), `${c.rever}x`, "abc", "", "../../etc", c.rever.toUpperCase()]) {
      const pagina = await consultarLink(falso, "rever_autorizar");
      assert.deepEqual(pagina, { situacao: "invalido" }, `sem dados do caso para ${JSON.stringify(falso)}`);
      assert.equal((await autorizar(falso)).resultado, "invalido");
      assert.equal((await pedirAlteracoes(falso, "x")).resultado, "invalido");
    }
    // O link de alterações não autoriza e o de autorização não pede alterações.
    assert.deepEqual(await consultarLink(c.alterar, "rever_autorizar"), { situacao: "invalido" });
    assert.equal((await autorizar(c.alterar)).resultado, "invalido");
    assert.equal((await pedirAlteracoes(c.rever, "x")).resultado, "invalido");
    assert.equal((await retrato(c.casoId)).textos[0].estado, "aguardando_aprovacao");
  });

  test("8. o token de um caso só age sobre esse caso", async () => {
    const a = await casoComTexto({ conteudo: "Texto do caso A" });
    const b = await casoComTexto({ conteudo: "Texto do caso B" });
    const antesB = await retrato(b.casoId);

    assert.equal((await consultarLink(a.rever, "rever_autorizar")).conteudo, "Texto do caso A", "o link de A nunca mostra o texto de B");
    assert.equal((await autorizar(a.rever)).resultado, "autorizado");
    assert.deepEqual(await retrato(b.casoId), antesB, "o caso B fica exatamente como estava");
    assert.equal((await consultarLink(b.rever, "rever_autorizar")).situacao, "valido");

    const { data } = await admin.from("casos_textos_autorizacoes").select("caso_id, texto_id").eq("texto_id", a.textoId).single();
    assert.equal(data.caso_id, a.casoId);
  });

  test("9. autorização da versão N não serve para enviar nem autorizar a versão N+1", async () => {
    const c = await casoComTexto({ conteudo: "Versão 1" });
    assert.equal((await autorizar(c.rever)).resultado, "autorizado");

    const v2 = await novaVersao(c.casoId, "Versão 2 alterada");
    const envioV2 = await admin.rpc("texto_registar_envio", {
      p_texto_id: v2, p_conteudo_sha256: hashConteudo("Versão 2 alterada"), p_destinatario: "Operadora X", p_canal: "email", p_resultado: null, p_admin: null,
    });
    assert.equal(envioV2.data.resultado, "nao_autorizado", "a versão 2 não herda a autorização da 1");
    const envioV1 = await admin.rpc("texto_registar_envio", {
      p_texto_id: c.textoId, p_conteudo_sha256: hashConteudo("Versão 1"), p_destinatario: "Operadora X", p_canal: "email", p_resultado: null, p_admin: null,
    });
    assert.equal(envioV1.data.resultado, "versao_antiga", "a versão 1 autorizada já não pode ser enviada");

    // Os links da versão 1 não autorizam a versão 2.
    const t2 = await emitir(v2);
    assert.equal((await consultarLink(c.rever, "rever_autorizar")).situacao, "versao_antiga");
    assert.equal((await autorizar(c.rever)).resultado, "versao_antiga");
    const s = await retrato(c.casoId);
    assert.equal(s.textos[1].estado, "aguardando_aprovacao");
    assert.equal(s.autorizacoes.length, 1);

    assert.equal((await autorizar(t2.rever)).resultado, "autorizado", "a versão 2 precisa de uma autorização própria");
  });

  test("10. \"Pedir alterações\" só com a ação explícita e com mensagem", async () => {
    const c = await casoComTexto();
    await consultarLink(c.alterar, "pedir_alteracoes");
    assert.equal((await retrato(c.casoId)).pedidos.length, 0, "abrir a página não pede alterações");
    assert.equal((await pedirAlteracoes(c.alterar, "   ")).resultado, "mensagem_invalida");
    assert.equal((await retrato(c.casoId)).pedidos.length, 0);

    assert.equal((await pedirAlteracoes(c.alterar, "Corrijam a data do contrato.")).resultado, "pedido_registado");
    assert.equal((await pedirAlteracoes(c.alterar, "outra vez")).resultado, "alteracoes_pedidas", "repetir não cria outro pedido");
    const s = await retrato(c.casoId);
    assert.equal(s.pedidos.length, 1);
    assert.equal(s.textos[0].estado, "alteracoes_solicitadas");
    assert.equal((await autorizar(c.rever)).resultado, "alteracoes_pedidas", "depois de pedir alterações, esta versão não pode ser autorizada");
  });

  test("estado especial: reclamação já enviada — os links não permitem mais ações", async () => {
    const c = await casoComTexto({ conteudo: "Texto enviado" });
    await autorizar(c.rever);
    const envio = await admin.rpc("texto_registar_envio", {
      p_texto_id: c.textoId, p_conteudo_sha256: hashConteudo("Texto enviado"), p_destinatario: "Operadora X", p_canal: "email", p_resultado: null, p_admin: null,
    });
    assert.equal(envio.data.resultado, "enviado");
    const antes = await retrato(c.casoId);
    assert.equal((await consultarLink(c.rever, "rever_autorizar")).situacao, "ja_autorizado");
    assert.equal((await consultarLink(c.alterar, "pedir_alteracoes")).situacao, "ja_autorizado");
    assert.equal((await autorizar(c.rever)).resultado, "ja_autorizado");
    assert.equal((await pedirAlteracoes(c.alterar, "afinal…")).resultado, "ja_autorizado");
    assert.deepEqual(await retrato(c.casoId), antes);
  });
});
