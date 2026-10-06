import { MODELO_RASCUNHOS, PARAMETROS_RASCUNHO } from "@/lib/claude";
import { chamarClaudeJson } from "@/lib/claudeJson";
import type { ResultadoModelo } from "./gerar";

// DoLado — chamada à Claude API para a sugestão do texto (primeira
// reclamação ou nova comunicação à empresa). A chamada em si é partilhada
// (src/lib/claudeJson.ts); aqui só o modelo e os parâmetros do rascunho.

export function chamarClaudeRascunho({
  sistema,
  mensagem,
  schema,
}: {
  sistema: string;
  mensagem: string;
  schema: Record<string, unknown>;
}): Promise<ResultadoModelo> {
  return chamarClaudeJson({
    modelo: MODELO_RASCUNHOS,
    maxTokens: PARAMETROS_RASCUNHO.max_tokens,
    effort: PARAMETROS_RASCUNHO.output_config.effort,
    sistema,
    mensagem,
    schema,
    contexto: "rascunho",
  });
}
