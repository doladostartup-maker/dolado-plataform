// Funções para pôr texto do cliente em e-mails com segurança. Partilhado
// pelas Edge Functions e testado com `node --test` — sem APIs de Deno.
//
// Tudo o que vem do cliente é texto: no HTML passa por escape e no assunto
// perde quebras de linha/caracteres de controlo e é encurtado.

export function escaparHtml(texto: string): string {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texto seguro para o assunto: sem quebras de linha/controlo, comprimento limitado. */
export function textoParaAssunto(texto: string, max = 80): string {
  const limpo = String(texto).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
}
