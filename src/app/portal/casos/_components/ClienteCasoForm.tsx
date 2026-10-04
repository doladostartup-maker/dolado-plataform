import { AJUDA_CAMPO, BOTAO_PRIMARIO, CAIXA_SELECAO, CAMPO, ROTULO } from "@/components/portal/ui";

function Campo({
  label,
  ajuda,
  children,
}: {
  label: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={ROTULO}>
      {label}
      {children}
      {ajuda && <span className={AJUDA_CAMPO}>{ajuda}</span>}
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
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Nome">
          <input name="nome" autoComplete="name" defaultValue={valoresIniciais.nome ?? ""} required className={CAMPO} />
        </Campo>
        <Campo label="E-mail">
          <input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={valoresIniciais.email ?? ""}
            required
            className={CAMPO}
          />
        </Campo>
        <Campo label="Telefone (opcional)">
          <input name="telefone" type="tel" autoComplete="tel" className={CAMPO} />
        </Campo>
        <Campo label="Empresa parceira (opcional)">
          <input name="empresa_parceira" placeholder="ex.: Remax Duplo Prestígio" className={CAMPO} />
        </Campo>
        <Campo label="Setor">
          <select name="sector" defaultValue="" className={CAMPO}>
            <option value="">—</option>
            <option value="Telecomunicações">Telecomunicações</option>
            <option value="Energia">Energia</option>
            <option value="Água">Água</option>
          </select>
        </Campo>
        <Campo label="Tipo de problema">
          <input name="tipo_problema" placeholder="ex.: cobrança indevida" className={CAMPO} />
        </Campo>
      </div>
      <Campo label="O que aconteceu?" ajuda="Datas, valores e contactos que já fez com a empresa ajudam-nos a tratar o caso mais depressa.">
        <textarea name="descricao" rows={5} className={CAMPO} />
      </Campo>

      <label className="flex items-start gap-3 rounded-[14px] bg-[var(--v2-surface)] p-4 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        <input type="checkbox" name="autorizacao" required className={CAIXA_SELECAO} />
        Peço à DoLado que analise e acompanhe esta reclamação e confirmo que a
        informação é verdadeira. Os meus dados são tratados nos termos da Política de
        Privacidade.
      </label>

      <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
        Abrir caso
      </button>
    </form>
  );
}
