import { eurosComIva, rotuloMes, type MesDespesa, type Parcela } from "@/lib/empresas/painel";

// Gráficos simples em SVG/CSS (sem dependências), Fase 7. Cada gráfico tem
// também o valor em texto (leitores de ecrã e impressão).

export function BarrasMensais({ meses }: { meses: MesDespesa[] }) {
  const maximo = Math.max(1, ...meses.map((m) => m.totalCents));
  // Largura total fixa (640): com poucos meses as barras alargam, em vez de o
  // gráfico crescer em altura.
  const largura = Math.floor(640 / Math.max(6, meses.length));
  const altura = 160;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${meses.length * largura} ${altura + 24}`} className="h-auto w-full max-w-[640px]" role="img" aria-label="Despesa por mês, com IVA">
        {meses.map((m, i) => {
          const h = Math.max(2, Math.round((m.totalCents / maximo) * altura));
          return (
            <g key={m.mes}>
              <rect
                x={i * largura + largura * 0.2}
                y={altura - h}
                width={largura * 0.6}
                height={h}
                rx={4}
                fill="var(--v2-green)"
                opacity={m.completo ? 1 : 0.35}
              />
              <text x={i * largura + largura / 2} y={altura + 16} textAnchor="middle" fontSize="13" fill="var(--v2-muted)">
                {rotuloMes(m.mes).split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-[13px] text-[var(--v2-muted)]">Barras claras: mês incompleto (ainda sem todas as facturas).</figcaption>
      <ul className="sr-only">
        {meses.map((m) => (
          <li key={m.mes}>
            {rotuloMes(m.mes)}: {eurosComIva(m.totalCents)}
            {m.completo ? "" : " (incompleto)"}
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function BarrasParcelas({ parcelas }: { parcelas: Parcela[] }) {
  const total = parcelas.reduce((s, p) => s + p.totalCents, 0) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {parcelas.map((p) => (
        <li key={p.chave} className="flex flex-col gap-1">
          <div className="flex justify-between gap-3 text-[15px]">
            <span className="font-semibold">{p.nome}</span>
            <span>{eurosComIva(p.totalCents)}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[var(--v2-line)]" aria-hidden>
            <div className="h-2.5 rounded-full bg-[var(--v2-green)]" style={{ width: `${Math.max(2, (p.totalCents / total) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
