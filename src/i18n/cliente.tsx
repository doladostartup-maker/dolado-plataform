"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "./config";
import type { Dicionario } from "./dicionario";

// Idioma nos Client Components: vem do layout [idioma] por contexto. Fora
// dele (backoffice), é sempre português.

const ContextoIdioma = createContext<Idioma>(IDIOMA_PADRAO);

export function ProvedorIdioma({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  return <ContextoIdioma.Provider value={idioma}>{children}</ContextoIdioma.Provider>;
}

export function useIdioma(): Idioma {
  return useContext(ContextoIdioma);
}

/** Textos de um domínio no idioma atual. */
export function useTextos<T>(dicionario: Dicionario<T>): T {
  return dicionario[useIdioma()];
}

/** Ligações no idioma atual: "/precario" → "/en/precario" em inglês. */
export function useCaminho(): (href: string) => string {
  const idioma = useIdioma();
  return useCallback((href: string) => localizarHref(idioma, href), [idioma]);
}
