"use client";

import { useId, useState } from "react";
import { AJUDA_CAMPO, CAMPO } from "./ui";

/**
 * Campo de palavra-passe com "Mostrar"/"Esconder" (útil sobretudo no
 * telemóvel). Só apresentação: o valor segue no formulário como um campo
 * normal; a palavra-passe começa sempre escondida.
 */
export function CampoPalavraPasse({
  name,
  autoComplete,
  minLength,
  mostrar,
  esconder,
  descricao,
}: {
  name: string;
  autoComplete: "new-password" | "current-password";
  minLength?: number;
  mostrar: string;
  esconder: string;
  /** Requisitos, ligados ao campo por aria-describedby. */
  descricao?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const idDescricao = useId();
  return (
    <>
      <span className="relative block">
        <input
          name={name}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          minLength={minLength}
          aria-describedby={descricao ? idDescricao : undefined}
          className={`${CAMPO} min-h-12 pr-24`}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
          className="absolute inset-y-0.5 right-0.5 min-w-[72px] rounded-[8px] px-3 text-[14px] font-semibold text-[var(--v2-green-dark)] hover:bg-[var(--v2-surface)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-green)]"
        >
          {visivel ? esconder : mostrar}
        </button>
      </span>
      {descricao && (
        <span id={idDescricao} className={AJUDA_CAMPO}>
          {descricao}
        </span>
      )}
    </>
  );
}
