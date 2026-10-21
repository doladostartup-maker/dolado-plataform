// Resumos mensais no portal (/portal/contratos/resumos) — sem I/O; `npm test`.
//
// O portal mostra o resumo tal como foi enviado: a fotografia gravada em
// protecao_resumos_mensais.conteudo (imutável depois de enviada), nunca um
// resumo recalculado com os dados de hoje. A leitura é feita com a sessão do
// cliente (RLS: só os próprios resumos com estado 'enviado').
//
// O conteúdo é jsonb escrito por várias versões do modelo (resumo_v1…): esta
// leitura é defensiva — campo em falta ou com outro tipo fica vazio, e um
// resumo sem os campos essenciais não é mostrado (nunca um erro na página).

import { IDIOMAS, type Idioma } from "../../i18n/config.ts";
import type { EstadoResumo, ResumoMensal } from "./resumo.ts";

/** Parte do resumo que o portal apresenta. */
export type ResumoPortal = Pick<
  ResumoMensal,
  "mes" | "mesNome" | "estado" | "estadoTitulo" | "estadoTexto" | "introducao" | "atividade" | "alteracoes" | "semAlteracoes" | "acompanhamento" | "energia" | "proximaData"
> & { idioma: Idioma };

const ESTADOS: readonly EstadoResumo[] = ["tudo_acompanhado", "atencao", "por_confirmar", "em_verificacao", "sem_servicos"];

const texto = (v: unknown): string => (typeof v === "string" ? v : "");
const linhas = (v: unknown): string[] => (Array.isArray(v) ? v.filter((l): l is string => typeof l === "string" && l.trim() !== "") : []);

/** "2026-09" a partir do parâmetro da página; null se não for um mês válido. */
export function mesDoParametro(valor: string): string | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(valor);
  return m ? valor : null;
}

/** "2026-09-01" (protecao_resumos_mensais.mes_referencia) → "2026-09". */
export function mesDaReferencia(mesReferencia: string): string {
  return mesReferencia.slice(0, 7);
}

/** Lê o conteúdo gravado; null quando falta o essencial (estado, título ou texto). */
export function resumoDoConteudo(conteudo: unknown, mesReferencia: string): ResumoPortal | null {
  if (!conteudo || typeof conteudo !== "object" || Array.isArray(conteudo)) return null;
  const c = conteudo as Record<string, unknown>;
  const estado = ESTADOS.find((e) => e === c.estado);
  const estadoTitulo = texto(c.estadoTitulo);
  const estadoTexto = texto(c.estadoTexto);
  if (!estado || !estadoTitulo || !estadoTexto) return null;
  // Resumos antigos (resumo_v1) não guardavam o idioma: foram escritos em português.
  const idioma = IDIOMAS.find((i) => i === c.idioma) ?? "pt-PT";
  const mes = mesDaReferencia(mesReferencia);
  const semAlteracoes = texto(c.semAlteracoes);
  return {
    mes,
    mesNome: texto(c.mesNome) || mes,
    idioma,
    estado,
    estadoTitulo,
    estadoTexto,
    introducao: texto(c.introducao),
    atividade: linhas(c.atividade),
    alteracoes: linhas(c.alteracoes),
    semAlteracoes: semAlteracoes || null,
    acompanhamento: linhas(c.acompanhamento),
    energia: linhas(c.energia),
    proximaData: texto(c.proximaData),
  };
}
