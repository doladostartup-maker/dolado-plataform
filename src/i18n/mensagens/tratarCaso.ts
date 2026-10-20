import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { tratarCaso as pt } from "./pt-PT/tratarCaso.ts";
import { tratarCaso as en } from "./en-GB/tratarCaso.ts";

export const tTratarCaso = dicionario("tratarCaso", pt, en);

/** Mensagem de uma ação/regra (devolvida em português) no idioma pedido. */
export function traduzirMensagemCaso(idioma: Idioma, mensagem: string | null | undefined): string {
  if (!mensagem) return "";
  return (tTratarCaso[idioma].mensagens as Record<string, string>)[mensagem] ?? mensagem;
}
