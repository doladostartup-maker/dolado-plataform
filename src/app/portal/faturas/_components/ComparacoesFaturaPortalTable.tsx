type Comparacao = {
  id: string;
  operadora: string | null;
  valor_mes_atual: number | null;
  diferenca_pct: number | null;
  status: string;
  created_at: string;
};

function BadgeEstado({ status }: { status: string }) {
  if (status === "sent_to_client") {
    return (
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-success-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-status-success)]">
        Analisada
      </span>
    );
  }
  if (status === "needs_manual_review") {
    return (
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-pending-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-status-pending)]">
        A verificar manualmente
      </span>
    );
  }
  if (status === "extraction_failed") {
    return (
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-danger-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-status-danger)]">
        A verificar manualmente
      </span>
    );
  }
  return (
    <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-ink-muted)]">
      A analisar
    </span>
  );
}

export function ComparacoesFaturaPortalTable({ comparacoes }: { comparacoes: Comparacao[] }) {
  if (comparacoes.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        Ainda não enviou nenhuma fatura para comparar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Data</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Operadora</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Valor</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Diferença</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Estado</th>
          </tr>
        </thead>
        <tbody>
          {comparacoes.map((c) => (
            <tr key={c.id} className="border-t border-[var(--color-hairline)]">
              <td className="px-3 py-2 text-[var(--color-ink-muted)]">
                {new Date(c.created_at).toLocaleDateString("pt-PT")}
              </td>
              <td className="px-3 py-2 text-[var(--color-ink)]">{c.operadora ?? "—"}</td>
              <td className="px-3 py-2 text-[var(--color-ink)]">
                {c.valor_mes_atual !== null ? `€${c.valor_mes_atual.toFixed(2)}` : "—"}
              </td>
              <td className="px-3 py-2 text-[var(--color-ink)]">
                {c.diferenca_pct !== null ? `${c.diferenca_pct > 0 ? "+" : ""}${c.diferenca_pct.toFixed(1)}%` : "—"}
              </td>
              <td className="px-3 py-2">
                <BadgeEstado status={c.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
