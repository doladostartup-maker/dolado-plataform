import type { ReactNode } from "react";
import type { TomEstado } from "@/lib/portal/estadoCaso";

// Badge de estado do portal. Poucas cores, sempre com significado:
// acao (verde forte: precisa de si), curso (azul: a DoLado está a tratar),
// espera (âmbar suave: à espera de terceiros), concluido (verde suave),
// neutro (cinza).

const ESTILO: Record<TomEstado, { caixa: string; ponto: string }> = {
  acao: { caixa: "bg-[var(--v2-green)] text-white", ponto: "bg-white" },
  curso: { caixa: "bg-[var(--v2-blue-soft)] text-[#1D4F86]", ponto: "bg-[var(--v2-blue)]" },
  espera: { caixa: "bg-[var(--v2-aviso-bg)] text-[var(--v2-aviso)]", ponto: "bg-[#C77A2E]" },
  concluido: { caixa: "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]", ponto: "bg-[var(--v2-green)]" },
  neutro: { caixa: "bg-[#EEF2F6] text-[var(--v2-muted)]", ponto: "bg-[#94A3B8]" },
};

export function Etiqueta({ tom = "neutro", children }: { tom?: TomEstado; children: ReactNode }) {
  const e = ESTILO[tom];
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold leading-tight ${e.caixa}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${e.ponto}`} />
      {children}
    </span>
  );
}
