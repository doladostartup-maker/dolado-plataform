import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { protecao as pt } from "./pt-PT/protecao.ts";
import { protecao as en } from "./en-GB/protecao.ts";
import { traduzirMensagemPortal } from "./portal.ts";

export const tProtecao = dicionario("protecao", pt, en);

/** Mensagem de uma ação da Proteção (devolvida em português) no idioma pedido. */
export function traduzirMensagemProtecao(idioma: Idioma, mensagem: string): string {
  const m = (tProtecao[idioma].mensagens as Record<string, string>)[mensagem];
  return m ?? traduzirMensagemPortal(idioma, mensagem);
}
