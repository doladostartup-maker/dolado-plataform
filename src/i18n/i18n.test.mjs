// Idiomas (pt-PT / en-GB) — `npm test`.
// Dicionários completos e em inglês britânico, regras de URL do middleware,
// fallback para o português e páginas que nunca têm idioma.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  IDIOMA_PADRAO,
  LOCALE_STRIPE,
  caminhoEquivalente,
  caminhoNoIdioma,
  dominioCookieIdioma,
  ehCaminhoSemIdioma,
  idiomaDoSegmento,
  localizarHref,
  normalizarIdioma,
  separarIdioma,
} from "./config.ts";
import { chavesEmFalta, completar, dicionario } from "./dicionario.ts";
import { tRotulos, rotulo } from "./mensagens/rotulos.ts";
import { traduzirMensagemProtecao } from "./mensagens/protecao.ts";
import { MOMENTOS, PROBLEMAS, SETORES } from "../lib/pedidoCaso.ts";
import { MSG_ERRO_GUARDAR } from "../lib/mensagensErro.ts";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const MENSAGENS = join(AQUI, "mensagens");
const SRC = join(AQUI, "..");
const dominios = readdirSync(join(MENSAGENS, "pt-PT"))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.replace(/\.ts$/, ""));

async function par(dominio) {
  const pt = await import(join(MENSAGENS, "pt-PT", `${dominio}.ts`));
  const en = await import(join(MENSAGENS, "en-GB", `${dominio}.ts`));
  const nome = Object.keys(pt).find((k) => typeof pt[k] === "object");
  return { pt: pt[nome], en: en[nome], nome };
}

/** Todos os textos de um dicionário (funções chamadas com argumentos de exemplo). */
function textos(valor, saida = []) {
  if (typeof valor === "string") saida.push(valor);
  else if (typeof valor === "function") {
    try {
      const r = valor(...Array.from({ length: valor.length }, (_, i) => (i === 0 ? 2 : "X")));
      textos(r, saida);
    } catch {
      // funções que esperam listas ou objetos: o texto-fonte é verificado à parte
    }
  } else if (Array.isArray(valor)) valor.forEach((v) => textos(v, saida));
  else if (valor && typeof valor === "object") Object.values(valor).forEach((v) => textos(v, saida));
  return saida;
}

