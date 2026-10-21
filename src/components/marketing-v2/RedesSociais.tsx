"use client";

import type { ReactNode } from "react";
import { IconeBase, type PropsIcone } from "./Icones";
import { useTextos } from "@/i18n/cliente";
import { tComum } from "@/i18n/mensagens/comum";
import { track } from "@/lib/analytics";
import {
  INSTAGRAM_FUNDADOR,
  parametrosEventoSocial,
  type LocalRedeSocial,
  type RedeSocial,
} from "@/lib/redesSociais";

// Ligações discretas para as redes sociais (regras em src/lib/redesSociais.ts).
// Só ligações: sem feeds, widgets nem scripts externos.
//
// Medição (gtag, só com consentimento — ver track()): social_click com rede,
// conta (fundador/dolado) e local — só valores fixos.

/** Ícones lineares do DS V2 (sem logótipos preenchidos). */
export const IconeInstagram = (p: PropsIcone) => (
  <IconeBase {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17 7h.01" />
  </IconeBase>
);

export const IconeFacebook = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M14.5 3.5h-2a4 4 0 0 0-4 4v3h-2v3.5h2v6.5H12V14h2.5l.5-3.5h-3V8a1 1 0 0 1 1-1h1.5z" />
  </IconeBase>
);

const ICONES: Record<RedeSocial, (p: PropsIcone) => ReactNode> = { instagram: IconeInstagram, facebook: IconeFacebook };

/** Ligação externa numa nova janela, com o evento social_click. */
export function LigacaoSocial({
  rede,
  url,
  conta,
  local,
  className,
  children,
}: {
  rede: RedeSocial;
  url: string;
  conta: "fundador" | "dolado";
  local: LocalRedeSocial;
  className?: string;
  children: ReactNode;
}) {
  const t = useTextos(tComum).redesSociais;
  const Icone = ICONES[rede];
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("social_click", parametrosEventoSocial(rede, conta, local))}
      className={className}
    >
      <Icone tamanho={20} className="flex-none" />
      {children}
      <span className="sr-only"> {t.abreNovaJanela}</span>
    </a>
  );
}

const LIGACAO_FUNDADOR =
  "inline-flex min-h-11 items-center gap-2 text-[16px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]";

/** Remate discreto da história do fundador: Instagram pessoal. */
export function InstagramFundador({ local, className = "" }: { local: "homepage_fundador" | "sobre_nos_fundador"; className?: string }) {
  const t = useTextos(tComum).redesSociais;
  return (
    <div className={`border-t border-[var(--v2-line)] pt-5 ${className}`}>
      <p className="text-[16px] font-semibold text-[var(--v2-navy)]">{t.fundadorTitulo}</p>
      <p className="mt-1 text-[16px] leading-relaxed text-[var(--v2-muted)]">{t.fundadorTexto}</p>
      <LigacaoSocial rede="instagram" url={INSTAGRAM_FUNDADOR.url} conta="fundador" local={local} className={`${LIGACAO_FUNDADOR} mt-2`}>
        Instagram — {INSTAGRAM_FUNDADOR.perfil}
      </LigacaoSocial>
    </div>
  );
}
