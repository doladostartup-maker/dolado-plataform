import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Páginas públicas sem estado de sessão — poupam a chamada de rede à
// Supabase feita em updateSession, que é o maior custo de latência por
// pedido no plano "pico" da Clever Cloud.
const PAGINAS_PUBLICAS = ["/", "/termos", "/privacidade", "/entrar", "/login", "/registo"];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // cleverapps.io é só para testes internos (nunca deve ficar exposto em
  // links partilhados, emails, ou redirects para clientes reais).
  if (host.endsWith(".cleverapps.io")) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, "https://portal.dolado.pt"),
      308,
    );
  }

  // portal.dolado.pt é o subdomínio da aplicação — a raiz deve cair no
  // acesso (login/registo), não na landing de marketing servida em dolado.pt.
  if (pathname === "/" && host.startsWith("portal.")) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  if (PAGINAS_PUBLICAS.includes(pathname)) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
