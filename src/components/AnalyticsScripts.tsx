import Script from "next/script";
import { MedicaoComConsentimento } from "./MedicaoComConsentimento";
import { origemAquisicaoAtiva } from "@/lib/origemAquisicao";
import { ConsentimentoCookieIndicacao } from "@/components/indicacoes/ConsentimentoCookieIndicacao";
import { obterIdioma } from "@/i18n/servidor";

// Banner de consentimento (Cookiebot) + medição. Incluído uma única vez por
// PaginaV2 (todas as páginas públicas) e pelo layout de /tratar-caso.
//
// O Cookiebot mantém-se igual (mesmo script, mesmo modo). GTM, GA4 e Google
// Ads já não são carregados sempre: MedicaoComConsentimento só os insere
// depois do consentimento, porque o bloqueio automático do Cookiebot não os
// travava quando o domínio não está autorizado no Cookiebot Manager.

const COOKIEBOT_ID = "dafec895-e2af-4e2e-a904-ea3c9f12380e";

export async function AnalyticsScripts() {
  // Idioma do banner sempre explícito (data-culture), igual ao da página: sem
  // ele, o Cookiebot usa o idioma por omissão do Manager ou o do browser.
  const idioma = await obterIdioma();
  return (
    <>
      <Script
        id="cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid={COOKIEBOT_ID}
        data-blockingmode="auto"
        data-culture={idioma === "en-GB" ? "en" : "pt"}
        strategy="beforeInteractive"
      />
      <MedicaoComConsentimento origemAtiva={origemAquisicaoAtiva()} />
      <ConsentimentoCookieIndicacao />
    </>
  );
}
