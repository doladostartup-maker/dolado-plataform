// DoLado Empresas — Fase 3: contas de empresa fora dos fluxos particulares
// (`npm test`). Inventário da service role (risco RC2), guardas nos pontos de
// entrada particulares e regras de contas.ts.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { GUARDAS_PARTICULARES, INVENTARIO_SERVICE_ROLE } from "./inventarioServiceRole.ts";
import { DESTINO_CONTA_EMPRESA, contextoOcorrencia, destinoContaEmpresa, entrouPorOAuth, tipoContaDe } from "./contas.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;

function ficheiros(dir) {
  return readdirSync(join(RAIZ, dir)).flatMap((nome) => {
    const rel = join(dir, nome);
    if (statSync(join(RAIZ, rel)).isDirectory()) return ficheiros(rel);
    return /\.(ts|tsx)$/.test(nome) ? [rel] : [];
  });
}

const comServiceRole = ficheiros("src")
  .filter((f) => f !== "src/lib/supabase/admin.ts" && f !== "src/lib/empresas/inventarioServiceRole.ts")
  .filter((f) => readFileSync(join(RAIZ, f), "utf8").includes("createAdminClient"));

const ler = (f) => readFileSync(join(RAIZ, f), "utf8");

describe("inventário da service role", () => {
  test("todos os ficheiros com createAdminClient estão classificados", () => {
    const fora = comServiceRole.filter((f) => !(f in INVENTARIO_SERVICE_ROLE));
    assert.deepEqual(fora, [], `Classifique em src/lib/empresas/inventarioServiceRole.ts: ${fora.join(", ")}`);
  });
  test("o inventário não tem ficheiros que já não existem ou já não usam a service role", () => {
    const sobra = Object.keys(INVENTARIO_SERVICE_ROLE).filter((f) => !existsSync(join(RAIZ, f)) || !comServiceRole.includes(f));
    assert.deepEqual(sobra, []);
  });
  test("pontos de entrada particulares (src/app) usam um guarda que recusa contas de empresa", () => {
    const semGuarda = Object.entries(INVENTARIO_SERVICE_ROLE)
      .filter(([f, c]) => c === "particular" && f.startsWith("src/app/"))
      .filter(([f]) => !GUARDAS_PARTICULARES.some((g) => ler(f).includes(g)))
      .map(([f]) => f);
    assert.deepEqual(semGuarda, []);
  });
  test("backoffice e APIs de admin verificam o admin", () => {
    const semVerificacao = Object.entries(INVENTARIO_SERVICE_ROLE)
      .filter(([f, c]) => c === "admin" && f.startsWith("src/app/") && /(actions|route)\.ts$/.test(f))
      .filter(([f]) => !/requireAdmin(SemMfa)?\(|role !== "admin"/.test(ler(f)))
      .map(([f]) => f);
    assert.deepEqual(semVerificacao, []);
  });
});

describe("guardas nos fluxos particulares", () => {
  test("o portal particular recusa contas de empresa (layout e acções)", () => {
    assert.match(ler("src/app/[idioma]/portal/layout.tsx"), /requireParticular\(/);
    for (const f of ["portal/perfil/actions.ts", "portal/casos/actions.ts", "portal/casos/texto-actions.ts", "portal/subscricao/actions.ts"]) {
      const s = ler(`src/app/[idioma]/${f}`);
      const exportadas = s.match(/export async function \w+/g)?.length ?? 0;
      const guardas = (s.match(/requireParticular\(/g) ?? []).length;
      assert.ok(guardas >= exportadas, `${f}: ${exportadas} acções, ${guardas} guardas`);
    }
  });
  test("nenhum fluxo particular usa os guardas genéricos", () => {
    const genericos = ficheiros("src/app").filter((f) => /requireUser\(|utilizadorAtual\(|contaComEmailConfirmado\(/.test(ler(f)));
    assert.deepEqual(genericos, []);
  });
  test("sessões criadas em percursos particulares recusam contas de empresa", () => {
    assert.match(ler("src/app/[idioma]/login/actions.ts"), /recusarSessaoDeEmpresa\(/);
    assert.match(ler("src/app/auth/callback/route.ts"), /recusarSessaoDeEmpresa\(supabase, data\.user\.id, "auth\/callback", data\.session\?\.access_token\)/);
    const tratar = ler("src/app/[idioma]/tratar-caso/actions.ts");
    assert.equal((tratar.match(/recusarSessaoDeEmpresa\(/g) ?? []).length, 2, "código e palavra-passe do Tratar o meu caso");
  });
  test("no callback, a recusa vem antes de qualquer atribuição", () => {
    const s = ler("src/app/auth/callback/route.ts");
    const recusa = s.indexOf("recusarSessaoDeEmpresa(");
    for (const passo of ["atribuirIndicacaoDoBrowser(", "registarOrigemDaConta(", "associarDiagnosticosDaSessao("]) {
      assert.ok(recusa < s.indexOf(passo), passo);
    }
  });
  test("o webhook do Stripe verifica contas de empresa", () => {
    assert.match(ler("src/lib/stripe/webhookDependencias.ts"), /async contaEmpresa\(userId\)/);
  });
});

describe("regras das contas", () => {
  test("tipo de conta: só 'empresa' é empresa", () => {
    assert.equal(tipoContaDe("empresa"), "empresa");
    for (const v of ["particular", null, undefined, "", "Empresa"]) assert.equal(tipoContaDe(v), "particular");
  });
  test("destino de uma conta de empresa", () => {
    assert.equal(destinoContaEmpresa(), `${DESTINO_CONTA_EMPRESA}?motivo=conta_empresa`);
  });
  test("amr com OAuth", () => {
    assert.equal(entrouPorOAuth([{ method: "oauth", timestamp: 1 }]), true);
    assert.equal(entrouPorOAuth(["oauth"]), true);
    assert.equal(entrouPorOAuth([{ method: "password" }, { method: "totp" }]), false);
    assert.equal(entrouPorOAuth(undefined), false);
  });
  test("contexto da ocorrência sem dados pessoais nem caracteres livres", () => {
    assert.equal(contextoOcorrencia("portal/casos:acao"), "portal/casos:acao");
    assert.equal(contextoOcorrencia("a@b.pt <x>"), "ab.ptx");
    assert.equal(contextoOcorrencia(""), "desconhecido");
    assert.equal(contextoOcorrencia("x".repeat(300)).length, 200);
  });
});
