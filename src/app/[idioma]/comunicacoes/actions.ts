"use server";

import { tokenValido } from "@/lib/comunicacoesComerciais/ligacoes";
import { confirmarEndereco, retirarAutorizacao } from "@/lib/comunicacoesComerciais/servidor";

// Ligações dos e-mails de comunicações comerciais. Sem sessão: a ligação traz
// o tipo, o id da autorização e um token HMAC (nada guardado). Só o POST
// explícito altera; o GET das páginas só mostra.

export type ResultadoLigacao = "confirmado" | "ja_confirmado" | "expirado" | "retirado" | "ja_retirado" | "invalida" | null;

export async function confirmarEmail(_: ResultadoLigacao, form: FormData): Promise<ResultadoLigacao> {
  const tipo = form.get("tipo");
  const id = form.get("id");
  if (tipo !== "sem_conta" || !tokenValido("confirmar", tipo, id, form.get("t"))) return "invalida";
  try {
    const r = await confirmarEndereco(String(id));
    return r === "inexistente" ? "invalida" : r;
  } catch {
    return "invalida";
  }
}

export async function deixarDeReceber(_: ResultadoLigacao, form: FormData): Promise<ResultadoLigacao> {
  const tipo = form.get("tipo");
  const id = form.get("id");
  if (!tokenValido("retirar", tipo, id, form.get("t"))) return "invalida";
  try {
    const r = await retirarAutorizacao(tipo as "conta" | "sem_conta", String(id));
    return r === "inexistente" ? "invalida" : r;
  } catch {
    return "invalida";
  }
}
