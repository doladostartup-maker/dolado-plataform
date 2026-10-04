import type { ReactNode } from "react";

/** Lista de pares rótulo/valor (detalhes de um caso, plano, perfil). */
export function ListaDados({ children, colunas = 1 }: { children: ReactNode; colunas?: 1 | 2 }) {
  return <dl className={`grid gap-x-8 gap-y-4 ${colunas === 2 ? "sm:grid-cols-2" : ""}`}>{children}</dl>;
}

export function Dado({ rotulo, children, largo }: { rotulo: ReactNode; children: ReactNode; largo?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${largo ? "sm:col-span-2" : ""}`}>
      <dt className="text-[13px] font-medium text-[var(--v2-muted)]">{rotulo}</dt>
      <dd className="break-words text-[15px] text-[var(--v2-navy)]">{children}</dd>
    </div>
  );
}
