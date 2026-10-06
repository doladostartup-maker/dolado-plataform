// DoLado — validação da análise devolvida pela IA (sem I/O; `npm test`).
// Só é aceite com a forma pedida; listas e textos com limites. Uma análise
// recusada fica "falhou" e o backoffice mostra "Faça a análise manualmente".

import { CLASSIFICACOES, PROXIMOS_PASSOS, type Classificacao } from "./classificacoes.ts";

export type AnaliseIA = {
  tipo_mensagem: Classificacao;
  resumo: string;
  respondeu_ao_pedido: "sim" | "parcialmente" | "nao" | "nao_aplicavel";
  resultado_aparente: string;
  aceite: string[];
  recusado: string[];
  fundamentacao_empresa: string[];
  pontos_nao_respondidos: string[];
  contradicoes_ou_problemas: string[];
  informacao_necessaria: string[];
  proximo_passo_sugerido: (typeof PROXIMOS_PASSOS)[number];
  proximo_passo_explicacao: string;
  requer_intervencao_cliente: boolean;
  requer_nova_resposta: boolean;
  confianca: "high" | "medium" | "low";
  avisos: string[];
  /** Só regras enviadas pela DoLado (outras → resposta recusada). */
  referencias_juridicas: { rule_id: string; razao: string }[];
  /** Avisos do servidor (não vêm da IA). */
  avisos_servidor: string[];
};

const MAX_TEXTO = 3000;
const MAX_ITEM = 600;
const MAX_ITENS = 20;

const LISTAS = [
  "aceite",
  "recusado",
  "fundamentacao_empresa",
  "pontos_nao_respondidos",
  "contradicoes_ou_problemas",
  "informacao_necessaria",
  "avisos",
] as const;

function texto(v: unknown, max = MAX_TEXTO) {
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : null;
}

function listaDeTextos(v: unknown): string[] | null {
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) return null;
  return v.map((x) => (x as string).trim().slice(0, MAX_ITEM)).filter(Boolean).slice(0, MAX_ITENS);
}

const CONCLUSOES = /(?<![\p{L}-])(violou|violaram|ilegal|ilegais|ilegalmente|m[áa]-f[ée]|fraude|burla)(?![\p{L}-])/iu;

export type ResultadoValidacao =
  | { ok: true; analise: AnaliseIA }
  | { ok: false; motivo: "resposta_invalida" | "regra_nao_fornecida"; detalhe?: string };

export function validarAnalise(bruto: unknown, regrasEnviadas: string[] = []): ResultadoValidacao {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return { ok: false, motivo: "resposta_invalida" };
  const r = bruto as Record<string, unknown>;

  if (!CLASSIFICACOES.includes(r.tipo_mensagem as Classificacao)) return { ok: false, motivo: "resposta_invalida", detalhe: "tipo_mensagem" };
  if (!PROXIMOS_PASSOS.includes(r.proximo_passo_sugerido as (typeof PROXIMOS_PASSOS)[number])) {
    return { ok: false, motivo: "resposta_invalida", detalhe: "proximo_passo_sugerido" };
  }
  if (!["sim", "parcialmente", "nao", "nao_aplicavel"].includes(r.respondeu_ao_pedido as string)) {
    return { ok: false, motivo: "resposta_invalida", detalhe: "respondeu_ao_pedido" };
  }
  if (!["high", "medium", "low"].includes(r.confianca as string)) return { ok: false, motivo: "resposta_invalida", detalhe: "confianca" };
  if (typeof r.requer_intervencao_cliente !== "boolean" || typeof r.requer_nova_resposta !== "boolean") {
    return { ok: false, motivo: "resposta_invalida", detalhe: "booleanos" };
  }
  const resumo = texto(r.resumo);
  const resultado = texto(r.resultado_aparente);
  const explicacao = texto(r.proximo_passo_explicacao);
  if (!resumo || resultado === null || explicacao === null) return { ok: false, motivo: "resposta_invalida", detalhe: "textos" };

  const listas = {} as Record<(typeof LISTAS)[number], string[]>;
  for (const k of LISTAS) {
    const l = listaDeTextos(r[k]);
    if (!l) return { ok: false, motivo: "resposta_invalida", detalhe: k };
    listas[k] = l;
  }

  const permitidas = new Set(regrasEnviadas);
  const referencias: AnaliseIA["referencias_juridicas"] = [];
  const brutas = r.referencias_juridicas ?? [];
  if (!Array.isArray(brutas)) return { ok: false, motivo: "resposta_invalida", detalhe: "referencias_juridicas" };
  for (const item of brutas.slice(0, MAX_ITENS)) {
    const { rule_id: id, razao } = (item ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || typeof razao !== "string") return { ok: false, motivo: "resposta_invalida", detalhe: "referencias_juridicas" };
    if (!permitidas.has(id)) return { ok: false, motivo: "regra_nao_fornecida", detalhe: id.slice(0, 60) };
    if (!referencias.some((x) => x.rule_id === id)) referencias.push({ rule_id: id, razao: razao.trim().slice(0, MAX_ITEM) });
  }

  const avisosServidor: string[] = [];
  const tudo = [resumo, resultado, explicacao, ...Object.values(listas).flat()].join("\n");
  if (CONCLUSOES.test(tudo)) avisosServidor.push("A análise usa linguagem que conclui responsabilidade jurídica — rever antes de usar.");
  if (r.tipo_mensagem === "resposta_satisfatoria" || r.tipo_mensagem === "proposta_resolucao") {
    avisosServidor.push("A resolução só fica confirmada quando o cliente a confirmar.");
  }

  return {
    ok: true,
    analise: {
      tipo_mensagem: r.tipo_mensagem as Classificacao,
      resumo,
      respondeu_ao_pedido: r.respondeu_ao_pedido as AnaliseIA["respondeu_ao_pedido"],
      resultado_aparente: resultado,
      ...listas,
      proximo_passo_sugerido: r.proximo_passo_sugerido as AnaliseIA["proximo_passo_sugerido"],
      proximo_passo_explicacao: explicacao,
      requer_intervencao_cliente: r.requer_intervencao_cliente,
      requer_nova_resposta: r.requer_nova_resposta,
      confianca: r.confianca as AnaliseIA["confianca"],
      referencias_juridicas: referencias,
      avisos_servidor: avisosServidor,
    },
  };
}
