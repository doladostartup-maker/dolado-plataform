import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchComLimite } from "./fetchComLimite";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // O middleware corre em todos os pedidos: o refresh da sessão nunca
      // pode prender a navegação.
      global: { fetch: fetchComLimite(8_000) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Necessário para refrescar o token de sessão — não remover.
  // getClaims() valida o JWT localmente e só vai à rede quando o token
  // expirou (aí faz o refresh); getUser() fazia uma chamada por pedido.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
