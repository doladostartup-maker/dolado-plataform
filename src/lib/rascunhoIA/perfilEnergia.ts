// DoLado — perfil de selecção das regras jurídicas para casos de Energia e
// Gás (fornecimento), por tipo de problema. Sem I/O; `npm test`.
//
// Porquê (auditoria de 20/10/2026, docs/legal/auditoria-energia-facturacao-
// contratacao-2026-10-20.md): o critério geral envia no máximo 12 regras —
// primeiro as do sector (incluindo as genéricas de "Reclamação") e depois as
// gerais por ordem ALFABÉTICA do código. Em Energia, isso deixava de fora a
// prescrição e a caducidade de 6 meses (Lei n.º 23/96) nas cobranças e todas
// as regras do DL 24/2014 nos cancelamentos e nas mudanças de comercializador,
// enquanto enviava as regras da caução. Os temas são os de 85% das
// reclamações aos comercializadores (ERSE, 2025).
//
// Este perfil não acrescenta regras nem muda a base jurídica: só decide a
// ORDEM antes do limite, com a mesma filtragem do critério geral (em vigor,
// revista, do sector ou geral, Lei 23/96 só em serviços públicos essenciais).
//   1 — essenciais do tipo de problema (lista abaixo, pela ordem indicada);
//   2 — do sector, das categorias do tipo de problema;
//   3 — gerais, das categorias do tipo de problema;
//   4 — do sector, das categorias sempre enviadas (reclamação…) ou sem categoria;
//   5 — gerais, das categorias sempre enviadas ou sem categoria.
// As regras do DL 24/2014 só entram se forem compatíveis com a forma de
// contratação indicada pelo cliente (dl24CompativelComForma; sem resposta,
// todas as do regime menos a da compra na loja).
//
// Ficam fora deste perfil (critério geral de sempre): "Corte ou falha de
// serviço" (tem limite próprio), "Tarifa social", "Outro" e os painéis
// solares (perfilAutoconsumo.ts). Mudar as listas é uma decisão de
// produto/jurídica (Thiago): decide que fundamentos a IA pode considerar.
// Testes: energiaFacturacao.test.mjs.

import {
  PROBLEMA_COBRANCA_APOS_CANCELAMENTO,
  PROBLEMA_CONTRATO_NAO_ACEITE,
  PROBLEMA_FACTURA_ACERTO,
  type DetalhesCaso,
} from "../pedidoCaso.ts";
import { dl24CompativelComForma, regraDl24 } from "./perfilAutoconsumo.ts";
import type { RegraJuridica } from "./regras.ts";

/** Igual ao critério geral (MAX_REGRAS_POR_PEDIDO). */
export const MAX_REGRAS_ENERGIA = 12;

export const SETORES_PERFIL_ENERGIA: readonly string[] = ["Energia", "Gás"];

type Perfil = {
  /** Códigos das regras essenciais, por ordem de importância. */
  essenciais: string[];
  /** Categorias das regras relevantes para o tipo de problema. */
  categorias: string[];
};

