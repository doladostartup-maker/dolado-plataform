// Estado do caso em linguagem humana (portal do cliente). As regras (tom,
// "requer ação", que estado ganha) estão em src/lib/portal/estadoCaso.ts;
// aqui só os textos. O backoffice mostra sempre o português.

const NADA_A_FAZER = "Não precisa de fazer nada neste momento.";

export const estadoCaso = {
  porStatus: {
    Novo: {
      rotulo: "Caso recebido",
      explicacao: "Recebemos o seu caso. A DoLado vai analisar a situação e os documentos que enviou.",
      proximoPasso: "Análise do caso pela DoLado.",
    },
    "Em investigação": {
      rotulo: "Em análise",
      explicacao: "A DoLado está a analisar o seu caso e a preparar o próximo passo.",
      proximoPasso: "Preparação do texto da reclamação, que lhe mostramos antes de qualquer envio.",
    },
    "Aguardando operador": {
      rotulo: "A aguardar resposta da empresa",
      explicacao: "A sua reclamação foi enviada. Estamos a aguardar a resposta da empresa.",
      proximoPasso: `${NADA_A_FAZER} Quando a empresa responder, analisamos a resposta e damos-lhe notícias.`,
    },
    "Resposta em análise": {
      rotulo: "Resposta recebida — em análise pela DoLado",
      explicacao:
        "Recebemos uma comunicação relacionada com a sua reclamação. Estamos a analisá-la e entraremos em contacto consigo caso seja necessária alguma ação.",
      proximoPasso: NADA_A_FAZER,
    },
    "Aguardando cliente": {
      rotulo: "Precisamos de informação sua",
      explicacao: "Para continuarmos a tratar o seu caso, precisamos de informação ou documentos seus.",
      proximoPasso: "Envie-nos a informação pedida. Indicamos abaixo exatamente o que precisamos.",
    },
    "Aguardando decisão cliente": {
      rotulo: "A empresa apresentou uma solução",
      explicacao: "A empresa apresentou uma solução para o seu caso. Diga-nos se o problema ficou resolvido.",
      proximoPasso: "A sua confirmação. Só damos o caso por resolvido quando nos confirmar.",
    },
    Resolvido: {
      rotulo: "Resolvido",
      explicacao: "O problema ficou resolvido. O caso está concluído.",
      proximoPasso: "",
    },
    Bloqueado: {
      rotulo: "Próximo passo indicado",
      explicacao: "A DoLado indicou-lhe o próximo passo possível para continuar a tratar a situação.",
      proximoPasso: "Veja abaixo o próximo passo indicado pela DoLado.",
    },
    "Encerrado sem resolução": {
      rotulo: "Encerrado",
      explicacao: "O caso foi encerrado sem que a empresa tenha resolvido a situação.",
      proximoPasso: "",
    },
    "Encerrado com encaminhamento externo": {
      rotulo: "Encerrado na DoLado",
      explicacao: "A DoLado terminou o acompanhamento deste caso. Isto não significa necessariamente que o problema esteja resolvido.",
      proximoPasso: "",
    },
  },
  desconhecido: {
    rotulo: "Em acompanhamento",
    explicacao: "A DoLado está a acompanhar o seu caso.",
  },
  novaComunicacao: {
    explicacao: "A DoLado está a preparar uma nova comunicação à empresa, com base na resposta recebida.",
    proximoPasso: "Mostramos-lhe o texto antes de qualquer envio. Nada é enviado sem a sua autorização.",
  },
  analiseSemResposta: {
    rotulo: "Em análise pela DoLado",
    explicacao:
      "Estamos a analisar a situação do seu caso para definir o próximo passo. Entraremos em contacto consigo se for necessária alguma ação.",
  },
  textoAguarda: {
    rotulo: "Precisamos da sua autorização",
    explicacaoNova: "Preparámos uma nova comunicação à empresa. Reveja-a e autorize o envio, ou peça alterações.",
    explicacao: "Preparámos o texto da reclamação. Reveja-o e autorize o envio, ou peça alterações.",
    proximoPasso: "A sua autorização do texto. Nada é enviado sem ela.",
  },
  textoAlteracoes: {
    rotulo: "A rever o texto",
    explicacao: "Recebemos o seu pedido de alterações. A DoLado está a preparar uma nova versão do texto.",
    proximoPasso: "Nova versão do texto para a sua revisão.",
  },
  textoAutorizado: {
    rotulo: "Envio autorizado",
    explicacaoNova: "Autorizou o envio. A DoLado vai enviar a nova comunicação à empresa em seu nome.",
    explicacao: "Autorizou o envio. A DoLado vai apresentar a reclamação em seu nome.",
    proximoPassoNova: "Envio da nova comunicação.",
    proximoPasso: "Envio da reclamação e registo do comprovativo.",
  },
  eventos: {
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
  },
  eventoDesconhecido: "Atualização do caso",
  cronologia: {
    reclamacaoEnviada: "Reclamação enviada",
    novaEnviada: "Nova comunicação enviada à empresa",
    referencia: (ref: string) => `Referência: ${ref}`,
    novaPreparada: "Nova comunicação preparada",
    novaRevisao: "Nova comunicação enviada para a sua revisão",
    encerradoDolado: "Encerrado na DoLado",
    encerradoDetalhe: "O acompanhamento terminou; existem opções externas para continuar",
    novoDossie: "Nova versão do dossiê do caso preparada",
  },
};
