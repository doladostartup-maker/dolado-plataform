"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, NIPC } from "@/lib/site";
import { IconeFechar, IconeMenu, IconeSeta } from "./Icones";
import { BOTAO_PRIMARIO } from "./estilos";

// Navbar e rodapé próprios de /landing-v2 — não substituem o SiteHeader nem o
// rodapé da homepage.

const LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#ferramentas", label: "Ferramentas gratuitas" },
  { href: "/#precario", label: "Preços" },
  { href: "/perguntas-frequentes", label: "Ajuda" },
];

function Logotipo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="DoLado — página inicial">
      <Image src="/brand/dolado-logo-icon.svg" alt="" width={30} height={30} />
      <span className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">DoLado</span>
    </Link>
  );
}

export function NavegacaoV2({ onTratarCaso }: { onTratarCaso: () => void }) {
  const [aberto, setAberto] = useState(false);

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
          <button type="button" onClick={onTratarCaso} className={`${BOTAO_PRIMARIO} min-h-10 px-5 text-[14px]`}>
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
              onTratarCaso();
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

const COLUNAS_RODAPE: { titulo: string; links: { href: string; label: string; externo?: boolean }[] }[] = [
  {
    titulo: "Produto",
    links: [
      { href: "/como-funciona", label: "Como funciona" },
      { href: "#ferramentas", label: "Ferramentas gratuitas" },
      { href: "/#precario", label: "Preços" },
    ],
  },
  {
    titulo: "DoLado",
    links: [
      { href: "/sobre-nos", label: "Sobre nós" },
      { href: "/perguntas-frequentes", label: "Ajuda" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { href: ROTAS_LEGAIS.termos, label: "Termos e Condições" },
      { href: ROTAS_LEGAIS.privacidade, label: "Política de Privacidade" },
      { href: ROTAS_LEGAIS.livreResolucao, label: "Livre resolução" },
      { href: ROTAS_LEGAIS.resolucaoLitigios, label: "Resolução de litígios" },
      { href: LIVRO_RECLAMACOES_URL, label: "Livro de Reclamações", externo: true },
    ],
  },
];

export function RodapeV2() {
  return (
    <footer className="border-t border-[var(--v2-line)] bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logotipo />
          <p className="mt-4 max-w-[260px] text-[14px] leading-relaxed text-[var(--v2-muted)]">
            Do lado dos consumidores.
          </p>
        </div>
        {COLUNAS_RODAPE.map((c) => (
          <div key={c.titulo}>
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-navy)]">{c.titulo}</p>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.externo ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--v2-line)]">
        <p className="mx-auto max-w-[1200px] px-5 py-5 text-[12.5px] text-[var(--v2-muted)] sm:px-8">
          © 2026 DoLado · {ENTIDADE_LEGAL} · NIPC {NIPC} · Lisboa
        </p>
      </div>
    </footer>
  );
}
