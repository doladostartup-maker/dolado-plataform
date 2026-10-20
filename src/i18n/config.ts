// Idiomas da interface do cliente — regras puras (sem I/O), usadas pelo
// middleware, pelos componentes e pelos testes (`node --test`).
//
// O idioma é só apresentação: nunca decide acesso, planos, pagamentos, RLS
// nem regras de negócio. O backoffice, as APIs, os webhooks e /auth/* não
// têm idioma (ficam sempre sem prefixo e em português).
//
// URLs: português sem prefixo (/precario), inglês com /en (/en/precario).
// Internamente, o middleware reescreve as páginas portuguesas para o
// segmento /pt (src/app/[idioma]/…); /pt nunca aparece ao visitante.

export const IDIOMAS = ["pt-PT", "en-GB"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_PADRAO: Idioma = "pt-PT";

/** Valor do segmento interno [idioma] de cada idioma. */
export const SEGMENTO: Record<Idioma, string> = { "pt-PT": "pt", "en-GB": "en" };

/** Prefixo público do URL (português não tem prefixo). */
export const PREFIXO_EN = "/en";

/** Preferência do visitante (escolha no seletor ou última página /en visitada). */
export const COOKIE_IDIOMA = "dolado_idioma";
export const VALIDADE_COOKIE_IDIOMA_S = 365 * 24 * 60 * 60;

/** Cabeçalho do pedido com o idioma, posto pelo middleware (Server Actions, páginas dinâmicas). */
export const CABECALHO_IDIOMA = "x-dolado-idioma";

/** Nomes no seletor, cada um no próprio idioma (padrão de acessibilidade). */
export const NOME_IDIOMA: Record<Idioma, string> = { "pt-PT": "Português", "en-GB": "English" };
export const BANDEIRA_IDIOMA: Record<Idioma, string> = { "pt-PT": "🇵🇹", "en-GB": "🇬🇧" };
/** Atributo lang do HTML. */
export const LANG_HTML: Record<Idioma, string> = { "pt-PT": "pt-PT", "en-GB": "en-GB" };
/** Locale do Stripe Checkout (só apresentação). */
export const LOCALE_STRIPE: Record<Idioma, "pt" | "en-GB"> = { "pt-PT": "pt", "en-GB": "en-GB" };

export function ehIdioma(valor: unknown): valor is Idioma {
  return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}

/** Idioma de um valor qualquer (cookie, cabeçalho); desconhecido → português. */
export function normalizarIdioma(valor: unknown): Idioma {
  return ehIdioma(valor) ? valor : IDIOMA_PADRAO;
}

/** Idioma do segmento interno [idioma] ("pt" | "en"); desconhecido → null. */
export function idiomaDoSegmento(segmento: string | undefined | null): Idioma | null {
  if (segmento === "en") return "en-GB";
  if (segmento === "pt") return "pt-PT";
  return null;
}

/**
 * Separa o prefixo de idioma de um caminho público.
 * "/en/precario" → { idioma: "en-GB", caminho: "/precario", prefixado: true }
 * "/precario"    → { idioma: "pt-PT", caminho: "/precario", prefixado: false }
 */
export function separarIdioma(pathname: string): { idioma: Idioma; caminho: string; prefixado: boolean } {
  if (pathname === PREFIXO_EN || pathname.startsWith(`${PREFIXO_EN}/`)) {
    return { idioma: "en-GB", caminho: pathname.slice(PREFIXO_EN.length) || "/", prefixado: true };
  }
  return { idioma: "pt-PT", caminho: pathname, prefixado: false };
}

/**
 * Caminhos que nunca têm idioma: APIs, webhooks, callbacks de autenticação,
 * backoffice e ficheiros internos do Next. Ficam sem prefixo e sem reescrita.
 */
export function ehCaminhoSemIdioma(caminho: string): boolean {
  return (
    caminho === "/api" ||
    caminho.startsWith("/api/") ||
    caminho === "/auth" ||
    caminho.startsWith("/auth/") ||
    caminho === "/backoffice" ||
    caminho.startsWith("/backoffice/") ||
    caminho.startsWith("/_next") ||
    caminho.startsWith("/__") ||
    caminho.startsWith("/.") ||
    // Ficheiros (ícones, imagens, robots…): o último segmento tem extensão.
    /\/[^/]+\.[a-z0-9]+$/i.test(caminho)
  );
}

/** Caminho no idioma pedido: "/precario" → "/en/precario" (inglês); português sem prefixo. */
export function caminhoNoIdioma(idioma: Idioma, caminho: string): string {
  const { caminho: base } = separarIdioma(caminho);
  if (idioma === "pt-PT" || ehCaminhoSemIdioma(base.split(/[?#]/)[0])) return base;
  if (base === "/") return PREFIXO_EN;
  if (base.startsWith("/?") || base.startsWith("/#")) return `${PREFIXO_EN}${base.slice(1)}`;
  return `${PREFIXO_EN}${base}`;
}

const HOSTS_DOLADO = new Set(["dolado.pt", "www.dolado.pt", "portal.dolado.pt", "localhost", "127.0.0.1"]);

/**
 * Ligação no idioma pedido. Aceita caminhos ("/precario", "/#faq") e URLs
 * absolutos da DoLado (dolado.pt, portal.dolado.pt, localhost); deixa como
 * estão âncoras, mailto:, tel: e sites externos.
 */
export function localizarHref(idioma: Idioma, href: string): string {
  if (idioma === IDIOMA_PADRAO || !href) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return caminhoNoIdioma(idioma, href);
  if (!/^https?:\/\//i.test(href)) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (!HOSTS_DOLADO.has(url.hostname) && !url.hostname.endsWith(".cleverapps.io")) return href;
  const localizado = caminhoNoIdioma(idioma, url.pathname);
  return `${url.origin}${localizado}${url.search}${url.hash}`;
}

/**
 * Página equivalente noutro idioma (seletor). Todas as páginas do cliente
 * existem nos dois idiomas; caminhos sem idioma (backoffice, API) levam à
 * página inicial do idioma escolhido.
 */
export function caminhoEquivalente(pathnameAtual: string, destino: Idioma, pesquisa = ""): string {
  const { caminho } = separarIdioma(pathnameAtual || "/");
  if (ehCaminhoSemIdioma(caminho)) return caminhoNoIdioma(destino, "/");
  return `${caminhoNoIdioma(destino, caminho)}${pesquisa}`;
}

/** Domínio do cookie do idioma: partilhado entre dolado.pt e portal.dolado.pt em produção. */
export function dominioCookieIdioma(host: string): string | undefined {
  const h = host.split(":")[0].toLowerCase();
  return h === "dolado.pt" || h.endsWith(".dolado.pt") ? ".dolado.pt" : undefined;
}
