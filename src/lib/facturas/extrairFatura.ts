// DoLado — extração de valores de fatura via Claude API, partilhada entre
// o endpoint /api/internal/analyze-invoice e a Server Action que cria a
// comparação directamente (evita um self-fetch HTTP dentro do próprio
// servidor). Chave ANTHROPIC_API_KEY ainda por contratar (previsto
// 01/10) — enquanto não existir, devolve sempre `{ ok: false }`.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODELO = "claude-sonnet-5";

const SYSTEM_PROMPT = `Vais receber uma fatura de um cliente (telecom, energia ou água).
Extrai os valores e devolve APENAS JSON:

{
  "total_value": 45.50,
  "breakdown": {
    "base": 35.00,
    "tax": 10.50,
    "service": 0,
    "other": 0
  },
  "billing_period": "2026-09",
  "confidence": "high" | "medium" | "low",
  "extraction_notes": "qualquer ambiguidade"
}

Extrai apenas os números presentes no documento. Não infiras valores que não
estão explicitamente escritos. Se não conseguires ler algum valor com confiança,
usa confidence "low" e explica em extraction_notes.`;

export type ExtracaoFatura = {
  total_value: number | null;
  breakdown: { base?: number; tax?: number; service?: number; other?: number } | null;
  billing_period: string | null;
  confidence: "high" | "medium" | "low";
  extraction_notes: string | null;
};

export type ResultadoExtracao =
  | { ok: true; extracao: ExtracaoFatura; bruta: unknown }
  | { ok: false; motivo: string };

function respostaValida(v: unknown): v is ExtracaoFatura {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    (r.total_value === null || typeof r.total_value === "number") &&
    ["high", "medium", "low"].includes(r.confidence as string)
  );
}

async function chamarClaude(base64: string, tipoMime: string) {
  const blocoConteudo =
    tipoMime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: tipoMime, data: base64 } }
      : { type: "image", source: { type: "base64", media_type: tipoMime, data: base64 } };

  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [blocoConteudo, { type: "text", text: "Extrai os valores desta fatura." }],
        },
      ],
    }),
  });
}

export async function extrairValoresFatura(buffer: Buffer, tipoMime: string): Promise<ResultadoExtracao> {
  if (!ANTHROPIC_API_KEY) {
    return { ok: false, motivo: "api_nao_configurada" };
  }

  const base64 = buffer.toString("base64");

  // Uma nova tentativa automática antes de cair em revisão manual — a API
  // pode falhar por um erro transitório (timeout, 5xx).
  let resposta: Response | null = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      resposta = await chamarClaude(base64, tipoMime);
      if (resposta.ok) break;
    } catch (erro) {
      console.error(`Tentativa ${tentativa + 1} de extrairValoresFatura falhou:`, erro);
    }
  }

  if (!resposta || !resposta.ok) {
    return { ok: false, motivo: "api_falhou" };
  }

  const corpo = await resposta.json();
  const textoResposta: string | undefined = corpo?.content?.[0]?.text;
  if (!textoResposta) {
    return { ok: false, motivo: "resposta_vazia" };
  }

  let extraido: unknown;
  try {
    extraido = JSON.parse(textoResposta);
  } catch {
    return { ok: false, motivo: "json_invalido" };
  }

  if (!respostaValida(extraido)) {
    return { ok: false, motivo: "formato_inesperado" };
  }

  return { ok: true, extracao: extraido, bruta: corpo };
}

/**
 * Gera a frase de análise da diferença por template, sem chamada extra à
 * API — é uma frase factual sobre uma diferença numérica, não precisa de
 * LLM. Poupa metade do custo por fatura face às duas chamadas do desenho
 * original.
 */
export function gerarAnalise(valorAtual: number, valorAnterior: number | null): string {
  if (valorAnterior === null) {
    return "Esta é a primeira fatura que comparámos para si — a partir da próxima já lhe mostramos a evolução mês a mês.";
  }

  const diferenca = valorAtual - valorAnterior;
  const percentagem = valorAnterior !== 0 ? (diferenca / valorAnterior) * 100 : 0;

  if (Math.abs(diferenca) < 0.01) {
    return "O valor manteve-se praticamente igual ao mês anterior.";
  }

  const sinal = diferenca > 0 ? "subiu" : "desceu";
  return `O valor ${sinal} ${Math.abs(percentagem).toFixed(1)}% (${diferenca > 0 ? "+" : "-"}€${Math.abs(diferenca).toFixed(2)}) face ao mês anterior.`;
}
