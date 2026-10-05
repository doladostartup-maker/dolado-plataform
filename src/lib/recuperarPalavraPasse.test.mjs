// Recuperação da palavra-passe — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  MSG_LIGACAO,
  MSG_PEDIDO_RECUPERACAO,
  ROTA_RECUPERAR,
  ROTA_REDEFINIR,
  codigoPkceComFormatoValido,
  emailComFormatoValido,
  estadoLigacaoDoErro,
  estadoLigacaoValido,
  tokenRecuperacaoComFormatoValido,
  urlRedefinir,
  validarNovaPalavraPasse,
} from "./recuperarPalavraPasse.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("nova palavra-passe", () => {
  test("válida: 8+ caracteres, letras e números, igual nos dois campos", () => {
    assert.equal(validarNovaPalavraPasse("casaAzul42", "casaAzul42"), null);
    assert.equal(validarNovaPalavraPasse("ação2026x", "ação2026x"), null);
  });
  test("vazia, curta, sem letras ou sem números", () => {
    assert.match(validarNovaPalavraPasse("", ""), /Introduza/);
    assert.match(validarNovaPalavraPasse(null, null), /Introduza/);
    assert.match(validarNovaPalavraPasse("abc12", "abc12"), /pelo menos 8/);
    assert.match(validarNovaPalavraPasse("12345678", "12345678"), /letras e números/);
    assert.match(validarNovaPalavraPasse("abcdefgh", "abcdefgh"), /letras e números/);
  });
  test("demasiado longa para a Supabase (72 bytes)", () => {
    const longa = "a1".repeat(37);
    assert.match(validarNovaPalavraPasse(longa, longa), /demasiado longa/);
  });
  test("campos diferentes", () => {
    assert.equal(validarNovaPalavraPasse("casaAzul42", "casaAzul43"), "As palavras-passe não coincidem.");
  });
});

describe("ligação do e-mail", () => {
  test("token_hash: formato aceite e lixo recusado", () => {
    assert.ok(tokenRecuperacaoComFormatoValido("a".repeat(56)));
    assert.ok(tokenRecuperacaoComFormatoValido(`pkce_${"0f".repeat(28)}`));
    for (const mau of ["", "curto", "<script>", "a".repeat(200), null, 42]) {
      assert.equal(tokenRecuperacaoComFormatoValido(mau), false, String(mau));
    }
  });
  test("code PKCE só como UUID", () => {
    assert.ok(codigoPkceComFormatoValido("3f1c2b8e-1d2a-4c55-9a7e-0123456789ab"));
    assert.equal(codigoPkceComFormatoValido("3f1c2b8e"), false);
  });
  test("token expirado ou já usado ≠ token inválido", () => {
    assert.equal(estadoLigacaoDoErro("otp_expired", "Email link is invalid or has expired"), "expirada");
    assert.equal(estadoLigacaoDoErro("flow_state_expired", ""), "expirada");
    assert.equal(estadoLigacaoDoErro("bad_code_verifier", "invalid"), "invalida");
    assert.equal(estadoLigacaoDoErro(undefined, undefined), "invalida");
    assert.ok(MSG_LIGACAO.expirada.texto.includes("Peça uma nova ligação"));
    assert.ok(estadoLigacaoValido("expirada") && !estadoLigacaoValido("<x>"));
  });
  test("URL de regresso nunca leva dados pessoais e mantém a ligação", () => {
    assert.equal(urlRedefinir({ token: "a".repeat(20), erro: "x" }), `${ROTA_REDEFINIR}?token_hash=${"a".repeat(20)}&erro=x`);
    assert.equal(urlRedefinir({ continuar: true }), `${ROTA_REDEFINIR}?continuar=1`);
  });
  test("e-mail: só o formato é verificado", () => {
    assert.ok(emailComFormatoValido("ana@exemplo.pt"));
    assert.equal(emailComFormatoValido("ana@"), false);
    assert.equal(emailComFormatoValido(`${"a".repeat(250)}@x.pt`), false);
  });
});

