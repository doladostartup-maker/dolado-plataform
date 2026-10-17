"use client";

import Link from "@/i18n/Link";
import { useState } from "react";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { useCaminho, useTextos } from "@/i18n/cliente";
import { tComum } from "@/i18n/mensagens/comum";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { IconeFechar, IconeMenu, IconeSeta } from "./Icones";
import { BOTAO_PRIMARIO } from "./estilos";
import { Logotipo } from "./Logotipo";
import { ROTAS_V2 } from "./rotas";

// Navbar do Design System V2 (todas as páginas públicas). Só existe dentro de
// PaginaV2. Prefetch: só os 4 links principais (navegação mais provável);
// "Problemas que tratamos", "Proteção", "Empresas", logótipo e "Iniciar
// sessão" (portal, outro domínio) sem prefetch.
// Revisão de 17/10/2026: "Problemas que tratamos" e "Proteção" entram no
// menu; "Empresas" fica no menu do telemóvel e no rodapé, para o menu do
// computador não ficar sobrecarregado; no computador, rótulos curtos
// ("Problemas", "Ferramentas") e menu completo só a partir de 1280 px
// (abaixo disso, o menu do telemóvel, com os nomes completos).

const LINKS = [
  { href: ROTAS_V2.problemas, chave: "problemas", curta: "problemasCurto", prefetch: false },
  { href: ROTAS_V2.comoFunciona, chave: "comoFunciona" },
  { href: ROTAS_V2.protecao, chave: "protecao", prefetch: false },
  { href: ROTAS_V2.precario, chave: "precario" },
  { href: ROTAS_V2.ferramentas, chave: "ferramentas", curta: "ferramentasCurto" },
  { href: ROTAS_V2.ajuda, chave: "ajuda" },
  { href: ROTAS_V2.empresas, chave: "empresas", prefetch: false, soTelemovel: true },
] as const;

export function NavbarV2({ eventoCta, parametrosCta }: { eventoCta: string; parametrosCta?: Record<string, string> }) {
  const [aberto, setAberto] = useState(false);
  const [origem] = useState(detectarOrigem);
  const t = useTextos(tComum);
  const c = useCaminho();

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
        <nav aria-label={t.acessibilidade.navPrincipal} className="hidden items-center gap-5 xl:flex 2xl:gap-6">
          {LINKS.filter((l) => !("soTelemovel" in l)).map((l) => (
            <Link key={l.chave} href={l.href} prefetch={"prefetch" in l ? l.prefetch : undefined} className="whitespace-nowrap text-[14px] font-medium text-[var(--v2-muted)] hover:text-[var(--v2-navy)]">
              {t.navbar["curta" in l ? l.curta : l.chave]}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 xl:flex xl:gap-5">
          <SeletorIdioma compacto />
          <a href={c(ROTAS_V2.entrar)} className="whitespace-nowrap text-[14px] font-semibold text-[var(--v2-navy)] hover:text-[var(--v2-green)]">
            {t.navbar.iniciarSessao}
          </a>
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} min-h-10 whitespace-nowrap px-5 text-[14px]`}>
            {t.navbar.tratarCaso} <IconeSeta tamanho={16} />
          </button>
        </div>
        <div className="flex items-center gap-1 xl:hidden">
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
        <div id="menu-v2" className="border-t border-[var(--v2-line)] bg-white px-5 pb-6 pt-2 xl:hidden">
          <nav aria-label={t.acessibilidade.navPrincipalTelemovel} className="flex flex-col">
            {LINKS.map((l) => (
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
            <a href={c(ROTAS_V2.entrar)} className="flex min-h-12 items-center text-[16px] font-semibold text-[var(--v2-navy)]">
              {t.navbar.iniciarSessao}
            </a>
          </nav>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              tratarCaso();
            }}
            className={`${BOTAO_PRIMARIO} mt-3 w-full`}
          >
            {t.navbar.tratarCaso} <IconeSeta tamanho={16} />
          </button>
        </div>
      )}
    </header>
  );
}
