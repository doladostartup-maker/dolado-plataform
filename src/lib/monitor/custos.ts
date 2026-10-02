// DoLado — custo da Claude API e orçamento do piloto (Monitor de Proteção).
//
// Custo estimado por chamada a partir dos tokens devolvidos pela API
// (usage.input_tokens / usage.output_tokens). Preços oficiais em USD por
// milhão de tokens. Um modelo desconhecido conta pelo preço mais alto da
// tabela: o orçamento nunca é subestimado.
//
// Orçamento (decisão de 02/10/2026): teto em ANTHROPIC_ORCAMENTO_USD (5 USD
// por omissão), avisos ao admin a 50/75/90% e, no teto, nenhum documento é
// processado automaticamente (fica pendente, sem erro para o cliente).

export const PRECOS_USD_POR_MTOK: Record<string, { entrada: number; saida: number }> = {
  "claude-sonnet-5-5": { entrada: 2, saida: 10 },
  "claude-sonnet-5": { entrada: 2, saida: 10 },
  "claude-haiku-4-5": { entrada: 1, saida: 5 },
  "claude-opus-5-5": { entrada: 4, saida: 20 },
};

const PRECO_MAIS_ALTO = Object.values(PRECOS_USD_POR_MTOK).reduce((max, p) =>
  p.entrada + p.saida > max.entrada + max.saida ? p : max,
);

export const ORCAMENTO_PADRAO_USD = 5;
export const AVISOS_ORCAMENTO_PCT = [50, 75, 90] as const;

export function custoEstimadoUsd(modelo: string, tokensEntrada: number, tokensSaida: number): number {
  const preco = PRECOS_USD_POR_MTOK[modelo] ?? PRECO_MAIS_ALTO;
  const entrada = Math.max(0, tokensEntrada || 0);
  const saida = Math.max(0, tokensSaida || 0);
  const custo = (entrada * preco.entrada + saida * preco.saida) / 1_000_000;
  // Precisão da coluna uso_api_claude.custo_estimado_usd (numeric(12, 6)).
  return Math.round(custo * 1_000_000) / 1_000_000;
}

export function lerTetoOrcamentoUsd(valor: string | undefined): number {
  const n = Number((valor ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : ORCAMENTO_PADRAO_USD;
}

export type EstadoOrcamento = {
  gastoUsd: number;
  tetoUsd: number;
  percentagem: number;
  bloqueado: boolean;
};

export function estadoOrcamento(gastoUsd: number, tetoUsd: number): EstadoOrcamento {
  const percentagem = tetoUsd > 0 ? (gastoUsd / tetoUsd) * 100 : 100;
  return { gastoUsd, tetoUsd, percentagem, bloqueado: gastoUsd >= tetoUsd };
}

// Patamares de aviso atravessados por uma chamada (de antes para depois).
// Cada patamar é avisado uma só vez: só quando é ultrapassado nesta chamada.
export function avisosAtravessados(gastoAntesUsd: number, gastoDepoisUsd: number, tetoUsd: number): number[] {
  if (tetoUsd <= 0) return [];
  const antes = (gastoAntesUsd / tetoUsd) * 100;
  const depois = (gastoDepoisUsd / tetoUsd) * 100;
  return AVISOS_ORCAMENTO_PCT.filter((p) => antes < p && depois >= p);
}
