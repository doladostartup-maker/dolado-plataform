// DoLado Empresas — Fase 5 contra a base de dados REAL (`npm run test:contrato`,
// stack local): activação → aviso registado → envio (Brevo simulada) uma só
// vez; falha da Brevo fica para a execução seguinte; aviso antigo não sai.
//
// Fora de `npm run test:contrato` fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";

function nipcAleatorio() {
  const base = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(base[i]) * (9 - i);
  const resto = soma % 11;
  return `${base}${resto < 2 ? 0 : 11 - resto}`;
}

let admin;
let enviarAvisosEmpresas;
const fetchOriginal = globalThis.fetch;
const brevo = { enviados: [], falhar: false };

describe("DoLado Empresas — avisos do ciclo (Supabase real)", { skip: !ATIVO && "só em npm run test:contrato", timeout: 120_000 }, () => {
  before(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    globalThis.fetch = async (url, opcoes) => {
      if (String(url).startsWith("https://api.brevo.com/")) {
        if (brevo.falhar) return new Response("{}", { status: 500 });
        brevo.enviados.push(JSON.parse(opcoes.body));
        return new Response("{}", { status: 201 });
      }
      return fetchOriginal(url, opcoes);
    };
    ({ enviarAvisosEmpresas } = await import("./avisosServidor.ts"));
  });
  after(() => {
    globalThis.fetch = fetchOriginal;
  });

  async function rpc(nome, args) {
    const { data, error } = await admin.rpc(nome, args);
    if (error) throw error;
    return data;
  }

  test("activação → um e-mail, uma só vez; falha da Brevo repete; aviso antigo não sai", async () => {
    const email = `ciclo-${randomUUID()}@contrato.test`;
    const { data: conta } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const { data: adminConta } = await admin.auth.admin.createUser({ email: `admin-${randomUUID()}@contrato.test`, email_confirm: true });
    await admin.from("utilizadores").update({ role: "admin" }).eq("id", adminConta.user.id);
    const nif = nipcAleatorio();
    assert.equal(await rpc("empresa_registar", { p_user: conta.user.id, p_nome: "Loja Ciclo", p_tipo_entidade: "sociedade", p_nif: nif, p_responsavel: "Ana" }), "registada");
    const { data: org } = await admin.from("organizacoes").select("id").eq("nif", nif).single();
    await admin.from("organizacoes").update({ estado: "aprovada" }).eq("id", org.id);

    // Falha da Brevo: o aviso fica com uma tentativa e sem enviado_em.
    assert.equal(await rpc("empresa_activar", { p_org: org.id, p_admin: adminConta.user.id, p_referencia: "FT 2026/9" }), "ativa");
    brevo.falhar = true;
    const falha = await enviarAvisosEmpresas();
    assert.ok(falha.falhados >= 1);
    const { data: depoisFalha } = await admin.from("empresa_avisos").select("tentativas, enviado_em").eq("organizacao_id", org.id).single();
    assert.deepEqual(depoisFalha, { tentativas: 1, enviado_em: null });

    // Execução seguinte: sai uma vez, para o e-mail confirmado da conta.
    brevo.falhar = false;
    brevo.enviados.length = 0;
    await enviarAvisosEmpresas();
    const meus = brevo.enviados.filter((m) => m.to[0].email === email);
    assert.equal(meus.length, 1);
    assert.equal(meus[0].subject, "A Protecção Empresas está activa");
    assert.match(meus[0].htmlContent, /FT 2026\/9/);
    await enviarAvisosEmpresas();
    assert.equal(brevo.enviados.filter((m) => m.to[0].email === email).length, 1, "nunca em duplicado");

    // Aviso com mais de 3 dias: ignorado, não sai.
    await rpc("empresa_aviso_registar", { p_org: org.id, p_periodo: null, p_tipo: "encerrada" });
    await admin.from("empresa_avisos").update({ criado_em: new Date(Date.now() - 4 * 86_400_000).toISOString() })
      .eq("organizacao_id", org.id).eq("tipo", "encerrada");
    brevo.enviados.length = 0;
    await enviarAvisosEmpresas();
    assert.equal(brevo.enviados.filter((m) => m.to[0].email === email).length, 0);
    const { data: antigo } = await admin.from("empresa_avisos").select("ignorado_em").eq("organizacao_id", org.id).eq("tipo", "encerrada").single();
    assert.ok(antigo.ignorado_em);

    await admin.auth.admin.deleteUser(conta.user.id);
    await admin.auth.admin.deleteUser(adminConta.user.id);
  });
});
