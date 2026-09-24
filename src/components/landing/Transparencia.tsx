"use client";

import { useCallback, useEffect, useState } from "react";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { FormularioGuiado } from "./FormularioGuiado";
import { SiteHeader } from "./SiteHeader";

type Item = {
  titulo: string;
  descricao: string;
  span2?: boolean;
};

const O_QUE_FAZEMOS: Item[] = [
  {
    titulo: "Identificamos a lei aplicável",
    descricao: "Lemos o seu caso e encontramos o artigo de lei que se aplica — telecom, energia ou água.",
  },
  {
    titulo: "Escrevemos a carta formal",
    descricao: "Pronta a enviar, com a lei citada e o pedido claro — você só confirma e envia.",
  },
  {
    titulo: "Acompanhamos o prazo",
    descricao: "Ficamos em cópia no seu e-mail e sabemos exatamente quando o prazo de resposta termina.",
  },
  {
    titulo: "Escalamos se for preciso",
    descricao: "Sem resposta útil, submetemos ao Livro de Reclamações em seu nome, com a sua autorização.",
  },
];

const O_QUE_NAO_FAZEMOS: Item[] = [
  {
    titulo: "Não damos aconselhamento jurídico individualizado",
    descricao: "Organizamos factos e citamos a lei — não decidimos a sua estratégia legal.",
  },
  {
    titulo: "Não representamos em tribunal ou arbitragem",
    descricao: "Se o caso chegar a esse ponto, precisa de um advogado — dizemos-lhe isso com antecedência.",
  },
  {
    titulo: "Nunca cobramos uma percentagem do que recuperar",
    descricao: "Sem comissão de sucesso, por decisão nossa — evita qualquer conflito de interesse no seu caso.",
    span2: true,
  },
];

const FAQS = [
  {
    q: "Isto substitui um advogado?",
    a: "Não. Prestamos apoio administrativo — organização e citação da lei. Para estratégia jurídica ou representação formal, precisa de um advogado.",
  },
  {
    q: "E se a empresa não responder?",
    a: "Escalamos para o Livro de Reclamações em seu nome, com a sua autorização prévia.",
  },
  {
    q: "Vocês assinam ou representam-me legalmente?",
    a: "Não. Identificamo-nos sempre como a agir em seu nome numa reclamação administrativa — nunca como seus representantes legais.",
  },
];

export function Transparencia() {
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback(() => {
    track("click_nav_transparencia");
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
      {/* ===== Secção 1: Nav ===== */}
      <SiteHeader ctaLabel="Escrever a minha reclamação" onCtaClick={openForm} />

      {/* ===== Secção 2: Hero (brand-wash) ===== */}
      <section className="flex flex-col items-center gap-4 bg-[var(--color-brand-wash)] px-4 py-16 text-center sm:px-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)] text-2xl shadow-[var(--shadow-subtle)]">
          🤝
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          Transparência
        </p>
        <h1 className="max-w-[640px] text-[clamp(26px,4.6vw,38px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          O que fazemos por si — e o que não fazemos. Sem letras miúdas.
        </h1>
        <p className="max-w-[520px] text-base leading-relaxed text-[var(--color-ink-muted)]">
          Sabemos que confiar o seu caso a alguém é difícil quando não sabe exatamente o que
          está a contratar. Por isso explicamos aqui, em linguagem simples, os limites do que a
          DoLado pode fazer.
        </p>
      </section>

      {/* ===== Secção 3: O que fazemos ===== */}
      <section className="px-4 pt-16 pb-4 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <h2 className="mb-7 text-xl font-semibold text-[var(--color-ink)]">O que fazemos por si</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {O_QUE_FAZEMOS.map((item) => (
              <div key={item.titulo} className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-brand)] text-[15px] font-bold text-white"
                >
                  ✓
                </span>
                <div>
                  <p className="mb-0.5 text-[14.5px] font-semibold text-[var(--color-ink)]">{item.titulo}</p>
                  <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Secção 4: O que não fazemos ===== */}
      <section className="px-4 py-12 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <h2 className="mb-7 text-xl font-semibold text-[var(--color-ink)]">O que não fazemos</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {O_QUE_NAO_FAZEMOS.map((item) => (
              <div
                key={item.titulo}
                className={`flex items-start gap-3.5 ${item.span2 ? "sm:col-span-2" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[15px] font-bold text-[var(--color-ink-muted)]"
                >
                  –
                </span>
                <div>
                  <p className="mb-0.5 text-[14.5px] font-semibold text-[var(--color-ink)]">{item.titulo}</p>
                  <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Secção 5: Reasseguramento ===== */}
      <section className="px-4 pt-2 pb-14 sm:px-10">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-5 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-subtle)] sm:flex-row sm:p-8">
          <span aria-hidden="true" className="flex-none text-[28px]">
            🔒
          </span>
          <p className="text-center text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-left">
            <span className="font-semibold text-[var(--color-ink)]">
              Nada sai sem a sua autorização explícita.
            </span>{" "}
            Cada caso é confirmado consigo antes de qualquer contacto com a empresa.
          </p>
        </div>
      </section>

      {/* ===== Secção 6: FAQ ===== */}
      <section className="px-4 pb-[72px] sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <h2 className="mb-5 text-xl font-semibold text-[var(--color-ink)]">Perguntas frequentes</h2>
          <div className="flex flex-col border-t border-[var(--color-hairline)]">
            {FAQS.map((f, i) => (
              <div
                key={f.q}
                className={`px-1 py-[18px] ${i < FAQS.length - 1 ? "border-b border-[var(--color-hairline)]" : ""}`}
              >
                <p className="mb-1.5 text-[14.5px] font-semibold text-[var(--color-ink)]">{f.q}</p>
                <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
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
