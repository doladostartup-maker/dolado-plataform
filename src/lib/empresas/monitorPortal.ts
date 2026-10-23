// DoLado Empresas — textos e regras de apresentação do Monitor no portal
// (sem I/O). Fase 6A. Só em português (D1).

export const MENSAGENS_INSTALACAO = {
  criada: "Instalação criada.",
  sem_acesso: "Só é possível com a Protecção Empresas activa.",
  limite: "O plano já tem o número máximo de instalações. Contacte-nos se precisar de mais.",
  nome_invalido: "Indique o nome da instalação.",
  nome_repetido: "Já existe uma instalação com este nome.",
} as const;

export const MENSAGENS_CARREGAMENTO = {
  registado: "Documento recebido.",
  sem_acesso: "Só é possível carregar documentos com a Protecção Empresas activa.",
  instalacao_invalida: "Escolha uma instalação da sua empresa.",
  quota_esgotada: "Já usou as facturas analisadas incluídas este mês. Contacte-nos se precisar de mais.",
  configuracao_terminada: "A configuração inicial só está disponível nos primeiros 30 dias.",
  configuracao_esgotada: "Já carregou todas as facturas históricas incluídas na configuração inicial.",
  caminho_invalido: "Ficheiro inválido. Carregue o documento novamente.",
  erro: "Não foi possível concluir o pedido. Tente de novo.",
} as const;

export type EstadoDocumentoEmpresa = "a_processar" | "por_associar" | "analise_manual" | "registado" | "repetido" | "falhou";

/** O que a empresa vê de cada documento (sem detalhes técnicos). */
export function estadoDocumentoEmpresa(d: {
  etapa: string | null;
  estado: string;
  contrato_id: string | null;
  associacao_estado: string | null;
}): EstadoDocumentoEmpresa {
  if (d.etapa === "repetido") return "repetido";
  if (d.etapa === "falhou") return "falhou";
  if (d.etapa && !["concluido", "repetido", "falhou"].includes(d.etapa)) return "a_processar";
  if (!d.contrato_id && (d.associacao_estado === "possivel" || d.associacao_estado === "conflito")) return "por_associar";
  if (d.contrato_id) return "registado";
  return d.estado === "pendente" && d.etapa === "concluido" ? "analise_manual" : d.estado === "processado" ? "registado" : "analise_manual";
}

export const TEXTO_ESTADO_DOCUMENTO: Record<EstadoDocumentoEmpresa, string> = {
  a_processar: "Em análise",
  por_associar: "Precisa da sua confirmação",
  analise_manual: "Em análise pela DoLado",
  registado: "Registado",
  repetido: "Já estava registado",
  falhou: "Não foi possível concluir a análise",
};

export const QUOTA_TEXTO = {
  reservada: "conta para a quota",
  consumida: "conta para a quota",
  libertada: "não conta para a quota",
  nao_conta: "não conta para a quota",
} as const;
