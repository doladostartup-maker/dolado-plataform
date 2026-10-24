// DoLado Empresas — Fase 8 contra a base de dados REAL (`npm run test:contrato`,
// stack local): alertas de prazo, factura em falta e resumo mensal — cada um
// sai uma só vez (Brevo simulada); uma falha da Brevo fica para a execução
// seguinte; organização suspensa não recebe.
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

const dia = (deslocamento) => new Date(Date.now() + deslocamento * 86_400_000).toISOString().slice(0, 10);

let admin;
let servidor;
const fetchOriginal = globalThis.fetch;
const brevo = { enviados: [], falhar: false };

describe("DoLado Empresas — alertas e resumo mensal (Supabase real)", { skip: !ATIVO && "só em npm run test:contrato", timeout: 120_000 }, () => {
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
    servidor = await import("./alertasServidor.ts");
  });
  after(() => {
    globalThis.fetch = fetchOriginal;
  });

  async function rpc(nome, args) {
    const { data, error } = await admin.rpc(nome, args);
    if (error) throw error;
    return data;
  }

  async function empresaActiva(nome) {
    const email = `alertas-${randomUUID()}@contrato.test`;
    const { data: conta } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const { data: adminConta } = await admin.auth.admin.createUser({ email: `admin-${randomUUID()}@contrato.test`, email_confirm: true });
    await admin.from("utilizadores").update({ role: "admin" }).eq("id", adminConta.user.id);
    const nif = nipcAleatorio();
    assert.equal(await rpc("empresa_registar", { p_user: conta.user.id, p_nome: nome, p_tipo_entidade: "sociedade", p_nif: nif, p_responsavel: "Ana" }), "registada");
    const { data: org } = await admin.from("organizacoes").select("id").eq("nif", nif).single();
    await admin.from("organizacoes").update({ estado: "aprovada" }).eq("id", org.id);
    assert.equal(await rpc("empresa_activar", { p_org: org.id, p_admin: adminConta.user.id, p_referencia: "FT 1" }), "ativa");
    return { email, userId: conta.user.id, orgId: org.id, adminId: adminConta.user.id };
  }

  test("prazo, factura em falta e resumo: uma só vez; falha repete; suspensa não recebe", async () => {
    const e = await empresaActiva("Loja Alertas");
    const hoje = dia(0);
    const { data: servico, error } = await admin
      .from("contratos_monitorizados")
      .insert({ utilizador_id: e.userId, setor: "telecomunicacoes", fornecedor: "Telecom Teste", data_fim_fidelizacao: dia(45), created_at: new Date(Date.now() - 86_400_000).toISOString() })
      .select("id")
      .single();
    assert.ifError(error);
    for (const [i, emissao] of [dia(-80), dia(-50)].entries()) {
      const { data: doc, error: e1 } = await admin
        .from("documentos_monitor")
        .insert({ utilizador_id: e.userId, storage_path: `contrato/${randomUUID()}`, tipo_indicado: "fatura", tipo: "fatura", sha256: randomUUID().replace(/-/g, "").padEnd(64, String(i)), etapa: "concluido", estado: "processado", contrato_id: servico.id })
        .select("id")
        .single();
      assert.ifError(e1);
      const { error: e2 } = await admin.from("faturas_monitor").insert({ contrato_id: servico.id, utilizador_id: e.userId, documento_id: doc.id, data_emissao: emissao, periodo_inicio: emissao, total_cents: 4599 });
      assert.ifError(e2);
    }
    const meus = () => brevo.enviados.filter((m) => m.to[0].email === e.email);

    // Prazo: falha da Brevo liberta a reserva; depois sai uma vez.
    brevo.enviados.length = 0;
    brevo.falhar = true;
    assert.ok((await servidor.enviarPrazosEmpresas(hoje)).falhados >= 1);
    brevo.falhar = false;
    await servidor.enviarPrazosEmpresas(hoje);
    await servidor.enviarPrazosEmpresas(hoje);
    assert.deepEqual(meus().map((m) => m.subject), ["A fidelização de um serviço termina dentro de 45 dias"]);
    assert.match(meus()[0].htmlContent, /Telecom Teste/);

    // Factura em falta: intervalo 30 dias, última há 50.
    brevo.enviados.length = 0;
    await servidor.enviarFacturasEmFalta(hoje);
    await servidor.enviarFacturasEmFalta(hoje);
    assert.deepEqual(meus().map((m) => m.subject), ["Falta uma factura de um serviço acompanhado"]);

    // Resumo do mês corrente (período pago desde a activação).
    brevo.enviados.length = 0;
    const mes = `${hoje.slice(0, 7)}-01`;
    await servidor.enviarResumosEmpresas(mes, hoje);
    await servidor.enviarResumosEmpresas(mes, hoje);
    assert.equal(meus().length, 1);
    assert.match(meus()[0].subject, /^O resumo da Protecção Empresas de /);
    assert.ok(meus()[0].textContent.includes("Próximos prazos"));
    const { data: resumo } = await admin.from("empresa_resumos_mensais").select("estado, modelo_versao, conteudo").eq("organizacao_id", e.orgId).single();
    assert.equal(resumo.estado, "enviado");
    assert.equal(resumo.modelo_versao, "resumo_empresa_v1");
    assert.equal(resumo.conteudo.prazos.length, 1);

    // Suspensa: nada sai (um prazo novo não gera alerta).
    await admin.from("organizacoes").update({ estado: "suspensa" }).eq("id", e.orgId);
    await admin.from("contratos_monitorizados").update({ data_fim_promocao: dia(20) }).eq("id", servico.id);
    brevo.enviados.length = 0;
    await servidor.enviarPrazosEmpresas(hoje);
    assert.equal(meus().length, 0);

    await admin.auth.admin.deleteUser(e.userId);
    await admin.auth.admin.deleteUser(e.adminId);
  });
});
