import Anthropic from "@anthropic-ai/sdk";
import { custoEstimadoUsd } from "@/lib/monitor/custos";
import type { ResultadoModelo } from "@/lib/rascunhoIA/gerar";

// DoLado — uma chamada isolada à Claude API com resposta JSON estruturada
// (structured outputs). Partilhada pela sugestão do texto da reclamação
// (src/lib/rascunhoIA/) e pela análise das respostas das empresas
// (src/lib/analiseResposta/). Só no servidor: a chave (ANTHROPIC_API_KEY)
// nunca sai daqui.
//
// Sem histórico, sem ferramentas. Fallback do lado do servidor da API
// ("default") se o modelo recusar por política de segurança: o modelo que
// respondeu fica registado na auditoria. A resposta começa com blocos de
// raciocínio: lê-se sempre o bloco de texto, nunca content[0]. Nunca lança —
// quem chama regista a falha e segue o caminho manual.

let cliente: Anthropic | null = null;

// Corre em segundo plano (after()), por isso não há pedido HTTP à espera.
const TIMEOUT_TENTATIVA_MS = 120_000;

function obterCliente() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  cliente ??= new Anthropic({ maxRetries: 1, timeout: TIMEOUT_TENTATIVA_MS });
  return cliente;
}

export async function chamarClaudeJson({
  modelo,
  maxTokens,
  effort,
  sistema,
  mensagem,
  schema,
  contexto,
}: {
  modelo: string;
  maxTokens: number;
  effort: "low" | "medium" | "high";
  sistema: string;
  mensagem: string;
  schema: Record<string, unknown>;
  /** Só para os registos de erro (ex.: "rascunho", "analise"). */
  contexto: string;
}): Promise<ResultadoModelo> {
  const client = obterCliente();
  if (!client) return { ok: false, motivo: "api_nao_configurada", uso: null };

  const inicio = Date.now();
  try {
    const { data: resposta, request_id } = await client.beta.messages
      .create({
        model: modelo,
        max_tokens: maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: sistema,
        output_config: { effort, format: { type: "json_schema", schema } },
        messages: [{ role: "user", content: mensagem }],
      })
      .withResponse();

    const modeloUsado = resposta.model || modelo;
    const uso = {
      modelo: modeloUsado,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
      custoUsd: custoEstimadoUsd(modeloUsado, resposta.usage.input_tokens, resposta.usage.output_tokens),
      latenciaMs: Date.now() - inicio,
      requestId: request_id ?? null,
    };

    if (resposta.stop_reason === "refusal") return { ok: false, motivo: "recusa", uso };

    const texto = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!texto || resposta.stop_reason === "max_tokens") return { ok: false, motivo: "resposta_invalida", uso };

    try {
      return { ok: true, bruto: JSON.parse(texto), uso };
    } catch {
      return { ok: false, motivo: "resposta_invalida", uso, detalhe: "JSON inválido" };
    }
  } catch (erro) {
    const detalhe =
      erro instanceof Anthropic.APIError
        ? `HTTP ${erro.status ?? "sem estado"}: ${erro.message}`.slice(0, 300)
        : `${erro instanceof Error ? erro.message : String(erro)}`.slice(0, 300);
    console.error(`Falha ao chamar a Claude API (${contexto}):`, detalhe);
    return { ok: false, motivo: "erro_api", uso: null, detalhe };
  }
}
