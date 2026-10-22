// Landing /30-dias-gratis — `npm test`.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAMINHO_LANDING_30_DIAS,
  EXEMPLOS_LANDING,
  saltarParaRegisto,
  caminhoAtivacaoLanding,
  consultaUtm,
  lerUtm,
  origemRegistoDoDestino,
} from "./landing30Dias.ts";
import { lerOrigem } from "./protecaoGratuita.ts";
import { landing30Dias as pt } from "../i18n/mensagens/pt-PT/landing30Dias.ts";
import { landing30Dias as en } from "../i18n/mensagens/en-GB/landing30Dias.ts";

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
  test("em portal.dolado.pt redirecciona para dolado.pt (sem Cookiebot no portal não há medição)", () => {
    const m = ler("../middleware.ts");
    assert.match(m, /host\.startsWith\("portal\."\) && caminho === CAMINHO_LANDING_30_DIAS\) \{\n\s+return NextResponse\.redirect\(new URL\(`\$\{pathname\}\$\{search\}`, "https:\/\/dolado\.pt"\), 308\);/);
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
    assert.match(c, /useEventoVista\("landing_30d_view"\)/);
    assert.match(c, /track\("landing_30d_cta_click", \{ local \}\)/);
    assert.match(c, /type Local = "topo" \| "final" \| "barra";/);
  });
  test("migration aceita a origem na base de dados", () => {
    const sql = ler("../../supabase/migrations/20261020090000_landing_30_dias_gratis.sql");
    assert.match(sql, /'landing_30d', 'outro'/);
    assert.match(sql, /in \('homepage', 'precario', 'protecao', 'portal', 'landing_30d'\) then p_origem/);
  });
});

describe("percurso até ao registo", () => {
  test("da landing sem sessão salta a explicação intermédia; outras origens não", () => {
    assert.equal(saltarParaRegisto("landing_30d", false), true);
    assert.equal(saltarParaRegisto("landing_30d", true), false);
    assert.equal(saltarParaRegisto("diagnostico", false), true);
    for (const o of ["homepage", "precario", "protecao", "portal", "outro"]) assert.equal(saltarParaRegisto(o, false), false, o);
  });
  test("a activação redirecciona para o registo com a própria activação como destino", () => {
    const c = ler("../app/[idioma]/experimentar-protecao/page.tsx");
    assert.match(c, /saltarParaRegisto\(origem, motivo !== "sem_sessao"\)/);
    assert.match(c, /redirect\(localizarHref\(idioma, `\/registo\?next=\$\{encodeURIComponent\(aqui\)\}`\)\)/);
    // Com sessão, a aceitação dos Termos continua na activação (nunca saltada).
    assert.match(c, /<FormularioAtivacao origem=\{origem\} \/>/);
  });
  test("o registo mostra a oferta só quando vem da landing e mantém o código de parceiro", () => {
    const c = ler("../app/[idioma]/registo/page.tsx");
    assert.match(c, /const daLanding = origemRegistoDoDestino\(next\) !== null;/);
    assert.match(c, /name="codigo_parceiro"/);
    assert.match(c, /<details open=\{params\.erro === tp\.invalido\}>/);
  });
});

describe("conteúdo", () => {
  test("exemplos: diferença calculada (+7,00 €) e marcados como fictícios", () => {
    assert.equal(EXEMPLOS_LANDING.factura.actualCents - EXEMPLOS_LANDING.factura.anteriorCents, 700);
    assert.equal(EXEMPLOS_LANDING.promocao.mensalidadeCents, 2990);
    assert.match(pt.exemplos.ficticio, /fictício/);
    assert.match(en.exemplos.ficticio, /[Ff]ictitious/);
  });
  test("reclamações nunca incluídas nos 30 dias; sem cartão; cobrança perto do fim explicada", () => {
    for (const [t, reclam, cartao, doisDias] of [
      [pt, /tratamento de reclamações não está incluído/, /cartão bancário/, /menos de 2 dias/],
      [en, /[Cc]omplaint handling is not included/, /bank card/, /fewer than 2 days/],
    ]) {
      assert.match(t.topo.condicoes("4,99 €").join(" "), reclam);
      assert.match(t.topo.condicoes("4,99 €").join(" "), cartao);
      const fim = t.perguntas.itens("4,99 €", 6).find((q) => q.id === "fim");
      assert.match(fim.resposta, doisDias);
    }
  });
  test("cinco perguntas, pela ordem das dúvidas que impedem a inscrição", () => {
    assert.deepEqual(pt.perguntas.itens("x", 6).map((q) => q.id), ["recebo", "cartao", "fim", "documentos", "cancelar"]);
    assert.deepEqual(en.perguntas.itens("x", 6).map((q) => q.id), ["recebo", "cartao", "fim", "documentos", "cancelar"]);
  });
  test("sem promessas de poupança nem números de clientes", () => {
    const tudo = JSON.stringify(pt) + JSON.stringify(en) + pt.perguntas.itens("p", 6).map((q) => q.resposta).join(" ");
    assert.doesNotMatch(tudo, /poupe|poupança garantida|garantimos|milhares de clientes|save money|guaranteed/i);
  });
});
