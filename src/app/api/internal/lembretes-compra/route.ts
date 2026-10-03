import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enviarLembretesCompraSemConta } from "@/lib/compra/lembretes";
import { dependenciasLembretes } from "@/lib/compra/servidor";

// Lembretes de compras pagas sem conta (1 e 3 dias). Chamada de hora a hora
// pelo pg_cron da Supabase (job "lembretes-compra-sem-conta"), com o
// segredo do Vault 'lembretes_compra_cron_secret' em x-cron-secret — igual
// a LEMBRETES_COMPRA_CRON_SECRET aqui. Sem segredo configurado: 401 e nada
// é enviado. Idempotente: cada marco é reservado na base de dados antes de
// sair.

export const dynamic = "force-dynamic";

function segredoValido(recebido: string | null) {
  const esperado = process.env.LEMBRETES_COMPRA_CRON_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!segredoValido(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";
    const resultado = await enviarLembretesCompraSemConta(dependenciasLembretes(), siteUrl);
    console.log(JSON.stringify({ origem: "lembretes_compra", ...resultado }));
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error(JSON.stringify({ origem: "lembretes_compra", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return NextResponse.json({ erro: "Falha ao enviar lembretes." }, { status: 500 });
  }
}
