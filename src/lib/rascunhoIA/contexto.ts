// DoLado — contexto estruturado enviado à IA para sugerir o texto da
// reclamação (sem I/O; `npm test`).
//
// Só os dados necessários para redigir o texto. Nunca vão: nome, e-mail,
// telefone, NIF, morada, referências de contrato/cliente, CPE/CUI, notas
// internas, nem dados de pagamento. O texto livre do cliente passa por
// retirarDadosPessoais() antes de sair do servidor. O rascunho usa
// marcadores ([NOME DO CLIENTE], …) que a DoLado preenche na revisão.
//
// Dados do Monitor de Proteção: só os serviços acompanhados da própria conta
// que correspondem à empresa e ao setor do caso, com as condições já aceites
// (valores atuais) e as faturas mais recentes.

import { encontrarFornecedor, normalizarNomeEmpresa, type Fornecedor } from "../monitor/fornecedores.ts";

export type CasoParaRascunho = {
  id: string;
  utilizador_id: string | null;
  nome: string | null;
  sector: string | null;
  empresa: string | null;
  problema_tipo: string | null;
  tipo_problema: string | null;
  descricao: string | null;
  momento_cliente: string | null;
  data_fim_fidelidade: string | null;
  created_at: string;
};

export type FaturaMonitor = {
  contrato_id: string;
  data_emissao: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_cents: number | null;
  recorrente_cents: number | null;
  pontual_cents: number | null;
  descontos_cents: number | null;
  mensalidade_lida_cents: number | null;
  linhas: unknown;
};

export type ServicoMonitor = {
  id: string;
  setor: string;
  fornecedor: string | null;
  servico: string | null;
  data_assinatura: string | null;
  data_ativacao: string | null;
  data_inicio: string | null;
  duracao_fidelizacao_meses: number | null;
  data_fim_fidelizacao: string | null;
  tipo_fidelizacao: string | null;
  mensalidade_cents: number | null;
  descricao_promocao: string | null;
  data_inicio_promocao: string | null;
  data_fim_promocao: string | null;
  desconto_promocao_cents: number | null;
  cessacao_operador_cents: number | null;
  cessacao_operador_data: string | null;
  servicos_incluidos: string | null;
  faturas: FaturaMonitor[];
};

/** Versão da forma do contexto (gravada na auditoria com o hash). */
export const CONTEXTO_VERSAO = "contexto_v1";

const MAX_DESCRICAO = 4000;
const MAX_SERVICOS = 3;
const MAX_FATURAS = 6;
const MAX_LINHAS = 15;

// ---------------------------------------------------------------------------
// Dados pessoais no texto livre

const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Retira do texto livre dados pessoais que não são precisos para redigir a
 * reclamação: e-mails, IBAN, telefones, NIF/números longos, códigos postais
 * e o nome do cliente. Melhor esforço (não é anonimização completa).
 */
export function retirarDadosPessoais(texto: string, { nome }: { nome?: string | null } = {}): string {
  let t = texto;
  t = t.replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, "[e-mail]");
  t = t.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, "[IBAN]");
  t = t.replace(/(?:\+|00)\s?351[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, "[telefone]");
  t = t.replace(/\b[29]\d{2}[\s.-]\d{3}[\s.-]\d{3}\b/g, "[telefone]");
  // Qualquer sequência de 9 ou mais algarismos (NIF, telefone, cartão,
  // n.º de cliente): o texto da reclamação não precisa deles.
  t = t.replace(/\b\d(?:[ -]?\d){8,}\b/g, "[número]");
  t = t.replace(/\b\d{4}-\d{3}\b/g, "[código postal]");
  const partes = (nome ?? "")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3 && !PARTICULAS.has(p.toLowerCase()));
  for (const parte of partes) {
    t = t.replace(new RegExp(`(?<![\\p{L}])${escaparRegex(parte)}(?![\\p{L}])`, "giu"), "[cliente]");
  }
  return t;
}

// ---------------------------------------------------------------------------
// Serviços do Monitor que correspondem ao caso

const SETORES_MONITOR: Record<string, string[]> = {
  "telecomunicações": ["telecomunicacoes"],
  energia: ["eletricidade", "gas"],
  "água": ["agua"],
};

