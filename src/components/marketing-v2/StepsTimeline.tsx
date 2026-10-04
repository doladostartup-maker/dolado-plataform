import type { ReactNode } from "react";
import { IconeSeta, IconeVisto } from "./Icones";

// Etapas de um processo (secção 19 do Design System V2).
// "horizontal": 3–5 etapas lado a lado no desktop, empilhadas no telemóvel.
// "vertical": linha temporal em coluna em todos os ecrãs (processos longos).

export type Passo = {
  titulo: string;
  texto: ReactNode;
  /** Ícone mostrado ao lado do número (só no layout horizontal, desktop). */
  icone?: ReactNode;
  /** Quem age neste passo (ex.: "O seu passo" / "A DoLado"). */
  rotulo?: { texto: string; doCliente: boolean };
  /** Última etapa: mostra um visto em vez do número. */
  final?: boolean;
};

function Marcador({ passo, numero }: { passo: Passo; numero: number }) {
  return (
    <span className="relative flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-[14px] font-bold text-white">
      {passo.final ? <IconeVisto tamanho={16} strokeWidth={2.6} /> : numero}
    </span>
  );
}

function Rotulo({ rotulo }: { rotulo: NonNullable<Passo["rotulo"]> }) {
  return (
    <span
      className={`mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
        rotulo.doCliente ? "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]" : "bg-[var(--v2-blue-soft)] text-[var(--v2-muted)]"
      }`}
    >
      {rotulo.texto}
    </span>
  );
}

export function StepsTimeline({ passos, layout = "horizontal" }: { passos: Passo[]; layout?: "horizontal" | "vertical" }) {
  if (layout === "vertical") {
    return (
      <ol>
        {passos.map((p, i) => {
          const ultimo = i === passos.length - 1;
          return (
            <li key={p.titulo} className="relative flex gap-5 pb-9 last:pb-0">
              {!ultimo && (
                <span aria-hidden="true" className="absolute left-[15px] top-10 h-[calc(100%-44px)] w-[2px] bg-[var(--v2-mint)]" />
              )}
              <Marcador passo={p} numero={i + 1} />
              <div className="min-w-0 pt-0.5">
                {p.rotulo && <Rotulo rotulo={p.rotulo} />}
                <h3 className="mb-1.5 text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{p.titulo}</h3>
                <p className="max-w-[560px] text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{p.texto}</p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="grid gap-0 lg:auto-cols-fr lg:grid-flow-col lg:gap-8">
      {passos.map((p, i) => {
        const ultimo = i === passos.length - 1;
        return (
          <li key={p.titulo} className="relative flex gap-5 pb-10 last:pb-0 lg:block lg:pb-0">
            {/* Ligação vertical (telemóvel) e seta horizontal (desktop) */}
            {!ultimo && (
              <>
                <span aria-hidden="true" className="absolute left-[15px] top-10 h-[calc(100%-44px)] w-[2px] bg-[var(--v2-mint)] lg:hidden" />
                <span aria-hidden="true" className="absolute right-[-26px] top-[22px] hidden text-[var(--v2-line-strong)] lg:block">
                  <IconeSeta tamanho={20} />
                </span>
              </>
            )}
            <div className="flex flex-none items-center gap-4 self-start lg:mb-6">
              <Marcador passo={p} numero={i + 1} />
              {p.icone && <span className="hidden text-[var(--v2-navy)] lg:block">{p.icone}</span>}
            </div>
            <div>
              {p.rotulo && <Rotulo rotulo={p.rotulo} />}
              <h3 className="mb-2 text-[17px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{p.titulo}</h3>
              <p className="text-[15px] leading-relaxed text-[var(--v2-muted)] lg:pr-4">{p.texto}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
