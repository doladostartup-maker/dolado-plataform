import { ROTULO_SETOR, SETORES_CONTRATO } from "@/lib/monitor/contratos";
import { INPUT_CLASS } from "./estilos";

// Campos do contrato que o cliente pode indicar ou corrigir (formulário
// "Adicionar contrato" e "Corrigir dados"). Valores em euros escritos como
// o cliente quiser ("42,99"); datas pelo seletor do browser.

export type ValoresContrato = {
  setor?: string;
  fornecedor?: string | null;
  referencia_contrato?: string | null;
  data_assinatura?: string | null;
  data_ativacao?: string | null;
  data_inicio?: string | null;
  duracao_fidelizacao_meses?: number | null;
  data_fim_fidelizacao?: string | null;
  data_fim_promocao?: string | null;
  descricao_promocao?: string | null;
  mensalidade_cents?: number | null;
  vantagem_cents?: number | null;
  tipo_fidelizacao?: string | null;
  nova_instalacao?: string | null;
  equipamento_subsidiado?: string | null;
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
      <Campo label="Data de assinatura" ajuda="Não é usada como início da fidelização.">
        <input type="date" name="data_assinatura" defaultValue={valores.data_assinatura ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label="Data de instalação/ativação" ajuda="Muitos contratos começam nesta data.">
        <input type="date" name="data_ativacao" defaultValue={valores.data_ativacao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label="Início da fidelização" ajuda="Se não souber, deixe em branco: usamos a data de instalação/ativação.">
        <input type="date" name="data_inicio" defaultValue={valores.data_inicio ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label="Duração da fidelização (meses)" ajuda="Com o início e a duração, calculamos o fim da fidelização.">
        <input name="duracao_fidelizacao_meses" inputMode="numeric" defaultValue={valores.duracao_fidelizacao_meses ?? ""} placeholder="ex.: 24" className={INPUT_CLASS} />
      </Campo>
      <Campo label="Fim da fidelização" ajuda="Só se o contrato indicar a data de fim.">
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
      <Campo label="Tipo de fidelização" ajuda="Para estimar o custo de saída (telecomunicações).">
        <select name="tipo_fidelizacao" defaultValue={valores.tipo_fidelizacao ?? ""} className={INPUT_CLASS}>
          <option value="">Não sei / não se aplica</option>
          <option value="primeira">Primeira fidelização</option>
          <option value="refidelizacao">Refidelização (renovação)</option>
        </select>
      </Campo>
      <Campo label="Houve nova instalação na refidelização?" ajuda="Por exemplo, mudança de tecnologia ou de morada.">
        <select name="nova_instalacao" defaultValue={valores.nova_instalacao ?? ""} className={INPUT_CLASS}>
          <option value="">Não sei / não se aplica</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </Campo>
      <Campo label="Tem equipamento subsidiado?" ajuda="Por exemplo, um telemóvel ou uma box pagos em prestações ou oferecidos.">
        <select name="equipamento_subsidiado" defaultValue={valores.equipamento_subsidiado ?? ""} className={INPUT_CLASS}>
          <option value="">Não sei</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </Campo>
      <Campo label="Referência do contrato" ajuda="Opcional.">
        <input name="referencia_contrato" defaultValue={valores.referencia_contrato ?? ""} className={INPUT_CLASS} />
      </Campo>
    </div>
  );
}
