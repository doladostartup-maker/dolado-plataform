// E-book gratuito e página /guia-facturas — `npm test`.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  CAMINHO_GUIA_FACTURAS,
  FICHEIRO_GUIA_FACTURAS,
  classificarOrigem,
  guiaFacturasAtivo,
  normalizarEmail,
  origemValida,
  utmDoFormulario,
} from "./guiaFacturas.ts";
import { CONSENTIMENTO_COMUNICACOES_GUIA_VERSAO, TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA } from "./legal.ts";
import { assuntoGuiaFacturas, montarHtmlGuiaFacturas, montarTextoGuiaFacturas } from "./email/guiaFacturas.ts";
import { PAGINAS_BILINGUES } from "./seo/indexacao.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const raiz = (caminho) => new URL(`../../${caminho}`, import.meta.url);

describe("e-mail", () => {
  test("normaliza e aceita endereços comuns", () => {
    assert.equal(normalizarEmail("  Ana.Silva@Exemplo.PT "), "ana.silva@exemplo.pt");
    assert.equal(normalizarEmail("joao+guia@sapo.pt"), "joao+guia@sapo.pt");
    assert.equal(normalizarEmail("a.b@mail.co.uk"), "a.b@mail.co.uk");
  });
  test("recusa o que não é um endereço", () => {
    for (const v of ["", "ana", "ana@", "@exemplo.pt", "ana@exemplo", "ana @exemplo.pt", "ana@exemplo.p", "ana..b@exemplo.pt", ".ana@exemplo.pt",
      "ana@-exemplo.pt", "<script>@x.pt", `${"a".repeat(65)}@exemplo.pt`, `a@${"b".repeat(250)}.pt`, null, undefined, 42, ["a@b.pt"]]) {
      assert.equal(normalizarEmail(v), null, String(v));
    }
  });
});

describe("origem da campanha", () => {
  test("UTM do Instagram, do Facebook e dos anúncios", () => {
    assert.equal(classificarOrigem({ utm_source: "instagram", utm_medium: "social" }), "instagram");
    assert.equal(classificarOrigem({ utm_source: "ig", utm_medium: "bio" }), "instagram");
    assert.equal(classificarOrigem({ utm_source: "facebook", utm_medium: "post" }), "facebook");
    assert.equal(classificarOrigem({ utm_source: "fb" }), "facebook");
    assert.equal(classificarOrigem({ utm_source: "facebook", utm_medium: "paid_social" }), "meta_ads");
    assert.equal(classificarOrigem({ utm_source: "meta", utm_medium: "cpc" }), "meta_ads");
    assert.equal(classificarOrigem({ utm_source: "ig", utm_medium: "paid" }), "meta_ads");
    assert.equal(classificarOrigem({ utm_source: "newsletter_parceiro" }), "outro");
  });
  test("sem UTM: fbclid, referrer ou directo", () => {
    assert.equal(classificarOrigem({}, null, true), "meta_ads");
    assert.equal(classificarOrigem({}, "l.instagram.com"), "instagram");
    assert.equal(classificarOrigem({}, "m.facebook.com"), "facebook");
    assert.equal(classificarOrigem({}, "lm.facebook.com"), "facebook");
    assert.equal(classificarOrigem({}, "www.google.com"), "outro");
    assert.equal(classificarOrigem({}, null), "directo");
    assert.equal(classificarOrigem({}, "instagram.com.exemplo.net"), "outro");
  });
  test("só valores da lista fechada chegam à base de dados", () => {
    assert.equal(origemValida("instagram"), "instagram");
    assert.equal(origemValida("tiktok"), "outro");
    assert.equal(origemValida(null), "outro");
  });
  test("UTM do formulário: só os cinco, limpos e com tamanho máximo", () => {
    const f = new Map([["utm_source", " instagram "], ["utm_campaign", "guia\u0000_out"], ["utm_term", "x".repeat(151)], ["email", "ana@x.pt"]]);
    assert.deepEqual(utmDoFormulario(f), { utm_source: "instagram", utm_campaign: "guia_out" });
  });
});

