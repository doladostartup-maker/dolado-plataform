"use client";

import Link from "next/link";
import { useState } from "react";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { IconeFechar, IconeMenu, IconeSeta } from "./Icones";
import { BOTAO_PRIMARIO } from "./estilos";
import { Logotipo } from "./Logotipo";
import { ROTAS_V2 } from "./rotas";

// Navbar do Design System V2 (todas as páginas públicas). Só existe dentro de
// PaginaV2.

const LINKS = [
  { href: ROTAS_V2.comoFunciona, label: "Como funciona" },
  { href: ROTAS_V2.ferramentas, label: "Ferramentas gratuitas" },
  { href: ROTAS_V2.precario, label: "Preçário" },
  { href: ROTAS_V2.ajuda, label: "Ajuda" },
];

export function NavbarV2({ eventoCta, parametrosCta }: { eventoCta: string; parametrosCta?: Record<string, string> }) {
  const [aberto, setAberto] = useState(false);
  const [origem] = useState(detectarOrigem);

  function tratarCaso() {
    track(eventoCta, parametrosCta);
    window.location.assign(urlTratarCaso(origem));
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--v2-line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
        <Logotipo />
        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="text-[14px] font-medium text-[var(--v2-muted)] hover:text-[var(--v2-navy)]">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/entrar" className="text-[14px] font-semibold text-[var(--v2-navy)] hover:text-[var(--v2-green)]">
            Iniciar sessão
          </Link>
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} min-h-10 px-5 text-[14px]`}>
            Tratar do meu caso <IconeSeta tamanho={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-v2"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--v2-navy)] lg:hidden"
        >
          {aberto ? <IconeFechar tamanho={22} /> : <IconeMenu tamanho={22} />}
        </button>
      </div>
      {aberto && (
        <div id="menu-v2" className="border-t border-[var(--v2-line)] bg-white px-5 pb-6 pt-2 lg:hidden">
          <nav aria-label="Principal (telemóvel)" className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setAberto(false)}
                className="flex min-h-12 items-center border-b border-[var(--v2-line)] text-[16px] font-medium text-[var(--v2-navy)]"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/entrar" className="flex min-h-12 items-center text-[16px] font-semibold text-[var(--v2-navy)]">
              Iniciar sessão
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              tratarCaso();
            }}
            className={`${BOTAO_PRIMARIO} mt-3 w-full`}
          >
            Tratar do meu caso <IconeSeta tamanho={16} />
          </button>
        </div>
      )}
    </header>
  );
}
