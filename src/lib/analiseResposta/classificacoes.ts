// Classificações e próximos passos da análise de uma comunicação recebida
// (sem I/O). Ficheiro à parte do prompt: é importado também por componentes
// do browser (backoffice), que nunca devem receber as instruções da IA.

export const CLASSIFICACOES = [
  "resposta_automatica",
  "confirmacao_rececao",
  "pedido_informacao",
  "pedido_documentos",
  "resposta_satisfatoria",
  "resposta_parcial",
  "resposta_negativa",
  "proposta_resolucao",
  "mensagem_irrelevante",
  "necessita_revisao_manual",
] as const;
export type Classificacao = (typeof CLASSIFICACOES)[number];

export const PROXIMOS_PASSOS = [
  "aguardar_nova_resposta",
  "sem_acao",
  "pedir_informacao_cliente",
  "confirmar_resolucao_com_cliente",
  "preparar_nova_resposta",
  "encaminhar_outro_meio",
  "revisao_manual",
] as const;
