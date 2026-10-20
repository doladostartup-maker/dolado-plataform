import { SETORES_CONTRATO, rotuloSetorMonitor } from "@/lib/monitor/contratos";
import type { Idioma } from "@/i18n/config";
import { tProtecao } from "@/i18n/mensagens/protecao";
import { INPUT_CLASS } from "./estilos";
import { AJUDA_CAMPO, ROTULO } from "@/components/portal/ui";

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
  desconto_promocao_cents?: number | null;
  data_inicio_promocao?: string | null;
  servicos_incluidos?: string | null;
};

function Campo({ label, ajuda, children }: { label: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <label className={ROTULO}>
      {label}
      {children}
      {ajuda && <span className={AJUDA_CAMPO}>{ajuda}</span>}
    </label>
  );
}

function euros(cents: number | null | undefined, decimal: string) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", decimal);
}

export function CamposContrato({
  valores = {},
  setorObrigatorio = false,
  idioma,
}: {
  valores?: ValoresContrato;
  setorObrigatorio?: boolean;
  idioma: Idioma;
}) {
  const t = tProtecao[idioma].campos;
  const dec = tProtecao[idioma].upload.decimal;
  const setores = SETORES_CONTRATO.filter((s) => s !== "nao_indicado" || !setorObrigatorio);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Campo label={t.fornecedor}>
        <input name="fornecedor" required={setorObrigatorio} defaultValue={valores.fornecedor ?? ""} placeholder={t.fornecedorExemplo} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.setor}>
        <select name="setor" required={setorObrigatorio} defaultValue={valores.setor ?? ""} className={INPUT_CLASS}>
          {setorObrigatorio && <option value="">{t.escolha}</option>}
          {setores.map((s) => (
            <option key={s} value={s}>
              {rotuloSetorMonitor(s, idioma)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label={t.assinatura} ajuda={t.assinaturaAjuda}>
        <input type="date" name="data_assinatura" defaultValue={valores.data_assinatura ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.ativacao} ajuda={t.ativacaoAjuda}>
        <input type="date" name="data_ativacao" defaultValue={valores.data_ativacao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.inicio} ajuda={t.inicioAjuda}>
        <input type="date" name="data_inicio" defaultValue={valores.data_inicio ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.duracao} ajuda={t.duracaoAjuda}>
        <input name="duracao_fidelizacao_meses" inputMode="numeric" defaultValue={valores.duracao_fidelizacao_meses ?? ""} placeholder={t.exemploMeses} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.fim} ajuda={t.fimAjuda}>
        <input type="date" name="data_fim_fidelizacao" defaultValue={valores.data_fim_fidelizacao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.mensalidade} ajuda={t.mensalidadeAjuda}>
        <input name="mensalidade_cents" inputMode="decimal" defaultValue={euros(valores.mensalidade_cents, dec)} placeholder={t.exemploEuros} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.vantagem} ajuda={t.vantagemAjuda}>
        <input name="vantagem_cents" inputMode="decimal" defaultValue={euros(valores.vantagem_cents, dec)} placeholder={t.exemploVantagem} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.promocao}>
        <input name="descricao_promocao" defaultValue={valores.descricao_promocao ?? ""} placeholder={t.promocaoExemplo} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.desconto} ajuda={t.descontoAjuda}>
        <input name="desconto_promocao_cents" inputMode="decimal" defaultValue={euros(valores.desconto_promocao_cents, dec)} placeholder={t.exemploDesconto} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.inicioPromocao}>
        <input type="date" name="data_inicio_promocao" defaultValue={valores.data_inicio_promocao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.fimPromocao}>
        <input type="date" name="data_fim_promocao" defaultValue={valores.data_fim_promocao ?? ""} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.servicos} ajuda={t.opcional}>
        <input name="servicos_incluidos" defaultValue={valores.servicos_incluidos ?? ""} placeholder={t.servicosExemplo} className={INPUT_CLASS} />
      </Campo>
      <Campo label={t.tipo} ajuda={t.tipoAjuda}>
        <select name="tipo_fidelizacao" defaultValue={valores.tipo_fidelizacao ?? ""} className={INPUT_CLASS}>
          <option value="">{t.naoSeiAplica}</option>
          <option value="primeira">{t.primeira}</option>
          <option value="refidelizacao">{t.refidelizacao}</option>
        </select>
      </Campo>
      <Campo label={t.novaInstalacao} ajuda={t.novaInstalacaoAjuda}>
        <select name="nova_instalacao" defaultValue={valores.nova_instalacao ?? ""} className={INPUT_CLASS}>
          <option value="">{t.naoSeiAplica}</option>
          <option value="sim">{t.sim}</option>
          <option value="nao">{t.nao}</option>
        </select>
      </Campo>
      <Campo label={t.equipamento} ajuda={t.equipamentoAjuda}>
        <select name="equipamento_subsidiado" defaultValue={valores.equipamento_subsidiado ?? ""} className={INPUT_CLASS}>
          <option value="">{t.naoSei}</option>
          <option value="sim">{t.sim}</option>
          <option value="nao">{t.nao}</option>
        </select>
      </Campo>
      <Campo label={t.referencia} ajuda={t.opcional}>
        <input name="referencia_contrato" defaultValue={valores.referencia_contrato ?? ""} className={INPUT_CLASS} />
      </Campo>
    </div>
  );
}
