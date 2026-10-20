// Chat em direto (Crisp): consentimento, páginas onde aparece e onde nunca
// pode aparecer, e nenhum dado enviado ao Crisp.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CATEGORIA_COOKIEBOT_CRISP,
  PAGINAS_COM_CRISP,
  crispAtivo,
  crispPermitido,
  ehCookieCrisp,
  linhasApagarCookieCrisp,
  localeCrisp,
} from "./crisp.ts";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const fonte = (rel) => readFileSync(join(SRC, rel), "utf8");

function ficheiros(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? ficheiros(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const PAGINAS = {
  "/": "app/[idioma]/page.tsx",
  "/precario": "app/[idioma]/precario/page.tsx",
  "/simulador-elegibilidade": "app/[idioma]/simulador-elegibilidade/page.tsx",
};

describe("Crisp: consentimento", () => {
  test("desligado por omissão", () => {
    assert.equal(crispAtivo(undefined), false);
    assert.equal(crispAtivo("0"), false);
    assert.equal(crispAtivo("true"), false);
    assert.equal(crispAtivo("1"), true);
  });

  test("sem Cookiebot, sem resposta ou sem preferências: não carrega", () => {
    for (const cb of [
      undefined,
      {},
      { hasResponse: false, consent: { preferences: true } },
      { hasResponse: true, consent: { preferences: false } },
      { hasResponse: true },
    ]) {
      assert.equal(crispPermitido(cb), false, JSON.stringify(cb));
    }
  });

  test("só a categoria preferências liberta o chat", () => {
    assert.equal(CATEGORIA_COOKIEBOT_CRISP, "preferences");
    assert.equal(crispPermitido({ hasResponse: true, consent: { preferences: true } }), true);
    assert.equal(crispPermitido({ hasResponse: true, consent: { preferences: false, statistics: true, marketing: true } }), false);
  });

  test("cookies do Crisp apagados no host e no domínio-base", () => {
    assert.equal(ehCookieCrisp("crisp-client/session/abc"), true);
    assert.equal(ehCookieCrisp("crisp-client%2Fsession%2Fabc"), true);
    assert.equal(ehCookieCrisp("dolado_idioma"), false);
    const linhas = linhasApagarCookieCrisp("crisp-client/session/x", "dolado.pt");
    assert.ok(linhas.every((l) => l.includes("expires=Thu, 01 Jan 1970")));
    assert.ok(linhas.some((l) => l.endsWith("domain=.dolado.pt")));
    assert.ok(linhasApagarCookieCrisp("crisp-client/x", "www.dolado.pt").some((l) => l.endsWith("domain=.dolado.pt")));
    assert.deepEqual(linhasApagarCookieCrisp("crisp-client/x", "localhost").length, 1);
    assert.deepEqual(linhasApagarCookieCrisp("crisp-client/x", "127.0.0.1").length, 1);
  });

  test("locale igual ao idioma da página", () => {
    assert.equal(localeCrisp("pt-PT"), "pt");
    assert.equal(localeCrisp("en-GB"), "en");
  });
});

describe("Crisp: onde aparece", () => {
  test("só a homepage, o preçário e o simulador pedem o chat", () => {
    assert.deepEqual([...PAGINAS_COM_CRISP].sort(), Object.keys(PAGINAS).sort());
    for (const [caminho, ficheiro] of Object.entries(PAGINAS)) {
      assert.match(fonte(ficheiro), /<PaginaV2[^>]*\bchatEmDireto\b/, caminho);
    }
    const comChat = ficheiros(join(SRC, "app"))
      .filter((f) => /\bchatEmDireto\b/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f))
      .sort();
    assert.deepEqual(comChat, Object.values(PAGINAS).sort());
  });

  test("o componente só é usado pela moldura pública, com interruptor", () => {
    const usos = ficheiros(SRC)
      .filter((f) => !f.endsWith("ChatCrisp.tsx") && /<ChatCrisp\b|from "\.\/ChatCrisp"|marketing-v2\/ChatCrisp/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    assert.deepEqual(usos, ["components/marketing-v2/PaginaV2.tsx"]);
    assert.match(fonte("components/marketing-v2/PaginaV2.tsx"), /chatEmDireto && crispAtivo\(\) && <ChatCrisp \/>/);
  });

  test("nunca no portal, backoffice, /tratar-caso, /comprar, contas nem checkout", () => {
    const proibidos = ["app/[idioma]/portal", "app/backoffice", "app/[idioma]/tratar-caso", "app/[idioma]/comprar", "app/[idioma]/texto", "app/api", "components/portal", "components/backoffice", "components/compra"];
    for (const dir of proibidos) {
      let lista = [];
      try {
        lista = ficheiros(join(SRC, dir));
      } catch {
        continue;
      }
      for (const f of lista) {
        assert.doesNotMatch(readFileSync(f, "utf8"), /crisp/i, relative(SRC, f));
      }
    }
  });
});

describe("Crisp: carregamento", () => {
  const componente = fonte("components/marketing-v2/ChatCrisp.tsx");

  test("só depois do consentimento, sem duplicados, assíncrono", () => {
    assert.match(componente, /if \(crispPermitido\(window\.Cookiebot\)\)/);
    assert.match(componente, /CookiebotOnConsentReady/);
    assert.match(componente, /CookiebotOnDecline/);
    assert.match(componente, /script\.async = true/);
    assert.match(componente, /if \(crispCarregado\(\)\)/);
    assert.match(componente, /data-cookieconsent/);
  });

  test("retirada: apaga cookies e localStorage e deixa de correr", () => {
    assert.match(componente, /localStorage, sessionStorage/);
    assert.match(componente, /apagarDadosCrisp\(\);\s*location\.reload\(\)/);
  });

  test("nunca abre sozinho nem envia dados da página ou da conta", () => {
    assert.doesNotMatch(componente, /chat:open|user:|session:data|session:segments|session:event|message:send|message:show/);
    assert.doesNotMatch(fonte("lib/crisp.ts").replace(/^\s*\/\/.*$/gm, ""), /chat:open|user:|session:data/);
  });
});
