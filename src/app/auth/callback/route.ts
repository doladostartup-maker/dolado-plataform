import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_DESTINO_POS_LOGIN, destinoSeguro } from "@/lib/pedidoCaso";
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sem destino explícito: se este browser tem um pedido de caso por
      // pagar ("Tratar o meu caso" → Google, ou ligação de confirmação do
      // e-mail), continua na escolha da modalidade.
      const destinoGuardado = (await cookies()).get(COOKIE_DESTINO_POS_LOGIN)?.value;
      const next = nextPedido
        ? destinoSeguro(nextPedido)
        : destinoGuardado
          ? destinoSeguro(destinoGuardado)
          : (await haPedidoPorPagarNoBrowser())
            ? "/tratar-caso/modalidade"
            : "/conta";
      const resposta = NextResponse.redirect(`${siteUrl}${next}`);
      if (destinoGuardado) resposta.cookies.delete(COOKIE_DESTINO_POS_LOGIN);
      return resposta;
    }
    console.error("[auth/callback] exchangeCodeForSession falhou:", error.message);
  }

  return NextResponse.redirect(
    `${siteUrl}/login?erro=${encodeURIComponent("Não foi possível iniciar sessão.")}`,
  );
}