function mesmaEmpresa(a: string, b: string) {
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

export function servicosDoCaso(caso: CasoParaRascunho, servicos: ServicoMonitor[], fornecedores: Fornecedor[]): ServicoMonitor[] {
  if (!caso.empresa) return [];
  const empresaCaso = normalizarNomeEmpresa(encontrarFornecedor(caso.empresa, fornecedores)?.nome_comercial ?? caso.empresa);
  const setores = SETORES_MONITOR[(caso.sector ?? "").toLowerCase()] ?? null;
  return servicos
    .filter((s) => {
      const empresaServico = normalizarNomeEmpresa(encontrarFornecedor(s.fornecedor, fornecedores)?.nome_comercial ?? s.fornecedor);
      if (!mesmaEmpresa(empresaCaso, empresaServico)) return false;
      return !setores || setores.includes(s.setor) || s.setor === "nao_indicado" || s.setor === "outro";
    })
    .slice(0, MAX_SERVICOS);
}

// ---------------------------------------------------------------------------
// Contexto

const euros = (c: number | null | undefined) => (typeof c === "number" ? Math.round(c) / 100 : null);
const curto = (v: string | null | undefined, max: number) => (v ? v.slice(0, max) : null);

function linhasFatura(linhas: unknown, nome: string | null) {
  if (!Array.isArray(linhas)) return [];
  return linhas.slice(0, MAX_LINHAS).flatMap((l) => {
    if (!l || typeof l !== "object") return [];
    const linha = l as Record<string, unknown>;
    const valor = typeof linha.valorCents === "number" ? linha.valorCents : typeof linha.valor_cents === "number" ? linha.valor_cents : null;
    return [
      {
        descricao: typeof linha.descricao === "string" ? retirarDadosPessoais(linha.descricao.slice(0, 120), { nome }) : null,
        categoria: typeof linha.categoria === "string" ? linha.categoria : null,
        valor_eur: euros(valor as number | null),
        recorrente: typeof linha.recorrente === "boolean" ? linha.recorrente : null,
      },
    ];
  });
}

export type ContextoRascunho = ReturnType<typeof construirContexto>;

export function construirContexto(caso: CasoParaRascunho, servicos: ServicoMonitor[]) {
  const descricao = caso.descricao ? retirarDadosPessoais(caso.descricao.slice(0, MAX_DESCRICAO), { nome: caso.nome }) : null;
  return {
    versao: CONTEXTO_VERSAO,
    pedido_do_cliente: {
      setor: caso.sector,
      empresa_reclamada: curto(caso.empresa, 120),
      categoria_do_problema: caso.problema_tipo,
      subcategoria_do_problema: caso.tipo_problema,
      descricao_do_cliente: descricao,
      contacto_anterior_com_a_empresa: caso.momento_cliente,
      data_do_pedido_a_dolado: caso.created_at.slice(0, 10),
    },
    dados_registados_pela_dolado: {
      data_fim_fidelizacao: caso.data_fim_fidelidade,
    },
    servicos_acompanhados_no_monitor: servicos.map((s) => ({
      fornecedor: s.fornecedor,
      setor: s.setor,
      servico: curto(s.servico, 200),
      servicos_incluidos: curto(s.servicos_incluidos, 300),
      fidelizacao: {
        data_assinatura: s.data_assinatura,
        data_ativacao: s.data_ativacao,
        data_inicio: s.data_inicio,
        duracao_meses: s.duracao_fidelizacao_meses,
        data_fim: s.data_fim_fidelizacao,
        tipo: s.tipo_fidelizacao,
      },
      mensalidade_contratada_eur: euros(s.mensalidade_cents),
      promocao: s.descricao_promocao || s.data_fim_promocao
        ? {
            descricao: curto(s.descricao_promocao, 300),
            inicio: s.data_inicio_promocao,
            fim: s.data_fim_promocao,
            desconto_eur: euros(s.desconto_promocao_cents),
          }
        : null,
      valor_cessacao_indicado_pelo_operador_eur: euros(s.cessacao_operador_cents),
      valor_cessacao_data: s.cessacao_operador_data,
      faturas_recentes: [...s.faturas]
        .sort((a, b) => (b.periodo_fim ?? b.data_emissao ?? "").localeCompare(a.periodo_fim ?? a.data_emissao ?? ""))
        .slice(0, MAX_FATURAS)
        .map((f) => ({
          data_emissao: f.data_emissao,
          periodo_inicio: f.periodo_inicio,
          periodo_fim: f.periodo_fim,
          total_eur: euros(f.total_cents),
          recorrente_eur: euros(f.recorrente_cents),
          pontual_eur: euros(f.pontual_cents),
          descontos_eur: euros(f.descontos_cents),
          mensalidade_lida_eur: euros(f.mensalidade_lida_cents),
          linhas: linhasFatura(f.linhas, caso.nome),
        })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Seguimento (nova comunicação depois de uma resposta da empresa)

export type SeguimentoParaRascunho = {
  /** Comunicações enviadas pela DoLado (mais recente primeiro). */
  enviadas: { conteudo: string; enviado_em: string }[];
  ultimaResposta: { texto: string | null; data: string | null } | null;
  /** Análise humana da DoLado (interna). */
  analise: string | null;
};

const MAX_SEGUIMENTO_ENVIADA = 6000;
const MAX_SEGUIMENTO_RESPOSTA = 8000;

export function construirSeguimento(seg: SeguimentoParaRascunho, nome: string | null) {
  const limpar = (t: string | null | undefined, max: number) => (t ? retirarDadosPessoais(t.slice(0, max), { nome }) : null);
  return {
    comunicacoes_enviadas: seg.enviadas.slice(0, 2).map((e) => ({ data: e.enviado_em.slice(0, 10), texto: limpar(e.conteudo, MAX_SEGUIMENTO_ENVIADA) })),
    ultima_resposta_da_empresa: seg.ultimaResposta
      ? { data: seg.ultimaResposta.data?.slice(0, 10) ?? null, texto: limpar(seg.ultimaResposta.texto, MAX_SEGUIMENTO_RESPOSTA) }
      : null,
    analise_da_dolado: limpar(seg.analise, 3000),
  };
}
