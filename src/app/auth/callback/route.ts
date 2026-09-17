import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/conta";
  // Usa sempre o site URL configurado, nunca o origin derivado do pedido:
  // atrás do proxy da Clever Cloud, request.url resolve para o endereço
  // interno (localhost:8080), não para o domínio público.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  return NextResponse.redirect(
    `${siteUrl}/login?erro=${encodeURIComponent("Não foi possível iniciar sessão.")}`,
  );
}
