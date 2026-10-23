// DoLado — painel "Aquisição e Conversão": regras de apresentação, sem I/O.
//
// Os números vêm de aquisicao_metricas() (só admin, só contagens). Aqui só se
// escolhe o período, se monta o funil (taxas face à etapa anterior e à
// entrada) e se convertem os custos. Nenhum número é estimado ou inventado:
// etapas sem dados mostram "—".

export const PERIODOS = ["hoje", "7d", "30d", "90d", "personalizado"] as const;
export type Periodo = (typeof PERIODOS)[number];

export type Intervalo = { periodo: Periodo; desde: Date; ate: Date };

const DIA_MS = 86_400_000;
const MAX_DIAS = 400;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Meia-noite de Lisboa do dia de `d` (o fuso muda ao longo do ano). */
export function inicioDoDiaLisboa(d: Date): Date {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
  return meiaNoiteLisboa(dia);
}

/** Desvio de Lisboa face a UTC, em minutos, no instante `d` (0 no Inverno, 60 no Verão). */
function desvioLisboaMin(d: Date): number {
  const nome = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "longOffset" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nome ?? "");
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** Meia-noite de Lisboa do dia `AAAA-MM-DD` (as mudanças de hora são à 1h/2h, nunca à meia-noite). */
function meiaNoiteLisboa(diaIso: string): Date {
  const utc = new Date(`${diaIso}T00:00:00Z`);
  return new Date(utc.getTime() - desvioLisboaMin(utc) * 60_000);
}

/** Período a partir da query (`?periodo=30d` ou `?periodo=personalizado&desde=…&ate=…`); por omissão 30 dias. */
export function lerIntervalo(consulta: Record<string, string | string[] | undefined>, agora: Date = new Date()): Intervalo {
  const p = typeof consulta.periodo === "string" && (PERIODOS as readonly string[]).includes(consulta.periodo) ? (consulta.periodo as Periodo) : "30d";
  const fim = new Date(inicioDoDiaLisboa(agora).getTime() + DIA_MS);
  if (p === "personalizado") {
    const desde = typeof consulta.desde === "string" && DATA.test(consulta.desde) ? meiaNoiteLisboa(consulta.desde) : null;
    const ateDia = typeof consulta.ate === "string" && DATA.test(consulta.ate) ? meiaNoiteLisboa(consulta.ate) : null;
    if (desde && ateDia) {
      const ate = new Date(ateDia.getTime() + DIA_MS);
      if (ate > desde && (ate.getTime() - desde.getTime()) / DIA_MS <= MAX_DIAS) return { periodo: p, desde, ate };
    }
    return lerIntervalo({ periodo: "30d" }, agora);
  }
  const dias = p === "hoje" ? 1 : Number(p.replace("d", ""));
  return { periodo: p, desde: new Date(fim.getTime() - dias * DIA_MS), ate: fim };
}

/** Período anterior com a mesma duração, imediatamente antes. */
export function intervaloAnterior(i: Intervalo): Intervalo {
  const duracao = i.ate.getTime() - i.desde.getTime();
  return { periodo: i.periodo, desde: new Date(i.desde.getTime() - duracao), ate: i.desde };
}

// ---------------------------------------------------------------------------
// Funil
// ---------------------------------------------------------------------------

export type Metricas = {
  sessoes: Record<
    "iniciaram" | "carregaram" | "concluiram" | "viram" | "clicaram_protecao" | "clicaram_guardar" | "com_conta" | "sem_conta_depois_de_ver",
    number
  >;
  documentos: {
    reservados: number;
    carregados: number;
    analises_iniciadas: number;
    concluidos: number;
    falhados: number;
    falhas_por_motivo: Record<string, number>;
    vistos: number;
    passados_ao_monitor: number;
  };
  /** `checkout` desde 20261102090000 (antes da migration, ausente). */
  contas: { criadas_ou_ligadas: number; experimental: number; checkout?: number; pagas: number; subscricoes_pagas: number };
  /** Funil da Protecção por página de entrada (desde 20261102090000). */
  funil_protecao?: { pagina: string; viram: number; clicaram_protecao: number; contas: number; checkout: number; pagas: number }[];
  por_canal: { canal: string; sessoes: number; carregaram: number; concluiram: number; contas: number; experimental: number; pagas: number }[];
  por_campanha: { origem: string; meio: string; campanha: string; documentos: number; concluidos: number; contas: number }[];
  por_pagina_entrada: Record<string, number>;
  por_dispositivo: Record<string, number>;
  por_setor: { setor: string; documentos: number; concluidos: number; contas: number; custo_usd: number }[];
  serie_diaria: { dia: string; carregados: number; concluidos: number; contas: number }[];
  ia: {
    por_modelo: { modelo: string; chamadas: number; tokens_entrada: number; tokens_saida: number; custo_usd: number; erros: number }[];
    por_funcionalidade: { funcionalidade: string; chamadas: number; custo_usd: number }[];
    gratuito_usd: number;
    gratuito_falhado_usd: number;
    total_usd: number;
    coorte_usd: number;
    serie_diaria: { dia: string; gratuito_usd: number | null; restante_usd: number | null }[];
  };
};

