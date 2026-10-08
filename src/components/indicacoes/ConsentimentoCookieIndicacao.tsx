"use client";

import { useEffect } from "react";

const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept", "CookiebotOnDecline"] as const;

/** Apaga o cookie httpOnly da indicação quando o consentimento de marketing não está ativo. */
export function ConsentimentoCookieIndicacao() {
  useEffect(() => {
    const sincronizar = () => {
      const cookiebot = window.Cookiebot;
      if (!cookiebot?.hasResponse) return;
      if (cookiebot.consent?.marketing === true) return;
      void fetch("/api/indicacoes/visita", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "retirar" }),
      }).catch(() => undefined);
    };
    sincronizar();
    for (const evento of EVENTOS_COOKIEBOT) window.addEventListener(evento, sincronizar);
    return () => {
      for (const evento of EVENTOS_COOKIEBOT) window.removeEventListener(evento, sincronizar);
    };
  }, []);

  return null;
}
