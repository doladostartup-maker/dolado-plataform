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

  if (!code) {
    // O próprio Google/Supabase pode devolver um erro em vez de um code
    // (ex. utilizador cancelou, ou falha no provider) — regista para
    // conseguirmos distinguir isso de uma falha na troca do code.
    console.error(
      "[auth/callback] sem code:",
      searchParams.get("error"),
      searchParams.get("error_description"),
    );
  } else {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession falhou:", error.message);
  }

  return NextResponse.redirect(
    `${siteUrl}/login?erro=${encodeURIComponent("Não foi possível iniciar sessão.")}`,
  );
}
