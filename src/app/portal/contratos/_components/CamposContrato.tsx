import { ROTULO_SETOR, SETORES_CONTRATO } from "@/lib/monitor/contratos";
import { INPUT_CLASS } from "./estilos";

// Campos do contrato que o cliente pode indicar ou corrigir (formulário
// "Adicionar contrato" e "Corrigir dados"). Valores em euros escritos como
// o cliente quiser ("42,99"); datas pelo seletor do browser.

export type ValoresContrato = {
  setor?: string;
  fornecedor?: string | null;
  referencia_contrato?: string | null;
  data_inicio?: string | null;
  data_fim_fidelizacao?: string | null;
  data_fim_promocao?: string | null;
  descricao_promocao?: string | null;
  mensalidade_cents?: number | null;
  vantagem_cents?: number | null;
};

function Campo({ label, ajuda, children }: { label: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
      {label}
      {children}
      {ajuda && <span className="text-[12.5px] text-[var(--color-ink-faint)]">{ajuda}</span>}
    </label>
  );
}

function euros(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function CamposContrato({ valores = {}, setorObrigatorio = false }: { valores?: ValoresContrato; setorObrigatorio?: boolean }) {
  const setores = SETORES_CONTRATO.filter((s) => s !== "nao_indicado" || !setorObrigatorio);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo label="Fornecedor">
        <input name="fornecedor" required={setorObrigatorio} defaultValue={valores.fornecedor ?? ""} placeholder="ex.: MEO, NOS, Vodafone, EDP, Galp…" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Setor">
        <select name="setor" required={setorObrigatorio} defaultValue={valores.setor ?? ""} className={INPUT_CLASS}>
          {setorObrigatorio && <option value="">Escolha…</option>}
          {setores.map((s) => (
            <option key={s} value={s}>
              {ROTULO_SETOR[s]}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Início do contrato">
        <input type="date" name="data_inicio" defaultValue={valores.data_inicio ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label="Fim da fidelização">
        <input type="date" name="data_fim_fidelizacao" defaultValue={valores.data_fim_fidelizacao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label="Mensalidade (€)" ajuda="O valor mensal do serviço, sem consumos extra.">
        <input name="mensalidade_cents" inputMode="decimal" defaultValue={euros(valores.mensalidade_cents)} placeholder="ex.: 42,99" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Valor da vantagem da fidelização (€)" ajuda="Descontos, instalação ou equipamento oferecidos em troca da fidelização, se o contrato indicar.">
        <input name="vantagem_cents" inputMode="decimal" defaultValue={euros(valores.vantagem_cents)} placeholder="ex.: 120,00" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Fim da promoção">
        <input type="date" name="data_fim_promocao" defaultValue={valores.data_fim_promocao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label="Promoção">
        <input name="descricao_promocao" defaultValue={valores.descricao_promocao ?? ""} placeholder="ex.: Desconto de 10 € na mensalidade" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Referência do contrato" ajuda="Opcional.">
        <input name="referencia_contrato" defaultValue={valores.referencia_contrato ?? ""} className={INPUT_CLASS} />
      </Campo>
    </div>
  );
}
