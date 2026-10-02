// DoLado — configuração partilhada das chamadas à Claude API (extração de
// documentos). Só código de servidor.
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

// A resposta pode começar com blocos de raciocínio — o texto útil é o
// primeiro bloco do tipo "text", nunca necessariamente content[0].
export function textoDaResposta(corpo: unknown): string | undefined {
  const conteudo = (corpo as { content?: unknown })?.content;
  if (!Array.isArray(conteudo)) return undefined;
  const bloco = conteudo.find(
    (b): b is { type: "text"; text: string } =>
      typeof b === "object" && b !== null && (b as { type?: unknown }).type === "text" && typeof (b as { text?: unknown }).text === "string",
  );
  return bloco?.text;
}
