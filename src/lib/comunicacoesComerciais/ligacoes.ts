// Comunicações comerciais: ligações de confirmação do endereço e de "deixar
// de receber" (sem sessão). Extensões .ts explícitas: testado com `node --test`.
//
// As ligações levam o id da autorização e um token HMAC-SHA256 desse id e da
// acção, com COMUNICACOES_CHAVE (≥ 32 caracteres; nunca mudar — as ligações
// já enviadas deixariam de funcionar). Nada é guardado. Sem chave válida,
// não há ligações: nenhum e-mail de confirmação sai e nenhum envio comercial
// é possível (falha fechada). O GET das páginas nunca altera nada; só o POST.

import { createHmac, timingSafeEqual } from "node:crypto";
import { localizarHref, type Idioma } from "../../i18n/config.ts";

export type TipoAutorizacao = "conta" | "sem_conta";
type Acao = "confirmar" | "retirar";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function chave(): string | null {
  const c = process.env.COMUNICACOES_CHAVE ?? "";
  return c.length >= 32 ? c : null;
}

/** Há chave configurada: confirmação e envios comerciais possíveis. */
export function comunicacoesDisponiveis(): boolean {
  return chave() !== null;
}

function token(acao: Acao, tipo: TipoAutorizacao, id: string): string | null {
  const c = chave();
  return c ? createHmac("sha256", c).update(`comunicacoes:${acao}:${tipo}:${id.toLowerCase()}`).digest("base64url") : null;
}

export function tipoValido(valor: unknown): valor is TipoAutorizacao {
  return valor === "conta" || valor === "sem_conta";
}

/** Token da ligação certo para esta acção, tipo e id (comparação em tempo constante). */
export function tokenValido(acao: Acao, tipo: unknown, id: unknown, recebido: unknown): boolean {
  if (!tipoValido(tipo) || typeof id !== "string" || !UUID.test(id) || typeof recebido !== "string") return false;
  const esperado = token(acao, tipo, id);
  if (!esperado) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

function base(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

function parametros(acao: Acao, tipo: TipoAutorizacao, id: string): string | null {
  const t = token(acao, tipo, id);
  return t ? `tipo=${tipo}&id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}` : null;
}

/** Página de confirmação do endereço (só autorizações sem conta). */
export function ligacaoConfirmar(id: string, idioma: Idioma): string | null {
  const p = parametros("confirmar", "sem_conta", id);
  return p ? `${base()}${localizarHref(idioma, `/comunicacoes/confirmar?${p}`)}` : null;
}

/** Página "Deixar de receber" (ligação visível no e-mail comercial). */
export function ligacaoDeixarDeReceber(tipo: TipoAutorizacao, id: string, idioma: Idioma): string | null {
  const p = parametros("retirar", tipo, id);
  return p ? `${base()}${localizarHref(idioma, `/comunicacoes/deixar-de-receber?${p}`)}` : null;
}

/**
 * Cabeçalhos List-Unsubscribe (RFC 2369) e List-Unsubscribe-Post (RFC 8058,
 * um clique no cliente de e-mail) para cada envio comercial.
 */
export function cabecalhosDeixarDeReceber(tipo: TipoAutorizacao, id: string): Record<string, string> | null {
  const p = parametros("retirar", tipo, id);
  if (!p) return null;
  return {
    "List-Unsubscribe": `<${base()}/api/comunicacoes/deixar-de-receber?${p}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