describe("interruptor e rotas", () => {
  test("desligado por omissão", () => {
    assert.equal(guiaFacturasAtivo({}), false);
    assert.equal(guiaFacturasAtivo({ GUIA_FACTURAS_ATIVO: "1" }), true);
    assert.match(ler("../app/[idioma]/guia-facturas/page.tsx"), /if \(!guiaFacturasAtivo\(\)\) redirect/);
    assert.match(ler("../app/actions/guiaFacturas.ts"), /if \(!guiaFacturasAtivo\(\)\) return \{ ok: false, erro: "indisponivel" \}/);
  });
  test("servida em dolado.pt, sem sessão, e indexável com hreflang", () => {
    const m = ler("../middleware.ts");
    for (const lista of ["const PAGINAS_PUBLICAS", "const PAGINAS_SO_MARKETING"]) {
      const bloco = m.slice(m.indexOf(lista), m.indexOf("];", m.indexOf(lista)));
      assert.ok(bloco.includes(`"${CAMINHO_GUIA_FACTURAS}"`), lista);
    }
    assert.ok(PAGINAS_BILINGUES.includes(CAMINHO_GUIA_FACTURAS));
    assert.doesNotMatch(ler("../app/[idioma]/guia-facturas/page.tsx"), /index: false/);
  });
  test("o PDF não passa pelo middleware (sem redireccionamento para o portal)", () => {
    assert.match(ler("../middleware.ts"), /svg\|png\|jpg\|jpeg\|gif\|webp\|pdf\)\$/);
  });
  test("imagem de partilha nas metatags", () => {
    const p = ler("../app/[idioma]/guia-facturas/page.tsx");
    assert.match(p, /images: \[\{ url: IMAGEM_PARTILHA, width: 1200, height: 630/);
    assert.match(p, /summary_large_image/);
  });
});

describe("privacidade e consentimento", () => {
  const acao = ler("../app/actions/guiaFacturas.ts");
  const componente = ler("../components/guia-facturas/GuiaFacturas.tsx");

  test("autorização comercial: texto do prompt, versão, e só com a caixa marcada", () => {
    assert.equal(TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA, "Quero receber dicas, novidades e comunicações da DoLado por e-mail.");
    assert.match(CONSENTIMENTO_COMUNICACOES_GUIA_VERSAO, /^\d{4}-\d{2}-\d{2}[a-z]?$/);
    assert.match(acao, /p_consentimento_texto: comunicacoes \? TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA : null/);
    // Desmarcada por omissão e nunca obrigatória.
    const caixa = componente.slice(componente.indexOf('type="checkbox"') - 40, componente.indexOf("/>", componente.indexOf('type="checkbox"')));
    assert.doesNotMatch(caixa, /defaultChecked|required/);
    assert.match(componente, /const \[comunicacoes, setComunicacoes\] = useState\(false\)/);
  });
  test("só o e-mail é pedido", () => {
    const campos = [...componente.matchAll(/name=\{CAMPOS_GUIA\.(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(campos, ["armadilha", "comunicacoes", "email", "idioma", "origem"]);
    assert.doesNotMatch(componente, /name="(nome|telefone|nif|morada|password)"/);
  });
  test("o e-mail nunca vai para logs nem para analytics", () => {
    for (const linha of acao.split("\n").filter((l) => l.includes("console."))) assert.doesNotMatch(linha, /email[,)}]|\$\{email/);
    for (const m of componente.matchAll(/track\("[^"]+"(, \{[^}]*\})?\)/g)) assert.doesNotMatch(m[0], /email/);
    assert.doesNotMatch(componente, /fbq\([^)]*email/);
  });
  test("anti-abuso: armadilha, limite por IP e escrita só pela função da base de dados", () => {
    assert.match(acao, /form\.get\(CAMPOS_GUIA\.armadilha\)/);
    assert.match(acao, /excedeuLimiteTaxa\(`guia:\$\{await obterIp\(\)\}`\)/);
    assert.match(acao, /rpc\("guia_registar_pedido"/);
    assert.doesNotMatch(acao, /\.from\("guias_pedidos"\)|auth\.admin|signUp/);
  });
  test("o e-mail transaccional não bloqueia o download nem é publicidade", () => {
    assert.match(acao, /after\(async \(\) =>/);
    assert.match(acao, /guia_libertar_email/);
    for (const idioma of ["pt-PT", "en-GB"]) {
      const html = montarHtmlGuiaFacturas(idioma);
      assert.ok(html.includes(`https://dolado.pt${FICHEIRO_GUIA_FACTURAS}`));
      assert.doesNotMatch(html, /protecao|Protec/i);
      assert.ok(montarTextoGuiaFacturas(idioma).includes(FICHEIRO_GUIA_FACTURAS));
      assert.ok(assuntoGuiaFacturas(idioma).length > 5);
    }
    assert.match(montarHtmlGuiaFacturas("pt-PT"), /lang="pt-PT"/);
    assert.match(montarHtmlGuiaFacturas("en-GB"), /lang="en-GB"/);
  });
});

describe("e-book (PDF)", async () => {
  const caminho = raiz(`public${FICHEIRO_GUIA_FACTURAS}`);
  test("o PDF e as imagens existem", () => {
    assert.ok(existsSync(caminho));
    assert.ok(existsSync(raiz("public/guias/capa-guia-facturas.jpg")));
    assert.ok(existsSync(raiz("public/guias/partilha-guia-facturas.jpg")));
    assert.ok(existsSync(raiz("conteudos/guia-facturas/guia-facturas.html")), "fonte editável");
  });
  const bytes = readFileSync(caminho);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });

  test("16 páginas A4, abaixo de 2 MB", () => {
    assert.equal(pdf.getPageCount(), 16);
    for (const p of pdf.getPages()) {
      const { width, height } = p.getSize();
      assert.ok(Math.abs(width - 595.3) < 2 && Math.abs(height - 841.9) < 2, `${width}×${height}`);
    }
    assert.ok(bytes.length < 2 * 1024 * 1024);
  });
  test("metadados preenchidos", () => {
    assert.match(pdf.getTitle() ?? "", /^Está a pagar mais do que devia\?/);
    assert.equal(pdf.getAuthor(), "DoLado");
    assert.ok((pdf.getSubject() ?? "").length > 20);
    assert.ok((pdf.getKeywords() ?? "").includes("facturas"));
  });
  test("ligações externas funcionais (Protecção, Calculadora, fontes oficiais)", () => {
    const uris = [];
    for (const p of pdf.getPages()) {
      const anotacoes = p.node.Annots();
      if (!anotacoes) continue;
      for (const ref of anotacoes.asArray()) {
        const a = pdf.context.lookup(ref);
        const acao = a.lookup(PDFName.of("A"));
        const uri = acao?.lookup?.(PDFName.of("URI"));
        if (uri) uris.push(uri.decodeText ? uri.decodeText() : String(uri.value ?? uri));
      }
    }
    const todas = uris.join(" ");
    for (const esperado of ["dolado.pt/protecao", "dolado.pt/calculadora-cancelamento", "diariodarepublica.pt", "anacom-consumidor.pt", "erse.pt", "ersar.pt", "livroreclamacoes.pt"]) {
      assert.ok(todas.includes(esperado), esperado);
    }
    assert.ok(uris.every((u) => u.startsWith("https://") || u.startsWith("mailto:")), "só https e mailto");
  });
});
