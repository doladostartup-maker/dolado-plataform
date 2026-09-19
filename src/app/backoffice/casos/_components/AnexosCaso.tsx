type Anexo = {
  id: string;
  nome_ficheiro: string;
  tamanho_bytes: number | null;
  created_at: string;
  apagarAction: (formData: FormData) => void;
};

function formatarTamanho(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnexosCaso({
  anexos,
  carregarAction,
}: {
  anexos: Anexo[];
  carregarAction: (formData: FormData) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--color-ink-muted)]">Anexos</h2>

      {anexos.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-faint)]">Sem anexos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {anexos.map((anexo) => (
            <li
              key={anexo.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-2.5"
            >
              <a
                href={`/api/anexos/${anexo.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium text-[var(--color-brand)] underline"
              >
                {anexo.nome_ficheiro}
              </a>
              <div className="flex flex-none items-center gap-3">
                <span className="text-[var(--text-caption)] text-[var(--color-ink-faint)]">
                  {formatarTamanho(anexo.tamanho_bytes)}
                </span>
                <form action={anexo.apagarAction}>
                  <button
                    type="submit"
                    className="text-[var(--text-caption)] text-[var(--color-status-danger)] hover:underline"
                  >
                    Apagar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={carregarAction} className="flex items-center gap-3">
        <input
          type="file"
          name="ficheiro"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
          className="text-sm text-[var(--color-ink-muted)] file:mr-3 file:rounded-[var(--radius-button)] file:border file:border-[var(--color-hairline)] file:bg-[var(--color-surface)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-ink)]"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[14px] py-[8px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Carregar
        </button>
      </form>
    </div>
  );
}
