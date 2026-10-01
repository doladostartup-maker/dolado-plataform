const ETAPAS = ["O seu caso", "Conta", "Modalidade", "Pagamento"];

/** Indicador das etapas de "Tratar o meu caso" (1 a 4). */
export function Etapas({ atual }: { atual: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" aria-label="Etapas">
      {ETAPAS.map((nome, i) => {
        const n = i + 1;
        const feito = n < atual;
        const corrente = n === atual;
        return (
          <li
            key={nome}
            aria-current={corrente ? "step" : undefined}
            className={`flex items-center gap-1.5 ${
              corrente
                ? "font-semibold text-[var(--color-brand)]"
                : feito
                  ? "text-[var(--color-ink-muted)]"
                  : "text-[var(--color-ink-faint)]"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                corrente || feito
                  ? "bg-[var(--color-brand)] text-white"
                  : "border border-[var(--color-hairline-strong)]"
              }`}
            >
              {feito ? "✓" : n}
            </span>
            {nome}
          </li>
        );
      })}
    </ol>
  );
}
