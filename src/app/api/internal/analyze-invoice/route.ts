import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { extrairValoresFatura } from "@/lib/facturas/extrairFatura";

// DoLado — Extração de valores de fatura para o Comparador de Faturas
// (Fase 4). Wrapper HTTP sobre extrairValoresFatura, para uso externo ao
// processo Next.js (ex. um job em background); a Server Action que cria a
// comparação chama o helper directamente, sem passar por aqui.

const BUCKET = "faturas-comparador";

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
    if (excedeuLimiteTaxa(`analyze-invoice:${ip}`)) {
      return NextResponse.json({ ok: false, motivo: "demasiados_pedidos" }, { status: 429 });
    }

    const { caminho_storage: caminhoStorage } = await request.json();
    if (!caminhoStorage || typeof caminhoStorage !== "string") {
      return NextResponse.json({ ok: false, motivo: "pedido_invalido" }, { status: 400 });
    }
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

    const resultado = await extrairValoresFatura(buffer, tipoMime);
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("Falha em analyze-invoice:", erro);
    return NextResponse.json({ ok: false, motivo: "erro_inesperado" });
  }
}
