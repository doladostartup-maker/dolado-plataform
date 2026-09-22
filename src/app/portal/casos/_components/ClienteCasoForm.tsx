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

export function ClienteCasoForm({
  action,
  valoresIniciais = {},
}: {
  action: (formData: FormData) => void;
  valoresIniciais?: { nome?: string; email?: string };
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <Campo label="Nome">
        <input
          name="nome"
          defaultValue={valoresIniciais.nome ?? ""}
          required
          className={INPUT_CLASS}
        />
      </Campo>
      <Campo label="E-mail">
        <input
          name="email"
          type="email"
          defaultValue={valoresIniciais.email ?? ""}
          required
          className={INPUT_CLASS}
        />
      </Campo>
      <Campo label="Telefone">
        <input name="telefone" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Empresa parceira">
        <input
          name="empresa_parceira"
          placeholder="ex.: Remax Duplo Prestígio"
          className={INPUT_CLASS}
        />
      </Campo>
      <Campo label="Setor">
        <select name="sector" defaultValue="" className={INPUT_CLASS}>
          <option value="">—</option>
          <option value="Telecomunicações">Telecomunicações</option>
          <option value="Energia">Energia</option>
          <option value="Água">Água</option>
        </select>
      </Campo>
      <Campo label="Tipo de problema">
        <input name="tipo_problema" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Descrição">
        <textarea name="descricao" rows={4} className={INPUT_CLASS} />
      </Campo>

      <label
        className="flex items-start gap-2 rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]"
      >
        <input type="checkbox" name="autorizacao" required className="mt-1" />
        Autorizo a DoLado a tratar os meus dados pessoais para efeitos de
        acompanhamento desta reclamação.
      </label>

      <button
        type="submit"
        className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
      >
        Abrir caso
      </button>
    </form>
  );
}
