// Landing /analisar-fatura — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { CAMINHO_ANALISAR_FATURA, EXEMPLO_FACTURA, ORIGEM_ANALISAR_FATURA, caminhoAnalisarFaturaDe, totaisExemplo } from "./analisarFatura.ts";
import { analisarFatura as pt } from "../i18n/mensagens/pt-PT/analisarFatura.ts";

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const textoPt = JSON.stringify(pt) + pt.exemplo.cartoes.destaques.pontual("1,00 €");

describe("regras", () => {
  test("destino de /30-dias-gratis mantém o idioma", () => {
    assert.equal(caminhoAnalisarFaturaDe("/30-dias-gratis"), CAMINHO_ANALISAR_FATURA);
    assert.equal(caminhoAnalisarFaturaDe("/en/30-dias-gratis"), `/en${CAMINHO_ANALISAR_FATURA}`);
  });
  test("o exemplo é calculado: total e cobranças pontuais vêm das linhas", () => {
    const t = totaisExemplo();
    assert.equal(t.totalCents, EXEMPLO_FACTURA.reduce((s, l) => s + l.valorCents, 0));
    assert.equal(t.pontuais, 1);
    assert.equal(t.pontuaisCents, EXEMPLO_FACTURA.find((l) => !l.recorrente).valorCents);
  });
});

describe("texto", () => {
  test("nunca promete erros, poupanças nem conclusões; sem a oferta dos 30 dias nem IA no texto principal", () => {
    const principal = JSON.stringify({ hero: pt.hero, exemplo: pt.exemplo, final: pt.final, metadados: pt.metadados }).toLowerCase();
    for (const proibido of ["poupe", "poupar", "ilegal", "indevid", "erro", "30 dias", "grátis", "inteligência artificial", " ia "]) {
      assert.ok(!principal.includes(proibido), proibido);
    }
  });
  test("o exemplo mostra só factos, como o resultado: sem passos a seguir", () => {
    const exemplo = JSON.stringify(pt.exemplo).toLowerCase() + pt.exemplo.cartoes.destaques.pontual("1,00 €").toLowerCase();
    for (const proibido of ["confirme", "peça", "compare", "recomend", "deve "]) assert.ok(!exemplo.includes(proibido), proibido);
    assert.deepEqual(Object.keys(pt.exemplo.cartoes), ["pagar", "destaques", "contrato"]);
  });
  test("o exemplo está identificado como ilustrativo", () => {
    assert.match(pt.exemplo.etiqueta, /ilustrativo/i);
    assert.ok(ler("../components/analisar-fatura/AnalisarFatura.tsx").includes("t.etiqueta"));
  });
  test("regras de escrita: e-mail com hífen, sem tu", () => {
    assert.ok(!/\bemail/i.test(textoPt));
    assert.ok(!/\b(preenche|o teu|a tua|carrega a tua)\b/i.test(textoPt));
  });
});

describe("página e integrações", () => {
  const m = ler("../middleware.ts");
  const lista = (nome) => m.slice(m.indexOf(`const ${nome}`), m.indexOf("];", m.indexOf(`const ${nome}`)));

  test("servida em dolado.pt sem sessão", () => {
    assert.ok(lista("PAGINAS_PUBLICAS").includes(`"${CAMINHO_ANALISAR_FATURA}"`));
    assert.ok(lista("PAGINAS_SO_MARKETING").includes(`"${CAMINHO_ANALISAR_FATURA}"`));
  });
  test("em portal.dolado.pt redirecciona para dolado.pt (medição só com o Cookiebot)", () => {
    assert.match(m, /host\.startsWith\("portal\."\) && caminho === CAMINHO_ANALISAR_FATURA\) \{\n\s+return NextResponse\.redirect\(new URL\(`\$\{pathname\}\$\{search\}`, "https:\/\/dolado\.pt"\), 308\);/);
  });
  test("/30-dias-gratis segue para aqui com os parâmetros, só com o diagnóstico ligado", () => {
    assert.match(m, /caminho === CAMINHO_LANDING_30_DIAS && diagnosticoAtivo\(\)\) \{\n\s+return NextResponse\.redirect\(new URL\(`\$\{caminhoAnalisarFaturaDe\(pathname\)\}\$\{search\}`, request\.url\), 307\);/);
  });
  test("noindex, fora do sitemap e sem o diagnóstico leva à Protecção", () => {
    const p = ler("../app/[idioma]/analisar-fatura/page.tsx");
    assert.match(p, /robots: \{ index: false, follow: true \}/);
    assert.match(p, /if \(!diagnosticoAtivo\(\)\) redirect/);
    assert.ok(!ler("./seo/indexacao.ts").includes(CAMINHO_ANALISAR_FATURA));
  });
  test("usa o carregamento real do diagnóstico, sem registo, pagamento nem preços", () => {
    const c = ler("../components/analisar-fatura/AnalisarFatura.tsx");
    assert.ok(c.includes("useCarregamento("));
    assert.ok(c.includes("ORIGEM_ANALISAR_FATURA"));
    for (const proibido of ["signUp", "stripe", "confirmarCompra", "PLANOS", "<form", "experimentar-protecao"]) assert.ok(!c.includes(proibido), proibido);
  });
  test("o resultado só muda a secção da Protecção com a origem conhecida", () => {
    const p = ler("../app/[idioma]/diagnostico/page.tsx");
    assert.ok(p.includes("consulta.origem === ORIGEM_ANALISAR_FATURA ? ORIGEM_ANALISAR_FATURA : null"));
    assert.equal(ORIGEM_ANALISAR_FATURA, "analisar_fatura");
  });
});
