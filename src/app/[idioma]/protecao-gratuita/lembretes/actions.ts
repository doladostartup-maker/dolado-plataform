"use server";

import { desativarLembretes, tokenLembretesValido } from "@/lib/protecaoGratuitaServidor";

// Deixar de receber os lembretes opcionais da Proteção gratuita (dias 7 e
// 25). Sem sessão: a ligação do e-mail traz o id do período e um token HMAC
// desse id (nada guardado). Só o POST explícito altera; o GET só mostra.

export type EstadoLembretes = { feito: boolean; invalida: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deixarDeReceberLembretes(_: EstadoLembretes, form: FormData): Promise<EstadoLembretes> {
  const id = String(form.get("id") ?? "");
  const token = String(form.get("t") ?? "");
  if (!UUID.test(id) || !tokenLembretesValido(id, token)) return { feito: false, invalida: true };
  try {
    const ok = await desativarLembretes(id);
    return { feito: ok, invalida: !ok };
  } catch {
    return { feito: false, invalida: true };
  }
}