describe("dicionários", () => {
  test("cada domínio português tem a versão inglesa", () => {
    const ingleses = readdirSync(join(MENSAGENS, "en-GB")).filter((f) => f.endsWith(".ts"));
    assert.deepEqual(ingleses.sort(), dominios.map((d) => `${d}.ts`).sort());
    for (const d of dominios) assert.ok(readFileSync(join(MENSAGENS, `${d}.ts`), "utf8").includes("dicionario("), `${d}: índice sem dicionario()`);
  });

  for (const d of dominios) {
    test(`${d}: inglês com todas as chaves, sem textos vazios`, async () => {
      const { pt, en } = await par(d);
      assert.ok(pt && en, `${d}: exportação em falta`);
      assert.deepEqual(chavesEmFalta(pt, en), []);
    });
  }

  test("inglês britânico (sem grafias americanas)", async () => {
    const americano =
      /\b(authoriz\w*|organiz\w*|recogniz\w*|analyz\w*|canceled|canceling|color\w*|favor\w*|behavior\w*|center|centers|catalog|fulfill|enroll|program(?!me)|license(?=d? (?:to|for))|gotten|apartment|zip code|cell ?phone|vacation)\b/i;
    for (const d of dominios) {
      const { en } = await par(d);
      for (const t of textos(en)) assert.doesNotMatch(t, americano, `${d}: "${t}"`);
    }
  });

  test("inglês sem palavras portuguesas esquecidas", async () => {
    const portugues = /(?<!\p{L})(você|não|está|são|também|fatura|faturas|mensalidade|subscrição|então|serviço|contrato)(?!\p{L})/iu;
    for (const d of dominios) {
      if (d === "rotulos" || d === "monitor" || d === "juridico" || d === "legal") continue; // mapas indexados pelo valor gravado em português
      const { en } = await par(d);
      for (const t of textos(en)) {
        if (/^(?:[A-Z]{2,}|NIF|CPE|CUI|IBAN)\b/.test(t)) continue;
        assert.doesNotMatch(t, portugues, `${d}: "${t}"`);
      }
    }
  });

  test("a marca não se traduz nem leva artigo masculino", async () => {
    for (const d of dominios) {
      const { pt, en } = await par(d);
      for (const t of textos(pt)) assert.doesNotMatch(t, /(?<!\p{L})(?:[oO]|do|no|pelo) DoLado\b|\bDolado\b/u, `${d} (pt): "${t}"`);
      for (const t of textos(en)) assert.doesNotMatch(t, /\bDolado\b|\bTheSide\b/, `${d} (en): "${t}"`);
    }
  });

  test("português segue as regras de escrita (e-mail, sem tu)", async () => {
    for (const d of dominios) {
      const { pt } = await par(d);
      for (const t of textos(pt)) {
        assert.doesNotMatch(t, /(?<![\p{L}{<-])emails?(?![\p{L}}/])/iu, `${d}: "${t}"`);
        assert.doesNotMatch(t, /(?<!\p{L})(você|o teu|a tua|preenche|tela|celular|cadastro)(?!\p{L})/iu, `${d}: "${t}"`);
      }
    }
  });

  test("tradução em falta cai no português (nunca numa chave)", () => {
    const pt = { titulo: "Olá", lista: ["um", "dois"], grupo: { a: "A", b: (n) => `${n} b` } };
    const en = { titulo: "", lista: ["one"], grupo: { a: "A-en" } };
    assert.deepEqual(chavesEmFalta(pt, en).sort(), ["grupo.b", "lista", "titulo"]);
    const c = completar(pt, en);
    assert.equal(c.titulo, "Olá");
    assert.deepEqual(c.lista, ["um", "dois"]);
    assert.equal(c.grupo.a, "A-en");
    assert.equal(c.grupo.b(2), "2 b");

    const avisos = [];
    const original = console.warn;
    console.warn = (m) => avisos.push(m);
    try {
      const t = dicionario("teste", pt, en);
      assert.equal(t["en-GB"].titulo, "Olá");
      assert.equal(t["pt-PT"], pt);
    } finally {
      console.warn = original;
    }
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /\[i18n\] teste: 3 tradução/);
  });

  test("valores gravados em português têm rótulo inglês (setores, problemas, momentos)", () => {
    for (const s of SETORES) assert.ok(tRotulos["en-GB"].setores[s], `setor ${s}`);
    for (const p of PROBLEMAS) assert.ok(tRotulos["en-GB"].problemas[p], `problema ${p}`);
    for (const m of MOMENTOS) assert.ok(tRotulos["en-GB"].momentos[m], `momento ${m}`);
    assert.equal(rotulo("pt-PT", "setores", "Gás"), "Gás");
    assert.equal(rotulo("en-GB", "setores", "Gás"), "Gas");
    // Valor desconhecido (dado antigo): mostra-se tal como está, nunca uma chave.
    assert.equal(rotulo("en-GB", "setores", "Setor antigo"), "Setor antigo");
  });

  test("mensagens das ações traduzidas; desconhecidas ficam como estão", () => {
    assert.equal(traduzirMensagemProtecao("pt-PT", MSG_ERRO_GUARDAR), MSG_ERRO_GUARDAR);
    assert.match(traduzirMensagemProtecao("en-GB", MSG_ERRO_GUARDAR), /^We couldn't complete/);
    assert.equal(traduzirMensagemProtecao("en-GB", "Indique o fornecedor."), "Enter the provider.");
    assert.equal(traduzirMensagemProtecao("en-GB", "Outra coisa"), "Outra coisa");
  });
});

