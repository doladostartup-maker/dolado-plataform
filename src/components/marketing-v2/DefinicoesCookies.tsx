"use client";

import type { ReactNode } from "react";

// "Definições de cookies" no rodapé: reabre o banner do Cookiebot para o
// visitante mudar ou retirar o consentimento (retirar tem de ser tão fácil
// como dar — art. 7.º, n.º 3, do RGPD). O Cookiebot só existe em dolado.pt;
// sem ele, o clique não faz nada.
export function DefinicoesCookies({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.Cookiebot?.renew?.()}>
      {children}
    </button>
  );
}
