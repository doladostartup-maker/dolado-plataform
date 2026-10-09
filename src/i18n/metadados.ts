import type { Metadata } from "next";
import { IDIOMAS, caminhoNoIdioma, type Idioma } from "./config.ts";

// Metadata das páginas públicas indexáveis: canonical no próprio idioma,
// hreflang pt-PT / en-GB / x-default (português, o idioma por omissão) e
// Open Graph com os textos traduzidos. Os URLs são sempre os de dolado.pt.

const SITE = "https://dolado.pt";
const LOCALE_OG: Record<Idioma, string> = { "pt-PT": "pt_PT", "en-GB": "en_GB" };

export function urlPublico(idioma: Idioma, caminho: string) {
  const c = caminhoNoIdioma(idioma, caminho);
  return c === "/" ? SITE : `${SITE}${c}`;
}

export function alternativas(idioma: Idioma, caminho: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: urlPublico(idioma, caminho),
    languages: {
      ...Object.fromEntries(IDIOMAS.map((i) => [i, urlPublico(i, caminho)])),
      "x-default": urlPublico("pt-PT", caminho),
    },
  };
}

export function metadadosPublicos(
  idioma: Idioma,
  caminho: string,
  { title, description }: { title: string; description?: string },
): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    alternates: alternativas(idioma, caminho),
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: urlPublico(idioma, caminho),
      siteName: "DoLado",
      locale: LOCALE_OG[idioma],
      alternateLocale: IDIOMAS.filter((i) => i !== idioma).map((i) => LOCALE_OG[i]),
      type: "website",
    },
  };
}

/**
 * Páginas legais: o texto só existe em português (versão vinculativa). A
 * página /en serve a moldura em inglês, mas não é indexada e aponta para a
 * portuguesa como canonical.
 */
export function metadadosLegais(
  idioma: Idioma,
  caminho: string,
  { title, description }: { title: string; description?: string },
): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: urlPublico("pt-PT", caminho) },
    ...(idioma === "pt-PT" ? {} : { robots: { index: false, follow: true } }),
  };
}
