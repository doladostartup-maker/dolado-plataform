"use client";

import { useCallback, useEffect, useState } from "react";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { AccordionPerguntas } from "./AccordionPerguntas";
import { FormularioGuiado } from "./FormularioGuiado";
import { CATEGORIAS_PERGUNTAS } from "./conteudoPerguntasFrequentes";
import { SiteHeader } from "./SiteHeader";

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

export function PerguntasFrequentes() {
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback((origemClique: string) => {
    track(origemClique);
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, closeForm]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <SiteHeader
        ctaLabel="Começar reclamação"
        onCtaClick={() => openForm("click_nav_perguntas_frequentes")}
      />

      {/* ===== Hero ===== */}
      <section className="mx-auto max-w-[720px] px-4 pt-16 pb-6 text-center sm:px-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          Perguntas Frequentes
        </p>
        <h1 className="mb-4 text-[clamp(26px,4.4vw,36px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Perguntas frequentes
        </h1>
        <p className="mx-auto max-w-[520px] text-[15.5px] leading-relaxed text-[var(--color-ink-muted)]">
          Encontre respostas sobre como funciona a DoLado, os nossos planos, o envio da
          reclamação e o que acontece depois.
        </p>
      </section>

      {/* ===== Atalhos para as categorias ===== */}
      <nav aria-label="Categorias" className="mx-auto max-w-[760px] px-4 pt-4 sm:px-10">
        <ul className="flex flex-wrap justify-center gap-2">
          {CATEGORIAS_PERGUNTAS.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className="inline-flex min-h-9 items-center rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-white px-3.5 text-[13px] font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                {c.titulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ===== Categorias ===== */}
      <div className="mx-auto flex max-w-[760px] flex-col gap-12 px-4 pt-12 pb-14 sm:px-10">
        {CATEGORIAS_PERGUNTAS.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-titulo`} className="scroll-mt-24">
            <h2
              id={`${c.id}-titulo`}
              className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]"
            >
              {c.titulo}
            </h2>
            <AccordionPerguntas perguntas={c.perguntas} />
          </section>
        ))}
      </div>

      {/* ===== CTA final ===== */}
      <section className="flex flex-col items-center border-t border-[var(--color-hairline)] px-4 py-14 text-center sm:px-10">
        <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Pronto para começar?
        </h2>
        <button
          type="button"
          onClick={() => openForm("click_cta_perguntas_frequentes")}
          className={`${BOTAO_PRIMARIO} text-[14px] font-semibold`}
        >
          Começar reclamação
        </button>
      </section>

      {/* Modal do formulário */}
      {formOpen && (
        <div
          onClick={closeForm}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(23,26,33,0.42)] px-4 py-8 sm:px-8"
        >
          <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-[640px] flex-none">
            <FormularioGuiado onClose={closeForm} onSuccess={trackFormSuccess} origem={origem} />
          </div>
        </div>
      )}
    </div>
  );
}
