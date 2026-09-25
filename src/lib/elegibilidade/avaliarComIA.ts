// DoLado — Fase 2 do Simulador de Elegibilidade: a Claude API gera uma
// SUGESTÃO para casos que a Fase 1 não consegue decidir — nunca uma
// decisão. O resultado fica sempre sujeito a confirmação humana antes de
// qualquer contacto com o cliente (regra validada com a advogada RGPD:
// isto é o ponto onde se interpreta o caso individual, a linha entre
// apoio administrativo e aconselhamento jurídico). Chave
// ANTHROPIC_API_KEY ainda por contratar (previsto 01/10) — sem ela, ou se
// a chamada falhar, devolve `{ ok: false }` e o caso segue para revisão
// manual sem sugestão, exactamente como já acontecia antes de haver IA.

import type { DuracaoContrato, Setor } from "./regras";
import { DURACAO_LABEL } from "./regras";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODELO = "claude-sonnet-5";

export type SugestaoIA = {
  suggested_status: "eligible" | "not_eligible" | "unclear";
  reasoning: string;
  confidence: "high" | "medium" | "low";
};

export type ResultadoAvaliacaoIA =
  | { ok: true; sugestao: SugestaoIA; bruta: unknown }
  | { ok: false; motivo: string };

function respostaValida(v: unknown): v is SugestaoIA {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    ["eligible", "not_eligible", "unclear"].includes(r.suggested_status as string) &&
    typeof r.reasoning === "string" &&
    ["high", "medium", "low"].includes(r.confidence as string)
  );
}

function montarSystemPrompt(setor: Setor): string {
  return `Vais analisar um caso de reclamação de consumidor em Portugal (setor: ${setor}).

A tua tarefa é APENAS organizar os factos e assinalar se este caso parece
enquadrar-se nos padrões típicos de reclamações válidas neste setor — não
és tu quem decide, é um humano que vai rever a tua sugestão antes de
qualquer contacto com o cliente.

NÃO cites artigos de lei específicos. NÃO recomendes uma estratégia de
reclamação. NÃO afirmes que o cliente "tem direito" a algo — usa
formulações como "este caso apresenta características semelhantes a
reclamações que costumam ser aceites" em vez de conclusões definitivas.

Responde APENAS em JSON, sem texto antes ou depois:
{
  "suggested_status": "eligible" | "not_eligible" | "unclear",
  "reasoning": "explicação curta, em português de Portugal, tom factual",
  "confidence": "high" | "medium" | "low"
}`;
}

export async function avaliarElegibilidadeComIA(
  setor: Setor,
  duracao: DuracaoContrato,
  empresaRespondeuBem: boolean,
  descricao: string,
): Promise<ResultadoAvaliacaoIA> {
  if (!ANTHROPIC_API_KEY) {
    return { ok: false, motivo: "api_nao_configurada" };
  }

  const mensagemUtilizador = `Dados do caso:
- Duração do contrato: ${DURACAO_LABEL[duracao]}
- Empresa respondeu adequadamente: ${empresaRespondeuBem ? "Sim" : "Não"}
- Descrição do problema: ${descricao}`;

  let resposta: Response | null = null;
  try {
    resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 512,
        system: montarSystemPrompt(setor),
        messages: [{ role: "user", content: mensagemUtilizador }],
      }),
    });
  } catch (erro) {
    console.error("Falha de rede em avaliarElegibilidadeComIA:", erro);
    return { ok: false, motivo: "api_falhou" };
  }

  if (!resposta.ok) {
    console.error(`Claude API respondeu ${resposta.status}: ${await resposta.text()}`);
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

  return { ok: true, sugestao: extraido, bruta: corpo };
}
