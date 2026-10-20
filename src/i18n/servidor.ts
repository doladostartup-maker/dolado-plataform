import { cache } from "react";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CABECALHO_IDIOMA, IDIOMA_PADRAO, idiomaDoSegmento, localizarHref, normalizarIdioma, type Idioma } from "./config";
import type { Dicionario } from "./dicionario";

// Idioma nos Server Components, Server Actions e metadata.
//
// Páginas: cada página/layout de src/app/[idioma] chama idiomaDaPagina(params)
// — funciona nas páginas estáticas (sem cabeçalhos) e fica guardado para os
// componentes do mesmo pedido. Server Actions e páginas dinâmicas sem params:
// cabeçalho posto pelo middleware. Sem nenhum dos dois: português.

const guardado = cache(() => ({ idioma: null as Idioma | null }));

export function definirIdioma(idioma: Idioma) {
  guardado().idioma = idioma;
}

/** Idioma de uma página (params do segmento [idioma]); desconhecido → português. */
export async function idiomaDaPagina(params: Promise<{ idioma: string }> | { idioma: string }): Promise<Idioma> {
  const { idioma: segmento } = await params;
  const idioma = idiomaDoSegmento(segmento) ?? IDIOMA_PADRAO;
  definirIdioma(idioma);
  return idioma;
}

export async function obterIdioma(): Promise<Idioma> {
  const definido = guardado().idioma;
  if (definido) return definido;
  try {
    return normalizarIdioma((await headers()).get(CABECALHO_IDIOMA));
  } catch {
    return IDIOMA_PADRAO;
  }
}

/** Textos de um domínio no idioma do pedido. */
export async function textos<T>(dicionario: Dicionario<T>): Promise<T> {
  return dicionario[await obterIdioma()];
}

/** Ligação/redirect no idioma do pedido: "/portal" → "/en/portal" em inglês. */
export async function caminho(href: string): Promise<string> {
  return localizarHref(await obterIdioma(), href);
}

/** Props de uma página/layout do segmento [idioma] (outros parâmetros à parte). */
export type ComIdioma<P = object> = { params: Promise<{ idioma: string } & P> };

/**
 * revalidatePath para as duas versões de uma página do cliente: o segmento
 * interno é /pt ou /en (o URL público português não tem prefixo).
 */
export function revalidarPagina(caminhoPublico: string, tipo?: "page" | "layout") {
  for (const segmento of ["pt", "en"]) revalidatePath(`/${segmento}${caminhoPublico}`, tipo);
}
