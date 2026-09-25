type Verificacao = {
  id: string;
  setor: string;
  estado_elegibilidade: string;
  estado_final: string | null;
  created_at: string;
};

function BadgeResultado({ v }: { v: Verificacao }) {
  if (v.estado_elegibilidade === "em_revisao") {
    return (
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-pending-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-status-pending)]">
        🟠 Análise em curso
      </span>
    );
  }
  if (v.estado_final === "elegivel") {
    return (
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-success-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-status-success)]">
        🟢 Elegível
      </span>
    );
  }
  if (v.estado_final === "nao_elegivel") {
    return (
      <span className="rounded-[var(--radius-pill)] bg-[var(--color-status-danger-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-status-danger)]">
        Não é elegível agora
      </span>
    );
  }
  return (
    <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-ink-muted)]">
      A processar
    </span>
  );
}

export function VerificacoesElegibilidadeTable({ verificacoes }: { verificacoes: Verificacao[] }) {
  if (verificacoes.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        Ainda não fez nenhuma verificação de elegibilidade.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Data</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Setor</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {verificacoes.map((v) => (
            <tr key={v.id} className="border-t border-[var(--color-hairline)]">
              <td className="px-3 py-2 text-[var(--color-ink-muted)]">
                {new Date(v.created_at).toLocaleDateString("pt-PT")}
              </td>
              <td className="px-3 py-2 text-[var(--color-ink)]">{v.setor}</td>
              <td className="px-3 py-2">
                <BadgeResultado v={v} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
