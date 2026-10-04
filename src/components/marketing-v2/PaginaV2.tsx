import type { ReactNode } from "react";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { FooterV2 } from "./FooterV2";
import { fonteV2 as fonte } from "./fonte";
import { NavbarV2 } from "./NavbarV2";

// Moldura de qualquer página pública V2: tokens (.tema-v2 em globals.css),
// fonte, NavbarV2, <main> e FooterV2. Regras em docs/design/design-system-v2.md.
//
// Medição centralizada aqui: todas as páginas públicas (incluindo as legais,
// via (legal)/layout.tsx) carregam AnalyticsScripts uma única vez, por esta
// moldura — nunca página a página. GTM, GA4 e Google Ads só são inseridos
// depois do consentimento no banner do Cookiebot (MedicaoComConsentimento).

export function PaginaV2({
  eventoCtaNavbar,
  parametrosCtaNavbar,
  children,
}: {
  eventoCtaNavbar: string;
  /** Parâmetros do evento do botão da navbar (ex.: { local: "cabecalho" }). */
  parametrosCtaNavbar?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <div className={`tema-v2 ${fonte.className} min-h-screen bg-white text-[var(--v2-navy)] antialiased`}>
      <AnalyticsScripts />
      <NavbarV2 eventoCta={eventoCtaNavbar} parametrosCta={parametrosCtaNavbar} />
      <main>{children}</main>
      <FooterV2 />
    </div>
  );
}
