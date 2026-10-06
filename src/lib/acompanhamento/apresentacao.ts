// Acompanhamento depois do envio — textos e listas do backoffice (sem I/O;
// `npm test`). As regras (estados, transições) estão na base de dados:
// supabase/migrations/20261006100000_acompanhamento_pos_envio.sql.

import { CLASSIFICACOES, type Classificacao } from "../analiseResposta/classificacoes.ts";

export const CANAIS_RECEBIDA = {
  email: "E-mail (outro endereço)",
  carta: "Carta",
  telefone: "Telefone",
  livro_reclamacoes: "Livro de Reclamações",
  outro: "Outro",
} as const;

export const ROTULO_CANAL_RECEBIDA: Record<string, string> = { ...CANAIS_RECEBIDA, email: "E-mail" };

export const CLASSIFICACAO_ROTULO: Record<Classificacao, string> = {
  resposta_automatica: "Resposta automática",
  confirmacao_rececao: "Confirmação de receção",
  pedido_informacao: "Pedido de informação",
  pedido_documentos: "Pedido de documentos",
  resposta_satisfatoria: "Resposta satisfatória",
  resposta_parcial: "Resposta parcial",
  resposta_negativa: "Resposta negativa",
  proposta_resolucao: "Proposta de resolução",
  mensagem_irrelevante: "Mensagem irrelevante",
  necessita_revisao_manual: "Necessita de revisão manual",
};

export function ehClassificacao(v: unknown): v is Classificacao {
  return typeof v === "string" && (CLASSIFICACOES as readonly string[]).includes(v);
}

export type Decisao = "mensagem_sem_acao" | "resolucao_proposta" | "preparar_nova_resposta" | "pedir_informacao_cliente" | "encaminhar";

/** As ações depois da análise (A–E), pela ordem em que aparecem. */
export const DECISOES: Record<Decisao, { letra: string; rotulo: string; descricao: string; confirmacao: string; exigeComunicacao?: boolean }> = {
  resolucao_proposta: {
    letra: "A",
    rotulo: "Resposta satisfatória / potencialmente resolvido",
    descricao: "O cliente vê a solução e confirma se o problema ficou resolvido. Nunca fecha sozinho.",
    confirmacao: "Solução apresentada ao cliente. O caso aguarda a confirmação dele.",
  },
  preparar_nova_resposta: {
    letra: "B",
    rotulo: "Resposta insuficiente ou negativa — preparar nova resposta",
    descricao: "O caso volta à preparação: nova versão do texto, revisão e autorização do cliente antes de qualquer envio.",
    confirmacao: "Decisão registada. Prepare a nova comunicação em “Reclamação”.",
  },
  pedir_informacao_cliente: {
    letra: "C",
    rotulo: "Pedir informação ou documentos ao cliente",
    descricao: "O cliente vê exatamente o que é pedido e responde no portal.",
    confirmacao: "Pedido enviado ao cliente. O caso aguarda a resposta dele.",
  },
  encaminhar: {
    letra: "D",
    rotulo: "Encaminhar para outro meio ou encerrar",
    descricao: "Regulador, centro de arbitragem, julgado de paz, outro meio ou encerramento sem resolução.",
    confirmacao: "Encaminhamento registado.",
  },
  mensagem_sem_acao: {
    letra: "E",
    rotulo: "Mensagem sem ação (automática, confirmação, spam)",
    descricao: "A mensagem fica guardada; o caso volta a “A aguardar resposta da empresa”, se foi esta mensagem que o pôs em análise.",
    confirmacao: "Mensagem marcada sem ação.",
    exigeComunicacao: true,
  },
};

export function ehDecisao(v: unknown): v is Decisao {
  return typeof v === "string" && v in DECISOES;
}

export const MENSAGENS_DECISAO: Record<string, string> = {
  invalido: "Pedido inválido.",
  comunicacao_invalida: "Esta ação precisa de uma comunicação deste caso.",
  ja_analisada: "Esta comunicação já foi analisada.",
  falta_mensagem_cliente: "Escreva a explicação da solução para o cliente.",
  falta_pedido: "Indique o que é pedido ao cliente.",
  encaminhamento_invalido: "Escolha o tipo de encaminhamento.",
  transicao_invalida: "Esta decisão não é possível no estado atual do caso.",
};

export const ESTADO_ANALISE: Record<string, { rotulo: string; tom: "acao" | "sucesso" | "neutro" }> = {
  por_analisar: { rotulo: "Por analisar", tom: "acao" },
  analisada: { rotulo: "Analisada", tom: "sucesso" },
  sem_acao: { rotulo: "Sem ação", tom: "neutro" },
};

export const PROXIMO_PASSO_ROTULO: Record<string, string> = {
  aguardar_nova_resposta: "Aguardar nova resposta",
  sem_acao: "Sem ação",
  pedir_informacao_cliente: "Pedir informação ao cliente",
  confirmar_resolucao_com_cliente: "Confirmar a resolução com o cliente",
  preparar_nova_resposta: "Preparar nova resposta à empresa",
  encaminhar_outro_meio: "Encaminhar para outro meio",
  revisao_manual: "Revisão manual",
};

/** Sugestão da IA → decisão pré-selecionada no formulário (a pessoa confirma ou muda). */
export const DECISAO_SUGERIDA: Record<string, Decisao | null> = {
  aguardar_nova_resposta: "mensagem_sem_acao",
  sem_acao: "mensagem_sem_acao",
  pedir_informacao_cliente: "pedir_informacao_cliente",
  confirmar_resolucao_com_cliente: "resolucao_proposta",
  preparar_nova_resposta: "preparar_nova_resposta",
  encaminhar_outro_meio: "encaminhar",
  revisao_manual: null,
};

export const RESPONDEU_ROTULO: Record<string, string> = {
  sim: "Sim",
  parcialmente: "Parcialmente",
  nao: "Não",
  nao_aplicavel: "Não se aplica",
};

export const MOTIVOS_FALHA_ANALISE: Record<string, string> = {
  api_nao_configurada: "A Claude API não está configurada neste ambiente.",
  erro_api: "A Claude API não respondeu (indisponível ou tempo esgotado).",
  recusa: "O modelo recusou responder a este pedido.",
  resposta_invalida: "A resposta da IA não tinha o formato esperado.",
  regra_nao_fornecida: "A análise referia uma regra jurídica que não está na base da DoLado — recusada.",
  orcamento_atingido: "O orçamento da Claude API foi atingido.",
  interrompido: "A análise foi interrompida antes de terminar.",
  comunicacao_inexistente: "A comunicação não foi encontrada.",
  erro_interno: "Erro inesperado ao gerar a análise.",
};

/** Dias corridos desde uma data (para "há N dias"). */
export function diasDesde(iso: string | null | undefined, agora: Date = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((agora.getTime() - t) / 864e5));
}
