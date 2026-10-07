// Apresentação do estado de um caso ao cliente, em linguagem humana. Só
// apresentação: os valores de casos.status e de casos_textos.estado não
// mudam, nem as regras que os alteram (funções da base de dados).

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

const NADA_A_FAZER = "Não precisa de fazer nada neste momento.";

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
    rotulo: "A aguardar resposta da empresa",
    tom: "espera",
    explicacao: "A sua reclamação foi enviada. Estamos a aguardar a resposta da empresa.",
    proximoPasso: `${NADA_A_FAZER} Quando a empresa responder, analisamos a resposta e damos-lhe notícias.`,
    requerAcao: false,
  },
  "Resposta em análise": {
    rotulo: "Resposta recebida — em análise pela DoLado",
    tom: "curso",
    explicacao:
      "Recebemos uma comunicação relacionada com a sua reclamação. Estamos a analisá-la e entraremos em contacto consigo caso seja necessária alguma ação.",
    proximoPasso: NADA_A_FAZER,
    requerAcao: false,
  },
  "Aguardando cliente": {
    rotulo: "Precisamos de informação sua",
    tom: "acao",
    explicacao: "Para continuarmos a tratar o seu caso, precisamos de informação ou documentos seus.",
    proximoPasso: "Envie-nos a informação pedida. Indicamos abaixo exatamente o que precisamos.",
    requerAcao: true,
  },
  "Aguardando decisão cliente": {
    rotulo: "A empresa apresentou uma solução",
    tom: "acao",
    explicacao: "A empresa apresentou uma solução para o seu caso. Diga-nos se o problema ficou resolvido.",
    proximoPasso: "A sua confirmação. Só damos o caso por resolvido quando nos confirmar.",
    requerAcao: true,
  },
  Resolvido: {
    rotulo: "Resolvido",
    tom: "concluido",
    explicacao: "O problema ficou resolvido. O caso está concluído.",
    proximoPasso: null,
    requerAcao: false,
  },
  Bloqueado: {
    rotulo: "Próximo passo indicado",
    tom: "neutro",
    explicacao: "A DoLado indicou-lhe o próximo passo possível para continuar a tratar a situação.",
    proximoPasso: "Veja abaixo o próximo passo indicado pela DoLado.",
    requerAcao: false,
  },
  "Encerrado sem resolução": {
    rotulo: "Encerrado",
    tom: "neutro",
    explicacao: "O caso foi encerrado sem que a empresa tenha resolvido a situação.",
    proximoPasso: null,
    requerAcao: false,
  },
  "Encerrado com encaminhamento externo": {
    rotulo: "Encerrado na DoLado",
    tom: "neutro",
    explicacao: "A DoLado terminou o acompanhamento deste caso. Isto não significa necessariamente que o problema esteja resolvido.",
    proximoPasso: null,
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

/** Estados em que o texto em curso não muda o que o cliente vê. */
const SEM_TEXTO_EM_CURSO = [
  "Resolvido",
  "Encerrado sem resolução",
  "Encerrado com encaminhamento externo",
  "Aguardando decisão cliente",
  "Aguardando cliente",
];

/** Estados em que o acompanhamento da DoLado terminou (o caso deixa de estar "em curso" no portal). */
export const ESTADOS_TERMINADOS_CLIENTE = ["Resolvido", "Encerrado sem resolução", "Encerrado com encaminhamento externo"];

export type ContextoEstado = {
  /** Já foi enviada pelo menos uma comunicação à empresa. */
  jaEnviado?: boolean;
  /** "Resposta em análise" sem uma mensagem nova (ex.: o cliente disse que não ficou resolvido). */
  analiseSemResposta?: boolean;
};

/**
 * Estado apresentado: o estado do texto em curso, quando existe, diz mais ao
 * cliente do que o estado geral do caso (ex.: "Precisamos da sua
 * autorização"). Um caso concluído, à espera de confirmação ou de
 * informação mantém-se assim.
 */
export function estadoCasoCliente(
  status: string,
  textoEmCurso: EstadoTextoRelevante = null,
  contexto: ContextoEstado = {},
): EstadoCasoCliente {
  let base = POR_STATUS[status] ?? DESCONHECIDO;
  if (status === "Em investigação" && contexto.jaEnviado) {
    base = {
      ...base,
      explicacao: "A DoLado está a preparar uma nova comunicação à empresa, com base na resposta recebida.",
      proximoPasso: "Mostramos-lhe o texto antes de qualquer envio. Nada é enviado sem a sua autorização.",
    };
  }
  if (status === "Resposta em análise" && contexto.analiseSemResposta) {
    base = {
      ...base,
      rotulo: "Em análise pela DoLado",
      explicacao: "Estamos a analisar a situação do seu caso para definir o próximo passo. Entraremos em contacto consigo se for necessária alguma ação.",
    };
  }
  if (SEM_TEXTO_EM_CURSO.includes(status)) return base;
  const nova = contexto.jaEnviado;
  if (textoEmCurso === "aguardando_aprovacao") {
    return {
      rotulo: "Precisamos da sua autorização",
      tom: "acao",
      explicacao: nova
        ? "Preparámos uma nova comunicação à empresa. Reveja-a e autorize o envio, ou peça alterações."
        : "Preparámos o texto da reclamação. Reveja-o e autorize o envio, ou peça alterações.",
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
      explicacao: nova
        ? "Autorizou o envio. A DoLado vai enviar a nova comunicação à empresa em seu nome."
        : "Autorizou o envio. A DoLado vai apresentar a reclamação em seu nome.",
      proximoPasso: nova ? "Envio da nova comunicação." : "Envio da reclamação e registo do comprovativo.",
      requerAcao: false,
    };
  }
  return base;
}

/** Acontecimentos do caso, vistos pelo cliente (casos_eventos.tipo; só os visíveis). */
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
  aguarda_resposta_empresa: "A aguardar resposta da empresa",
  comunicacao_recebida: "Comunicação recebida da empresa",
  em_analise_dolado: "Em análise pela DoLado",
  analise_concluida: "A DoLado concluiu a análise",
  solucao_apresentada: "A empresa apresentou uma solução",
  cliente_confirmou_resolucao: "Confirmou que o problema ficou resolvido",
  cliente_rejeitou_resolucao: "Indicou que o problema não ficou resolvido",
  pedido_informacao_cliente: "Pedimos-lhe informação",
  informacao_cliente_enviada: "Enviou a informação pedida",
  encaminhamento_registado: "Próximo passo indicado",
  caso_encerrado: "Caso encerrado",
  dossie_gerado: "Dossiê do caso preparado",
};

