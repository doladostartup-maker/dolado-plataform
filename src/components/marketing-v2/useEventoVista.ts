"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept"] as const;

/**
 * Evento de página vista (GA4) uma só vez por carregamento: já, se houver
 * gtag; senão, quando o consentimento chegar. O gtag só é inserido depois do
 * consentimento (MedicaoComConsentimento): tenta de novo pouco depois de o
 * Cookiebot responder. Sem consentimento, nada é enviado.
 */
export function useEventoVista(evento: string) {
  const enviado = useRef(false);
  useEffect(() => {
    const enviar = () => {
      if (enviado.current || typeof window.gtag !== "function") return false;
      enviado.current = true;
      track(evento);
      return true;
    };
    if (enviar()) return;
    const temporizadores: number[] = [];
    const aoConsentir = () => {
      for (const ms of [500, 2000]) temporizadores.push(window.setTimeout(enviar, ms));
    };
    for (const e of EVENTOS_COOKIEBOT) window.addEventListener(e, aoConsentir);
    return () => {
      for (const e of EVENTOS_COOKIEBOT) window.removeEventListener(e, aoConsentir);
      temporizadores.forEach((t) => window.clearTimeout(t));
    };
  }, [evento]);
}
