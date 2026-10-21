// Área do parceiro (/portal/parceiro): regras sem I/O (`npm test`).
// Base de dados: 20261027090000_area_parceiro.sql — o acesso é dado só pelo
// admin (parceiro_area_conceder) e a única leitura do parceiro é
// parceiro_area_resumo(), que devolve agregados e os pagamentos feitos ao
// próprio parceiro. Nunca linhas por cliente.
//
// Decisão de Thiago (21/10/2026): área de login do parceiro; valores e prazos
// das comissões não mudam; o Avulso continua sem comissão.

/** Área ligada (AREA_PARCEIRO_ATIVA=1). Desligada por omissão: a Política em vigor ainda não a descreve. */
export function areaParceiroAtiva(valor: string | undefined = process.env.AREA_PARCEIRO_ATIVA) {
  return valor === "1";
}

/** Estados das comissões tal como o parceiro os vê (cancelada e revertida = anulada). */
export const GRUPOS_COMISSAO = ["pendente", "em_verificacao", "elegivel", "aprovada", "paga", "anulada"] as const;
export type GrupoComissao = (typeof GRUPOS_COMISSAO)[number];

export type Contagem = { quantidade: number; valorCents: number };

export type PagamentoParceiro = {
  pagoEm: string;
  referencia: string;
  totalCents: number;
  ivaCents: number | null;
  transferidoCents: number;
  documento: string | null;
  comissoes: number;
};

export type ResumoArea = {
  parceiro: { nome: string; estado: "ativo" | "suspenso" | "encerrado"; dataInicio: string | null };
  codigos: string[];
  condicoes: {
    protecaoCents: number;
    casoProtecaoCents: number;
    mensalidades: number;
    minimoPagamentoCents: number;
  } | null;
  contasAssociadas: number;
  conversoes: { protecao: number; casoProtecao: number };
  comissoes: Record<GrupoComissao, Contagem>;
  oportunidades: { emCurso: number; ganhas: number; perdidas: number };
  pagamentos: PagamentoParceiro[];
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Obj) : {});
const inteiro = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 0;
};
const textoOuNull = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const CODIGO = /^[A-HJ-NP-Z2-9]{8}$/;

/** Leitura defensiva do jsonb devolvido por parceiro_area_resumo(); null = sem acesso. */
export function lerResumoArea(valor: unknown): ResumoArea | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const r = valor as Obj;
  const p = obj(r.parceiro);
  const estado = p.estado === "ativo" || p.estado === "suspenso" || p.estado === "encerrado" ? p.estado : null;
  const nome = textoOuNull(p.nome);
  if (!estado || !nome) return null;

  const c = r.condicoes == null ? null : obj(r.condicoes);
  const comissoes = obj(r.comissoes);
  const conversoes = obj(r.conversoes);
  const oportunidades = obj(r.oportunidades);

  return {
    parceiro: { nome, estado, dataInicio: textoOuNull(p.data_inicio) },
    codigos: Array.isArray(r.codigos) ? r.codigos.filter((x): x is string => typeof x === "string" && CODIGO.test(x)) : [],
    condicoes: c
      ? {
          protecaoCents: inteiro(c.comissao_protecao_cents),
          casoProtecaoCents: inteiro(c.comissao_caso_protecao_cents),
          mensalidades: inteiro(c.mensalidades_necessarias),
          minimoPagamentoCents: inteiro(c.minimo_pagamento_cents),
        }
      : null,
    contasAssociadas: inteiro(r.contas_associadas),
    conversoes: { protecao: inteiro(conversoes.protecao), casoProtecao: inteiro(conversoes.caso_protecao) },
    comissoes: Object.fromEntries(
      GRUPOS_COMISSAO.map((g) => {
        const x = obj(comissoes[g]);
        return [g, { quantidade: inteiro(x.quantidade), valorCents: inteiro(x.valor_cents) }];
      }),
    ) as Record<GrupoComissao, Contagem>,
    oportunidades: {
      emCurso: inteiro(oportunidades.em_curso),
      ganhas: inteiro(oportunidades.ganhas),
      perdidas: inteiro(oportunidades.perdidas),
    },
    pagamentos: (Array.isArray(r.pagamentos) ? r.pagamentos : []).flatMap((x) => {
      const g = obj(x);
      const pagoEm = textoOuNull(g.pago_em);
      const referencia = textoOuNull(g.referencia);
      if (!pagoEm || !referencia) return [];
      return [
        {
          pagoEm,
          referencia,
          totalCents: inteiro(g.total_cents),
          ivaCents: g.iva_cents == null ? null : inteiro(g.iva_cents),
          transferidoCents: inteiro(g.total_transferido_cents),
          documento: textoOuNull(g.documento_parceiro),
          comissoes: inteiro(g.comissoes),
        },
      ];
    }),
  };
}

/** Total ainda por receber (elegível + aprovada): o que a DoLado vai pagar depois de aprovar. */
export function porReceberCents(r: ResumoArea) {
  return r.comissoes.elegivel.valorCents + r.comissoes.aprovada.valorCents;
}

/** Há oportunidades empresariais para mostrar (a secção só aparece a quem as tem). */
export function temOportunidades(r: ResumoArea) {
  return r.oportunidades.emCurso + r.oportunidades.ganhas + r.oportunidades.perdidas > 0;
}
