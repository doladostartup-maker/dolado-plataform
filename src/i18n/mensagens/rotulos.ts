import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { rotulos as pt } from "./pt-PT/rotulos.ts";
import { rotulos as en } from "./en-GB/rotulos.ts";

export const tRotulos = dicionario("rotulos", pt, en);

type Grupo = keyof typeof pt;

/**
 * Como se mostra um valor gravado em português (setor, problema, momento…).
 * Valor desconhecido (dado antigo, texto livre): mostra-se tal como está.
 */
export function rotulo(idioma: Idioma, grupo: Grupo, valor: string | null | undefined): string {
  if (!valor) return "";
  const mapa = tRotulos[idioma][grupo] as Record<string, string>;
  return mapa[valor] ?? valor;
}
