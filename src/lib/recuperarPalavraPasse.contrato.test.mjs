// Recuperação da palavra-passe contra a Supabase Auth REAL — `npm run test:contrato`
// (stack local; scripts/test-contrato.mjs recusa qualquer endereço que não seja local).
//
// Prova o mecanismo usado por /redefinir-palavra-passe: o token_hash do
// e-mail (aqui gerado por generateLink, como o {{ .TokenHash }} do template)
// abre uma sessão de recuperação com verifyOtp, a palavra-passe muda, a
// ligação deixa de servir e a conta entra logo com a nova palavra-passe.
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

let admin;
let novoCliente;
let regras;
let mensagemErroConta;

describe("recuperação da palavra-passe (Supabase Auth real)", { skip: !ATIVO && "só em npm run test:contrato" }, () => {
  before(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    assert.ok(process.env.CONTRATO_ANON_KEY, "chave anon local em falta");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Mesmo fluxo do cliente do servidor (@supabase/ssr usa PKCE).
    novoCliente = () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, flowType: "pkce" },
      });
    regras = await import("./recuperarPalavraPasse.ts");
    ({ mensagemErroConta } = await import("./mensagensErro.ts"));
  });

  async function contaComPalavraPasse(palavraPasse) {
    const email = `recuperar-${randomUUID()}@contrato.test`;
    const { error } = await admin.auth.admin.createUser({ email, password: palavraPasse, email_confirm: true });
    if (error) throw error;
    return email;
  }

  async function tokenRecuperacao(email) {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error) throw error;
    return data.properties.hashed_token;
  }

  // Percurso real: resetPasswordForEmail com o cliente PKCE (como a Server
  // Action) → e-mail do template supabase/templates/recuperacao.html no
  // Mailpit → token_hash da ligação → verifyOtp noutro cliente (outro
  // dispositivo). O token de um pedido PKCE tem o prefixo pkce_.
  async function ligacaoDoEmail(email, depoisDe) {
    const base = process.env.CONTRATO_MAILPIT_URL;
    for (let i = 0; i < 50; i++) {
      const r = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
      const { messages = [] } = await r.json();
      const nova = messages.find((m) => new Date(m.Created).getTime() >= depoisDe);
      if (nova) {
        const msg = await (await fetch(`${base}/api/v1/message/${nova.ID}`)).json();
        assert.equal(msg.Subject, "Defina uma nova palavra-passe na DoLado");
        const href = msg.HTML.match(/href="([^"]*token_hash=[^"]*)"/)?.[1];
        assert.ok(href, "ligação com token_hash no e-mail");
        return new URL(href.replaceAll("&amp;", "&"));
      }
      await new Promise((ok) => setTimeout(ok, 200));
    }
    throw new Error("e-mail de recuperação não chegou ao Mailpit");
  }

  async function pedirPeloCliente(email) {
    const desde = Date.now() - 1000;
    const { error } = await novoCliente().auth.resetPasswordForEmail(email, {
      redirectTo: "https://portal.dolado.test/redefinir-palavra-passe",
    });
    assert.equal(error, null, error?.message);
    return ligacaoDoEmail(email, desde);
  }

  test("e-mail real: a ligação do template abre a sessão de recuperação noutro dispositivo", { skip: !process.env.CONTRATO_MAILPIT_URL && "sem Mailpit" }, async () => {
    const email = await contaComPalavraPasse("antiga123A");
    const ligacao = await pedirPeloCliente(email);
    const token = ligacao.searchParams.get("token_hash");
    assert.ok(regras.tokenRecuperacaoComFormatoValido(token), `formato: ${token?.slice(0, 8)}…`);

    const outroDispositivo = novoCliente();
    const { error } = await outroDispositivo.auth.verifyOtp({ type: "recovery", token_hash: token });
    assert.equal(error, null, error?.message);
    assert.equal((await outroDispositivo.auth.updateUser({ password: "novaSenha2026" })).error, null);
    assert.equal((await novoCliente().auth.signInWithPassword({ email, password: "novaSenha2026" })).error, null);
  });

  test("e-mail real: depois de um segundo pedido, só a ligação do e-mail mais recente funciona", { skip: !process.env.CONTRATO_MAILPIT_URL && "sem Mailpit" }, async () => {
    const email = await contaComPalavraPasse("antiga123A");
    const primeira = (await pedirPeloCliente(email)).searchParams.get("token_hash");
    await new Promise((ok) => setTimeout(ok, 1100)); // limite local: 1 e-mail por segundo por conta
    const segunda = (await pedirPeloCliente(email)).searchParams.get("token_hash");

    const antiga = await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: primeira });
    assert.ok(antiga.error, "a ligação do primeiro e-mail deixa de servir");
    assert.equal(regras.estadoLigacaoDoErro(antiga.error.code, antiga.error.message), "expirada");
    assert.equal((await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: segunda })).error, null);
  });

  test("pedido para um e-mail sem conta: sem erro (a Supabase não revela se a conta existe)", async () => {
    const { error } = await novoCliente().auth.resetPasswordForEmail(`inexistente-${randomUUID()}@contrato.test`, {
      redirectTo: "https://portal.dolado.test/redefinir-palavra-passe",
    });
    assert.equal(error, null, error?.message);
  });

  test("token_hash → nova palavra-passe → entra logo com ela; a antiga deixa de servir", async () => {
    const email = await contaComPalavraPasse("antiga123A");
    const token = await tokenRecuperacao(email);
    assert.ok(regras.tokenRecuperacaoComFormatoValido(token), `formato do token_hash: ${token.slice(0, 8)}…`);

    const cliente = novoCliente();
    const { error: erroOtp } = await cliente.auth.verifyOtp({ type: "recovery", token_hash: token });
    assert.equal(erroOtp, null, erroOtp?.message);
    const { error: erroAlterar } = await cliente.auth.updateUser({ password: "novaSenha2026" });
    assert.equal(erroAlterar, null, erroAlterar?.message);
    await cliente.auth.signOut({ scope: "global" });

    const antiga = await novoCliente().auth.signInWithPassword({ email, password: "antiga123A" });
    assert.ok(antiga.error, "a palavra-passe antiga já não entra");
    assert.equal(mensagemErroConta(antiga.error.code, antiga.error.message), "E-mail ou palavra-passe incorretos.");
    const nova = await novoCliente().auth.signInWithPassword({ email, password: "novaSenha2026" });
    assert.equal(nova.error, null, nova.error?.message);
  });

  test("ligação já usada ou inválida: recusada, sem sessão", async () => {
    const email = await contaComPalavraPasse("antiga123A");
    const token = await tokenRecuperacao(email);
    assert.equal((await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: token })).error, null);

    const repetida = await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: token });
    assert.ok(repetida.error, "a mesma ligação não serve duas vezes");
    assert.ok(regras.estadoLigacaoValido(regras.estadoLigacaoDoErro(repetida.error.code, repetida.error.message)));

    const inventada = await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: "0".repeat(56) });
    assert.ok(inventada.error, "token inventado recusado");
    assert.equal(inventada.data.session, null);
  });

  test("um novo pedido substitui a ligação anterior", async () => {
    const email = await contaComPalavraPasse("antiga123A");
    const primeira = await tokenRecuperacao(email);
    const segunda = await tokenRecuperacao(email);
    assert.notEqual(primeira, segunda);
    assert.ok((await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: primeira })).error, "a ligação antiga deixa de servir");
    assert.equal((await novoCliente().auth.verifyOtp({ type: "recovery", token_hash: segunda })).error, null);
  });

  test("palavra-passe recusada pela Supabase depois de validar a ligação: mensagem em português e a sessão continua", async () => {
    const email = await contaComPalavraPasse("antiga123A");
    const cliente = novoCliente();
    assert.equal((await cliente.auth.verifyOtp({ type: "recovery", token_hash: await tokenRecuperacao(email) })).error, null);

    const curta = await cliente.auth.updateUser({ password: "a1" });
    assert.ok(curta.error, "a Supabase recusa a palavra-passe curta");
    assert.match(mensagemErroConta(curta.error.code, curta.error.message), /requisitos/);

    const igual = await cliente.auth.updateUser({ password: "antiga123A" });
    assert.ok(igual.error);
    assert.equal(mensagemErroConta(igual.error.code, igual.error.message), "A nova palavra-passe tem de ser diferente da atual.");

    // Nova tentativa na mesma sessão (?continuar=1), sem nova ligação.
    assert.equal((await cliente.auth.updateUser({ password: "outraSenha77" })).error, null);
  });
});
