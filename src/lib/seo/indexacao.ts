// Indexação do site público (sitemap.xml e robots.txt) — regras puras, sem
// I/O; testadas com `node --test` (indexacao.test.mjs).
//
// Só entram no sitemap as páginas públicas indexáveis de dolado.pt, com as
// mesmas URLs absolutas e a mesma correspondência pt-PT/en-GB que o
// canonical e o hreflang de cada página (src/i18n/metadados.ts). Ficam de
// fora: portal, backoffice, APIs, callbacks, páginas com token
// (/texto/…, recuperação), links de indicação e tudo o que é noindex.
// Páginas legais: só a versão portuguesa (a /en é noindex, canonical para a
// portuguesa); versões antigas (/termos/<versão>) não entram.
//
// robots.txt não é segurança: as áreas privadas continuam protegidas pela
// sessão e pelo RLS. Aqui só se evita gastar o rastreio nelas.

import { IDIOMAS, type Idioma } from "../../i18n/config.ts";
import { urlPublico } from "../../i18n/metadados.ts";

export const SITE_PUBLICO = "https://dolado.pt";
export const URL_SITEMAP = `${SITE_PUBLICO}/sitemap.xml`;

/** Páginas com versão portuguesa e inglesa (metadadosPublicos). */
export const PAGINAS_BILINGUES = [
  "/",
  "/como-funciona",
  "/precario",
  "/ferramentas-gratuitas",
  "/simulador-elegibilidade",
  "/calculadora-cancelamento",
  "/mudanca-de-casa",
  "/perguntas-frequentes",
  "/sobre-nos",
  "/transparencia",
  "/empresas",
  "/contacto",
] as const;

/** Páginas legais: indexadas só em português (metadadosLegais). */
export const PAGINAS_SO_PORTUGUES = ["/termos", "/privacidade", "/livre-resolucao", "/resolucao-de-litigios"] as const;

export type EntradaSitemap = {
  url: string;
  alternates?: { languages: Record<string, string> };
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
};

function prioridade(caminho: string) {
  if (caminho === "/") return 1;
  if (caminho === "/precario" || caminho === "/como-funciona") return 0.9;
  return 0.7;
}

/** Entradas do sitemap: uma por URL, cada página bilingue com as duas alternativas e x-default. */
export function entradasSitemap(): EntradaSitemap[] {
  const bilingues = PAGINAS_BILINGUES.flatMap((caminho) => {
    const languages: Record<string, string> = {
      ...Object.fromEntries(IDIOMAS.map((i: Idioma) => [i, urlPublico(i, caminho)])),
      "x-default": urlPublico("pt-PT", caminho),
    };
    return IDIOMAS.map((idioma) => ({
      url: urlPublico(idioma, caminho),
      alternates: { languages },
      changeFrequency: (caminho === "/" ? "weekly" : "monthly") as EntradaSitemap["changeFrequency"],
      priority: idioma === "pt-PT" ? prioridade(caminho) : Math.round((prioridade(caminho) - 0.1) * 10) / 10,
    }));
  });
  const legais = PAGINAS_SO_PORTUGUES.map((caminho) => ({
    url: urlPublico("pt-PT", caminho),
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));
  return [...bilingues, ...legais];
}

/**
 * Áreas privadas/técnicas fora do rastreio (com e sem /en). Os ficheiros do
 * Next (/_next/…), imagens e ícones nunca são bloqueados.
 */
export const CAMINHOS_BLOQUEADOS = [
  "/api/",
  "/auth/",
  "/backoffice",
  "/portal",
  "/texto/",
  "/r/",
  "/comprar",
  "/conta$",
  "/criar-conta",
  "/associar-compra",
  "/confirmar-email",
  "/recuperar-palavra-passe",
  "/redefinir-palavra-passe",
  "/tratar-caso/",
] as const;

export function regrasRobots() {
  const disallow = CAMINHOS_BLOQUEADOS.flatMap((c) => (c.startsWith("/api/") || c.startsWith("/auth/") || c === "/backoffice" ? [c] : [c, `/en${c}`]));
  return { rules: [{ userAgent: "*", allow: "/", disallow }], sitemap: URL_SITEMAP };
}
