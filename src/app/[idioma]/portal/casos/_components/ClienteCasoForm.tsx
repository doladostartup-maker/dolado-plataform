import { SETORES } from "@/lib/pedidoCaso";
import { AJUDA_CAMPO, BOTAO_PRIMARIO, CAIXA_SELECAO, CAMPO, ROTULO } from "@/components/portal/ui";
import type { Idioma } from "@/i18n/config";
import { tPortal } from "@/i18n/mensagens/portal";
import { rotulo } from "@/i18n/mensagens/rotulos";

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
  idioma = "pt-PT",
}: {
  action: (formData: FormData) => void;
  valoresIniciais?: { nome?: string; email?: string };
  idioma?: Idioma;
}) {
  const t = tPortal[idioma].novoCaso.form;
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label={t.nome}>
          <input name="nome" autoComplete="name" defaultValue={valoresIniciais.nome ?? ""} required className={CAMPO} />
        </Campo>
        <Campo label={t.email}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={valoresIniciais.email ?? ""}
            required
            className={CAMPO}
          />
        </Campo>
        <Campo label={t.telefone}>
          <input name="telefone" type="tel" autoComplete="tel" className={CAMPO} />
        </Campo>
        <Campo label={t.empresaParceira}>
          <input name="empresa_parceira" placeholder={t.empresaParceiraExemplo} className={CAMPO} />
        </Campo>
        <Campo label={t.setor}>
          <select name="sector" defaultValue="" className={CAMPO}>
            <option value="">—</option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {rotulo(idioma, "setores", s)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label={t.tipoProblema}>
          <input name="tipo_problema" placeholder={t.tipoProblemaExemplo} className={CAMPO} />
        </Campo>
      </div>
      <Campo label={t.oQueAconteceu} ajuda={t.ajuda}>
        <textarea name="descricao" rows={5} className={CAMPO} />
      </Campo>

      <label className="flex items-start gap-3 rounded-[14px] bg-[var(--v2-surface)] p-4 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        <input type="checkbox" name="autorizacao" required className={CAIXA_SELECAO} />
        {t.autorizacao}
      </label>

      <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
        {t.abrir}
      </button>
    </form>
  );
}
