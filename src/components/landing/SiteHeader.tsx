"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type LinkMenu = { href: string; label: string };

// Ordem no menu: Como funciona · Ferramentas ▾ · Planos · Perguntas Frequentes · A DoLado ▾
const COMO_FUNCIONA: LinkMenu = { href: "/como-funciona", label: "Como funciona" };

// Ferramentas e guias públicos e gratuitos, agrupados no dropdown "Ferramentas"
const FERRAMENTAS_LINKS: LinkMenu[] = [
  { href: "/simulador-elegibilidade", label: "Simulador de Elegibilidade" },
  { href: "/calculadora-cancelamento", label: "Calculadora de Cancelamento" },
  { href: "/mudanca-de-casa", label: "Guia de Mudança de Casa" },
];

const NAV_LINKS: LinkMenu[] = [
  { href: "/precario", label: "Planos" },
  { href: "/perguntas-frequentes", label: "Perguntas Frequentes" },
];

// Links institucionais agrupados no dropdown "A DoLado"
const INSTITUCIONAL_LINKS: LinkMenu[] = [
  { href: "/transparencia", label: "Transparência" },
  { href: "/sobre-nos", label: "Sobre nós" },
  { href: "/contacto", label: "Contacto" },
];

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`flex-none transition-transform ${aberto ? "rotate-180" : ""}`}
    >
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LINK_DESKTOP =
  "whitespace-nowrap text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]";
const LINK_MOBILE = "flex min-h-11 items-center text-base font-medium text-[var(--color-ink)]";

/** Dropdown do menu desktop: abre com clique, fecha com Escape, clique fora ou quando o foco sai. */
function MenuDropdown({ id, titulo, links }: { id: string; titulo: string; links: LinkMenu[] }) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    const onClickFora = (e: MouseEvent) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickFora);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickFora);
    };
  }, [aberto]);

  return (
    <div
      ref={caixaRef}
      className="relative"
      onBlur={(e) => {
        // Fecha quando o foco (Tab) sai do dropdown
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAberto(false);
      }}
    >
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium hover:text-[var(--color-ink)] ${
          aberto ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"
        }`}
      >
        {titulo}
        <Chevron aberto={aberto} />
      </button>
      {aberto && (
        <div
          id={id}
          className="absolute left-1/2 top-full mt-3 flex min-w-[180px] -translate-x-1/2 flex-col rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-white py-1.5 shadow-[var(--shadow-md)]"
        >
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setAberto(false)}
              className="whitespace-nowrap px-4 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] focus-visible:bg-[var(--color-canvas)] focus-visible:text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grupo expansível do menu mobile. */
function GrupoMobile({
  id,
  titulo,
  links,
  aberto,
  onAlternar,
  onNavegar,
}: {
  id: string;
  titulo: string;
  links: LinkMenu[];
  aberto: boolean;
  onAlternar: () => void;
  onNavegar: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        aria-controls={id}
        className="flex min-h-11 items-center justify-between text-left text-base font-medium text-[var(--color-ink)]"
      >
        {titulo}
        <Chevron aberto={aberto} />
      </button>
      {aberto && (
        <div id={id} className="flex flex-col gap-1 pl-4">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={onNavegar}
              className="flex min-h-11 items-center text-base font-medium text-[var(--color-ink-muted)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

export function SiteHeader({
  ctaLabel,
  onCtaClick,
}: {
  ctaLabel: string;
  onCtaClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Grupo aberto no menu mobile (só um de cada vez)
  const [grupoMobile, setGrupoMobile] = useState<"ferramentas" | "dolado" | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const hamburguerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setGrupoMobile(null);
  };
  const alternarGrupo = (g: "ferramentas" | "dolado") => setGrupoMobile((atual) => (atual === g ? null : g));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onClickFora = (e: MouseEvent) => {
      if (
        painelRef.current &&
        !painelRef.current.contains(e.target as Node) &&
        !hamburguerRef.current?.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickFora);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickFora);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-hairline)] bg-white/72 backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/brand/dolado-logo-icon.svg" alt="" width={32} height={32} priority />
          <span className="text-base font-bold tracking-tight">
            <span className="text-[var(--color-ink)]">Do</span>
            <span className="text-[var(--color-brand)]">Lado</span>
          </span>
        </Link>

        {/* Navegação — desktop */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-x-6 lg:flex">
          <Link href={COMO_FUNCIONA.href} className={LINK_DESKTOP}>
            {COMO_FUNCIONA.label}
          </Link>
          <MenuDropdown id="menu-ferramentas" titulo="Ferramentas" links={FERRAMENTAS_LINKS} />
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} className={LINK_DESKTOP}>
              {l.label}
            </Link>
          ))}
          <MenuDropdown id="menu-a-dolado" titulo="A DoLado" links={INSTITUCIONAL_LINKS} />
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/entrar"
            className="whitespace-nowrap text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Entrar
          </Link>
          <button type="button" onClick={onCtaClick} className={BOTAO_PRIMARIO}>
            {ctaLabel}
          </button>
        </div>

        {/* Hambúrguer — mobile/tablet */}
        <button
          ref={hamburguerRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--radius-input)] text-[var(--color-ink)] lg:hidden"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M4 4L18 18M18 4L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Painel do menu — mobile/tablet */}
      {menuOpen && (
        <div
          ref={painelRef}
          className="flex flex-col gap-1 border-t border-[var(--color-hairline)] bg-white px-4 py-4 lg:hidden"
        >
          <Link href={COMO_FUNCIONA.href} onClick={closeMenu} className={LINK_MOBILE}>
            {COMO_FUNCIONA.label}
          </Link>
          <GrupoMobile
            id="menu-ferramentas-mobile"
            titulo="Ferramentas"
            links={FERRAMENTAS_LINKS}
            aberto={grupoMobile === "ferramentas"}
            onAlternar={() => alternarGrupo("ferramentas")}
            onNavegar={closeMenu}
          />
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={closeMenu} className={LINK_MOBILE}>
              {l.label}
            </Link>
          ))}
          <GrupoMobile
            id="menu-a-dolado-mobile"
            titulo="A DoLado"
            links={INSTITUCIONAL_LINKS}
            aberto={grupoMobile === "dolado"}
            onAlternar={() => alternarGrupo("dolado")}
            onNavegar={closeMenu}
          />
          <div className="my-2 border-t border-[var(--color-hairline)]" />
          <Link
            href="/entrar"
            onClick={closeMenu}
            className="flex min-h-11 items-center text-base font-medium text-[var(--color-ink)]"
          >
            Entrar
          </Link>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              onCtaClick();
            }}
            className={`${BOTAO_PRIMARIO} mt-2 w-full`}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </header>
  );
}
