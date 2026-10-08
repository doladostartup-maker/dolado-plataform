"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { SEM_CONSENTIMENTO, lerConsentimento, scriptsDeMedicao } from "@/lib/consentimentoMedicao";
import { COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM, COOKIE_ORIGEM, PARAMETRO_ORIGEM, decidirCookiesOrigem, linhaCookieOrigem } from "@/lib/origemAquisicao";

// Insere GTM, GA4 e Google Ads só depois de o Cookiebot confirmar o
// consentimento da categoria certa (regras em src/lib/consentimentoMedicao.ts).
// Não depende do bloqueio automático do Cookiebot: sem Cookiebot ou sem
// resposta no banner, nada é inserido. Os eventos do Cookiebot avisam quando
// o consentimento fica conhecido (também no carregamento, se já existir) e
// quando muda.
//
// Origem de aquisição (?ref=): os cookies dolado_estatisticas/dolado_origem só
// são criados com consentimento de estatística (regras em decidirCookiesOrigem,
// src/lib/origemAquisicao.ts). `origemAtiva` vem do servidor
// (ORIGEM_AQUISICAO_ATIVO não chega ao browser).

const GTM_ID = "GTM-T4HCJBMF";
const GA4_IDS = ["G-B4PQKLZ2BF", "G-KD6C514Q1Q"];
const ADS_ID = "AW-18429943837";

const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept", "CookiebotOnDecline"] as const;

const GTAG_BASE = `window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};`;

export function MedicaoComConsentimento({ origemAtiva = false }: { origemAtiva?: boolean }) {
  const [consentimento, setConsentimento] = useState(SEM_CONSENTIMENTO);

  useEffect(() => {
    const gerirOrigem = () => {
      const lerCookie = (nome: string) =>
        document.cookie.split("; ").find((item) => item.startsWith(`${nome}=`))?.slice(nome.length + 1);
      const { cookies, avisarRetirada } = decidirCookiesOrigem({
        ativo: origemAtiva,
        temResposta: window.Cookiebot?.hasResponse === true,
        estatisticas: window.Cookiebot?.hasResponse === true && window.Cookiebot.consent?.statistics === true,
        marcaAtual: lerCookie(COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM),
        origemAtual: lerCookie(COOKIE_ORIGEM),
        ref: new URLSearchParams(location.search).get(PARAMETRO_ORIGEM),
        agoraMs: Date.now(),
      });
      for (const c of cookies) document.cookie = linhaCookieOrigem(c, location.hostname, location.protocol === "https:");
      // Retirada: apaga a origem da conta com sessão neste domínio; sem sessão,
      // a marca "0" faz o mesmo na próxima interação autenticada.
      // Em dolado.pt não há sessão (cookies da Supabase só em portal.dolado.pt).
      if (avisarRetirada && location.hostname !== "dolado.pt" && location.hostname !== "www.dolado.pt") {
        void fetch("/api/privacidade/origem-aquisicao", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
      }
    };
    const atualizar = () => {
      setConsentimento(lerConsentimento(window.Cookiebot));
      gerirOrigem();
    };
    atualizar();
    for (const e of EVENTOS_COOKIEBOT) window.addEventListener(e, atualizar);
    return () => {
      for (const e of EVENTOS_COOKIEBOT) window.removeEventListener(e, atualizar);
    };
  }, [origemAtiva]);

  const permitidos = scriptsDeMedicao(consentimento);

  return (
    <>
      {permitidos.gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
      {permitidos.gtag && (
        <Script id="gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${GA4_IDS[0]}`} strategy="afterInteractive" />
      )}
      {permitidos.ga4 && (
        <Script id="gtag-ga4" strategy="afterInteractive">
          {`${GTAG_BASE}
gtag('js', new Date());
gtag('config', '${GA4_IDS[0]}');
gtag('config', '${GA4_IDS[1]}');`}
        </Script>
      )}
      {permitidos.ads && (
        <Script id="gtag-ads" strategy="afterInteractive">
          {`${GTAG_BASE}
gtag('js', new Date());
gtag('config', '${ADS_ID}', { allow_enhanced_conversions: true });`}
        </Script>
      )}
    </>
  );
}
