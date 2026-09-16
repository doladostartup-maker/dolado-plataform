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
          className="w-full rounded border px-3 py-2"
        />
      </Campo>
      <Campo label="Email">
        <input
          name="email"
          type="email"
          defaultValue={valoresIniciais.email ?? ""}
          required
          className="w-full rounded border px-3 py-2"
        />
      </Campo>
      <Campo label="Telefone">
        <input name="telefone" className="w-full rounded border px-3 py-2" />
      </Campo>
      <Campo label="Empresa parceira">
        <input
          name="empresa_parceira"
          placeholder="ex.: Remax Duplo Prestígio"
          className="w-full rounded border px-3 py-2"
        />
      </Campo>
      <Campo label="Sector">
        <select name="sector" defaultValue="" className="w-full rounded border px-3 py-2">
          <option value="">—</option>
          <option value="Telecomunicações">Telecomunicações</option>
          <option value="Energia">Energia</option>
          <option value="Água">Água</option>
        </select>
      </Campo>
      <Campo label="Tipo de problema">
        <input name="tipo_problema" className="w-full rounded border px-3 py-2" />
      </Campo>
      <Campo label="Descrição">
        <textarea name="descricao" rows={4} className="w-full rounded border px-3 py-2" />
      </Campo>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="autorizacao" required className="mt-1" />
        Autorizo a DoLado a tratar os meus dados pessoais para efeitos de
        acompanhamento desta reclamação.
      </label>

      <button
        type="submit"
        className="self-start rounded bg-black px-4 py-2 text-sm text-white"
      >
        Abrir caso
      </button>
    </form>
  );
}