export type Etapa = {
  id: string;
  rotulo: string;
  /** Unidade contada (o funil mistura sessões e contas: diz-se sempre qual). */
  unidade: "sessões" | "contas";
  valor: number;
  /** % face à etapa anterior (null na primeira ou com a anterior a 0). */
  daAnterior: number | null;
  /** % face à entrada do funil. */
  daEntrada: number | null;
  /** Quantos se perderam face à etapa anterior. */
  perdidos: number | null;
  anterior?: number;
};

const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : null);

/**
 * Visitante → … → cliente pago, só com o que a base de dados confirma. A
 * entrada é a sessão que escolheu um ficheiro (visitas e cliques no botão só
 * existem no GA4, com consentimento). Da conta em diante conta-se por conta.
 * Entre o resultado e a conta, o clique no botão da Protecção
 * (protection_cta_clicked = protecao_clicada_em): poucos cliques → o
 * resultado não mostrou valor; muitos cliques e poucos pagamentos → registo,
 * checkout, confiança ou preço. O período experimental fica fora da cadeia
 * (é uma alternativa ao checkout, não um passo antes dele).
 */
export function montarFunil(m: Metricas, anterior?: Metricas | null): Etapa[] {
  const linhas: [string, string, Etapa["unidade"], (x: Metricas) => number][] = [
    ["escolheram", "Escolheram um documento", "sessões", (x) => x.sessoes.iniciaram],
    ["carregaram", "Documento carregado", "sessões", (x) => x.sessoes.carregaram],
    ["concluiram", "Análise concluída", "sessões", (x) => x.sessoes.concluiram],
    ["viram", "Diagnóstico visto", "sessões", (x) => x.sessoes.viram],
    ["clicaram_protecao", "Clicaram na Protecção", "sessões", (x) => x.sessoes.clicaram_protecao],
    ["conta", "Conta criada ou ligada", "contas", (x) => x.contas.criadas_ou_ligadas],
    ["checkout", "Checkout aberto", "contas", (x) => x.contas.checkout ?? 0],
    ["pago", "Cliente pago", "contas", (x) => x.contas.pagas],
  ];
  const entrada = linhas[0][3](m);
  return linhas.map(([id, rotulo, unidade, ler], i) => {
    const valor = ler(m);
    const antes = i > 0 ? linhas[i - 1][3](m) : null;
    return {
      id,
      rotulo,
      unidade,
      valor,
      daAnterior: antes === null ? null : pct(valor, antes),
      daEntrada: pct(valor, entrada),
      perdidos: antes === null ? null : Math.max(0, antes - valor),
      ...(anterior ? { anterior: ler(anterior) } : {}),
    };
  });
}

/** A etapa com a maior perda relativa (onde se perdem mais potenciais clientes). */
export function maiorPerda(funil: Etapa[]): Etapa | null {
  const candidatas = funil.filter((e) => e.daAnterior !== null && e.perdidos !== null && e.perdidos > 0);
  if (!candidatas.length) return null;
  return candidatas.reduce((pior, e) => ((e.daAnterior ?? 100) < (pior.daAnterior ?? 100) ? e : pior));
}

/** Variação face ao período anterior, em %. null sem base de comparação. */
export function variacao(actual: number, anterior: number | undefined): number | null {
  if (anterior === undefined || anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

// ---------------------------------------------------------------------------
// Custos
// ---------------------------------------------------------------------------

export type Cambio = { taxa: number; data: string } | null;

/**
 * Taxa USD → EUR configurável e identificada por data (TAXA_USD_EUR e
 * TAXA_USD_EUR_DATA, ex.: 0.92 e 2026-10-22). Sem as duas, os custos ficam
 * só em dólares: nunca se inventa uma taxa.
 */
export function lerCambio(taxa: string | undefined, data: string | undefined): Cambio {
  const n = Number((taxa ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 10 || !data || !DATA.test(data)) return null;
  return { taxa: n, data };
}

export function porUnidade(total: number, unidades: number): number | null {
  return unidades > 0 ? total / unidades : null;
}

export const NOMES_CANAL: Record<string, string> = {
  google: "Google",
  instagram: "Instagram",
  facebook: "Facebook",
  direto: "Directo",
  referencia: "Outros sites",
  campanha: "Campanhas pagas",
  parceiro: "Parceiros",
  outro: "Outras origens",
};

export const NOMES_SETOR: Record<string, string> = {
  telecomunicacoes: "Telecomunicações",
  eletricidade: "Electricidade",
  gas: "Gás",
  agua: "Água",
  nao_indicado: "Analisado, sem sector",
  nao_classificado: "Não classificado (não concluído)",
  outro: "Outro",
};

export const NOMES_FALHA: Record<string, string> = {
  ficheiro_invalido: "Ficheiro inválido",
  nao_suportado: "Documento não suportado",
  ilegivel: "Ilegível",
  indisponivel: "Problema temporário",
  orcamento: "Orçamento da IA atingido",
};

export const NOMES_FUNCIONALIDADE: Record<string, string> = {
  diagnostico_gratuito: "Diagnóstico gratuito",
  monitor_fatura: "Protecção — facturas",
  monitor_contrato: "Protecção — contratos",
  rascunho_reclamacao: "Sugestão do texto da reclamação",
  analise_resposta: "Análise das respostas",
};
