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
