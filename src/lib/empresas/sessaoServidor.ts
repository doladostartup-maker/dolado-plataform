// DoLado Empresas — utilidades das Server Actions das contas de empresa
// (servidor). Fase 4.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { empresasAtivo } from "./registo.ts";

/** Acções das empresas: desligadas (EMPRESAS_ATIVO), respondem como página inexistente. */
export function exigirEmpresasAtivo() {
  if (!empresasAtivo()) notFound();
}

/** IP do pedido, só para os limites de taxa (nunca gravado). */
export async function ipDoPedido(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

/** URL com uma mensagem (erro ou aviso) na pesquisa. */
export function comMensagem(caminho: string, chave: "erro" | "info", texto: string): string {
  return `${caminho}${caminho.includes("?") ? "&" : "?"}${chave}=${encodeURIComponent(texto)}`;
}