// Os códigos ENE_* só existem no sector Energia e os GAS_* no Gás: a
// filtragem por sector escolhe os que se aplicam.
// ENE_FIDELIZACAO_INDEMNIZACAO_19 e ENE_DENUNCIA_SEM_ENCARGOS_81 nasceram
// inactivas (20261020140000_energia_fidelizacao_denuncia.sql): só entram
// depois de revistas e activadas.
const PERFIS: Record<string, Perfil> = {
  [PROBLEMA_FACTURA_ACERTO]: {
    essenciais: [
      "SPE_ACERTO_6M",
      "SPE_PRESCRICAO_6M",
      "ENE_LEITURA_REAL_PREVALECE_42",
      "GAS_LEITURA_ESTIMATIVA_42",
      "ENE_ESTIMATIVA_ESCOLHA_42",
      "SPE_ACERTO_EXCESSO",
      "ENE_FATURA_ATRASO_FRACIONAR_44",
      "GAS_FATURACAO_PERIODICIDADE_44",
      "ENE_RECLAM_FAT_SUSPENDE_CORTE_64",
      "GAS_RECLAM_FAT_CORTE_RQS_64",
      "SPE_ONUS_PROVA",
      "ENE_DADOS_CONSUMO_41",
    ],
    // Sem "Cobrança" nem "Pagamento": a caução e os pagamentos não
    // autorizados não explicam uma factura alta (a prescrição, que é da
    // categoria "Cobrança", entra como essencial).
    categorias: ["Faturação", "Medição", "Prova"],
  },
  "Cobrança indevida": {
    essenciais: [
      "SPE_ONUS_PROVA",
      "CONS_NAO_SOLICITADO_9",
      "PCD_NAO_SOLICITADO_12",
      "ENE_SERVICOS_ADICIONAIS_17",
      "SPE_PRESCRICAO_6M",
      "SPE_ACERTO_EXCESSO",
      "SPE_ACERTO_6M",
      "SPE_PAGAMENTO_PARCIAL",
      "ENE_RECLAM_FAT_SUSPENDE_CORTE_64",
      "GAS_RECLAM_FAT_CORTE_RQS_64",
      "ENE_LEITURA_REAL_PREVALECE_42",
      "GAS_LEITURA_ESTIMATIVA_42",
    ],
    categorias: ["Cobrança", "Faturação", "Medição", "Pagamento", "Prova"],
  },
  [PROBLEMA_COBRANCA_APOS_CANCELAMENTO]: {
    essenciais: [
      "ENE_MUDANCA_FATURA_FINAL_6S_242",
      "GAS_MUDANCA_COMERCIALIZADOR_242",
      "ENE_DENUNCIA_SEM_ENCARGOS_81",
      "GAS_DENUNCIA_SEM_ENCARGOS_81",
      "SPE_PRESCRICAO_6M",
      "SPE_ACERTO_EXCESSO",
      "SPE_ONUS_PROVA",
      "ENE_CAUCAO_RESTITUICAO_27",
      "GAS_CAUCAO_23_27",
      "CONS_NAO_SOLICITADO_9",
      "ENE_RECLAM_FAT_SUSPENDE_CORTE_64",
      "GAS_RECLAM_FAT_CORTE_RQS_64",
    ],
    categorias: ["Cancelamento", "Cobrança", "Pagamento", "Faturação", "Mudança de comercializador", "Prova"],
  },
  [PROBLEMA_CONTRATO_NAO_ACEITE]: {
    essenciais: [
      "ENE_ACEITACAO_EXPRESSA_20",
      "GAS_ACEITACAO_EXPRESSA_20",
      "ENE_CHAMADA_GRAVADA_243",
      "DIST_TELEFONE_5",
      "CONS_NAO_SOLICITADO_9",
      "PCD_NAO_SOLICITADO_12",
      "DIST_LIVRE_RESOLUCAO",
      "DIST_INFO_PRE_4",
      "DIST_FORA_ESTAB_FORMA_9",
      "DIST_CONFIRMACAO_6",
      "PCD_ACAO_ENGANOSA_7",
      "ENE_SERVICOS_ADICIONAIS_17",
      "DIST_SERVICO_15",
      "PCD_OMISSAO_9",
    ],
    categorias: ["Contrato", "Prática comercial", "Livre resolução", "Cobrança", "Mudança de comercializador"],
  },
  "Mudança de comercializador": {
    essenciais: [
      "ENE_ACEITACAO_EXPRESSA_20",
      "GAS_ACEITACAO_EXPRESSA_20",
      "ENE_CHAMADA_GRAVADA_243",
      "DIST_TELEFONE_5",
      "ENE_MUDANCA_GRATUITA_3S_242",
      "GAS_MUDANCA_COMERCIALIZADOR_242",
      "ENE_MUDANCA_FATURA_FINAL_6S_242",
      "ENE_DIVIDA_MUDANCA_242",
      "CONS_NAO_SOLICITADO_9",
      "DIST_LIVRE_RESOLUCAO",
    ],
    categorias: ["Mudança de comercializador", "Contrato", "Faturação", "Fidelização", "Prática comercial"],
  },
  "Cancelamento recusado": {
    essenciais: [
      "ENE_DENUNCIA_SEM_ENCARGOS_81",
      "GAS_DENUNCIA_SEM_ENCARGOS_81",
      "DIST_LIVRE_RESOLUCAO",
      "DIST_FORA_ESTAB_FORMA_9",
      "DIST_TELEFONE_5",
      "DIST_SERVICO_15",
      "DIST_REEMBOLSO_12",
      "ENE_FIDELIZACAO_INDEMNIZACAO_19",
      "GAS_FIDELIZACAO_INDEMNIZACAO_19",
      "CCG_FORMALIDADES_22",
    ],
    categorias: ["Cancelamento", "Livre resolução", "Contrato", "Renovação", "Fidelização"],
  },
  "Fidelização ou penalização": {
    essenciais: [
      "ENE_FIDELIZACAO_CONTRAPARTIDA_19",
      "GAS_FIDELIZACAO_CONTRAPARTIDA_19",
      "ENE_FIDELIZACAO_MAX_12M_19",
      "GAS_FIDELIZACAO_MAX_12M_19",
      "ENE_FIDELIZACAO_INDEMNIZACAO_19",
      "GAS_FIDELIZACAO_INDEMNIZACAO_19",
      "ENE_FIDELIZACAO_SEM_RENOV_AUTO_19",
      "GAS_FIDELIZACAO_RENOVACAO_19",
      "ENE_DENUNCIA_SEM_ENCARGOS_81",
      "GAS_DENUNCIA_SEM_ENCARGOS_81",
      "ENE_FIDELIZACAO_PRECO_19",
      "GAS_FIDELIZACAO_CONDICOES_19",
    ],
    categorias: ["Fidelização", "Cancelamento", "Renovação", "Contrato"],
  },
  "Aumento de mensalidade": {
    essenciais: [
      "ENE_ALT_CONTRATO_68",
      "GAS_ALT_CONTRATO_68",
      "ENE_FIDELIZACAO_PRECO_19",
      "GAS_FIDELIZACAO_CONDICOES_19",
      "PCD_ACAO_ENGANOSA_7",
      "CCG_ALT_UNILATERAL_22",
    ],
    categorias: ["Alteração contratual", "Alteração tarifária", "Faturação", "Contrato", "Prática comercial"],
  },
};

