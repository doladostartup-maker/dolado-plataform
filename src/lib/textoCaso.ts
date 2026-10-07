// Texto preparado para envio ao terceiro: configuração e textos da
// interface. Sem efeitos nem imports de runtime — usado no browser, no
// servidor e nos testes. As regras (versões, autorização, envio) vivem na
// base de dados: supabase/migrations/20261001180000_textos_caso_revisao_autorizacao.sql.

/** Validade dos links de revisão enviados por e-mail. */
export const VALIDADE_LINKS_REVISAO_DIAS = 14;

/** Tamanho máximo do pedido de alterações (igual ao limite da base de dados). */
export const MAX_PEDIDO_ALTERACOES = 5000;

export const ROTAS_TEXTO = {
  rever: (token: string) => `/texto/rever/${token}`,
  alterar: (token: string) => `/texto/alterar/${token}`,
} as const;

export type EstadoTexto =
  | "rascunho"
  | "aguardando_aprovacao"
  | "alteracoes_solicitadas"
  | "autorizado"
  | "enviado"
  | "substituido";

/** Estado visto pelo cliente (o cliente nunca vê rascunhos). */
export const ESTADO_TEXTO_CLIENTE: Record<EstadoTexto, string> = {
  rascunho: "Texto em preparação",
  aguardando_aprovacao: "A aguardar a sua aprovação",
  alteracoes_solicitadas: "Alterações solicitadas",
  autorizado: "Texto autorizado",
  enviado: "Enviado",
  substituido: "Versão substituída",
};

/** Estado visto pela equipa. */
export const ESTADO_TEXTO_EQUIPA: Record<EstadoTexto, string> = {
  rascunho: "Texto em preparação",
  aguardando_aprovacao: "A aguardar aprovação do texto",
  alteracoes_solicitadas: "Alterações solicitadas",
  autorizado: "Texto autorizado",
  enviado: "Enviado",
  substituido: "Substituída por versão mais recente",
};

export const EVENTOS_CASO: Record<string, string> = {
  texto_preparado: "Texto preparado",
  nova_versao: "Nova versão preparada",
  texto_enviado_revisao: "Texto enviado para revisão",
  links_reemitidos: "Novo link de revisão enviado",
  alteracoes_pedidas: "Cliente pediu alterações",
  texto_autorizado: "Cliente autorizou o envio",
  comunicacao_enviada: "Reclamação enviada",
  comprovativo_disponivel: "Comprovativo de submissão disponível",
  dossie_disponivel: "Dossiê final disponível",
  aguarda_resposta_empresa: "A aguardar resposta da empresa",
  comunicacao_recebida: "Comunicação recebida",
  em_analise_dolado: "Em análise pela DoLado",
  analise_concluida: "Análise concluída pela DoLado",
  solucao_apresentada: "Solução apresentada ao cliente",
  cliente_confirmou_resolucao: "Resolução confirmada",
  cliente_rejeitou_resolucao: "Resolução não confirmada",
  pedido_informacao_cliente: "Informação pedida ao cliente",
  informacao_cliente_enviada: "Cliente enviou a informação pedida",
  encaminhamento_registado: "Encaminhamento registado",
  caso_encerrado: "Caso encerrado sem resolução",
  dossie_gerado: "Dossiê do caso gerado",
};

/** Eventos só da cronologia interna (o cliente não os vê). */
export const EVENTOS_CASO_INTERNOS: Record<string, string> = {
  mensagem_sem_acao: "Mensagem marcada sem ação",
  estado_corrigido: "Estado corrigido manualmente",
};

// ---------------------------------------------------------------------------
// Comprovativo de submissão (pós-envio)

export const BUCKET_COMPROVATIVOS = "comprovativos-casos";
export const COMPROVATIVO_MAX_BYTES = 20 * 1024 * 1024;
export const COMPROVATIVO_TIPOS_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Validade das URLs assinadas para abrir/descarregar um comprovativo. */
export const COMPROVATIVO_URL_SEGUNDOS = 60;

export type TipoComprovativo = "ficheiro" | "identificador" | "sem_comprovativo" | "erro_obtencao";

