import { NextResponse } from "next/server";
import { COOKIE_DESTINO_POS_LOGIN, VALIDADE_DESTINO_GOOGLE_S, destinoSeguro } from "@/lib/destinoAuth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { COOKIE_IDIOMA, localizarHref, normalizarIdioma } from "@/i18n/config";
import { traduzirMensagemConta } from "@/i18n/mensagens/conta";

// Route Handler em vez de Server Action: redirect() para um domínio
// externo (Google) dentro de uma Server Action não aplica de forma
// fiável o Set-Cookie do code verifier PKCE — confirmado em produção
// (o callback só recebia cookies de GA, nunca o da Supabase). Um Route
// Handler que devolve NextResponse.redirect() não tem esse problema.
export async function GET(request: Request) {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error || !data.url) {
    // Mensagem fixa (nunca o texto técnico da Supabase), no idioma deste browser.
    const idioma = normalizarIdioma((await cookies()).get(COOKIE_IDIOMA)?.value);
    const erro = traduzirMensagemConta(idioma, "Erro ao iniciar sessão com Google.");
    return NextResponse.redirect(`${siteUrl}${localizarHref(idioma, `/login?erro=${encodeURIComponent(erro)}`)}`);
  }

  const resposta = NextResponse.redirect(data.url);
  // Destino depois do login (ex.: /comprar ou /associar-compra). Num cookie
  // de curta duração, e não no redirectTo: o URL de regresso autorizado na
  // Supabase é fixo. Só caminhos deste site.
  const next = new URL(request.url).searchParams.get("next");
  if (next) {
    resposta.cookies.set(COOKIE_DESTINO_POS_LOGIN, destinoSeguro(next), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: VALIDADE_DESTINO_GOOGLE_S,
    });
  }
  return resposta;
}
