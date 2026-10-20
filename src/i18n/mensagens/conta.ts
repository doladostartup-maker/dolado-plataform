import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { conta as pt } from "./pt-PT/conta.ts";
import { conta as en } from "./en-GB/conta.ts";

export const tConta = dicionario("conta", pt, en);

/**
 * Mensagem devolvida em português por uma regra de src/lib (erros da
 * Supabase Auth, recuperação da palavra-passe, associação de compras) no
 * idioma pedido. Mensagem desconhecida: tal como veio (nunca uma chave).
 */
export function traduzirMensagemConta(idioma: Idioma, mensagem: string): string {
  return (tConta[idioma].mensagens as Record<string, string>)[mensagem] ?? mensagem;
}