export const TIPOS_COMPROVATIVO_EQUIPA: Record<TipoComprovativo, string> = {
  ficheiro: "Ficheiro do comprovativo (PDF ou imagem)",
  identificador: "Só o número/identificador da submissão",
  sem_comprovativo: "Envio sem comprovativo (o canal não emite)",
  erro_obtencao: "Erro ao obter o comprovativo",
};

export function ehTipoComprovativo(v: unknown): v is TipoComprovativo {
  return typeof v === "string" && v in TIPOS_COMPROVATIVO_EQUIPA;
}

/** Mensagem para o cliente quando não há ficheiro nem identificador a mostrar. */
export function mensagemComprovativoCliente(tipo: TipoComprovativo | null) {
  if (tipo === "sem_comprovativo") return "Este envio não tem comprovativo de submissão.";
  // Sem registo, ou erro na obtenção: mensagem neutra, sem botões.
  return "O comprovativo de submissão será disponibilizado aqui assim que estiver disponível.";
}

/** Limite da referência da reclamação (igual à base de dados). */
export const MAX_REFERENCIA = 200;

export const CANAIS_ENVIO = {
  livro_reclamacoes_eletronico: "Livro de Reclamações Eletrónico",
  email: "E-mail",
  carta: "Carta",
  formulario_operador: "Formulário do operador",
  outro: "Outro",
} as const;
export type CanalEnvio = keyof typeof CANAIS_ENVIO;
export function ehCanalEnvio(v: unknown): v is CanalEnvio {
  return typeof v === "string" && v in CANAIS_ENVIO;
}

/** Resultados devolvidos pelas funções da base de dados. */
export type ResultadoAcaoTexto =
  | "autorizado"
  | "ja_autorizado"
  | "pedido_registado"
  | "alteracoes_pedidas"
  | "versao_antiga"
  | "expirado"
  | "link_substituido"
  | "mensagem_invalida"
  | "invalido"
  | "erro";

/** Mensagens para o cliente — sem termos técnicos. */
export const MENSAGENS_TEXTO: Record<ResultadoAcaoTexto, { titulo: string; texto: string }> = {
  autorizado: {
    titulo: "Texto autorizado",
    texto: "Obrigado. A DoLado pode agora proceder ao envio em seu nome. Vamos dar-lhe notícias em cada passo relevante.",
  },
  ja_autorizado: {
    titulo: "Texto já autorizado",
    texto: "Este texto já foi autorizado. A DoLado pode proceder ao envio em seu nome.",
  },
  pedido_registado: {
    titulo: "Pedido de alterações enviado",
    texto: "Recebemos o seu pedido. Vamos rever o texto e enviar-lhe uma nova versão para aprovação. Nada será enviado sem a sua autorização.",
  },
  alteracoes_pedidas: {
    titulo: "Já recebemos o seu pedido de alterações",
    texto: "Vamos rever o texto e enviar-lhe uma nova versão para aprovação. Nada será enviado sem a sua autorização.",
  },
  versao_antiga: {
    titulo: "Existe uma versão mais recente deste texto",
    texto: "Consulte o e-mail mais recente enviado pela DoLado ou aceda à sua área de cliente.",
  },
  expirado: {
    titulo: "Este link expirou",
    texto: "Por segurança, os links de revisão são válidos durante um período limitado. Pode pedir um novo link, que enviaremos para o e-mail associado ao caso.",
  },
  link_substituido: {
    titulo: "Este link já não está ativo",
    texto: "Enviámos-lhe entretanto um link mais recente. Consulte o e-mail mais recente enviado pela DoLado ou aceda à sua área de cliente.",
  },
  mensagem_invalida: {
    titulo: "Falta indicar as alterações",
    texto: "Descreva o que gostaria de alterar no texto.",
  },
  invalido: {
    titulo: "Link inválido",
    texto: "Este link não é válido. Confirme que copiou o endereço completo do e-mail ou aceda à sua área de cliente.",
  },
  erro: {
    titulo: "Não foi possível concluir o pedido",
    texto: "Tente novamente dentro de alguns minutos.",
  },
};

export function ehResultadoAcaoTexto(v: unknown): v is ResultadoAcaoTexto {
  return typeof v === "string" && v in MENSAGENS_TEXTO;
}

/** Formato dos tokens (32 bytes em base64url): rejeita lixo antes de ir à base de dados. */
export function tokenComFormatoValido(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}
