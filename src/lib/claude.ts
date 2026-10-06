// DoLado — configuração partilhada das chamadas à Claude API (extração de
// documentos do Monitor de Proteção: src/lib/monitor/claudeDocumentos.ts;
// sugestão do texto da reclamação: src/lib/rascunhoIA/claude.ts).
// Só código de servidor. A resposta começa com blocos de raciocínio: ler
// sempre o bloco de texto, nunca content[0].
//
// O modelo vem de ANTHROPIC_DOCUMENT_MODEL para poder ser trocado sem
// alterar código (docs/especificacoes/CLAUDE_API_MONITORIZACAO.md, secção 1).

export const MODELO_DOCUMENTOS = process.env.ANTHROPIC_DOCUMENT_MODEL || "claude-sonnet-5-5";

// Os modelos atuais pensam antes de responder (thinking adaptativo, sempre
// ligado no Sonnet 5.5). Extração é uma tarefa simples: esforço baixo e
// margem de tokens para o raciocínio não cortar a resposta JSON.
export const PARAMETROS_EXTRACAO = {
  max_tokens: 4096,
  output_config: { effort: "low" },
} as const;

// Primeira sugestão do texto da reclamação (src/lib/rascunhoIA/). Redigir é
// mais exigente do que extrair: modelo Opus por omissão, esforço médio.
// Trocável sem alterar código (ANTHROPIC_RASCUNHO_MODEL).
export const MODELO_RASCUNHOS = process.env.ANTHROPIC_RASCUNHO_MODEL || "claude-opus-5-5";

export const PARAMETROS_RASCUNHO = {
  max_tokens: 16000,
  output_config: { effort: "medium" },
} as const;

// Análise preliminar das respostas das empresas (src/lib/analiseResposta/):
// interpretar uma resposta face à reclamação enviada é exigente — Opus por
// omissão, esforço médio. Sempre revista por uma pessoa antes de qualquer
// decisão. Trocável sem alterar código (ANTHROPIC_ANALISE_MODEL).
export const MODELO_ANALISES = process.env.ANTHROPIC_ANALISE_MODEL || "claude-opus-5-5";

export const PARAMETROS_ANALISE = {
  max_tokens: 16000,
  output_config: { effort: "medium" },
} as const;