describe("não revela se o e-mail tem conta", () => {
  const pedir = fonte("../app/recuperar-palavra-passe/actions.ts");
  test("a resposta é sempre a mesma, com ou sem erro da Supabase ou limite de pedidos", () => {
    assert.match(pedir, /resetPasswordForEmail\(email/);
    // Um só destino depois do pedido, fora de qualquer condição sobre o resultado.
    assert.equal(pedir.split("redirect(`${ROTA_RECUPERAR}?enviado=1`)").length - 1, 1);
    assert.doesNotMatch(pedir, /if \(error\)[^\n]*redirect/);
    assert.doesNotMatch(pedir, /console\.[a-z]+\([^)]*email/);
    assert.match(MSG_PEDIDO_RECUPERACAO, /^Se existir uma conta associada a este endereço/);
  });
  test("o e-mail nunca vai no URL", () => {
    assert.doesNotMatch(pedir, /enviado=1&|email=\$\{/);
  });
});

describe("integração com a autenticação existente", () => {
  test("login tem \"Esqueceu-se da palavra-passe?\" e confirma a alteração", () => {
    const login = fonte("../app/login/page.tsx");
    assert.match(login, /href=\{ROTA_RECUPERAR\}[^>]*>\s*Esqueceu-se da palavra-passe\?/);
    assert.match(login, /params\.alterada === "1"/);
  });
  test("a ligação só é usada no POST, depois de validar a palavra-passe; no fim, todas as sessões terminam", () => {
    const acao = fonte("../app/redefinir-palavra-passe/actions.ts");
    const pagina = fonte("../app/redefinir-palavra-passe/page.tsx");
    assert.doesNotMatch(pagina, /verifyOtp|exchangeCodeForSession|updateUser/);
    assert.ok(acao.indexOf("validarNovaPalavraPasse(") < acao.indexOf("verifyOtp("));
    assert.match(acao, /verifyOtp\(\{ type: "recovery", token_hash: token \}\)/);
    assert.ok(acao.indexOf("updateUser(") < acao.indexOf('signOut({ scope: "global" })'));
    assert.match(acao, /redirect\("\/login\?alterada=1"\)/);
    assert.match(pagina, /referrer: "no-referrer"/);
  });
  test("não mexe em acessos, planos nem subscrições", () => {
    for (const f of ["../app/recuperar-palavra-passe/actions.ts", "../app/redefinir-palavra-passe/actions.ts"]) {
      assert.doesNotMatch(fonte(f), /user_access|createAdminClient|subscri|plano/i, f);
    }
  });
  test("páginas públicas no portal (sem refresh de sessão no middleware)", () => {
    const mw = fonte("../middleware.ts");
    assert.match(mw, /"\/recuperar-palavra-passe",\n\s*"\/redefinir-palavra-passe",/);
    assert.match(mw, /searchParams\.has\("token_hash"\)[\s\S]*\/redefinir-palavra-passe\$\{search\}/);
    assert.equal(ROTA_RECUPERAR, "/recuperar-palavra-passe");
  });
  test("template do e-mail: ligação com token_hash para a página da DoLado, em português europeu", () => {
    const html = fonte("../../supabase/templates/recuperacao.html");
    assert.match(html, /href="\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}"/);
    assert.doesNotMatch(html, /ConfirmationURL/);
    assert.match(html, /a sua conta na DoLado|da sua conta na DoLado/);
    assert.match(html, /contacto@dolado\.pt/);
    assert.doesNotMatch(html, /\b(você|seu email|email)\b/i);
    const config = fonte("../../supabase/config.toml");
    assert.match(config, /\[auth\.email\.template\.recovery\]\nsubject = "Defina uma nova palavra-passe na DoLado"\ncontent_path = "\.\/supabase\/templates\/recuperacao\.html"/);
  });
  test("o redirectTo enviado à Supabase é a página de redefinição", () => {
    assert.match(fonte("../app/recuperar-palavra-passe/actions.ts"), /redirectTo: `\$\{process\.env\.NEXT_PUBLIC_SITE_URL\}\$\{ROTA_REDEFINIR\}`/);
  });
});