const norm = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Este caso usa o perfil de Energia e Gás? */
export function usaPerfilEnergia(setor: string | null | undefined, problema: string | null | undefined): boolean {
  return !!setor && SETORES_PERFIL_ENERGIA.includes(setor) && !!problema && !!PERFIS[problema.trim()];
}

/** Categorias consideradas por um tipo de problema do perfil (vazio se não tiver perfil). */
export function categoriasEnergia(problema: string): string[] {
  return PERFIS[problema]?.categorias ?? [];
}

/** Códigos essenciais de um tipo de problema do perfil (testes e documentação). */
export function essenciaisEnergia(problema: string): readonly string[] {
  return PERFIS[problema]?.essenciais ?? [];
}

/**
 * Regras para um caso de Energia/Gás com perfil. `candidatas` já têm de
 * estar filtradas pelo chamador (em vigor, aplicáveis ao sector, fora das
 * categorias só do Autoconsumo); `sempre` são as categorias sempre enviadas.
 */
export function selecionarRegrasEnergia(
  problema: string,
  detalhes: Partial<DetalhesCaso> | null | undefined,
  candidatas: RegraJuridica[],
  sempre: readonly string[],
): RegraJuridica[] {
  const perfil = PERFIS[problema.trim()];
  if (!perfil) return [];
  const categorias = new Set(perfil.categorias.map(norm));
  const sempreNorm = new Set(sempre.map(norm));
  const forma = detalhes?.forma_contratacao ?? null;

  return candidatas
    .filter((r) => !regraDl24(r) || dl24CompativelComForma(r, forma))
    .map((r) => {
      const essencial = perfil.essenciais.indexOf(r.codigo);
      const cat = norm(r.categoria);
      const doSetor = !!r.setor;
      let prioridade: number;
      if (essencial >= 0) prioridade = 1;
      else if (categorias.has(cat)) prioridade = doSetor ? 2 : 3;
      else if (!r.categoria || sempreNorm.has(cat)) prioridade = doSetor ? 4 : 5;
      else prioridade = 0; // fora do tipo de problema
      return { r, prioridade, ordem: essencial >= 0 ? essencial : Number.MAX_SAFE_INTEGER };
    })
    .filter(({ prioridade }) => prioridade > 0)
    .sort((a, b) => a.prioridade - b.prioridade || a.ordem - b.ordem || a.r.codigo.localeCompare(b.r.codigo))
    .slice(0, MAX_REGRAS_ENERGIA)
    .map(({ r }) => r);
}
