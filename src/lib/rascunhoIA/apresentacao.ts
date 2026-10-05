// DoLado — textos do backoffice para a sugestão do texto pela IA (sem I/O).
// Só uso interno: nada disto é mostrado ao cliente.

export const ROTULO_SUGESTAO_POR_REVER = "Sugestão IA · Por rever";
export const ROTULO_SUGESTAO_REVISTA = "Sugestão IA · Revista";

/** Geração "a gerar" há mais tempo do que isto é tratada como interrompida. */
export const LIMITE_GERACAO_MS = 5 * 60 * 1000;

export const MOTIVOS_FALHA: Record<string, string> = {
  api_nao_configurada: "A Claude API não está configurada neste ambiente.",
  erro_api: "A Claude API não respondeu (indisponível ou tempo esgotado).",
  recusa: "O modelo recusou responder a este pedido.",
  resposta_invalida: "A resposta da IA não tinha o formato esperado.",
  texto_vazio: "A resposta da IA não trazia um texto utilizável.",
  texto_longo: "O texto sugerido era demasiado longo.",
  regra_nao_fornecida: "A resposta indicava uma regra jurídica que não foi fornecida pela DoLado — recusada.",
  legislacao_nao_fornecida: "O texto citava legislação que não está na base jurídica da DoLado — recusado.",
  orcamento_atingido: "O orçamento da Claude API foi atingido.",
  interrompido: "A geração foi interrompida antes de terminar.",
  caso_inexistente: "O caso não foi encontrado.",
  erro_interno: "Erro inesperado ao gerar a sugestão.",
};

export function motivoFalha(motivo: string | null | undefined) {
  return (motivo && MOTIVOS_FALHA[motivo]) || "Motivo desconhecido.";
}

export const CONFIANCA: Record<string, string> = {
  high: "alta",
  medium: "média",
  low: "baixa",
};

export const MENSAGENS_APLICAR: Record<string, string> = {
  aplicado: "Sugestão colocada no texto do caso, por rever.",
  requer_confirmacao: "O texto atual foi editado: confirme que quer substituí-lo (fica guardado como versão anterior).",
  bloqueado: "O texto atual já foi enviado ao cliente: a sugestão fica só para consulta. Para a usar, crie uma nova versão.",
  ja_aplicado: "Esta sugestão já está no texto do caso.",
  invalido: "Não foi possível usar esta sugestão.",
};
