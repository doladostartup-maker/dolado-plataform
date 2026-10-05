// DoLado — etapas da leitura de um documento do Monitor (sem I/O; `npm test`).
//
// O upload só grava o documento; a leitura corre a seguir no servidor e
// regista a etapa real em documentos_monitor.etapa. O browser lê essa
// coluna (RLS) e mostra as etapas — nunca uma percentagem inventada.

export type EtapaDocumento = "recebido" | "a_verificar" | "a_ler" | "a_registar" | "concluido" | "falhou" | "repetido";

export const ETAPAS_EM_CURSO: EtapaDocumento[] = ["recebido", "a_verificar", "a_ler", "a_registar"];

/** Etapas mostradas ao cliente, pela ordem real do processamento. */
export const PASSOS = [
  { etapa: "recebido", texto: "Ficheiro recebido" },
  { etapa: "a_verificar", texto: "A verificar o ficheiro" },
  { etapa: "a_ler", texto: "A identificar datas, preços e condições" },
  { etapa: "a_registar", texto: "A preparar o resumo" },
] as const;

// Uma leitura normal demora menos de 30 s; a chamada à Claude API tem um
// limite de ~100 s no total (src/lib/monitor/claudeDocumentos.ts). Sem
// avanço há mais de 3 minutos, o processo parou (ex.: reinício do servidor)
// e o cliente pode tentar de novo.
export const LIMITE_SEM_AVANCO_MS = 3 * 60 * 1000;

export function emCurso(etapa: string | null | undefined): boolean {
  return ETAPAS_EM_CURSO.includes(etapa as EtapaDocumento);
}

export function parado(etapa: string | null | undefined, atualizadaEm: string | null | undefined, agoraMs: number): boolean {
  if (!emCurso(etapa)) return false;
  if (!atualizadaEm) return true;
  return agoraMs - new Date(atualizadaEm).getTime() > LIMITE_SEM_AVANCO_MS;
}

/** Índice do passo atual (0–3); os anteriores estão concluídos. */
export function indicePasso(etapa: string | null | undefined): number {
  const i = PASSOS.findIndex((p) => p.etapa === etapa);
  return i < 0 ? PASSOS.length : i;
}

export type SituacaoDocumento =
  | { tipo: "em_curso"; passo: number }
  | { tipo: "pronto"; contratoId: string | null; estado: string }
  | { tipo: "repetido"; contratoId: string | null }
  /** Lido, mas não confirmámos a que serviço pertence: o cliente decide. */
  | { tipo: "por_associar" }
  | { tipo: "nao_concluido"; podeRepetir: boolean };

/**
 * O que mostrar ao cliente. "nao_concluido" cobre falhas técnicas (API em
 * baixo, limite de tempo, servidor reiniciado): o documento fica guardado e
 * a DoLado verifica-o à mão; quando a falha é transitória, o cliente pode
 * tentar de novo. Sem chave ou com o orçamento esgotado não vale a pena
 * repetir (regra 3 do "Uso de IA": nunca bloquear o cliente).
 */
export function situacaoDocumento(
  doc: {
    etapa: string | null;
    etapa_atualizada_em: string | null;
    estado: string;
    contrato_id: string | null;
    associacao_estado?: string | null;
    motivo?: string | null;
  },
  agoraMs: number,
): SituacaoDocumento {
  if (doc.etapa === "repetido") return { tipo: "repetido", contratoId: doc.contrato_id };
  if (parado(doc.etapa, doc.etapa_atualizada_em, agoraMs)) return { tipo: "nao_concluido", podeRepetir: true };
  if (emCurso(doc.etapa)) return { tipo: "em_curso", passo: indicePasso(doc.etapa) };
  if (doc.etapa === "falhou") return { tipo: "nao_concluido", podeRepetir: doc.estado === "pendente" };
  if (!doc.contrato_id && (doc.associacao_estado === "possivel" || doc.associacao_estado === "conflito")) return { tipo: "por_associar" };
  return { tipo: "pronto", contratoId: doc.contrato_id, estado: doc.estado };
}

/** Falhas transitórias, em que tentar de novo pode resultar. */
export function falhaTransitoria(motivo: string | null | undefined) {
  return motivo === "erro_api" || motivo === "erro_inesperado" || motivo === "ficheiro_nao_encontrado";
}

/** Etapa final depois de uma leitura (segundo plano ou "Ler de novo" no backoffice). */
export function etapaDepoisDaLeitura(r: { estado: string; motivo?: string | null; repetido?: boolean }): EtapaDocumento {
  if (r.repetido) return "repetido";
  return r.estado === "pendente" && falhaTransitoria(r.motivo) ? "falhou" : "concluido";
}

// ---------------------------------------------------------------------------
// Backoffice: o que cada documento pede à DoLado
// ---------------------------------------------------------------------------
// "estado" diz o resultado da leitura; "etapa" diz onde o processamento está.
// Um documento "pendente" pode estar só à espera da leitura automática (sem
// ação possível), ter falhado ou precisar de tratamento à mão — o backoffice
// separa estes casos em vez de os mostrar todos como "por processar".

export type SituacaoAdmin =
  /** Leitura automática a decorrer: nada a fazer (ainda). */
  | "em_leitura"
  /** Sem avanço há mais de LIMITE_SEM_AVANCO_MS (ex.: servidor reiniciado). */
  | "leitura_parada"
  /** Falha na leitura (API, ficheiro, erro inesperado). */
  | "falhou"
  /** Leitura terminada sem resultado (sem chave, orçamento): tratar à mão. */
  | "por_processar"
  /** Lido, com campos a verificar pela DoLado. */
  | "por_rever";

export const ROTULO_SITUACAO_ADMIN: Record<SituacaoAdmin, string> = {
  em_leitura: "Em leitura automática",
  leitura_parada: "Leitura parada",
  falhou: "Falhou a leitura",
  por_processar: "Por processar à mão",
  por_rever: "Por rever",
};

/** Situações que pedem uma ação da DoLado (as restantes resolvem-se sozinhas). */
export const SITUACOES_ADMIN_COM_ACAO: SituacaoAdmin[] = ["leitura_parada", "falhou", "por_processar", "por_rever"];

/**
 * null = o documento não conta no backoffice: lido sem nada a rever,
 * ilegível, ou repetido (o ficheiro já foi apagado e a linha só existe até o
 * cliente ver o aviso).
 */
export function situacaoDocumentoAdmin(
  doc: { estado: string; etapa: string | null; etapa_atualizada_em: string | null },
  agoraMs: number,
): SituacaoAdmin | null {
  if (doc.etapa === "repetido") return null;
  if (doc.estado === "a_rever") return "por_rever";
  if (doc.estado !== "pendente") return null;
  if (parado(doc.etapa, doc.etapa_atualizada_em, agoraMs)) return "leitura_parada";
  if (emCurso(doc.etapa)) return "em_leitura";
  if (doc.etapa === "falhou") return "falhou";
  return "por_processar";
}
