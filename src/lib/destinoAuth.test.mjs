// Continuidade dos fluxos de conta (login, confirmação do e-mail, Google) — `npm test`.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  DESTINO_PEDIDO_POR_PAGAR,
  DESTINO_POS_LOGIN,
  DESTINO_POS_LOGIN_ADMIN,
  destinoCompra,
  destinoPorPerfil,
  destinoSeguro,
  escolherDestino,
  urlConfirmarEmail,
  urlLogin,
} from "./destinoAuth.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("destino depois de autenticar", () => {
  test("caso A — preçário → plano → criar conta → confirmar: continua na compra do mesmo plano", () => {
    const destino = escolherDestino({ destinoGuardado: destinoCompra("caso_protecao") });
    assert.equal(destino, "/comprar?plano=caso_protecao");
  });
  test("caso B — compra já paga (criar conta depois do Checkout): entra no portal", () => {
    assert.equal(escolherDestino({ destinoGuardado: DESTINO_POS_LOGIN }), "/portal/casos");
  });
  test("caso C — login normal, sem destino: /portal/casos (cliente) ou backoffice (admin)", () => {
    assert.equal(escolherDestino({}), null);
    assert.equal(destinoPorPerfil("cliente"), DESTINO_POS_LOGIN);
    assert.equal(destinoPorPerfil(null), "/portal/casos");
    assert.equal(destinoPorPerfil("admin"), DESTINO_POS_LOGIN_ADMIN);
  });
  test("\"A sua conta\" (/conta) deixou de ser destino por omissão", () => {
    assert.notEqual(DESTINO_POS_LOGIN, "/conta");
    assert.equal(destinoSeguro(null), "/portal/casos");
  });
  test("?next= explícito ganha ao destino guardado; o guardado ganha ao pedido por pagar", () => {
    assert.equal(escolherDestino({ nextExplicito: "/associar-compra?x=1", destinoGuardado: "/portal/casos" }), "/associar-compra?x=1");
    assert.equal(escolherDestino({ destinoGuardado: "/comprar?plano=protecao", haPedidoPorPagar: true }), "/comprar?plano=protecao");
    assert.equal(escolherDestino({ haPedidoPorPagar: true }), DESTINO_PEDIDO_POR_PAGAR);
  });
  test("destinos externos são ignorados (open redirect)", () => {
    for (const mau of ["//evil.example", "https://evil.example", "/\\evil.example", "evil", 42]) {
      assert.equal(escolherDestino({ nextExplicito: mau, destinoGuardado: mau }), null);
    }
  });
  test("página de confirmação leva o destino, sem dados pessoais", () => {
    assert.equal(urlConfirmarEmail("/comprar?plano=protecao"), "/confirmar-email?next=%2Fcomprar%3Fplano%3Dprotecao");
    assert.equal(urlConfirmarEmail("https://evil.example"), "/confirmar-email?next=%2Fportal%2Fcasos");
  });
});

