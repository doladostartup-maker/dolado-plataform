import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destinoDepoisDeAutenticar } from "@/lib/authServidor";
import { COOKIE_DESTINO_POS_LOGIN, ehDestinoSeguro } from "@/lib/destinoAuth";
import { haPedidoPorPagarNoBrowser } from "@/lib/pedidoCasoServidor";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPedido = searchParams.get("next");
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
    // Diagnóstico: nomes dos cookies recebidos (nunca os valores), para
    // perceber se o cookie do code verifier chega ao callback ou não.
    const nomesCookies = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter(Boolean);
    console.error("[auth/callback] cookies recebidos:", nomesCookies.join(", ") || "(nenhum)");

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const destinoGuardado = (await cookies()).get(COOKIE_DESTINO_POS_LOGIN)?.value;
    if (!error && data.user) {
      // Destino: ?next= explícito → destino guardado ao criar a conta ou ao
      // sair para o Google (ex.: continuar a compra em /comprar) → pedido de
      // caso por pagar neste browser → /portal/casos (ou backoffice, admin).
      const next = await destinoDepoisDeAutenticar(supabase, data.user.id, {
        nextExplicito: nextPedido,
        destinoGuardado,
        haPedidoPorPagar: haPedidoPorPagarNoBrowser,
      });
      const resposta = NextResponse.redirect(`${siteUrl}${next}`);
      if (destinoGuardado) resposta.cookies.delete(COOKIE_DESTINO_POS_LOGIN);
      return resposta;
    }
    console.error("[auth/callback] exchangeCodeForSession falhou:", error?.message);

    // A ligação de confirmação aberta noutro browser/dispositivo: a Supabase
    // já confirmou o e-mail, mas a sessão só abre no browser que criou a
    // conta (PKCE). Em vez de um erro, pede para iniciar sessão — e mantém o
    // destino para continuar no mesmo passo.
    const voltar = ehDestinoSeguro(destinoGuardado) ? `&next=${encodeURIComponent(destinoGuardado)}` : "";
    return NextResponse.redirect(
      `${siteUrl}/login?info=${encodeURIComponent(
        "Se acabou de confirmar o seu e-mail, inicie sessão para continuar.",
      )}${voltar}`,
    );
  }

  return NextResponse.redirect(
    `${siteUrl}/login?erro=${encodeURIComponent("Não foi possível iniciar sessão.")}`,
  );
}
