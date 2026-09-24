const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
      {label}
      {children}
    </label>
  );
}

export function AlertaFidelizacaoPortalForm({
  action,
  email,
  valoresIniciais = {},
  textoBotao = "Avisem-me",
  pedirConsentimento = false,
}: {
  action: (formData: FormData) => void;
  email: string;
  valoresIniciais?: {
    operadora?: string;
    data_inicio_contrato?: string | null;
    data_fim_fidelizacao?: string;
  };
  textoBotao?: string;
  pedirConsentimento?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <Campo label="E-mail">
        <input value={email} readOnly disabled className={`${INPUT_CLASS} opacity-70`} />
      </Campo>

      <Campo label="Operadora / prestador">
        <input
          name="operadora"
          placeholder="ex.: MEO, NOS, Vodafone, EDP, Galp, EPAL…"
          defaultValue={valoresIniciais.operadora ?? ""}
          required
          className={INPUT_CLASS}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Data de início do contrato (opcional)">
          <input
            type="date"
            name="data_inicio_contrato"
            defaultValue={valoresIniciais.data_inicio_contrato ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Data de fim de fidelização">
          <input
            type="date"
            name="data_fim_fidelizacao"
            defaultValue={valoresIniciais.data_fim_fidelizacao ?? ""}
            required
            className={INPUT_CLASS}
          />
        </Campo>
      </div>

      {pedirConsentimento && (
        <label className="flex items-start gap-2 rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
          <input type="checkbox" name="consentimento" required className="mt-1" />
          Autorizo a DoLado a guardar estes dados para me avisar antes do fim da fidelização.
        </label>
      )}

      <button
        type="submit"
        className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
      >
        {textoBotao}
      </button>
    </form>
  );
}
