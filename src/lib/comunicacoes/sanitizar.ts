// Tratamento do conteúdo recebido por e-mail (sem I/O; `npm test`).
//
// Todo o conteúdo de uma mensagem recebida é NÃO CONFIÁVEL:
//   * o HTML original é guardado só como prova e nunca é apresentado como
//     HTML (nem no backoffice nem no portal): o que se mostra é texto simples
//     derivado aqui, apresentado pelo React como texto (escapado), sem
//     scripts, estilos, imagens remotas nem ligações ativas;
//   * nomes de ficheiros são normalizados (sem caminhos, sem caracteres de
//     controlo, sem extensões duplas enganadoras);
//   * só alguns cabeçalhos são guardados (identificação da mensagem e sinais
//     de resposta automática).

export const LIMITES = {
  corpoTexto: 200_000,
  corpoHtml: 1_000_000,
  assunto: 1000,
  nome: 300,
  email: 320,
  messageId: 998,
  referencias: 50,
  destinatarios: 50,
} as const;

/** Remove caracteres de controlo (exceto mudança de linha e tabulação) e normaliza Unicode. */
export function limparTexto(texto: string | null | undefined, max: number): { texto: string | null; truncado: boolean } {
  if (typeof texto !== "string") return { texto: null, truncado: false };
  const limpo = texto
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "");
  if (!limpo.trim()) return { texto: null, truncado: false };
  return limpo.length > max ? { texto: limpo.slice(0, max), truncado: true } : { texto: limpo, truncado: false };
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function decodificarEntidades(t: string) {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (todo, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTIDADES) return ENTIDADES[k];
    const n = k.startsWith("#x") ? parseInt(k.slice(2), 16) : k.startsWith("#") ? parseInt(k.slice(1), 10) : NaN;
    if (Number.isFinite(n) && n > 31 && n < 0x110000 && n !== 127) return String.fromCodePoint(n);
    return todo;
  });
}

/**
 * HTML → texto simples para apresentação. Nunca devolve marcação: elementos
 * perigosos (script, style, iframe, object, …) são retirados com o conteúdo;
 * o resto perde as etiquetas; quebras de bloco viram mudanças de linha.
 */
export function htmlParaTexto(html: string): string {
  let t = html.slice(0, LIMITES.corpoHtml);
  t = t.replace(/<!--[\s\S]*?-->/g, "");
  t = t.replace(/<(script|style|head|title|iframe|object|embed|svg|math|template|noscript|xml)\b[\s\S]*?<\/\1\s*>/gi, "");
  t = t.replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)\b[^>]*\/?>/gi, "");
  t = t.replace(/<\s*br\s*\/?>/gi, "\n");
  t = t.replace(/<\/\s*(p|div|li|tr|h[1-6]|blockquote|section|article|table|ul|ol)\s*>/gi, "\n");
  t = t.replace(/<\s*li\b[^>]*>/gi, "• ");
  t = t.replace(/<[^>]*>/g, "");
  t = t.replace(/[<>]/g, "");
  t = decodificarEntidades(t);
  return t
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Texto para apresentar: o texto simples da mensagem ou, sem ele, o HTML convertido. */
export function corpoParaApresentacao({ texto, html, markdown }: { texto?: string | null; html?: string | null; markdown?: string | null }) {
  const base = (texto && texto.trim()) || (markdown && markdown.trim()) || (html ? htmlParaTexto(html) : "");
  // Mesmo o texto simples pode trazer "<script>" escrito: apresentado como
  // texto pelo React, é inofensivo; os caracteres de controlo saem aqui.
  return limparTexto(base, LIMITES.corpoTexto);
}

// ---------------------------------------------------------------------------
// Cabeçalhos

export type CabecalhosBrutos = Record<string, string | string[] | null | undefined>;

const CABECALHOS_GUARDADOS = [
  "message-id",
  "in-reply-to",
  "references",
  "date",
  "auto-submitted",
  "x-autoreply",
  "x-autorespond",
  "precedence",
  "list-id",
  "x-auto-response-suppress",
] as const;

/** Só os cabeçalhos relevantes, em minúsculas, com valores curtos. */
export function cabecalhosRelevantes(brutos: CabecalhosBrutos | null | undefined): Record<string, string> {
  const r: Record<string, string> = {};
  if (!brutos || typeof brutos !== "object") return r;
  for (const [k, v] of Object.entries(brutos)) {
    const nome = k.toLowerCase();
    if (!(CABECALHOS_GUARDADOS as readonly string[]).includes(nome)) continue;
    const valor = Array.isArray(v) ? v.join(", ") : v;
    const limpo = limparTexto(typeof valor === "string" ? valor : null, 2000).texto;
    if (limpo) r[nome] = limpo;
  }
  return r;
}

/** Sinais de resposta automática (RFC 3834 e cabeçalhos comuns). Só uma pista: a decisão é humana. */
export function pareceAutomatica(cab: Record<string, string>, assunto: string | null): boolean {
  const auto = (cab["auto-submitted"] ?? "").toLowerCase();
  if (auto && auto !== "no") return true;
  if (cab["x-autoreply"] || cab["x-autorespond"]) return true;
  if (/^(auto_reply|bulk|junk)$/i.test((cab["precedence"] ?? "").trim())) return true;
  return /^(resposta autom[aá]tica|auto(matic)? ?reply|out of office|aus[eê]ncia)/i.test((assunto ?? "").trim());
}

/** Message-IDs em <…> de um cabeçalho References / In-Reply-To. */
export function idsDeMensagem(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return [...valor.matchAll(/<[^<>\s]{1,996}>/g)].map((m) => m[0]).slice(0, LIMITES.referencias);
}

// ---------------------------------------------------------------------------
// Endereços

export type Endereco = { email: string; nome: string | null };

/**
 * Endereço a partir do texto de um cabeçalho ("Nome <email@x>", "<email@x>"
 * ou "email@x"), como o Resend os devolve. null se não houver um e-mail válido.
 */
export function enderecoDeTexto(valor: unknown): Endereco | null {
  if (typeof valor !== "string" || valor.length > 1000) return null;
  const m = valor.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>\s*$/);
  const email = (m ? m[2] : valor).trim().toLowerCase().slice(0, LIMITES.email);
  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(email)) return null;
  return { email, nome: limparTexto(m?.[1] ?? null, LIMITES.nome).texto };
}

export function listaEnderecos(lista: unknown): Endereco[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .slice(0, LIMITES.destinatarios)
    .map(enderecoDeTexto)
    .filter((e): e is Endereco => !!e);
}

// ---------------------------------------------------------------------------
// Ficheiros

/**
 * Nome de ficheiro seguro para guardar/mostrar: sem caminho, sem caracteres
 * de controlo nem de formatação bidirecional (ex.: "fatura‮fdp.exe"), só
 * letras, números e pontuação simples, com a extensão do tipo verificado.
 */
export function normalizarNomeFicheiro(nome: string | null | undefined, extensao: string): string {
  const base = (typeof nome === "string" ? nome : "")
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\.[^.]{1,10}$/, "")
    .replace(/[^\p{L}\p{N} _()-]/gu, "_")
    .replace(/^[.\s_]+|[.\s_]+$/g, "")
    .slice(0, 150);
  return `${base || "anexo"}.${extensao}`;
}
