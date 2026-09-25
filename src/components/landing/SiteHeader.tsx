"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/simulador-elegibilidade", label: "Simulador de Elegibilidade" },
  { href: "/por-que-assinar", label: "Por quê assinar?" },
  { href: "/transparencia", label: "Transparência" },
  { href: "/#quem-trata", label: "Sobre nós" },
  { href: "/contacto", label: "Contacto" },
];

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
  const painelRef = useRef<HTMLDivElement>(null);
  const hamburguerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setMenuOpen(false);

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
        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-1.5 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="whitespace-nowrap text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
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
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={closeMenu}
              className="flex min-h-11 items-center text-base font-medium text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
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
