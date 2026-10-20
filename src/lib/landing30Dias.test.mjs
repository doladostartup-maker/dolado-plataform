// Landing /30-dias-gratis — `npm test`.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAMINHO_LANDING_30_DIAS,
  caminhoAtivacaoLanding,
  consultaUtm,
  lerUtm,
  origemRegistoDoDestino,
} from "./landing30Dias.ts";
import { lerOrigem } from "./protecaoGratuita.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

describe("UTM", () => {
  test("só os cinco UTM, limpos, pela mesma ordem", () => {
    const p = new URLSearchParams("utm_campaign=outubro&fbclid=abc&utm_source=facebook&utm_medium=paid%20social&email=x@y.pt");
    assert.deepEqual(lerUtm(p), { utm_source: "facebook", utm_medium: "paid social", utm_campaign: "outubro" });
    assert.equal(consultaUtm(lerUtm(p)), "&utm_source=facebook&utm_medium=paid%20social&utm_campaign=outubro");
  });
  test("valores vazios, longos ou com caracteres de controlo", () => {
    assert.deepEqual(lerUtm({ utm_source: "  ", utm_medium: "x".repeat(151), utm_term: "a\nb" }), { utm_term: "ab" });
    assert.deepEqual(lerUtm({ utm_source: ["ig", "fb"] }), { utm_source: "ig" });
  });
  test("caminho da activação leva a origem e os UTM codificados", () => {
    assert.equal(caminhoAtivacaoLanding(), "/experimentar-protecao?origem=landing_30d");
    assert.equal(caminhoAtivacaoLanding({ utm_campaign: "a&b=c" }), "/experimentar-protecao?origem=landing_30d&utm_campaign=a%26b%3Dc");
  });
});

describe("origem do registo", () => {
  test("só a activação vinda da landing (pt e en)", () => {
    assert.equal(origemRegistoDoDestino("/experimentar-protecao?origem=landing_30d&utm_source=fb"), "landing_30d");
    assert.equal(origemRegistoDoDestino("/en/experimentar-protecao?origem=landing_30d"), "landing_30d");
  });
  test("outros destinos ou origens → null", () => {
    for (const d of [
      "/experimentar-protecao?origem=homepage",
      "/comprar?plano=protecao&origem=landing_30d",
      "//evil.test/experimentar-protecao?origem=landing_30d",
      "https://evil.test/experimentar-protecao?origem=landing_30d",
      null,
      undefined,
    ]) {
      assert.equal(origemRegistoDoDestino(d), null, String(d));
    }
  });
  test("a origem landing_30d é aceite na activação (métricas)", () => {
    assert.equal(lerOrigem("landing_30d"), "landing_30d");
  });
});

describe("página e integrações", () => {
  test("servida em dolado.pt sem sessão (middleware)", () => {
    const m = ler("../middleware.ts");
    const marketing = m.slice(m.indexOf("const PAGINAS_SO_MARKETING"), m.indexOf("];", m.indexOf("const PAGINAS_SO_MARKETING")));
    assert.ok(marketing.includes(`"${CAMINHO_LANDING_30_DIAS}"`));
  });
  test("noindex e fora do sitemap", () => {
    assert.match(ler("../app/[idioma]/30-dias-gratis/page.tsx"), /robots: \{ index: false, follow: true \}/);
    assert.ok(!ler("./seo/indexacao.ts").includes(CAMINHO_LANDING_30_DIAS));
  });
  test("a landing não regista nem pede pagamento: só liga à activação existente", () => {
    const c = ler("../components/landing-30-dias/Landing30Dias.tsx");
    for (const proibido of ["signUp", "stripe", "createClient", "confirmarCompra", "<form"]) assert.ok(!c.includes(proibido), proibido);
    assert.ok(c.includes("urlAtivacaoLanding"));
  });
  test("eventos sem dados pessoais", () => {
    const c = ler("../components/landing-30-dias/Landing30Dias.tsx");
    assert.match(c, /track\("landing_30d_view"\)/);
    assert.match(c, /track\("landing_30d_cta_click", \{ local \}\)/);
  });
  test("migration aceita a origem na base de dados", () => {
    const sql = ler("../../supabase/migrations/20261020090000_landing_30_dias_gratis.sql");
    assert.match(sql, /'landing_30d', 'outro'/);
    assert.match(sql, /in \('homepage', 'precario', 'protecao', 'portal', 'landing_30d'\) then p_origem/);
  });
});
