// DoLado — configuração partilhada das chamadas à Claude API (extração de
// documentos do Monitor de Proteção: src/lib/monitor/claudeDocumentos.ts;
// sugestão do texto da reclamação: src/lib/rascunhoIA/claude.ts).
// Só código de servidor. A resposta começa com blocos de raciocínio: ler
// sempre o bloco de texto, nunca content[0].
//
// O modelo vem de ANTHROPIC_DOCUMENT_MODEL para poder ser trocado sem
// alterar código (docs/especificacoes/CLAUDE_API_MONITORIZACAO.md, secção 1).

export const MODELO_DOCUMENTOS = process.env.ANTHROPIC_DOCUMENT_MODEL || "claude-sonnet-5-5";

// Diagnóstico gratuito sem registo (src/lib/diagnostico/): Haiku 5.5 por
// omissão (decisão de Thiago, 22/10/2026). Escolhido só no servidor, nunca
// pelo browser. A precisão da leitura com este modelo ainda não foi medida:
// o diagnóstico só se liga (DIAGNOSTICO_GRATUITO_ATIVO=1) depois da
// avaliação com facturas reais anotadas. Trocável sem alterar código
// (ANTHROPIC_DIAGNOSTICO_MODEL).
export const MODELO_DIAGNOSTICO = process.env.ANTHROPIC_DIAGNOSTICO_MODEL || "claude-haiku-5-5";

// Os modelos atuais pensam antes de responder (thinking adaptativo, sempre
// ligado no Sonnet 5.5). Extração é uma tarefa simples: esforço baixo e
// margem de tokens para o raciocínio não cortar a resposta JSON.
// 8192 desde a fatura_v4 (21/10/2026): o bloco de electricidade e gás é uma
// lista de campos, mais longa numa factura conjunta.
export const PARAMETROS_EXTRACAO = {
  max_tokens: 8192,
  output_config: { effort: "low" },
} as const;

// Primeira sugestão do texto da reclamação (src/lib/rascunhoIA/). Sonnet 5.5
// por omissão desde 21/10/2026 (antes Opus 5.5; decisão de Thiago), esforço
// médio — sempre revista por uma pessoa. Trocável sem alterar código
// (ANTHROPIC_RASCUNHO_MODEL).
export const MODELO_RASCUNHOS = process.env.ANTHROPIC_RASCUNHO_MODEL || "claude-sonnet-5-5";

export const PARAMETROS_RASCUNHO = {
  max_tokens: 16000,
  output_config: { effort: "medium" },
} as const;

// Análise preliminar das respostas das empresas (src/lib/analiseResposta/):
// Sonnet 5.5 por omissão desde 21/10/2026 (antes Opus 5.5; decisão de
// Thiago), esforço médio. Sempre revista por uma pessoa antes de qualquer
// decisão. Trocável sem alterar código (ANTHROPIC_ANALISE_MODEL).
export const MODELO_ANALISES = process.env.ANTHROPIC_ANALISE_MODEL || "claude-sonnet-5-5";

export const PARAMETROS_ANALISE = {
  max_tokens: 16000,
  output_config: { effort: "medium" },
} as const;
