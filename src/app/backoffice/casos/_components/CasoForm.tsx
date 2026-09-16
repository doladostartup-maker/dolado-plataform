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

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
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
          <input
            name="nome"
            defaultValue={valores.nome ?? ""}
            required
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Email">
          <input
            name="email"
            type="email"
            defaultValue={valores.email ?? ""}
            required
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Telefone">
          <input
            name="telefone"
            defaultValue={valores.telefone ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Empresa parceira">
          <input
            name="empresa_parceira"
            defaultValue={valores.empresa_parceira ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Sector">
          <select
            name="sector"
            defaultValue={valores.sector ?? ""}
            className="w-full rounded border px-3 py-2"
          >
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
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Estado">
          <select
            name="status"
            defaultValue={valores.status ?? "Novo"}
            className="w-full rounded border px-3 py-2"
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
            className="w-full rounded border px-3 py-2"
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
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Minutos">
          <input
            type="number"
            name="minutos"
            defaultValue={valores.minutos ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <Campo label="Valor indicado (€)">
          <input
            type="number"
            step="0.01"
            name="valor_indicado"
            defaultValue={valores.valor_indicado ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </Campo>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
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
          className="w-full rounded border px-3 py-2"
        />
      </Campo>
      <Campo label="Notas internas">
        <textarea
          name="notas"
          defaultValue={valores.notas ?? ""}
          rows={4}
          className="w-full rounded border px-3 py-2"
        />
      </Campo>
      <Campo label="Link do dossiê">
        <input
          name="dossie_url"
          defaultValue={valores.dossie_url ?? ""}
          className="w-full rounded border px-3 py-2"
        />
      </Campo>

      <button
        type="submit"
        className="self-start rounded bg-black px-4 py-2 text-sm text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
