// Apresentação do estado de um caso ao cliente, em linguagem humana. Só
// apresentação: os valores de casos.status e de casos_textos.estado não
// mudam, nem as regras que os alteram (backoffice e funções da base de dados).

export type TomEstado = "acao" | "curso" | "espera" | "concluido" | "neutro";

export type EstadoCasoCliente = {
  /** Rótulo curto (badge). */
  rotulo: string;
  tom: TomEstado;
  /** O que está a acontecer, numa frase. */
  explicacao: string;
  /** Próximo passo esperado. */
  proximoPasso: string | null;
  /** O cliente tem de fazer alguma coisa. */
  requerAcao: boolean;
};

const POR_STATUS: Record<string, EstadoCasoCliente> = {
  Novo: {
    rotulo: "Caso recebido",
    tom: "curso",
    explicacao: "Recebemos o seu caso. A DoLado vai analisar a situação e os documentos que enviou.",
    proximoPasso: "Análise do caso pela DoLado.",
    requerAcao: false,
  },
  "Em investigação": {
    rotulo: "Em análise",
    tom: "curso",
    explicacao: "A DoLado está a analisar o seu caso e a preparar o próximo passo.",
    proximoPasso: "Preparação do texto da reclamação, que lhe mostramos antes de qualquer envio.",
    requerAcao: false,
  },
  "Aguardando operador": {
    rotulo: "A aguardar resposta",
    tom: "espera",
    explicacao: "A reclamação foi apresentada. Estamos a aguardar a resposta da empresa.",
    proximoPasso: "Quando houver resposta, analisamos e damos-lhe notícias.",
    requerAcao: false,
  },
  "Aguardando decisão cliente": {
    rotulo: "Precisa da sua decisão",
    tom: "acao",
    explicacao: "Recebemos uma proposta para o seu caso. Precisamos de saber se a aceita.",
    proximoPasso: "A sua decisão sobre a proposta.",
    requerAcao: true,
  },
  Resolvido: {
    rotulo: "Resolvido",
    tom: "concluido",
    explicacao: "O caso foi concluído.",
    proximoPasso: null,
    requerAcao: false,
  },
  Bloqueado: {
    rotulo: "Em escalada",
    tom: "curso",
    explicacao: "O caso não ficou resolvido nesta fase. A DoLado está a avaliar os passos seguintes consigo.",
    proximoPasso: "Indicamos-lhe as opções disponíveis para continuar.",
    requerAcao: false,
  },
};

const DESCONHECIDO: EstadoCasoCliente = {
  rotulo: "Em acompanhamento",
  tom: "curso",
  explicacao: "A DoLado está a acompanhar o seu caso.",
  proximoPasso: null,
  requerAcao: false,
};

/** Estados do texto da reclamação que mudam o que o cliente vê. */
export type EstadoTextoRelevante = "aguardando_aprovacao" | "alteracoes_solicitadas" | "autorizado" | null;

/**
 * Estado apresentado: o estado do texto em curso, quando existe, diz mais ao
 * cliente do que o estado geral do caso (ex.: "Precisamos da sua
 * autorização"). Um caso concluído ou à espera de decisão mantém-se assim.
 */
export function estadoCasoCliente(status: string, textoEmCurso: EstadoTextoRelevante = null): EstadoCasoCliente {
  const base = POR_STATUS[status] ?? DESCONHECIDO;
  if (status === "Resolvido" || status === "Aguardando decisão cliente") return base;
  if (textoEmCurso === "aguardando_aprovacao") {
    return {
      rotulo: "Precisamos da sua autorização",
      tom: "acao",
      explicacao: "Preparámos o texto da reclamação. Reveja-o e autorize o envio, ou peça alterações.",
      proximoPasso: "A sua autorização do texto. Nada é enviado sem ela.",
      requerAcao: true,
    };
  }
  if (textoEmCurso === "alteracoes_solicitadas") {
    return {
      rotulo: "A rever o texto",
      tom: "curso",
      explicacao: "Recebemos o seu pedido de alterações. A DoLado está a preparar uma nova versão do texto.",
      proximoPasso: "Nova versão do texto para a sua revisão.",
      requerAcao: false,
    };
  }
  if (textoEmCurso === "autorizado") {
    return {
      rotulo: "Envio autorizado",
      tom: "curso",
      explicacao: "Autorizou o envio. A DoLado vai apresentar a reclamação em seu nome.",
      proximoPasso: "Envio da reclamação e registo do comprovativo.",
      requerAcao: false,
    };
  }
  return base;
}

/** Acontecimentos do caso, vistos pelo cliente (casos_eventos.tipo). */
export const EVENTOS_CASO_CLIENTE: Record<string, string> = {
  texto_preparado: "Texto da reclamação preparado",
  nova_versao: "Nova versão do texto preparada",
  texto_enviado_revisao: "Texto enviado para a sua revisão",
  links_reemitidos: "Novo link de revisão enviado",
  alteracoes_pedidas: "Pediu alterações ao texto",
  texto_autorizado: "Autorizou o envio",
  comunicacao_enviada: "Reclamação enviada",
  comprovativo_disponivel: "Comprovativo de submissão disponível",
  dossie_disponivel: "Dossiê final disponível",
};

export function rotuloEventoCliente(tipo: string): string {
  return EVENTOS_CASO_CLIENTE[tipo] ?? "Atualização do caso";
}
