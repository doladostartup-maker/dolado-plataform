// sitemap.xml, robots.txt e hreflang — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { CAMINHOS_BLOQUEADOS, PAGINAS_BILINGUES, PAGINAS_SO_PORTUGUES, entradasSitemap, regrasRobots } from "./indexacao.ts";
import { alternativas } from "../../i18n/metadados.ts";

const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("sitemap", () => {
  const entradas = entradasSitemap();
  const urls = entradas.map((e) => e.url);

  test("páginas públicas em pt-PT e en-GB, URLs absolutas de produção, sem repetidos", () => {
    assert.equal(urls.length, PAGINAS_BILINGUES.length * 2 + PAGINAS_SO_PORTUGUES.length);
    assert.equal(new Set(urls).size, urls.length);
    for (const u of urls) assert.match(u, /^https:\/\/dolado\.pt(\/|$)/);
    assert.ok(urls.includes("https://dolado.pt"));
    assert.ok(urls.includes("https://dolado.pt/en"));
    assert.ok(urls.includes("https://dolado.pt/precario"));
    assert.ok(urls.includes("https://dolado.pt/en/precario"));
  });

  test("correspondência PT/EN igual ao hreflang de cada página", () => {
    for (const caminho of PAGINAS_BILINGUES) {
      const meta = alternativas("pt-PT", caminho).languages;
      for (const e of entradas.filter((x) => x.alternates?.languages["pt-PT"] === meta["pt-PT"])) {
        assert.deepEqual(e.alternates.languages, meta);
      }
    }
  });

  test("legais só em português; nada privado, com token, noindex ou técnico", () => {
    assert.ok(urls.includes("https://dolado.pt/termos"));
    assert.ok(!urls.includes("https://dolado.pt/en/termos"));
    for (const u of urls) {
      assert.doesNotMatch(u, /portal\.|\/portal|\/backoffice|\/api\/|\/auth\/|\/texto\/|\/r\/|\/comprar|\/conta(\/|$)|\/redefinir|\/recuperar|\/confirmar-email|\/associar-compra|\/termos\/\d|\/privacidade\/\d/);
    }
  });

  test("todas as páginas do sitemap são servidas em dolado.pt (middleware) e têm canonical/hreflang", () => {
    const middleware = ler("../../middleware.ts");
    const marketing = middleware.slice(middleware.indexOf("const PAGINAS_SO_MARKETING"), middleware.indexOf("];", middleware.indexOf("const PAGINAS_SO_MARKETING")));
    for (const c of [...PAGINAS_BILINGUES, ...PAGINAS_SO_PORTUGUES]) assert.ok(marketing.includes(`"${c}"`), c);
    for (const c of PAGINAS_BILINGUES) {
      const pagina = ler(`../../app/[idioma]${c === "/" ? "" : c}/page.tsx`);
      assert.match(pagina, new RegExp(`metadadosPublicos\\(idioma, "${c}"`), c);
    }
  });
});

describe("robots.txt", () => {
  const r = regrasRobots();

  test("aponta para o sitemap de produção e não bloqueia assets", () => {
    assert.equal(r.sitemap, "https://dolado.pt/sitemap.xml");
    assert.equal(r.rules[0].allow, "/");
    for (const d of r.rules[0].disallow) assert.doesNotMatch(d, /^\/_next|\.(js|css|png|svg|webp)$|^\/brand|^\/landing/);
  });

  test("bloqueia áreas privadas/técnicas, em português e em /en", () => {
    for (const c of ["/api/", "/auth/", "/backoffice", "/portal", "/en/portal", "/texto/", "/en/texto/", "/conta$", "/en/conta$"]) assert.ok(r.rules[0].disallow.includes(c), c);
    assert.ok(CAMINHOS_BLOQUEADOS.length > 5);
    // Nenhuma página do sitemap fica bloqueada.
    for (const e of entradasSitemap()) {
      const caminho = new URL(e.url).pathname;
      for (const d of r.rules[0].disallow) {
        const bloqueia = d.endsWith("$") ? caminho === d.slice(0, -1) : caminho.startsWith(d);
        assert.ok(!bloqueia, `${caminho} bloqueado por ${d}`);
      }
    }
  });

  test("middleware: /robots.txt e /sitemap.xml nunca são redirecionados para o portal", () => {
    const m = ler("../../middleware.ts");
    assert.match(m, /const FICHEIROS_SEO = \["\/robots\.txt", "\/sitemap\.xml"\]/);
    const semIdioma = m.slice(m.indexOf("async function encaminharSemIdioma"));
    assert.match(semIdioma, /!FICHEIROS_SEO\.includes\(pathname\)/);
  });
});
