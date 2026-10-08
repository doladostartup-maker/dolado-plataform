import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { SEM_CONSENTIMENTO, lerConsentimento, scriptsDeMedicao } from "./consentimentoMedicao.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("medição só com consentimento", () => {
  test("sem Cookiebot, sem resposta ou recusado: nada corre", () => {
    for (const cb of [undefined, {}, { hasResponse: false, consent: { statistics: true, marketing: true } }, { hasResponse: true, consent: { statistics: false, marketing: false } }]) {
      const c = lerConsentimento(cb);
      assert.deepEqual(scriptsDeMedicao(c), { gtag: false, ga4: false, ads: false, gtm: false });
    }
    assert.deepEqual(lerConsentimento(undefined), SEM_CONSENTIMENTO);
  });

  test("cada categoria liberta só os seus scripts", () => {
    assert.deepEqual(scriptsDeMedicao(lerConsentimento({ hasResponse: true, consent: { statistics: true, marketing: false } })), { gtag: true, ga4: true, ads: false, gtm: false });
    assert.deepEqual(scriptsDeMedicao(lerConsentimento({ hasResponse: true, consent: { statistics: false, marketing: true } })), { gtag: true, ga4: false, ads: true, gtm: false });
    assert.deepEqual(scriptsDeMedicao(lerConsentimento({ hasResponse: true, consent: { statistics: true, marketing: true } })), { gtag: true, ga4: true, ads: true, gtm: true });
  });

  test("os scripts de medição só são inseridos pelo componente com consentimento", () => {
    const scripts = fonte("../components/AnalyticsScripts.tsx");
    assert.match(scripts, /consent\.cookiebot\.com\/uc\.js/);
    assert.match(scripts, /<MedicaoComConsentimento origemAtiva=\{origemAquisicaoAtiva\(\)\} \/>/);
    assert.doesNotMatch(scripts, /googletagmanager|gtag\(/);
    const medicao = fonte("../components/MedicaoComConsentimento.tsx");
    assert.match(medicao, /permitidos\.gtm &&/);
    assert.match(medicao, /permitidos\.ga4 &&/);
    assert.match(medicao, /permitidos\.ads &&/);
    assert.match(medicao, /CookiebotOnConsentReady/);
  });

  test("medição centralizada: só na moldura pública e no fluxo do caso", () => {
    assert.match(fonte("../components/marketing-v2/PaginaV2.tsx"), /<AnalyticsScripts \/>/);
    for (const p of ["../app/page.tsx", "../app/precario/page.tsx", "../app/como-funciona/page.tsx", "../app/(legal)/layout.tsx"]) {
      assert.doesNotMatch(fonte(p), /AnalyticsScripts/, p);
    }
  });

  test("o e-mail em hash (conversões melhoradas) exige consentimento de marketing", () => {
    assert.match(fonte("./analytics.ts"), /Cookiebot\?\.consent\?\.marketing === true[\s\S]*sha256_email_address/);
  });
});
