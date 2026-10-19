import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { SEM_CONSENTIMENTO, lerConsentimento, metaPixelId, scriptsDeMedicao } from "./consentimentoMedicao.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("medição só com consentimento", () => {
  test("sem Cookiebot, sem resposta ou recusado: nada corre", () => {
    for (const cb of [undefined, {}, { hasResponse: false, consent: { statistics: true, marketing: true } }, { hasResponse: true, consent: { statistics: false, marketing: false } }]) {
      const c = lerConsentimento(cb);
      assert.deepEqual(scriptsDeMedicao(c), { gtag: false, ga4: false, ads: false, gtm: false, meta: false });
    }
    assert.deepEqual(lerConsentimento(undefined), SEM_CONSENTIMENTO);
  });

  test("cada categoria liberta só os seus scripts", () => {
    assert.deepEqual(scriptsDeMedicao(lerConsentimento({ hasResponse: true, consent: { statistics: true, marketing: false } })), { gtag: true, ga4: true, ads: false, gtm: false, meta: false });
    assert.deepEqual(scriptsDeMedicao(lerConsentimento({ hasResponse: true, consent: { statistics: false, marketing: true } })), { gtag: true, ga4: false, ads: true, gtm: false, meta: true });
    assert.deepEqual(scriptsDeMedicao(lerConsentimento({ hasResponse: true, consent: { statistics: true, marketing: true } })), { gtag: true, ga4: true, ads: true, gtm: true, meta: true });
  });

  test("os scripts de medição só são inseridos pelo componente com consentimento", () => {
    const scripts = fonte("../components/AnalyticsScripts.tsx");
    assert.match(scripts, /consent\.cookiebot\.com\/uc\.js/);
    assert.match(scripts, /<MedicaoComConsentimento origemAtiva=\{origemAquisicaoAtiva\(\)\} \/>/);
    assert.doesNotMatch(scripts, /googletagmanager|gtag\(|fbevents|fbq\(/);
    const medicao = fonte("../components/MedicaoComConsentimento.tsx");
    assert.match(medicao, /permitidos\.gtm &&/);
    assert.match(medicao, /permitidos\.ga4 &&/);
    assert.match(medicao, /permitidos\.ads &&/);
    assert.match(medicao, /CookiebotOnConsentReady/);
    assert.match(medicao, /pixelMeta\(permitidos\.meta, caminho\)/);
  });

  test("Pixel da Meta: só com ID válido, sem <noscript> e revogado quando o consentimento sai", () => {
    assert.equal(metaPixelId("1432203388349553"), "1432203388349553");
    assert.equal(metaPixelId(" 1432203388349553 "), "1432203388349553");
    for (const v of [undefined, "", "abc", "123", "1432203388349553'); alert(1"]) assert.equal(metaPixelId(v), null, String(v));
    const medicao = fonte("../components/MedicaoComConsentimento.tsx");
    assert.doesNotMatch(medicao, /<noscript|facebook\.com\/tr/);
    assert.match(medicao, /if \(!META_PIXEL_ID\) return;/);
    assert.match(medicao, /fbq\?\.\("consent", "revoke"\)/);
  });

  test("medição centralizada: só na moldura pública e no fluxo do caso", () => {
    assert.match(fonte("../components/marketing-v2/PaginaV2.tsx"), /<AnalyticsScripts \/>/);
    for (const p of ["../app/[idioma]/page.tsx", "../app/[idioma]/precario/page.tsx", "../app/[idioma]/como-funciona/page.tsx", "../app/[idioma]/(legal)/layout.tsx"]) {
      assert.doesNotMatch(fonte(p), /AnalyticsScripts/, p);
    }
  });

  test("o e-mail em hash (conversões melhoradas) exige consentimento de marketing", () => {
    assert.match(fonte("./analytics.ts"), /Cookiebot\?\.consent\?\.marketing === true[\s\S]*sha256_email_address/);
  });
});
