const STATUS_STYLES: Record<string, { color: string; wash: string }> = {
  Novo: { color: "var(--color-status-pending)", wash: "var(--color-status-pending-wash)" },
  "Em investigação": {
    color: "var(--color-status-pending)",
    wash: "var(--color-status-pending-wash)",
  },
  "Aguardando operador": {
    color: "var(--color-status-pending)",
    wash: "var(--color-status-pending-wash)",
  },
  "Aguardando decisão cliente": {
    color: "var(--color-status-urgent)",
    wash: "var(--color-status-urgent-wash)",
  },
  Resolvido: { color: "var(--color-status-success)", wash: "var(--color-status-success-wash)" },
  Bloqueado: { color: "var(--color-status-danger)", wash: "var(--color-status-danger-wash)" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Novo;

  return (
    <span
      className="inline-flex items-center rounded-[var(--radius-pill)] px-[10px] py-[4px] text-[12px] font-medium"
      style={{ backgroundColor: style.wash, color: style.color }}
    >
      {status}
    </span>
  );
}
