const ETAPAS = ["O seu caso", "Conta", "Modalidade", "Pagamento"];

/** Indicador das etapas de "Tratar o meu caso" (1 a 4). */
export function Etapas({ atual }: { atual: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]" aria-label="Etapas">
      {ETAPAS.map((nome, i) => {
        const n = i + 1;
        const feito = n < atual;
        const corrente = n === atual;
        return (
          <li
            key={nome}
            aria-current={corrente ? "step" : undefined}
            className={`flex items-center gap-2 ${
              corrente ? "font-bold text-[var(--v2-navy)]" : feito ? "font-medium text-[var(--v2-muted)]" : "text-[#7A889A]"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                feito
                  ? "bg-[var(--v2-green)] text-white"
                  : corrente
                    ? "border-2 border-[var(--v2-green)] bg-white text-[var(--v2-green)]"
                    : "border border-[var(--v2-line-strong)] bg-white"
              }`}
            >
              {feito ? (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                n
              )}
            </span>
            {nome}
            <span className="sr-only">{feito ? " (concluída)" : corrente ? " (atual)" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
