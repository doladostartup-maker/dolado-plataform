"use client";

import Link from "@/i18n/Link";
import { useState } from "react";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { useCaminho, useTextos } from "@/i18n/cliente";
import { tComum } from "@/i18n/mensagens/comum";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { IconeFechar, IconeMenu, IconeSeta } from "./Icones";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO } from "./estilos";
import { LigacaoAnalisar } from "./LigacaoAnalisar";
import { Logotipo } from "./Logotipo";
import { ROTAS_V2 } from "./rotas";

// Navbar do Design System V2 (todas as páginas públicas). Só existe dentro de
// PaginaV2. Prefetch: só os links principais (navegação mais provável);
// "Problemas que tratamos", "Proteção", logótipo e "Entrar" (portal, outro
// domínio) sem prefetch.
// Simplificação de 17/10/2026: o menu fica só com Problemas, Proteção,
// Preços, Ferramentas e "Tratar do meu caso"; "Entrar" e PT/EN ficam
// discretos. "Como funciona", "Ajuda" (perguntas frequentes) e "Empresas"
// saíram do menu (computador e telemóvel) e continuam no rodapé, no sitemap
// e nas ligações internas.
// Reposicionamento de 22/10/2026: com a análise gratuita ligada, a entrada
// principal é "Analisar documento" (leva ao cartão de análise da homepage,
// LigacaoAnalisar) e o menu segue a nova hierarquia — Como funciona,
// Protecção, Preços, Problemas, Ferramentas. "Tratar do meu caso" continua no
// menu do telemóvel (por baixo da acção principal), na homepage, em "Como
// funciona" e nas páginas de problemas. Sem a análise, fica como antes.

const LINKS = [
  { href: ROTAS_V2.comoFunciona, chave: "comoFunciona", prefetch: false, soComAnalise: true },
  { href: ROTAS_V2.protecao, chave: "protecao", prefetch: false },
  { href: ROTAS_V2.precario, chave: "precario" },
  { href: ROTAS_V2.problemas, chave: "problemas", curta: "problemasCurto", prefetch: false },
  { href: ROTAS_V2.ferramentas, chave: "ferramentas", curta: "ferramentasCurto" },
] as const;

/**
 * `analisar`: análise gratuita ligada (DIAGNOSTICO_GRATUITO_ATIVO, lido no build) — botão "Analisar documento".
 * `ctaDiscreto`: sem a análise, "Tratar do meu caso" em contorno.
 */
export function NavbarV2({
  eventoCta,
  parametrosCta,
  ctaDiscreto = false,
  analisar = false,
}: {
  eventoCta: string;
  parametrosCta?: Record<string, string>;
  ctaDiscreto?: boolean;
  analisar?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [origem] = useState(detectarOrigem);
  const t = useTextos(tComum);
  const c = useCaminho();

  const estiloCta = ctaDiscreto ? BOTAO_CONTORNO : BOTAO_PRIMARIO;
  const links = LINKS.filter((l) => analisar || !("soComAnalise" in l));
  // Com cinco ligações e "Analisar documento", o menu completo só cabe a partir de 1280 px.
  const soComputador = analisar ? "hidden xl:flex" : "hidden lg:flex";
  const soTelemovel = analisar ? "xl:hidden" : "lg:hidden";

  function tratarCaso() {
    track(eventoCta, parametrosCta);
    window.location.assign(c(urlTratarCaso(origem)));
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--v2-line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
        <div className="flex-none">
          <Logotipo />
        </div>
        <nav aria-label={t.acessibilidade.navPrincipal} className={`${soComputador} items-center gap-7`}>
          {links.map((l) => (
            <Link key={l.chave} href={l.href} prefetch={"prefetch" in l ? l.prefetch : undefined} className="whitespace-nowrap text-[15px] font-medium text-[var(--v2-navy)] hover:text-[var(--v2-green)]">
              {t.navbar["curta" in l ? l.curta : l.chave]}
            </Link>
          ))}
        </nav>
        <div className={`${soComputador} items-center gap-4`}>
          <SeletorIdioma compacto />
          <a href={c(ROTAS_V2.entrar)} className="whitespace-nowrap text-[14px] font-medium text-[var(--v2-muted)] hover:text-[var(--v2-navy)]">
            {t.navbar.iniciarSessao}
          </a>
          {analisar ? (
            <LigacaoAnalisar evento="click_nav_analisar_documento" className={`${BOTAO_PRIMARIO} min-h-10 whitespace-nowrap px-5 text-[14px]`}>
              {t.navbar.analisarDocumento} <IconeSeta tamanho={16} />
            </LigacaoAnalisar>
          ) : (
            <button type="button" onClick={tratarCaso} className={`${estiloCta} min-h-10 whitespace-nowrap px-5 text-[14px]`}>
              {t.navbar.tratarCaso} <IconeSeta tamanho={16} />
            </button>
          )}
        </div>
        <div className={`flex items-center gap-1 ${soTelemovel}`}>
          <SeletorIdioma compacto />
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls="menu-v2"
            aria-label={aberto ? t.acessibilidade.fecharMenu : t.acessibilidade.abrirMenu}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--v2-navy)]"
          >
            {aberto ? <IconeFechar tamanho={22} /> : <IconeMenu tamanho={22} />}
          </button>
        </div>
      </div>
      {aberto && (
        <div id="menu-v2" className={`border-t border-[var(--v2-line)] bg-white px-5 pb-6 pt-2 ${soTelemovel}`}>
          <nav aria-label={t.acessibilidade.navPrincipalTelemovel} className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.chave}
                href={l.href}
                prefetch={"prefetch" in l ? l.prefetch : undefined}
                onClick={() => setAberto(false)}
                className="flex min-h-12 items-center border-b border-[var(--v2-line)] text-[16px] font-medium text-[var(--v2-navy)]"
              >
                {t.navbar[l.chave]}
              </Link>
            ))}
            <a href={c(ROTAS_V2.entrar)} className="flex min-h-12 items-center text-[15px] font-medium text-[var(--v2-muted)]">
              {t.navbar.iniciarSessao}
            </a>
          </nav>
          {analisar ? (
            <>
              <LigacaoAnalisar
                evento="click_nav_analisar_documento"
                parametros={{ local: "menu_telemovel" }}
                aoClicar={() => setAberto(false)}
                className={`${BOTAO_PRIMARIO} mt-3 min-h-12 w-full text-[16px]`}
              >
                {t.navbar.analisarDocumento} <IconeSeta tamanho={16} />
              </LigacaoAnalisar>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  tratarCaso();
                }}
                className="mt-2 flex min-h-12 w-full items-center justify-center text-[16px] font-semibold text-[var(--v2-navy)] underline underline-offset-4"
              >
                {t.navbar.jaTemProblema}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                tratarCaso();
              }}
              className={`${estiloCta} mt-3 w-full`}
            >
              {t.navbar.tratarCaso} <IconeSeta tamanho={16} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
