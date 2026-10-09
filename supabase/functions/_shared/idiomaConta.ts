// Idioma preferido de uma conta, a partir de user_metadata da Supabase Auth
// (mesma regra de src/lib/idiomaConta.ts — as Edge Functions não importam de
// src/). Só apresentação: decide o idioma do e-mail, nunca o destinatário.
// Sem idioma (contas antigas) ou valor desconhecido → português.

import type { IdiomaEmail } from "./molduraEmail.ts";

export function idiomaDosMetadados(metadados: unknown): IdiomaEmail {
  if (!metadados || typeof metadados !== "object") return "pt-PT";
  return (metadados as Record<string, unknown>).idioma === "en-GB" ? "en-GB" : "pt-PT";
}
