"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { enviarContacto, type EstadoContacto } from "@/app/actions/contacto";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { FormularioGuiado } from "./FormularioGuiado";
import { SiteHeader } from "./SiteHeader";

const INPUT_CLASS =
  "w-full rounded-[8px] border border-[var(--color-hairline)] bg-white px-3 py-2.5 text-[13.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-wash)]";
const LABEL_CLASS = "mb-1.5 block text-[12.5px] font-semibold text-[var(--color-ink)]";

const ESTADO_INICIAL: EstadoContacto = { ok: false };

export function Contacto() {
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);
  const [state, formAction, pending] = useActionState(enviarContacto, ESTADO_INICIAL);

  const openForm = useCallback(() => {
    track("click_nav_contacto");
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

      {/* ===== Secção 2: Hero simples ===== */}
      <section className="mx-auto max-w-[600px] px-4 pt-14 pb-2 text-center sm:px-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-brand)]">
          Contacto
        </p>
        <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Fale connosco
        </h1>
      </section>

      {/* ===== Secção 3: Aviso importante ===== */}
      <section className="mx-auto mt-6 max-w-[560px] px-4 sm:px-10">
        <div className="flex items-start gap-3 rounded-[8px] border-l-[3px] border-[#B3541E] bg-[#FBEEE3] px-5 py-4">
          <span aria-hidden="true" className="flex-none text-[18px]">
            ⚠️
          </span>
          <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            <span className="font-bold">Este formulário não abre casos.</span> Reclamações
            enviadas por e-mail ou por este formulário são ignoradas. Para abrir um caso, use
            sempre o fluxo guiado em &ldquo;Escrever a minha reclamação&rdquo;.
          </p>
        </div>
      </section>

      {/* ===== Secção 4: Formulário ===== */}
      <section className="mx-auto max-w-[560px] px-4 pt-7 pb-[72px] sm:px-10">
        {state.ok ? (
          <div className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-subtle)]">
            <p className="text-[15px] font-semibold text-[var(--color-ink)]">
              Mensagem enviada.
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
              Obrigado pelo contacto — responderemos assim que possível.
            </p>
          </div>
        ) : (
          <form
            action={formAction}
            className="flex flex-col gap-4 rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-subtle)]"
          >
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px" }}
            />

            <div>
              <label className={LABEL_CLASS} htmlFor="contacto-nome">
                Nome
              </label>
              <input
                id="contacto-nome"
                name="nome"
                type="text"
                placeholder="O seu nome"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="contacto-email">
                E-mail
              </label>
              <input
                id="contacto-email"
                name="email"
                type="email"
                placeholder="nome@exemplo.pt"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="contacto-assunto">
                Assunto
              </label>
              <input
                id="contacto-assunto"
                name="assunto"
                type="text"
                placeholder="Sobre o que quer falar?"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="contacto-mensagem">
                Mensagem
              </label>
              <textarea
                id="contacto-mensagem"
                name="mensagem"
                rows={5}
                placeholder="Escreva aqui — imprensa, parcerias, dúvidas gerais…"
                required
                className={INPUT_CLASS}
              />
            </div>

            {state.erro && (
              <p className="text-[13px]" style={{ color: "var(--color-status-danger)" }}>
                {state.erro}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1.5 min-h-11 w-full rounded-[8px] bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "A enviar…" : "Enviar mensagem"}
            </button>
          </form>
        )}
      </section>

      {/* Modal do formulário de reclamação */}
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
