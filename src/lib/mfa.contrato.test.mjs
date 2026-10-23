// MFA (TOTP) contra a Supabase Auth REAL — `npm run test:contrato` (stack
// local; scripts/test-contrato.mjs recusa qualquer endereço que não seja local).
// Exige [auth.mfa.totp] activo em supabase/config.toml.
//
// Prova o que a Fase 1A precisa antes de a Fase 1B exigir aal2: inscrição do
// factor principal e do de reserva, sessão aal2 no JWT, nova sessão aal1 com
// próximo nível aal2, insufficient_aal ao inscrever com aal1, verificação com
// a reserva, retirada de um factor e a recuperação de último recurso (apagar
// os factores com a service role, como no SQL Editor do Dashboard).
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const PASSO_S = 30;

// RFC 6238 (SHA-1, 6 dígitos, 30 s) — o que as aplicações de autenticação fazem.
function base32(segredo) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of segredo.replace(/=+$/, "").toUpperCase()) bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codigoTotp(segredo, instante = Date.now()) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(instante / 1000 / PASSO_S)));
  const hmac = createHmac("sha1", base32(segredo)).update(contador).digest();
  const desvio = hmac[hmac.length - 1] & 0xf;
  const valor = (hmac.readUInt32BE(desvio) & 0x7fffffff) % 1_000_000;
  return String(valor).padStart(6, "0");
}

/** Um código TOTP não deve ser usado duas vezes na mesma janela: espera pela seguinte. */
async function esperarProximaJanela() {
  const resto = PASSO_S * 1000 - (Date.now() % (PASSO_S * 1000));
  await new Promise((r) => setTimeout(r, resto + 1000));
}

function aalDoToken(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")).aal;
}

let admin;
let novoCliente;

describe("MFA TOTP (Supabase Auth real)", { skip: !ATIVO && "só em npm run test:contrato", timeout: 180_000 }, () => {
  before(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    assert.ok(process.env.CONTRATO_ANON_KEY, "chave anon local em falta");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    novoCliente = () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, flowType: "pkce" },
      });
  });

  async function entrar(email, palavraPasse) {
    const cliente = novoCliente();
    const { error } = await cliente.auth.signInWithPassword({ email, password: palavraPasse });
    if (error) throw error;
    return cliente;
  }

  async function nivel(cliente) {
    const { data, error } = await cliente.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
  }

  test("principal + reserva, aal2, recuperação", async () => {
    const email = `mfa-${randomUUID()}@contrato.test`;
    const palavraPasse = `Mfa-${randomUUID()}`;
    const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({ email, password: palavraPasse, email_confirm: true });
    if (erroCriar) throw erroCriar;
    const userId = criado.user.id;

    // 1. Sem factores: aal1 e próximo nível aal1.
    const c1 = await entrar(email, palavraPasse);
    assert.deepEqual(
      { atual: (await nivel(c1)).currentLevel, proximo: (await nivel(c1)).nextLevel },
      { atual: "aal1", proximo: "aal1" },
    );

    // 2. Principal: inscrição + verificação → sessão aal2 (também no JWT).
    const { data: principal, error: e1 } = await c1.auth.mfa.enroll({ factorType: "totp", friendlyName: "Principal", issuer: "DoLado" });
    if (e1) throw e1;
    assert.match(principal.totp.qr_code, /^data:image\/svg\+xml/);
    const { error: v1 } = await c1.auth.mfa.challengeAndVerify({ factorId: principal.id, code: codigoTotp(principal.totp.secret) });
    if (v1) throw v1;
    assert.equal((await nivel(c1)).currentLevel, "aal2");
    const { data: sessao1 } = await c1.auth.getSession();
    assert.equal(aalDoToken(sessao1.session.access_token), "aal2");

    // 3. Reserva: inscrita com a sessão aal2.
    const { data: reserva, error: e2 } = await c1.auth.mfa.enroll({ factorType: "totp", friendlyName: "Reserva", issuer: "DoLado" });
    if (e2) throw e2;
    const { error: v2 } = await c1.auth.mfa.challengeAndVerify({ factorId: reserva.id, code: codigoTotp(reserva.totp.secret) });
    if (v2) throw v2;
    const { data: lista } = await c1.auth.mfa.listFactors();
    assert.deepEqual(
      lista.totp.filter((f) => f.status === "verified").map((f) => f.friendly_name).sort(),
      ["Principal", "Reserva"],
    );

    // 4. Nova sessão (outro dispositivo): aal1 com próximo nível aal2; inscrever
    // com aal1 é recusado (insufficient_aal) — a regra que podeInscrever() espelha.
    const c2 = await entrar(email, palavraPasse);
    assert.deepEqual(
      { atual: (await nivel(c2)).currentLevel, proximo: (await nivel(c2)).nextLevel },
      { atual: "aal1", proximo: "aal2" },
    );
    const { error: semAal2 } = await c2.auth.mfa.enroll({ factorType: "totp", friendlyName: "Intruso", issuer: "DoLado" });
    assert.ok(semAal2, "inscrever com aal1 devia ser recusado");
    assert.equal(semAal2.code, "insufficient_aal");

    // 5. Perdeu o principal (caso 1): entra com a reserva e retira o principal.
    await esperarProximaJanela();
    const { error: v3 } = await c2.auth.mfa.challengeAndVerify({ factorId: reserva.id, code: codigoTotp(reserva.totp.secret) });
    if (v3) throw v3;
    assert.equal((await nivel(c2)).currentLevel, "aal2");
    const { error: eRetirar } = await c2.auth.mfa.unenroll({ factorId: principal.id });
    if (eRetirar) throw eRetirar;
    const { data: depois } = await c2.auth.mfa.listFactors();
    assert.deepEqual(depois.totp.map((f) => f.friendly_name), ["Reserva"]);

    // 6. Perdeu todos (caso 2): a service role apaga os factores, como o SQL
    // Editor do Dashboard; a conta volta a entrar só com a palavra-passe.
    const { data: restantes } = await admin.auth.admin.mfa.listFactors({ userId });
    for (const f of restantes.factors) {
      const { error } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId });
      if (error) throw error;
    }
    const c3 = await entrar(email, palavraPasse);
    assert.deepEqual(
      { atual: (await nivel(c3)).currentLevel, proximo: (await nivel(c3)).nextLevel },
      { atual: "aal1", proximo: "aal1" },
    );

    await admin.auth.admin.deleteUser(userId);
  });

  test("código errado é recusado e não sobe a sessão", async () => {
    const email = `mfa-${randomUUID()}@contrato.test`;
    const palavraPasse = `Mfa-${randomUUID()}`;
    const { data: criado, error } = await admin.auth.admin.createUser({ email, password: palavraPasse, email_confirm: true });
    if (error) throw error;
    const c = await entrar(email, palavraPasse);
    const { data: factor } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: "Principal", issuer: "DoLado" });
    const certo = codigoTotp(factor.totp.secret);
    const errado = certo === "000000" ? "111111" : "000000";
    const { error: recusa } = await c.auth.mfa.challengeAndVerify({ factorId: factor.id, code: errado });
    assert.ok(recusa, "código errado devia ser recusado");
    assert.equal(recusa.code, "mfa_verification_failed");
    assert.equal((await nivel(c)).currentLevel, "aal1");
    await admin.auth.admin.deleteUser(criado.user.id);
  });
});
