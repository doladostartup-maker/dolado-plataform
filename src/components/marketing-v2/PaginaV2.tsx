import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { FooterV2 } from "./FooterV2";
import { NavbarV2 } from "./NavbarV2";

// Moldura de qualquer página pública V2: tokens (.tema-v2 em globals.css),
// fonte, NavbarV2, <main> e FooterV2. Regras em docs/design/design-system-v2.md.

// Fonte só das páginas V2 (alojada pelo next/font no próprio site).
const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

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
      <NavbarV2 eventoCta={eventoCtaNavbar} parametrosCta={parametrosCtaNavbar} />
      <main>{children}</main>
      <FooterV2 />
    </div>
  );
}
