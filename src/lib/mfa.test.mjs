// MFA (TOTP) do admin — regras sem I/O (`npm test`). O percurso real contra a
// Supabase Auth está em mfa.contrato.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { estadoMfa, normalizarCodigo, podeInscrever, podeRemover, proximoNomeFactor } from "./mfa.ts";

const f = (id, nome, verificado = true) => ({ id, nome, verificado, criadoEm: "2026-10-23T10:00:00Z" });

describe("estado do MFA", () => {
  test("sem factores verificados (um por verificar não conta)", () => {
    assert.equal(estadoMfa("aal1", []), "sem_factores");
    assert.equal(estadoMfa("aal1", [f("a", "Principal", false)]), "sem_factores");
  });
  test("com factores e sessão aal1: falta verificar", () => {
    assert.equal(estadoMfa("aal1", [f("a", "Principal")]), "por_verificar");
    assert.equal(estadoMfa("aal1", [f("a", "Principal"), f("b", "Reserva")]), "por_verificar");
  });
  test("aal2 com um factor: falta a reserva; com dois: completo", () => {
    assert.equal(estadoMfa("aal2", [f("a", "Principal")]), "so_principal");
    assert.equal(estadoMfa("aal2", [f("a", "Principal"), f("b", "Reserva")]), "completo");
  });
});

describe("nome do próximo factor", () => {
  test("Principal, depois Reserva, depois Reserva 2", () => {
    assert.equal(proximoNomeFactor([]), "Principal");
    assert.equal(proximoNomeFactor([f("a", "Principal")]), "Reserva");
    assert.equal(proximoNomeFactor([f("a", "Principal"), f("b", "Reserva")]), "Reserva 2");
    assert.equal(proximoNomeFactor([f("a", "Principal"), f("b", "Reserva"), f("c", "Reserva 2")]), "Reserva 3");
  });
  test("substituir o principal perdido volta a dar Principal", () => {
    assert.equal(proximoNomeFactor([f("b", "Reserva")]), "Principal");
  });
  test("factores por verificar não ocupam o nome (são apagados antes da inscrição)", () => {
    assert.equal(proximoNomeFactor([f("a", "Principal", false)]), "Principal");
  });
});

describe("inscrever e retirar", () => {
  test("inscrever: sem factores basta a sessão; com factores exige aal2", () => {
    assert.equal(podeInscrever("aal1", []), true);
    assert.equal(podeInscrever("aal1", [f("a", "Principal", false)]), true);
    assert.equal(podeInscrever("aal1", [f("a", "Principal")]), false);
    assert.equal(podeInscrever("aal2", [f("a", "Principal")]), true);
  });
  test("retirar: só com aal2, só um factor da conta e nunca o último", () => {
    const dois = [f("a", "Principal"), f("b", "Reserva")];
    assert.equal(podeRemover("aal2", dois, "a"), true);
    assert.equal(podeRemover("aal1", dois, "a"), false);
    assert.equal(podeRemover("aal2", dois, "outro"), false);
    assert.equal(podeRemover("aal2", [f("a", "Principal")], "a"), false);
    assert.equal(podeRemover("aal2", [f("a", "Principal"), f("b", "Reserva", false)], "a"), false);
  });
});

describe("código TOTP", () => {
  test("6 dígitos, com ou sem espaços", () => {
    assert.equal(normalizarCodigo("123456"), "123456");
    assert.equal(normalizarCodigo("123 456"), "123456");
    assert.equal(normalizarCodigo(" 123456 "), "123456");
  });
  test("recusa o resto", () => {
    for (const v of ["12345", "1234567", "12a456", "", null, undefined, 123456]) {
      assert.equal(normalizarCodigo(v), null, String(v));
    }
  });
});

describe("Fase 1A: o backoffice ainda não exige aal2", () => {
  // A exigência (requireAdmin com aal2, is_admin() com aal2) é a Fase 1B, só
  // depois de a inscrição e a recuperação estarem ensaiadas em produção.
  test("requireAdmin delega em requireAdminSemMfa, sem verificar o aal", () => {
    const auth = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
    assert.match(auth, /export async function requireAdmin\(\) \{\s*return requireAdminSemMfa\(\);\s*\}/);
    assert.doesNotMatch(auth, /claims\.aal|getAuthenticatorAssuranceLevel/);
  });
  test("a página de MFA fica fora do layout do backoffice e usa requireAdminSemMfa", () => {
    const pagina = readFileSync(new URL("../app/auth/mfa/page.tsx", import.meta.url), "utf8");
    const acoes = readFileSync(new URL("../app/auth/mfa/actions.ts", import.meta.url), "utf8");
    assert.match(pagina, /requireAdminSemMfa\(\)/);
    for (const fn of ["inscreverFactor", "verificarFactor", "removerFactor"]) {
      assert.match(acoes, new RegExp(`export async function ${fn}\\([^)]*\\)[^{]*\\{\\s*const \\{[^}]*\\} = await requireAdminSemMfa\\(\\);`), fn);
    }
  });
  test("segredos e códigos nunca vão para a consola", () => {
    const acoes = readFileSync(new URL("../app/auth/mfa/actions.ts", import.meta.url), "utf8");
    assert.doesNotMatch(acoes, /console\./);
  });
});
