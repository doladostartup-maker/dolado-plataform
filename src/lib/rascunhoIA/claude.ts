import Anthropic from "@anthropic-ai/sdk";
import { MODELO_RASCUNHOS, PARAMETROS_RASCUNHO } from "@/lib/claude";
import { custoEstimadoUsd } from "@/lib/monitor/custos";
import type { ResultadoModelo } from "./gerar";

// DoLado — chamada à Claude API para a primeira sugestão do texto da
// reclamação. Só no servidor: a chave (ANTHROPIC_API_KEY) nunca sai daqui.
//
// Uma chamada isolada por geração: sem histórico, sem ferramentas,
// structured outputs com o schema da versão em uso. Fallback do lado do
// servidor da API ("default") se o modelo recusar por política de
// segurança: o modelo que respondeu fica registado na auditoria. Nunca
// lança — o chamador regista a falha e o caso segue no caminho manual.

let cliente: Anthropic | null = null;

// Redigir uma reclamação demora mais do que ler um documento; corre em
// segundo plano (after()), por isso não há pedido HTTP à espera.
const TIMEOUT_TENTATIVA_MS = 120_000;

function obterCliente() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  cliente ??= new Anthropic({ maxRetries: 1, timeout: TIMEOUT_TENTATIVA_MS });
  return cliente;
}

export async function chamarClaudeRascunho({
  sistema,
  mensagem,
  schema,
}: {
  sistema: string;
  mensagem: string;
  schema: Record<string, unknown>;
}): Promise<ResultadoModelo> {
  const client = obterCliente();
  if (!client) return { ok: false, motivo: "api_nao_configurada", uso: null };

  const inicio = Date.now();
  try {
    const { data: resposta, request_id } = await client.beta.messages
      .create({
        model: MODELO_RASCUNHOS,
        max_tokens: PARAMETROS_RASCUNHO.max_tokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: sistema,
        output_config: {
          effort: PARAMETROS_RASCUNHO.output_config.effort,
          format: { type: "json_schema", schema },
        },
        messages: [{ role: "user", content: mensagem }],
      })
      .withResponse();

    const modelo = resposta.model || MODELO_RASCUNHOS;
    const uso = {
      modelo,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
      custoUsd: custoEstimadoUsd(modelo, resposta.usage.input_tokens, resposta.usage.output_tokens),
      latenciaMs: Date.now() - inicio,
      requestId: request_id ?? null,
    };

    if (resposta.stop_reason === "refusal") return { ok: false, motivo: "recusa", uso };

    // A resposta começa com blocos de raciocínio: ler o bloco de texto.
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
    console.error("Falha ao chamar a Claude API (rascunho):", detalhe);
    return { ok: false, motivo: "erro_api", uso: null, detalhe };
  }
}