describe("URLs", () => {
  test("português sem prefixo, inglês em /en", () => {
    assert.deepEqual(separarIdioma("/precario"), { idioma: "pt-PT", caminho: "/precario", prefixado: false });
    assert.deepEqual(separarIdioma("/en/precario"), { idioma: "en-GB", caminho: "/precario", prefixado: true });
    assert.deepEqual(separarIdioma("/en"), { idioma: "en-GB", caminho: "/", prefixado: true });
    // "/entrar" começa por "/en" mas não é inglês.
    assert.deepEqual(separarIdioma("/entrar"), { idioma: "pt-PT", caminho: "/entrar", prefixado: false });
    assert.equal(caminhoNoIdioma("en-GB", "/"), "/en");
    assert.equal(caminhoNoIdioma("en-GB", "/portal/casos/123"), "/en/portal/casos/123");
    assert.equal(caminhoNoIdioma("en-GB", "/en/precario"), "/en/precario");
    assert.equal(caminhoNoIdioma("pt-PT", "/en/precario"), "/precario");
    assert.equal(caminhoNoIdioma("en-GB", "/?ref=x"), "/en?ref=x");
  });

  test("APIs, webhooks, /auth, backoffice e ficheiros nunca têm idioma", () => {
    for (const c of [
      "/api/stripe/webhook",
      "/api/webhooks/resend/inbound",
      "/api/internal/resumo-mensal",
      "/auth/callback",
      "/auth/login/google",
      "/backoffice",
      "/backoffice/casos/1",
      "/_next/static/x.js",
      "/favicon.ico",
      "/robots.txt",
    ]) {
      assert.ok(ehCaminhoSemIdioma(c), c);
      assert.equal(caminhoNoIdioma("en-GB", c), c, c);
      assert.equal(localizarHref("en-GB", c), c, c);
    }
    for (const c of ["/", "/precario", "/portal", "/tratar-caso/conta", "/texto/abc/rever", "/entrar"]) assert.ok(!ehCaminhoSemIdioma(c), c);
  });

  test("ligações: caminhos e URLs da DoLado localizados; externos, âncoras e e-mail intactos", () => {
    assert.equal(localizarHref("pt-PT", "/precario"), "/precario");
    assert.equal(localizarHref("en-GB", "/precario#faq"), "/en/precario#faq");
    assert.equal(localizarHref("en-GB", "https://dolado.pt/tratar-caso?origem=%2Fportal"), "https://dolado.pt/en/tratar-caso?origem=%2Fportal");
    assert.equal(localizarHref("en-GB", "https://portal.dolado.pt/comprar?plano=avulso"), "https://portal.dolado.pt/en/comprar?plano=avulso");
    assert.equal(localizarHref("en-GB", "https://portal.dolado.pt/api/x"), "https://portal.dolado.pt/api/x");
    assert.equal(localizarHref("en-GB", "https://www.livroreclamacoes.pt/"), "https://www.livroreclamacoes.pt/");
    assert.equal(localizarHref("en-GB", "#conteudo"), "#conteudo");
    assert.equal(localizarHref("en-GB", "mailto:contacto@dolado.pt"), "mailto:contacto@dolado.pt");
    assert.equal(localizarHref("en-GB", "//cdn.exemplo.com/x"), "//cdn.exemplo.com/x");
  });

  test("seletor: mesma página no outro idioma, com a pesquisa", () => {
    assert.equal(caminhoEquivalente("/portal/casos/1", "en-GB", "?ok=1"), "/en/portal/casos/1?ok=1");
    assert.equal(caminhoEquivalente("/en/portal/casos/1", "pt-PT"), "/portal/casos/1");
    assert.equal(caminhoEquivalente("/en", "pt-PT"), "/");
    assert.equal(caminhoEquivalente("/", "en-GB"), "/en");
    // Ligações com token: o token não muda, só o prefixo.
    assert.equal(caminhoEquivalente("/texto/tok_123/rever", "en-GB"), "/en/texto/tok_123/rever");
    assert.equal(caminhoEquivalente("/backoffice", "en-GB"), "/en");
  });

  test("idioma por omissão é o português; valores desconhecidos não mudam nada", () => {
    assert.equal(IDIOMA_PADRAO, "pt-PT");
    assert.equal(normalizarIdioma(undefined), "pt-PT");
    assert.equal(normalizarIdioma("en-US"), "pt-PT");
    assert.equal(normalizarIdioma("en-GB"), "en-GB");
    assert.equal(idiomaDoSegmento("en"), "en-GB");
    assert.equal(idiomaDoSegmento("pt"), "pt-PT");
    assert.equal(idiomaDoSegmento("fr"), null);
  });

  test("cookie partilhado entre dolado.pt e portal.dolado.pt; local sem domínio", () => {
    assert.equal(dominioCookieIdioma("dolado.pt"), ".dolado.pt");
    assert.equal(dominioCookieIdioma("portal.dolado.pt:443"), ".dolado.pt");
    assert.equal(dominioCookieIdioma("localhost:3000"), undefined);
    assert.equal(dominioCookieIdioma("evil-dolado.pt"), undefined);
  });

  test("Stripe: só o idioma do Checkout muda (mesmos preços e produtos)", () => {
    assert.equal(LOCALE_STRIPE["pt-PT"], "pt");
    assert.equal(LOCALE_STRIPE["en-GB"], "en-GB");
    const stripe = readFileSync(join(SRC, "app/actions/stripe.ts"), "utf8");
    assert.doesNotMatch(stripe, /price_[A-Za-z0-9]+/, "os Price IDs vêm de src/lib, nunca do idioma");
  });
});

