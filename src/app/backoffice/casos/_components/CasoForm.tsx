type CasoFormValues = {
  nome?: string;
  email?: string;
  telefone?: string | null;
  empresa_parceira?: string | null;
  sector?: string | null;
  tipo_problema?: string | null;
  descricao?: string | null;
  status?: string;
  tipo_abc?: string | null;
  data_fim_fidelidade?: string | null;
  minutos?: number | null;
  disposicao_pagar?: boolean | null;
  valor_indicado?: number | null;
  notas?: string | null;
  dossie_url?: string | null;
};

const STATUSES = ["Novo", "Em Análise", "Aguardando Decisão", "Resolvido", "Bloqueado"];

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
      {label}
      {children}
    </label>
  );
}

export function CasoForm({
  action,
  valores = {},
  submitLabel,
}: {
  action: (formData: FormData) => void;
  valores?: CasoFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Nome">
          <input name="nome" defaultValue={valores.nome ?? ""} required className={INPUT_CLASS} />
        </Campo>
        <Campo label="Email">
          <input
            name="email"
            type="email"
            defaultValue={valores.email ?? ""}
            required
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Telefone">
          <input
            name="telefone"
            defaultValue={valores.telefone ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Empresa parceira">
          <input
            name="empresa_parceira"
            defaultValue={valores.empresa_parceira ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Sector">
          <select name="sector" defaultValue={valores.sector ?? ""} className={INPUT_CLASS}>
            <option value="">—</option>
            <option value="Telecomunicações">Telecomunicações</option>
            <option value="Energia">Energia</option>
            <option value="Água">Água</option>
          </select>
        </Campo>
        <Campo label="Tipo de problema">
          <input
            name="tipo_problema"
            defaultValue={valores.tipo_problema ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Estado">
          <select
            name="status"
            defaultValue={valores.status ?? "Novo"}
            className={INPUT_CLASS}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Tipo (A/B/C)">
          <select
            name="tipo_abc"
            defaultValue={valores.tipo_abc ?? ""}
            className={INPUT_CLASS}
          >
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </Campo>
        <Campo label="Fim de fidelidade">
          <input
            type="date"
            name="data_fim_fidelidade"
            defaultValue={valores.data_fim_fidelidade ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Minutos">
          <input
            type="number"
            name="minutos"
            defaultValue={valores.minutos ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <Campo label="Valor indicado (€)">
          <input
            type="number"
            step="0.01"
            name="valor_indicado"
            defaultValue={valores.valor_indicado ?? ""}
            className={INPUT_CLASS}
          />
        </Campo>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--color-ink)]">
          <input
            type="checkbox"
            name="disposicao_pagar"
            defaultChecked={valores.disposicao_pagar ?? false}
          />
          Disposto a pagar
        </label>
      </div>

      <Campo label="Descrição">
        <textarea
          name="descricao"
          defaultValue={valores.descricao ?? ""}
          rows={4}
          className={INPUT_CLASS}
        />
      </Campo>
      <Campo label="Notas internas">
        <textarea
          name="notas"
          defaultValue={valores.notas ?? ""}
          rows={4}
          className={INPUT_CLASS}
        />
      </Campo>
      <Campo label="Link do dossiê">
        <input
          name="dossie_url"
          defaultValue={valores.dossie_url ?? ""}
          className={INPUT_CLASS}
        />
      </Campo>

      <button
        type="submit"
        className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
      >
        {submitLabel}
      </button>
    </form>
  );
}