export function rotuloEventoCliente(tipo: string): string {
  return EVENTOS_CASO_CLIENTE[tipo] ?? "Atualização do caso";
}

export type EventoCliente = {
  tipo: string;
  created_at: string;
  texto_id?: string | null;
  dados?: { rotulo?: string; modo?: string; versao?: number } | null;
};
export type ItemCronologia = { titulo: string; quando: string; detalhe?: string };

/**
 * Cronologia vista pelo cliente: rótulos humanos, com a diferença entre a
 * reclamação e as comunicações seguintes, e a referência de cada envio. Sem
 * dados técnicos (ids, endereços, análise interna).
 */
export function cronologiaCliente(eventos: EventoCliente[], referencias: Map<string, string | null> = new Map()): ItemCronologia[] {
  let envios = 0;
  return eventos.map((e) => {
    const depoisDoEnvio = envios > 0;
    let titulo = rotuloEventoCliente(e.tipo);
    let detalhe: string | undefined;
    if (e.tipo === "comunicacao_enviada") {
      titulo = envios === 0 ? "Reclamação enviada" : "Nova comunicação enviada à empresa";
      envios += 1;
      const ref = e.texto_id ? referencias.get(e.texto_id) : null;
      if (ref) detalhe = `Referência: ${ref}`;
    } else if (depoisDoEnvio && (e.tipo === "texto_preparado" || e.tipo === "nova_versao")) {
      titulo = "Nova comunicação preparada";
    } else if (depoisDoEnvio && e.tipo === "texto_enviado_revisao") {
      titulo = "Nova comunicação enviada para a sua revisão";
    } else if (e.tipo === "encaminhamento_registado" && e.dados?.rotulo) {
      detalhe = e.dados.rotulo;
    } else if (e.tipo === "caso_encerrado" && e.dados?.modo === "encaminhamento_externo") {
      titulo = "Encerrado na DoLado";
      detalhe = "O acompanhamento terminou; existem opções externas para continuar";
    } else if (e.tipo === "dossie_gerado" && (e.dados?.versao ?? 1) > 1) {
      titulo = "Nova versão do dossiê do caso preparada";
    }
    return { titulo, quando: e.created_at, detalhe };
  });
}