describe("middleware e páginas", () => {
  const middleware = readFileSync(join(SRC, "middleware.ts"), "utf8");

  test("o idioma do browser nunca é usado", () => {
    assert.doesNotMatch(middleware, /accept-language/i);
    assert.doesNotMatch(readFileSync(join(AQUI, "servidor.ts"), "utf8"), /accept-language/i);
  });

  test("preferência só redireciona navegação (GET/HEAD), nunca Server Actions", () => {
    assert.match(middleware, /preferido === "en-GB" && \(request\.method === "GET" \|\| request\.method === "HEAD"\)/);
  });

  test("rotas sem idioma seguem as regras de sempre (sem reescrita)", () => {
    assert.match(middleware, /if \(ehCaminhoSemIdioma\(caminho\)\)/);
    assert.match(middleware, /return encaminharSemIdioma\(request, host, pathname, search\)/);
  });

  test("o backoffice não existe em inglês nem usa dicionários", () => {
    const ficheiros = [];
    const percorrer = (d) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory()) percorrer(join(d, f.name));
        else if (/\.tsx?$/.test(f.name)) ficheiros.push(join(d, f.name));
      }
    };
    percorrer(join(SRC, "app/backoffice"));
    percorrer(join(SRC, "components/backoffice"));
    for (const f of ficheiros) assert.doesNotMatch(readFileSync(f, "utf8"), /@\/i18n\/mensagens/, f);
    assert.match(readFileSync(join(SRC, "app/backoffice/layout.tsx"), "utf8"), /lang="pt-PT"/);
    assert.ok(!readdirSync(join(SRC, "app/[idioma]")).includes("backoffice"));
  });

  test("páginas do portal fora dos motores de pesquisa", () => {
    assert.match(readFileSync(join(SRC, "app/[idioma]/portal/layout.tsx"), "utf8"), /index:\s*false/);
  });

  test("uma só árvore de páginas para os dois idiomas", () => {
    const app = readdirSync(join(SRC, "app"));
    assert.ok(!app.includes("en") && !app.includes("pt"), "sem páginas duplicadas por idioma");
    assert.match(readFileSync(join(SRC, "app/[idioma]/layout.tsx"), "utf8"), /dynamicParams = false/);
  });
});