describe("criação de contas por e-mail (código)", () => {
  const fluxos = {
    registo: fonte("../app/registo/actions.ts"),
    criarConta: fonte("../app/criar-conta/actions.ts"),
    tratarCaso: fonte("../app/tratar-caso/actions.ts"),
  };

  test("todos os signUp passam por dadosContaNova (emailRedirectTo = /auth/callback)", () => {
    for (const [nome, codigo] of Object.entries(fluxos)) {
      const chamadas = codigo.split("auth.signUp(").length - 1;
      assert.ok(chamadas > 0, `${nome}: sem signUp`);
      assert.equal(codigo.split("options: dadosContaNova(").length - 1, chamadas, `${nome}: signUp sem dadosContaNova`);
    }
    assert.match(fonte("./authServidor.ts"), /emailRedirectTo: urlCallbackAuth\(\)/);
  });

  test("só \"Tratar o meu caso\" (com campo para o código) pede o código no e-mail", () => {
    assert.match(fluxos.tratarCaso, /mostrarCodigo: true/);
    assert.doesNotMatch(fluxos.registo, /mostrarCodigo/);
    assert.doesNotMatch(fluxos.criarConta, /mostrarCodigo/);
    assert.match(fonte("../app/tratar-caso/conta/FormularioConta.tsx"), /name="codigo"/);
  });

  test("os fluxos sem código guardam o destino e mostram a página de confirmação", () => {
    for (const codigo of [fluxos.registo, fluxos.criarConta]) {
      assert.match(codigo, /guardarDestinoPosLogin\(/);
      assert.match(codigo, /urlConfirmarEmail\(/);
      assert.doesNotMatch(codigo, /\/login\?info=.*Verifique o seu e-mail/);
    }
  });

  test("o login com palavra-passe e o callback não caem em /conta", () => {
    assert.doesNotMatch(fonte("../app/login/actions.ts"), /"\/conta"/);
    assert.doesNotMatch(fonte("../app/auth/callback/route.ts"), /"\/conta"/);
  });
});

describe("template do e-mail de confirmação", () => {
  const html = fonte("../../supabase/templates/confirmacao.html");

  test("o código só aparece dentro do bloco condicional mostrar_codigo", () => {
    const inicio = html.indexOf("{{ with .Data }}{{ if .mostrar_codigo }}");
    const fim = html.indexOf("{{ end }}{{ end }}");
    assert.ok(inicio > 0 && fim > inicio, "bloco condicional em falta");
    const token = html.indexOf(".Token");
    assert.ok(token > inicio && token < fim, "o código está fora do bloco condicional");
    assert.equal(html.split(".Token").length - 1, 1);
  });
  test("a ligação de confirmação está sempre presente", () => {
    const inicio = html.indexOf("{{ with .Data }}");
    const botao = html.indexOf("{{ .ConfirmationURL }}");
    assert.ok(botao > 0 && botao < inicio);
    assert.match(html, /Confirmar o meu e-mail/);
  });
  test("texto em português europeu, sem a referência ao caso para quem não o está a tratar", () => {
    assert.doesNotMatch(html, /Se está a tratar o seu caso/);
    assert.doesNotMatch(html, /\b(arquivo|você|cadastro|email)\b/i);
  });
});

// Incidente de 07/10/2026: sem sessão, as descargas redirecionavam para
// https://localhost:8080/login — atrás do proxy da Clever Cloud, request.url
// é o endereço interno. O login é sempre absoluto no NEXT_PUBLIC_SITE_URL.
describe("login a partir das rotas de descarga", () => {
  test("URL absoluto no site público, com regresso à descarga", () => {
    assert.equal(
      urlLogin("https://portal.dolado.pt", "/api/comprovativos/abc?download=1"),
      "https://portal.dolado.pt/login?next=%2Fapi%2Fcomprovativos%2Fabc%3Fdownload%3D1",
    );
  });
  test("destino inseguro é ignorado (sem open redirect)", () => {
    assert.equal(urlLogin("https://portal.dolado.pt", "//outro.site/x"), "https://portal.dolado.pt/login");
    assert.equal(urlLogin("https://portal.dolado.pt", "https://outro.site"), "https://portal.dolado.pt/login");
    assert.equal(urlLogin("https://portal.dolado.pt", null), "https://portal.dolado.pt/login");
  });

  const rotasApi = (dir) =>
    readdirSync(dir).flatMap((n) => {
      const c = join(dir, n);
      return statSync(c).isDirectory() ? rotasApi(c) : n === "route.ts" ? [c] : [];
    });
  const api = rotasApi(new URL("../app/api/", import.meta.url).pathname);

  test("nenhuma rota de /api constrói URLs a partir de request.url", () => {
    assert.ok(api.length > 0);
    for (const f of api) {
      assert.doesNotMatch(readFileSync(f, "utf8"), /new URL\([^)]*\b(request|req)\.url\b/, f);
    }
  });
  test("descargas sem sessão vão para urlLogin com o caminho pedido", () => {
    for (const rel of ["comprovativos/[id]/route.ts", "monitor/documentos/[id]/route.ts", "comunicacoes/anexos/[id]/route.ts"]) {
      const s = fonte(`../app/api/${rel}`);
      assert.match(s, /NextResponse\.redirect\(urlLogin\(process\.env\.NEXT_PUBLIC_SITE_URL!, `\$\{request\.nextUrl\.pathname\}\$\{request\.nextUrl\.search\}`\)/, rel);
    }
  });
});
