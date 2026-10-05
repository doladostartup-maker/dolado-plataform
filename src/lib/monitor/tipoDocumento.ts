// DoLado — tipo de um documento do Monitor (fatura / contrato).
//
// O tipo decide o pipeline de leitura (servidor.ts → processarDocumento).
// Começa como o tipo escolhido pelo cliente (documentos_monitor.tipo_indicado,
// imutável) e só muda por decisão da DoLado na revisão do backoffice
// (monitor_documento_alterar_tipo, com auditoria). A leitura também diz que
// tipo de documento viu (tipo_documento no schema): isso é só uma sugestão
// para o revisor, nunca altera o tipo sozinho.

export const TIPOS_DOCUMENTO = ["fatura", "contrato"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ROTULO_TIPO_DOCUMENTO: Record<string, string> = {
  fatura: "Fatura",
  contrato: "Contrato",
  desconhecido: "Desconhecido",
};

const COM_ARTIGO: Record<TipoDocumento, string> = { fatura: "uma fatura", contrato: "um contrato" };

export function lerTipoDocumento(valor: unknown): TipoDocumento | null {
  return TIPOS_DOCUMENTO.includes(valor as TipoDocumento) ? (valor as TipoDocumento) : null;
}

/** Tipo que a leitura indicou ter visto ("outro" se não é fatura nem contrato). */
export function tipoLido(resultado: unknown): TipoDocumento | "outro" | null {
  if (!resultado || typeof resultado !== "object") return null;
  const t = (resultado as { tipo_documento?: unknown }).tipo_documento;
  if (t === "outro") return "outro";
  return lerTipoDocumento(t);
}

type Leitura = { estado: string; resultado: unknown };

/**
 * Sugestão para o revisor, a partir da leitura mais recente ainda válida
 * (leituras ordenadas da mais recente para a mais antiga). null quando a
 * leitura confirma o tipo atual ou não há leitura.
 */
export function sugestaoTipoDocumento(
  doc: { tipo: string; tipo_indicado: string },
  leituras: Leitura[],
): { tipo: TipoDocumento | null; texto: string } | null {
  const ultima = leituras.find((l) => l.estado === "sucesso" && l.resultado);
  const lido = ultima ? tipoLido(ultima.resultado) : null;
  if (!lido || lido === doc.tipo) return null;
  const atual = lerTipoDocumento(doc.tipo);
  if (lido === "outro") {
    return { tipo: null, texto: "A leitura indica que o documento não parece ser uma fatura nem um contrato." };
  }
  if (!atual) return { tipo: lido, texto: `O documento parece ser ${COM_ARTIGO[lido]}.` };
  const como = doc.tipo === doc.tipo_indicado ? "foi enviado como" : "está a ser tratado como";
  return { tipo: lido, texto: `O documento parece ser ${COM_ARTIGO[lido]}, mas ${como} ${ROTULO_TIPO_DOCUMENTO[atual].toLowerCase()}.` };
}

export function textoConfirmacaoTipo(novo: TipoDocumento): string {
  return `O documento será novamente analisado como ${ROTULO_TIPO_DOCUMENTO[novo]}. Continuar?`;
}

export type ErroAlterarTipo = "tipo_invalido" | "mesmo_tipo" | "nao_encontrado" | "indisponivel" | "dados_decididos" | "erro";

export const MSG_ERRO_ALTERAR_TIPO: Record<ErroAlterarTipo, string> = {
  tipo_invalido: "Escolha um tipo de documento válido.",
  mesmo_tipo: "O documento já é tratado com esse tipo.",
  nao_encontrado: "Documento não encontrado.",
  indisponivel: "Não é possível alterar o tipo agora: o documento está a ser lido ou o ficheiro já não está guardado.",
  dados_decididos:
    "Este documento tem valores ou situações já confirmados pelo cliente ou pela DoLado. O tipo não é alterado automaticamente: trate a correção à mão.",
  erro: "Não foi possível alterar o tipo do documento. Tente novamente.",
};

/** Erro da função SQL (código Postgres) → motivo para o revisor. */
export function erroAlterarTipo(erro: { code?: string; message?: string } | null): ErroAlterarTipo {
  switch (erro?.code) {
    case "P0002":
      return "nao_encontrado";
    case "22023":
      return /já é tratado/.test(erro.message ?? "") ? "mesmo_tipo" : "tipo_invalido";
    case "P0001":
      return "indisponivel";
    case "42501":
      return /já decididos/.test(erro.message ?? "") ? "dados_decididos" : "erro";
    default:
      return "erro";
  }
}
