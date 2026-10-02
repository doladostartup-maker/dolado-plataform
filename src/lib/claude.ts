// DoLado — configuração partilhada das chamadas à Claude API (extração de
// documentos do Monitor de Proteção: src/lib/monitor/claudeDocumentos.ts).
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
