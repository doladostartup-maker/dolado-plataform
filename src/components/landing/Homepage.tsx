"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { detectarOrigem, track } from "@/lib/analytics";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, NIPC, urlTratarCaso } from "@/lib/site";
import { AccordionPerguntas } from "./AccordionPerguntas";
import { FuncionalidadesProtecao } from "./FuncionalidadesProtecao";
import { PERGUNTAS_HOMEPAGE } from "./conteudoPerguntasFrequentes";
import { Precario } from "./Precario";
import { SiteHeader } from "./SiteHeader";

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)]";

export function Homepage() {
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback((origemClique: string) => {
    track(origemClique);
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* ===== Secção 1: Nav + Hero ===== */}
      <SiteHeader
        ctaLabel="Tratar o meu caso"
        onCtaClick={() => openForm("click_nav_reclamacao")}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-30"
          style={{
            background: "radial-gradient(600px 300px at 50% 0%, var(--color-brand-wash), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-[1120px] gap-10 px-4 py-16 sm:px-10 sm:py-20 lg:grid-cols-[460px_1fr] lg:items-center lg:gap-16">
          {/* Coluna esquerda */}
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
              Telecom · Energia · Água
            </p>
            <h1 className="mb-5 text-[clamp(30px,4.6vw,46px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--color-ink)]">
              A sua reclamação, escrita com a lei do seu lado.
            </h1>
            <p className="mb-8 text-base leading-relaxed text-[var(--color-ink-muted)]">
              A DoLado identifica a legislação aplicável ao seu caso e prepara a reclamação por
              si. Recebe o texto primeiro, revê e confirma. Só com a sua autorização fazemos o
              envio para o Livro de Reclamações e acompanhamos o que acontece a seguir.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => openForm("click_hero_reclamacao")} className={BOTAO_PRIMARIO}>
                Tratar o meu caso
              </button>
              <Link href="/como-funciona" className={BOTAO_SECUNDARIO}>
                Ver como funciona
              </Link>
            </div>
            <p className="mb-4 text-[14px] text-[var(--color-ink-muted)]">
              Ainda não sabe se deve avançar?{" "}
              <Link
                href="/simulador-elegibilidade"
                onClick={() => track("click_hero_simulador")}
                className="font-semibold text-[var(--color-brand)] underline-offset-2 hover:underline"
              >
                Ver se a DoLado pode ajudar →
              </Link>
            </p>
            <p className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-faint)]">
              <span className="text-[var(--color-brand)]">✓</span>
              Resposta ao primeiro contacto no prazo máximo de 48 horas úteis
            </p>
          </div>

          {/* Coluna direita — vídeo */}
          <div>
            <p className="mb-3 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)] lg:text-left">
              Veja a DoLado a preparar a sua reclamação
            </p>
            <div className="relative flex h-[320px] items-center justify-center rounded-[var(--radius-panel)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
              <button
                type="button"
                aria-label="Reproduzir vídeo de demonstração"
                onClick={() => track("click_play_demo")}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand)] text-white transition hover:bg-[var(--color-brand-hover)]"
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M7 5.5L17 11L7 16.5V5.5Z" fill="currentColor" />
                </svg>
              </button>
              <span className="absolute bottom-3 right-3 rounded-[var(--radius-input)] bg-black/60 px-2 py-0.5 text-[11.5px] font-medium text-white">
                2:14
              </span>
            </div>
            <p className="mt-3 text-center text-[12.5px] text-[var(--color-ink-faint)] lg:text-left">
              Do relato do problema à reclamação pronta para a sua aprovação, sem cortes.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Secção 2: Funcionalidades ===== */}
      <FuncionalidadesProtecao
        botaoPrimario={BOTAO_PRIMARIO}
        botaoSecundario={BOTAO_SECUNDARIO}
        onProblemaClick={() => openForm("click_funcionalidades_reclamacao")}
      />

      {/* ===== Secção 3: Preçário ===== */}
      <Precario />

      {/* ===== Secção 4: Perguntas frequentes ===== */}
      <section className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-10">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">
            Perguntas frequentes
          </h2>
          <p className="mb-6 text-[13.5px] text-[var(--color-ink-muted)]">
            Tudo o que precisa de saber antes de começar.
          </p>
          <AccordionPerguntas perguntas={PERGUNTAS_HOMEPAGE} />
          <p className="mt-6">
            <Link
              href="/perguntas-frequentes"
              className="text-[13.5px] font-medium text-[var(--color-brand)] underline-offset-4 hover:text-[var(--color-brand-hover)] hover:underline"
            >
              Ver todas as perguntas frequentes →
            </Link>
          </p>
        </div>
      </section>

      {/* ===== Secção 6: Faixa de transparência legal ===== */}
      <section id="transparencia" className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-10">
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] px-5 py-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
            Não garantimos resolver — garantimos que a reclamação chega bem feita, com a lei
            certa citada. A DoLado presta apoio administrativo, nunca aconselhamento jurídico
            individualizado.
          </p>
        </div>
      </section>

      {/* ===== Secção 7: CTA final ===== */}
      <section id="quem-trata" className="border-t border-[var(--color-hairline)] px-4 py-16 text-center sm:px-10">
        <h2 className="mb-5 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Tem um problema com uma empresa?
        </h2>
        <button
          type="button"
          onClick={() => openForm("click_cta_final")}
          className={`${BOTAO_PRIMARIO} text-[14px] font-semibold`}
        >
          Tratar o meu caso
        </button>
      </section>

      {/* Rodapé */}
      <footer id="contacto" className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-[var(--color-ink-muted)] sm:px-10">
          <p className="w-full max-w-[640px] leading-relaxed">
            A DoLado está do lado do consumidor. Ajudamos a apresentar e acompanhar reclamações e
            a evitar prejuízos causados pela falta de informação, com transparência, proximidade e
            simplicidade.
          </p>
          <span>
            © 2026 DoLado · {ENTIDADE_LEGAL} · NIPC {NIPC} · Lisboa
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href={ROTAS_LEGAIS.termos} className="hover:text-[var(--color-brand)]">
              Termos
            </Link>
            <Link href={ROTAS_LEGAIS.privacidade} className="hover:text-[var(--color-brand)]">
              Privacidade
            </Link>
            <Link href={ROTAS_LEGAIS.livreResolucao} className="hover:text-[var(--color-brand)]">
              Livre resolução
            </Link>
            <Link href={ROTAS_LEGAIS.resolucaoLitigios} className="hover:text-[var(--color-brand)]">
              Resolução de litígios
            </Link>
            <a
              href={LIVRO_RECLAMACOES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-[var(--color-brand)]"
            >
              Livro de Reclamações
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
