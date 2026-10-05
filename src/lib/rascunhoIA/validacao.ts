// DoLado — validação da resposta da IA (sem I/O; `npm test`).
//
// A resposta só é aceite se tiver a forma pedida E se toda a base jurídica
// vier das regras enviadas pela DoLado:
//   * legal_basis só com rule_id enviados — qualquer outro recusa tudo;
//   * o texto não pode citar diplomas (Lei n.º X/AAAA, Decreto-Lei …) que
//     não estejam nas regras enviadas — recusa tudo.
// Uma resposta recusada nunca chega ao texto do caso (fica "Rascunho IA não
// gerado", com "Tentar novamente"). Verificações que não justificam recusar
// (expressões a rever, marcadores por preencher) viram avisos do servidor,
// mostrados à DoLado junto do rascunho.

import { MARCADORES } from "./prompt.ts";
import type { RegraEnviada } from "./regras.ts";

export type Confianca = "high" | "medium" | "low";

export type RespostaRascunho = {
  draft: string;
  legal_basis: { rule_id: string; reason: string }[];
  missing_information: string[];
  warnings: string[];
  confidence: Confianca;
  /** Avisos acrescentados pelo servidor (não vêm da IA). */
  server_warnings: string[];
};

export type MotivoRecusa =
  | "resposta_invalida"
  | "texto_vazio"
  | "texto_longo"
  | "regra_nao_fornecida"
  | "legislacao_nao_fornecida";

export type ResultadoValidacao =
  | { ok: true; resposta: RespostaRascunho }
  | { ok: false; motivo: MotivoRecusa; detalhe?: string };

/** Igual ao limite de casos_textos.conteudo. */
export const MAX_TEXTO = 50000;
const MIN_TEXTO = 80;
const MAX_ITENS = 20;
const MAX_ITEM = 500;

function listaDeTextos(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === "string")) return null;
  return v
    .map((x) => (x as string).trim().slice(0, MAX_ITEM))
    .filter(Boolean)
    .slice(0, MAX_ITENS);
}

// "Lei n.º 16/2022", "Decreto-Lei n.º 24/2014", "DL 446/85", "Lei 23/96",
// "Portaria n.º 123-A/2020", "Regulamento n.º 829/2023".
const CITACAO_DIPLOMA =
  /\b(?:Decreto-Lei|Decreto|DL|Lei|Portaria|Regulamento|Diretiva|Despacho|Resolução)\s*(?:n\.?\s*[ºo°.]?\s*)?(\d{1,5}(?:-[A-Z])?\/\d{2,4}(?:\/[A-Z]{2,4})?)/giu;

function numerosCitados(texto: string) {
  return [...texto.matchAll(CITACAO_DIPLOMA)].map((m) => m[1].toUpperCase());
}

// Palavra inteira com letras acentuadas (o \b do JavaScript só conhece ASCII).
const palavra = (alternativas: string) => new RegExp(`(?<![\\p{L}-])(?:${alternativas})(?![\\p{L}-])`, "iu");

// Expressões que concluem responsabilidade jurídica de terceiro ou não são
// português europeu: não recusam, mas são assinaladas à DoLado.
const EXPRESSOES_A_REVER: { padrao: RegExp; aviso: string }[] = [
  { padrao: palavra("violou|violaram|violando|violação|violações"), aviso: "O texto fala em violação — confirmar que não conclui responsabilidade jurídica da empresa." },
  { padrao: palavra("ilegal|ilegais|ilegalmente"), aviso: "O texto usa “ilegal” — descrever o facto e citar a norma, sem concluir." },
  { padrao: palavra("m[áa]-f[ée]"), aviso: "O texto fala em má-fé — rever." },
  { padrao: palavra("fraude|burla|abusiv[oa]s?"), aviso: "O texto usa linguagem acusatória (fraude/burla/abusivo) — rever." },
  { padrao: palavra("você|vocês|celular|cadastro|tela"), aviso: "O texto parece ter construções do português do Brasil — rever." },
  { padrao: palavra("emails?"), aviso: "Escrever “e-mail”, com hífen." },
];

export function validarResposta(bruto: unknown, regrasEnviadas: Pick<RegraEnviada, "rule_id" | "diploma" | "artigo">[]): ResultadoValidacao {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return { ok: false, motivo: "resposta_invalida" };
  const r = bruto as Record<string, unknown>;

  if (typeof r.draft !== "string") return { ok: false, motivo: "resposta_invalida", detalhe: "draft" };
  const draft = r.draft.replace(/\r\n/g, "\n").trim();
  if (draft.length < MIN_TEXTO) return { ok: false, motivo: "texto_vazio" };
  if (draft.length > MAX_TEXTO) return { ok: false, motivo: "texto_longo" };

  const missing = listaDeTextos(r.missing_information);
  const warnings = listaDeTextos(r.warnings);
  if (!missing || !warnings) return { ok: false, motivo: "resposta_invalida", detalhe: "listas" };
  if (r.confidence !== "high" && r.confidence !== "medium" && r.confidence !== "low") {
    return { ok: false, motivo: "resposta_invalida", detalhe: "confidence" };
  }
  if (!Array.isArray(r.legal_basis)) return { ok: false, motivo: "resposta_invalida", detalhe: "legal_basis" };

  const codigos = new Set(regrasEnviadas.map((g) => g.rule_id));
  const vistos = new Set<string>();
  const legalBasis: RespostaRascunho["legal_basis"] = [];
  for (const item of r.legal_basis) {
    if (!item || typeof item !== "object") return { ok: false, motivo: "resposta_invalida", detalhe: "legal_basis" };
    const { rule_id: ruleId, reason } = item as Record<string, unknown>;
    if (typeof ruleId !== "string" || typeof reason !== "string") return { ok: false, motivo: "resposta_invalida", detalhe: "legal_basis" };
    if (!codigos.has(ruleId)) return { ok: false, motivo: "regra_nao_fornecida", detalhe: ruleId.slice(0, 60) };
    if (vistos.has(ruleId)) continue;
    vistos.add(ruleId);
    legalBasis.push({ rule_id: ruleId, reason: reason.trim().slice(0, MAX_ITEM) });
  }

  // Diplomas citados no texto têm de estar nas regras enviadas.
  const fontes = regrasEnviadas.map((g) => `${g.diploma} ${g.artigo ?? ""}`.toUpperCase()).join(" | ");
  const desconhecidos = numerosCitados(draft).filter((n) => !fontes.includes(n));
  if (desconhecidos.length) {
    return { ok: false, motivo: "legislacao_nao_fornecida", detalhe: [...new Set(desconhecidos)].join(", ").slice(0, 200) };
  }

  const serverWarnings: string[] = [];
  for (const { padrao, aviso } of EXPRESSOES_A_REVER) if (padrao.test(draft)) serverWarnings.push(aviso);
  if (regrasEnviadas.length === 0) {
    serverWarnings.push("Não havia regras jurídicas aplicáveis na base da DoLado para este caso: o texto não tem fundamentação legal.");
  } else if (legalBasis.length === 0) {
    serverWarnings.push("A sugestão não usou nenhuma das regras jurídicas enviadas.");
  }
  const marcadores = MARCADORES.filter((m) => draft.includes(m));
  if (marcadores.length) serverWarnings.push(`Preencher antes de enviar ao cliente: ${marcadores.join(", ")}.`);

  return {
    ok: true,
    resposta: {
      draft,
      legal_basis: legalBasis,
      missing_information: missing,
      warnings,
      confidence: r.confidence,
      server_warnings: serverWarnings,
    },
  };
}
