import { dicionario } from "../dicionario.ts";
import type { Idioma } from "../config.ts";
import { whatsapp as pt } from "./pt-PT/whatsapp.ts";
import { whatsapp as en } from "./en-GB/whatsapp.ts";

export const tWhatsApp = dicionario("whatsapp", pt, en);

/**
 * Mensagem das páginas "Problemas que tratamos": identifica só a categoria
 * (slug do catálogo). Categoria sem mensagem → mensagem genérica.
 */
export function mensagemWhatsAppSetor(idioma: Idioma, categoria: string): string {
  const t = tWhatsApp[idioma].contextos;
  return (t.setor.mensagens as Record<string, string>)[categoria] ?? t.contacto.mensagem;
}
