import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // portal.dolado.pt é o subdomínio da aplicação — a raiz deve cair no
  // acesso (login/registo), não na landing de marketing servida em dolado.pt.
  if (
    request.nextUrl.pathname === "/" &&
    request.headers.get("host")?.split(":")[0].startsWith("portal.")
  ) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
