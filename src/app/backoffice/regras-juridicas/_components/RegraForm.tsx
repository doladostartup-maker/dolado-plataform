import { PROBLEMAS } from "@/lib/pedidoCaso";
import { SETORES_REGRAS, type RegraJuridica } from "@/lib/rascunhoIA/regras";

import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { AJUDA_CAMPO as AJUDA, BOTAO_PRIMARIO, CAIXA_SELECAO, CAMPO as INPUT, CAMPO_TEXTO_LONGO, LINHA_SELECAO, ROTULO } from "@/components/backoffice/ui";

export function RegraForm({
  action,
  valores,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  valores?: Partial<RegraJuridica>;
  submitLabel: string;
}) {
  const v = valores ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ROTULO}>
          Código
          <input name="codigo" required defaultValue={v.codigo ?? ""} maxLength={40} placeholder="TEL-ALT-PRECO-01" className={INPUT} />
          <span className={AJUDA}>Identificador enviado à IA. Maiúsculas, números, - e _.</span>
        </label>
        <label className={ROTULO}>
          Setor
          <select name="setor" defaultValue={v.setor ?? ""} className={INPUT}>
            <option value="">Todos os setores</option>
            {SETORES_REGRAS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={ROTULO}>
          Categoria do problema
          <select name="categoria" defaultValue={v.categoria ?? ""} className={INPUT}>
            <option value="">Todas as categorias</option>
            {PROBLEMAS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <span className={AJUDA}>As mesmas opções do formulário “Tratar o meu caso”.</span>
        </label>
        <label className={ROTULO}>
          Subcategoria
          <input name="subcategoria" defaultValue={v.subcategoria ?? ""} maxLength={120} className={INPUT} />
        </label>
      </div>

      <label className={ROTULO}>
        Título
        <input name="titulo" required defaultValue={v.titulo ?? ""} maxLength={200} className={INPUT} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ROTULO}>
          Diploma
          <input name="diploma" required defaultValue={v.diploma ?? ""} maxLength={200} placeholder="Lei n.º …/…" className={INPUT} />
        </label>
        <label className={ROTULO}>
          Artigo
          <input name="artigo" defaultValue={v.artigo ?? ""} maxLength={120} placeholder="Artigo …, n.º …" className={INPUT} />
        </label>
      </div>
      <label className={ROTULO}>
        Texto/resumo jurídico aprovado
        <textarea name="resumo" required defaultValue={v.resumo ?? ""} rows={6} maxLength={4000} className={CAMPO_TEXTO_LONGO} />
        <span className={AJUDA}>É exatamente isto que a IA recebe. Sem conclusões sobre casos concretos.</span>
      </label>
      <label className={ROTULO}>
        Condições de aplicabilidade
        <textarea name="condicoes_aplicabilidade" defaultValue={v.condicoes_aplicabilidade ?? ""} rows={3} maxLength={2000} className={CAMPO_TEXTO_LONGO} />
        <span className={AJUDA}>Factos que têm de estar verificados para a regra poder ser citada.</span>
      </label>
      <label className={ROTULO}>
        Fonte oficial
        <input name="fonte_url" type="url" defaultValue={v.fonte_url ?? ""} maxLength={500} placeholder="https://diariodarepublica.pt/…" className={INPUT} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={ROTULO}>
          Em vigor desde
          <input name="em_vigor_desde" type="date" defaultValue={v.em_vigor_desde ?? ""} className={INPUT} />
        </label>
        <label className={ROTULO}>
          Revogada em
          <input name="revogada_em" type="date" defaultValue={v.revogada_em ?? ""} className={INPUT} />
        </label>
        <label className={ROTULO}>
          Última revisão
          <input name="revista_em" type="date" defaultValue={v.revista_em ?? ""} className={INPUT} />
        </label>
      </div>
      <label className={`${LINHA_SELECAO} rounded-[12px] bg-[var(--v2-surface)] p-3`}>
        <input type="checkbox" name="ativa" defaultChecked={v.ativa ?? false} className={CAIXA_SELECAO} />
        <span>
          <span className="font-semibold">Ativa</span> — pode ser enviada à IA (exige a data da última revisão).
        </span>
      </label>
      <div className="border-t border-[var(--v2-line)] pt-4">
        <BotaoSubmeter className={BOTAO_PRIMARIO}>{submitLabel}</BotaoSubmeter>
      </div>
    </form>
  );
}
