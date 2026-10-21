// DoLado — textos dos achados do Monitor (F2/F4), partilhados pelo backoffice
// e pelo portal. Linguagem de verificação, nunca de conclusão.

export const ROTULO_ACHADO: Record<string, string> = {
  aumento_nao_explicado: "Aumento não explicado pelos dados do contrato",
  linha_nova: "Cobrança recorrente nova",
  possivel_dupla_faturacao: "Possível cobrança em duplicado",
  cessacao_divergente: "Valor de cessação diferente da estimativa",
  // Acompanhamento de serviços (acomp_v1)
  mensalidade_alterada: "Mensalidade diferente da factura anterior",
  diferenca_preco_contrato: "Mensalidade diferente do contrato",
  promocao_em_falta: "Desconto não identificado",
  promocao_alterada: "Desconto alterado",
  cobranca_recorrente_nova: "Cobrança recorrente nova",
  possivel_duplicado: "Possível cobrança em duplicado",
  fidelizacao_diferente: "Fim da fidelização diferente do contrato",
  diferenca_nao_explicada: "Diferença não explicada",
  // Electricidade e gás (energia_v1)
  energia_preco_alterado: "Preço da energia por kWh subiu",
  energia_termo_fixo_alterado: "Preço diário fixo (potência ou termo fixo) subiu",
  energia_potencia_alterada: "Potência contratada aumentou",
  energia_tarifario_alterado: "Opção horária ou tipo de tarifário mudou",
  energia_acerto_relevante: "Acerto de valor relevante",
  energia_servico_adicional: "Serviço adicional novo ou mais caro",
};

/**
 * Situações que ainda esperam uma decisão da DoLado (contadores do backoffice
 * e lista "Só por decidir"). Comunicadas, descartadas e obsoletas já não contam.
 */
export const ESTADOS_ACHADO_POR_DECIDIR = ["detetado", "em_revisao", "confirmado"] as const;

export function achadoPorDecidir(estado: string): boolean {
  return (ESTADOS_ACHADO_POR_DECIDIR as readonly string[]).includes(estado);
}
