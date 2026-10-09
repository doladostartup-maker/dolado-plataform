import type { ReactNode } from "react";

// Linha temporal vertical (caso, serviço). Funciona igual em telemóvel e em
// computador; os passos futuros aparecem tracejados.

export type PassoLinhaTemporal = {
  id: string;
  titulo: ReactNode;
  /** Data já formatada. */
  quando?: string | null;
  detalhe?: ReactNode;
  estado: "feito" | "atual" | "futuro";
};

const ESTADOS_PT = { feito: " (concluído)", atual: " (em curso)", futuro: " (a seguir)" };

export function LinhaTemporal({
  passos,
  rotulo,
  estados = ESTADOS_PT,
}: {
  passos: PassoLinhaTemporal[];
  rotulo: string;
  /** Texto para leitores de ecrã de cada estado (o backoffice usa o português). */
  estados?: Record<PassoLinhaTemporal["estado"], string>;
}) {
  return (
    <ol aria-label={rotulo} className="flex flex-col">
      {passos.map((p, i) => {
        const ultimo = i === passos.length - 1;
        return (
          <li key={p.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!ultimo && (
              <span
                aria-hidden
                className={`absolute left-[9px] top-6 bottom-0 w-px ${p.estado === "futuro" || passos[i + 1]?.estado === "futuro" ? "border-l border-dashed border-[var(--v2-line-strong)]" : "bg-[var(--v2-line-strong)]"}`}
              />
            )}
            <span aria-hidden className="relative mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center">
              {p.estado === "feito" ? (
                <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              ) : p.estado === "atual" ? (
                <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-[var(--v2-green)] bg-white">
                  <span className="h-2 w-2 rounded-full bg-[var(--v2-green)]" />
                </span>
              ) : (
                <span className="h-[15px] w-[15px] rounded-full border-2 border-dashed border-[var(--v2-line-strong)] bg-white" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className={`text-[14.5px] leading-snug ${p.estado === "futuro" ? "text-[var(--v2-muted)]" : "font-semibold text-[var(--v2-navy)]"}`}>
                {p.titulo}
                <span className="sr-only">{estados[p.estado]}</span>
              </p>
              {p.quando && <p className="text-[13px] text-[var(--v2-muted)]">{p.quando}</p>}
              {p.detalhe && <div className="text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{p.detalhe}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
