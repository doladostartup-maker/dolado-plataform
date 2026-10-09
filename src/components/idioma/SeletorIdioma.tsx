"use client";

import { usePathname } from "next/navigation";
import {
  BANDEIRA_IDIOMA,
  COOKIE_IDIOMA,
  IDIOMAS,
  LANG_HTML,
  NOME_IDIOMA,
  VALIDADE_COOKIE_IDIOMA_S,
  caminhoEquivalente,
  dominioCookieIdioma,
  type Idioma,
} from "@/i18n/config";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { tComum } from "@/i18n/mensagens/comum";

// Seletor de idioma (navbar pública e portal). Guarda a escolha no cookie
// dolado_idioma (partilhado entre dolado.pt e portal.dolado.pt) e abre a
// página equivalente no outro idioma, com os mesmos parâmetros.
// A bandeira é decorativa: o nome do idioma está sempre escrito e cada
// ligação tem o rótulo acessível no próprio idioma (hreflang/lang).

export function guardarIdioma(idioma: Idioma) {
  const dominio = dominioCookieIdioma(window.location.hostname);
  const seguro = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_IDIOMA}=${idioma}; path=/; max-age=${VALIDADE_COOKIE_IDIOMA_S}; samesite=lax${seguro}${dominio ? `; domain=${dominio}` : ""}`;
}

export function SeletorIdioma({ compacto = false, className = "" }: { compacto?: boolean; className?: string }) {
  const atual = useIdioma();
  const pathname = usePathname() ?? "/";
  const t = useTextos(tComum);

  return (
    <ul aria-label={t.idioma.rotulo} className={`flex items-center gap-1 ${className}`}>
      {IDIOMAS.map((idioma) => {
        const ativo = idioma === atual;
        const destino = caminhoEquivalente(pathname, idioma);
        return (
          <li key={idioma}>
            <a
              href={destino}
              hrefLang={LANG_HTML[idioma]}
              lang={LANG_HTML[idioma]}
              aria-label={t.idioma.mudarPara[idioma]}
              aria-current={ativo ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                guardarIdioma(idioma);
                if (ativo) return;
                window.location.assign(caminhoEquivalente(window.location.pathname, idioma, window.location.search + window.location.hash));
              }}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-[8px] px-2 text-[13.5px] font-medium ${
                ativo ? "text-[var(--v2-navy)]" : "text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]"
              }`}
            >
              <span aria-hidden="true" className="text-[16px] leading-none">
                {BANDEIRA_IDIOMA[idioma]}
              </span>
              <span className={compacto ? "sr-only" : ""}>{NOME_IDIOMA[idioma]}</span>
              {compacto && (
                <span aria-hidden="true" className="text-[12.5px] font-semibold uppercase">
                  {idioma.slice(0, 2)}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
