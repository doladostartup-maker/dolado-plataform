"use client";

import { useEffect, useId, useState } from "react";

// Botão e painel de navegação (portal e backoffice) abaixo de `md`. A navegação em si
// (links e "Terminar sessão") vem do layout como children, para ser a mesma
// da barra lateral.
export function MenuMovel({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const idPainel = useId();

  useEffect(() => {
    if (!aberto) return;
    const fecharComEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        onClick={() => setAberto((v) => !v)}
        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--v2-navy)] hover:bg-[var(--v2-surface)]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          {aberto ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {aberto && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(11,37,69,0.35)]"
            onClick={() => setAberto(false)}
          />
          <div
            id={idPainel}
            // Fecha o menu ao seguir qualquer ligação do painel.
            onClick={(e) => {
              if ((e.target as Element).closest("a")) setAberto(false);
            }}
            className="relative flex max-h-full flex-col overflow-y-auto rounded-b-[16px] border-b border-[var(--v2-line)] bg-white px-4 pb-4 pt-4 shadow-[var(--shadow-md)]"
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
}
