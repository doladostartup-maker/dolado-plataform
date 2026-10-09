import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { portal as pt } from "./pt-PT/portal.ts";
import { portal as en } from "./en-GB/portal.ts";
import { traduzirMensagemConta } from "./conta.ts";

export const tPortal = dicionario("portal", pt, en);

/**
 * Mensagem de uma ação do portal (devolvida em português) no idioma pedido.
 * Também cobre as mensagens de conta (ex.: erros da palavra-passe).
 */
export function traduzirMensagemPortal(idioma: Idioma, mensagem: string): string {
  const portal = (tPortal[idioma].mensagens as Record<string, string>)[mensagem];
  return portal ?? traduzirMensagemConta(idioma, mensagem);
}
