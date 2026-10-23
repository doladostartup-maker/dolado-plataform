// DoLado Empresas — Fase 4 contra a Supabase Auth e a base de dados REAIS
// (`npm run test:contrato`, stack local). Prova o percurso que as Server
// Actions fazem: registo → e-mail confirmado → sessão aal1 sem acesso à
// organização → dois factores → aal2 → aprovação; e-mail de uma conta
// particular com histórico (nada criado, conta intacta); nova palavra-passe
// pela ligação do e-mail com o segundo factor; reposição do MFA pelo admin
// (factores apagados, sessões terminadas).
//
// Fora de `npm run test:contrato` fica skipped.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const PASSO_S = 30;

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
  return String((hmac.readUInt32BE(desvio) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function esperarProximaJanela() {
  const resto = PASSO_S * 1000 - (Date.now() % (PASSO_S * 1000));
  await new Promise((r) => setTimeout(r, resto + 1000));
}

/** NIPC válido e diferente em cada execução (5 + 7 dígitos aleatórios + controlo). */
function nipcAleatorio() {
  const base = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(base[i]) * (9 - i);
  const resto = soma % 11;
  return `${base}${resto < 2 ? 0 : 11 - resto}`;
}

let admin;
let novoCliente;

describe("DoLado Empresas — registo e MFA (Supabase real)", { skip: !ATIVO && "só em npm run test:contrato", timeout: 240_000 }, () => {
  before(async () => {
    const { createClient } = await import("@supabase/supabase-js");
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

  async function rpc(nome, args) {
    const { data, error } = await admin.rpc(nome, args);
    if (error) throw error;
    return data;
  }

  test("registo → confirmação → dois factores → aprovação; palavra-passe com o segundo factor; reposição", async () => {
    const email = `empresa-${randomUUID()}@contrato.test`;
    const palavraPasse = `Emp-${randomUUID()}`;
    const nif = nipcAleatorio();

    // Conta nova por confirmar (o signUp em produção) e registo da organização.
    const { data: criado, error } = await admin.auth.admin.createUser({ email, password: palavraPasse, email_confirm: false });
    if (error) throw error;
    const userId = criado.user.id;
    assert.equal(await rpc("empresa_registar", { p_user: userId, p_nome: "Loja Contrato", p_tipo_entidade: "sociedade", p_nif: nif, p_responsavel: "Ana" }), "registada");
    assert.equal((await rpc("empresa_sincronizar_estado", { p_user: userId })).estado, "email_por_confirmar");

    // Confirmação do e-mail → MFA por configurar.
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    assert.equal((await rpc("empresa_sincronizar_estado", { p_user: userId })).estado, "mfa_por_configurar");

    // Sessão aal1: a conta não lê a própria organização (RLS exige aal2).
    const c = await entrar(email, palavraPasse);
    const { data: semAal2 } = await c.from("organizacoes").select("id");
    assert.deepEqual(semAal2, []);

    // Dois factores → a aguardar aprovação (transição assinalada uma vez).
    const { data: principal } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: "Principal", issuer: "DoLado" });
    await c.auth.mfa.challengeAndVerify({ factorId: principal.id, code: codigoTotp(principal.totp.secret) });
    assert.equal((await rpc("empresa_sincronizar_estado", { p_user: userId })).estado, "mfa_por_configurar", "um factor não chega");
    const { data: reserva, error: eReserva } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: "Reserva", issuer: "DoLado" });
    if (eReserva) throw eReserva;
    const { error: vReserva } = await c.auth.mfa.challengeAndVerify({ factorId: reserva.id, code: codigoTotp(reserva.totp.secret) });
    if (vReserva) throw vReserva;
    const sinc = await rpc("empresa_sincronizar_estado", { p_user: userId });
    assert.deepEqual([sinc.estado, sinc.passou_a_aguardar], ["a_aguardar_aprovacao", true]);

    // Com aal2 lê a organização (só a própria).
    const { data: comAal2 } = await c.from("organizacoes").select("nome, estado");
    assert.deepEqual(comAal2, [{ nome: "Loja Contrato", estado: "a_aguardar_aprovacao" }]);

    // Aprovação pelo admin.
    const { data: adminConta } = await admin.auth.admin.createUser({ email: `admin-${randomUUID()}@contrato.test`, email_confirm: true });
    await admin.from("utilizadores").update({ role: "admin" }).eq("id", adminConta.user.id);
    const organizacaoId = sinc.organizacao_id;
    assert.equal(await rpc("empresa_aprovar", { p_org: organizacaoId, p_admin: userId }), "sem_permissao");
    assert.equal(await rpc("empresa_aprovar", { p_org: organizacaoId, p_admin: adminConta.user.id }), "aprovada");

    // Nova palavra-passe pela ligação do e-mail: a sessão da ligação é aal1;
    // a acção pede o segundo factor antes de alterar.
    const { data: ligacao, error: eLigacao } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (eLigacao) throw eLigacao;
    const r = novoCliente();
    const { error: eOtp } = await r.auth.verifyOtp({ type: "recovery", token_hash: ligacao.properties.hashed_token });
    if (eOtp) throw eOtp;
    const { data: nivelLigacao } = await r.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.equal(nivelLigacao.currentLevel, "aal1");
    await esperarProximaJanela();
    const { error: v2 } = await r.auth.mfa.challengeAndVerify({ factorId: reserva.id, code: codigoTotp(reserva.totp.secret) });
    if (v2) throw v2;
    const nova = `Nova-${randomUUID()}`;
    const { error: eUpdate } = await r.auth.updateUser({ password: nova });
    if (eUpdate) throw eUpdate;
    await r.auth.signOut({ scope: "global" });
    const depois = await entrar(email, nova);
    const { data: nivelDepois } = await depois.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.deepEqual([nivelDepois.currentLevel, nivelDepois.nextLevel], ["aal1", "aal2"], "depois da troca, o segundo factor continua obrigatório");

    // Reposição do MFA pelo admin: factores apagados, sessões terminadas.
    const apagados = await rpc("empresa_mfa_reposicao", { p_org: organizacaoId, p_admin: adminConta.user.id, p_motivo: "Contrato", p_pedido: null });
    assert.equal(apagados, 2);
    const { data: factores } = await admin.auth.admin.mfa.listFactors({ userId });
    assert.equal(factores.factors.length, 0);
    const { error: eRefresh } = await depois.auth.refreshSession();
    assert.ok(eRefresh, "a sessão aberta já não renova");
    const { data: estadoFinal } = await admin.from("organizacoes").select("estado").eq("id", organizacaoId).single();
    assert.equal(estadoFinal.estado, "aprovada", "o estado da organização não muda");

    await admin.auth.admin.deleteUser(userId);
    await admin.auth.admin.deleteUser(adminConta.user.id);
  });

  test("e-mail de uma conta particular com histórico: nada criado, conta intacta", async () => {
    const email = `particular-${randomUUID()}@contrato.test`;
    const { data: criado } = await admin.auth.admin.createUser({ email, password: `P-${randomUUID()}`, email_confirm: true });
    const userId = criado.user.id;
    const { error } = await admin.from("user_access").insert({ user_id: userId });
    if (error) throw error;
    const nif = nipcAleatorio();
    assert.equal(
      await rpc("empresa_registar", { p_user: userId, p_nome: "X", p_tipo_entidade: "sociedade", p_nif: nif, p_responsavel: "Y" }),
      "com_historico",
    );
    const { data: perfil } = await admin.from("utilizadores").select("tipo_conta").eq("id", userId).single();
    assert.equal(perfil.tipo_conta, "particular");
    const { count } = await admin.from("organizacoes").select("id", { count: "exact", head: true }).eq("nif", nif);
    assert.equal(count, 0);
    await admin.auth.admin.deleteUser(userId);
  });
});
