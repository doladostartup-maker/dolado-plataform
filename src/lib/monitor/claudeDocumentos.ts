import Anthropic from "@anthropic-ai/sdk";
import { MODELO_DOCUMENTOS, PARAMETROS_EXTRACAO } from "@/lib/claude";
import { custoEstimadoUsd } from "./custos.ts";

// DoLado — chamada à Claude API para ler um documento do Monitor de
// Proteção (docs/especificacoes/CLAUDE_API_MONITORIZACAO.md).
//
// Uma chamada isolada por documento: sem histórico, sem dados da conta, sem
// ferramentas. Structured outputs com o schema da versão em uso. Novas
// tentativas só por erro técnico (2 tentativas no total, feitas pelo SDK);
// confiança baixa nunca provoca nova chamada. Nunca lança: o chamador cai
// sempre no caminho manual (regra 3 do "Uso de IA").

export const MIME_ACEITES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type MimeAceite = (typeof MIME_ACEITES)[number];

export type UsoChamada = {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoUsd: number;
  latenciaMs: number;
  requestId: string | null;
};

export type ResultadoChamada =
  | { ok: true; bruto: unknown; uso: UsoChamada }
  | {
      ok: false;
      motivo: "api_nao_configurada" | "recusa" | "resposta_invalida" | "erro_api";
      uso: UsoChamada | null;
      /** Só para o admin (estado HTTP e mensagem da API), nunca para o cliente. */
      detalhe?: string;
    };

let cliente: Anthropic | null = null;

function obterCliente() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  cliente ??= new Anthropic({ maxRetries: 1, timeout: 120_000 });
  return cliente;
}

export async function lerDocumentoComClaude({
  conteudo,
  mime,
  prompt,
  schema,
  instrucao,
}: {
  conteudo: Buffer;
  mime: MimeAceite;
  prompt: string;
  schema: Record<string, unknown>;
  instrucao: string;
}): Promise<ResultadoChamada> {
  const client = obterCliente();
  if (!client) return { ok: false, motivo: "api_nao_configurada", uso: null };

  const data = conteudo.toString("base64");
  const bloco: Anthropic.ContentBlockParam =
    mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mime, data } };

  const inicio = Date.now();
  try {
    const { data: resposta, request_id } = await client.messages
      .create({
        model: MODELO_DOCUMENTOS,
        max_tokens: PARAMETROS_EXTRACAO.max_tokens,
        system: prompt,
        output_config: {
          effort: PARAMETROS_EXTRACAO.output_config.effort,
          format: { type: "json_schema", schema },
        },
        messages: [{ role: "user", content: [bloco, { type: "text", text: instrucao }] }],
      })
      .withResponse();

    const uso: UsoChamada = {
      modelo: resposta.model || MODELO_DOCUMENTOS,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
      custoUsd: custoEstimadoUsd(MODELO_DOCUMENTOS, resposta.usage.input_tokens, resposta.usage.output_tokens),
      latenciaMs: Date.now() - inicio,
      requestId: request_id ?? null,
    };

    if (resposta.stop_reason === "refusal") return { ok: false, motivo: "recusa", uso };

    const texto = resposta.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
    if (!texto || resposta.stop_reason === "max_tokens") return { ok: false, motivo: "resposta_invalida", uso };

    try {
      return { ok: true, bruto: JSON.parse(texto), uso };
    } catch {
      return { ok: false, motivo: "resposta_invalida", uso };
    }
  } catch (erro) {
    const detalhe =
      erro instanceof Anthropic.APIError
        ? `HTTP ${erro.status ?? "sem estado"}: ${erro.message}`.slice(0, 300)
        : `${erro instanceof Error ? erro.message : String(erro)}`.slice(0, 300);
    console.error("Falha ao chamar a Claude API:", detalhe);
    return { ok: false, motivo: "erro_api", uso: null, detalhe };
  }
}
