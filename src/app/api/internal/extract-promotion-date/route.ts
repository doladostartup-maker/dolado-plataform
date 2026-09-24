import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";

// DoLado — Extração da data de fim de promoção a partir do contrato
// (Fase 4). Chave ANTHROPIC_API_KEY ainda por contratar (previsto
// 01/10) — enquanto não existir, ou se a chamada falhar por qualquer
// motivo, devolve sempre `{ ok: false }` e o formulário cai para o
// caminho manual em silêncio. Nunca lança um erro não apanhado: uma
// falha aqui não pode impedir o cliente de criar o alerta à mão.

const BUCKET = "contratos-promocao";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODELO = "claude-sonnet-5";

const SYSTEM_PROMPT = `Vais receber um documento de contrato de um cliente (telecom, energia ou água).
A tua única tarefa é extrair a data de fim da promoção/período promocional, se existir.

Responde SEMPRE em JSON, sem texto antes ou depois:
{
  "promotion_date_found": true | false,
  "promotion_date": "YYYY-MM-DD" | null,
  "promotion_description": "texto curto descrevendo a promoção" | null,
  "confidence": "high" | "medium" | "low",
  "notes": "qualquer ambiguidade encontrada"
}

Não interpretes cláusulas legais, não avalies direitos do cliente, não sugiras ações.
A tua tarefa é exclusivamente extração factual de uma data.`;

type ExtracaoResposta = {
  promotion_date_found: boolean;
  promotion_date: string | null;
  promotion_description: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
};

function respostaValida(v: unknown): v is ExtracaoResposta {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.promotion_date_found === "boolean" &&
    (r.promotion_date === null || typeof r.promotion_date === "string") &&
    (r.promotion_description === null || typeof r.promotion_description === "string") &&
    ["high", "medium", "low"].includes(r.confidence as string)
  );
}

async function obterIp() {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, motivo: "sem_sessao" }, { status: 401 });
    }

    const ip = await obterIp();
    if (excedeuLimiteTaxa(`extract-promotion-date:${ip}`)) {
      return NextResponse.json({ ok: false, motivo: "demasiados_pedidos" }, { status: 429 });
    }

    if (!ANTHROPIC_API_KEY) {
      // Chave ainda não contratada — caminho manual assume imediatamente,
      // sem tentar sequer chamar a API.
      return NextResponse.json({ ok: false, motivo: "api_nao_configurada" });
    }

    const { caminho_storage: caminhoStorage } = await request.json();
    if (!caminhoStorage || typeof caminhoStorage !== "string") {
      return NextResponse.json({ ok: false, motivo: "pedido_invalido" }, { status: 400 });
    }

    // O ficheiro só pertence a este utilizador se o caminho começar pelo
    // seu próprio user_id — criarUploadAssinadoContrato garante isto na
    // escrita; aqui confirma-se outra vez na leitura.
    if (!caminhoStorage.startsWith(`${user.id}/`)) {
      return NextResponse.json({ ok: false, motivo: "pedido_invalido" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: ficheiro, error: erroDownload } = await admin.storage
      .from(BUCKET)
      .download(caminhoStorage);

    if (erroDownload || !ficheiro) {
      return NextResponse.json({ ok: false, motivo: "ficheiro_ilegivel" });
    }

    const tipoMime = ficheiro.type || "application/pdf";
    const buffer = Buffer.from(await ficheiro.arrayBuffer());
    const base64 = buffer.toString("base64");

    const blocoConteudo =
      tipoMime === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: tipoMime, data: base64 } }
        : { type: "image", source: { type: "base64", media_type: tipoMime, data: base64 } };

    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
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
            content: [
              blocoConteudo,
              { type: "text", text: "Extrai a data de fim da promoção deste contrato." },
            ],
          },
        ],
      }),
    });

    if (!resposta.ok) {
      console.error(`Claude API respondeu ${resposta.status}: ${await resposta.text()}`);
      return NextResponse.json({ ok: false, motivo: "api_falhou" });
    }

    const corpo = await resposta.json();
    const textoResposta: string | undefined = corpo?.content?.[0]?.text;
    if (!textoResposta) {
      return NextResponse.json({ ok: false, motivo: "resposta_vazia" });
    }

    let extraido: unknown;
    try {
      extraido = JSON.parse(textoResposta);
    } catch {
      return NextResponse.json({ ok: false, motivo: "json_invalido" });
    }

    if (!respostaValida(extraido)) {
      return NextResponse.json({ ok: false, motivo: "formato_inesperado" });
    }

    return NextResponse.json({ ok: true, extracao: extraido, bruta: corpo });
  } catch (erro) {
    console.error("Falha em extract-promotion-date:", erro);
    return NextResponse.json({ ok: false, motivo: "erro_inesperado" });
  }
}
