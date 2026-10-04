import type { ReactNode } from "react";

// Pesquisa nas perguntas frequentes, só no browser (sem pedidos ao servidor
// nem registo do que é pesquisado). Procura na pergunta e na resposta,
// incluindo respostas em JSX, sem distinguir maiúsculas nem acentos.

/** "Fatura Ação" → "fatura acao" */
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Texto visível de um nó React (strings, números, arrays e elementos com children). */
export function textoDe(no: ReactNode): string {
  if (no == null || typeof no === "boolean") return "";
  if (typeof no === "string" || typeof no === "number") return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join(" ");
  if (typeof no === "object" && "props" in no) {
    return textoDe((no.props as { children?: ReactNode }).children);
  }
  return "";
}

/** Cada palavra da pesquisa tem de aparecer na pergunta ou na resposta. */
export function correspondeAPesquisa(pergunta: { pergunta: string; resposta: ReactNode }, pesquisa: string) {
  const termos = normalizar(pesquisa).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const alvo = normalizar(`${pergunta.pergunta} ${textoDe(pergunta.resposta)}`);
  return termos.every((t) => alvo.includes(t));
}
