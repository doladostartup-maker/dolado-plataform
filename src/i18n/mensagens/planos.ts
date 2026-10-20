import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { formatarEurosCents } from "../formatar.ts";
import { formatarPreco } from "../../lib/planos.ts";
import { planos as pt } from "./pt-PT/planos.ts";
import { planos as en } from "./en-GB/planos.ts";

export const tPlanos = dicionario("planos", pt, en);

/** Preço no idioma: português exatamente como em planos.ts ("4,99 €"); inglês "€4.99". */
export function precoNoIdioma(idioma: Idioma, centimos: number) {
  return idioma === "pt-PT" ? formatarPreco(centimos) : formatarEurosCents(idioma, centimos);
}
