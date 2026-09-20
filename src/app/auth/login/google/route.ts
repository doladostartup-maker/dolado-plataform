import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route Handler em vez de Server Action: redirect() para um domínio
// externo (Google) dentro de uma Server Action não aplica de forma
// fiável o Set-Cookie do code verifier PKCE — confirmado em produção
// (o callback só recebia cookies de GA, nunca o da Supabase). Um Route
// Handler que devolve NextResponse.redirect() não tem esse problema.
export async function GET() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      `${siteUrl}/login?erro=${encodeURIComponent(error?.message ?? "Erro ao iniciar sessão com Google.")}`,
    );
  }

  return NextResponse.redirect(data.url);
}
