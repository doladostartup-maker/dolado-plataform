import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Páginas públicas sem estado de sessão — poupam a chamada de rede à
// Supabase feita em updateSession, que é o maior custo de latência por
// pedido no plano "pico" da Clever Cloud.
const PAGINAS_PUBLICAS = [
  "/",
  "/termos",
  "/privacidade",
  "/livre-resolucao",
  "/resolucao-de-litigios",
  "/entrar",
  "/login",
  "/registo",
  "/criar-conta",
  "/confirmar-email",
  "/recuperar-palavra-passe",
  "/redefinir-palavra-passe",
  "/como-funciona",
  "/transparencia",
  "/sobre-nos",
  "/contacto",
  "/simulador-elegibilidade",
  "/calculadora-cancelamento",
  "/mudanca-de-casa",
  "/perguntas-frequentes",
  "/precario",
  "/ferramentas-gratuitas",
];

// /auth/callback tem de fazer a troca do code PKCE de forma atómica, sem
// outro cliente Supabase a mexer nos cookies antes — deixar o updateSession
// correr aqui apaga por vezes o cookie do code verifier antes da troca
// acontecer, fazendo o login falhar na primeira tentativa.
// O webhook do Stripe é chamado pelo próprio Stripe, sem cookies de sessão
// — correr o updateSession nele é trabalho desperdiçado e um cliente
// Supabase a mexer em cookies numa resposta que o Stripe só lê pelo corpo.
const ROTAS_SEM_REFRESH_DE_SESSAO = [
  ...PAGINAS_PUBLICAS,
  "/auth/callback",
  "/api/stripe/webhook",
];

// Só estas páginas de marketing fazem sentido em dolado.pt (sem "portal.").
// Tudo o resto (login, registo, entrar, portal, backoffice, auth/…) tem de
// correr sempre em portal.dolado.pt — os cookies de sessão e do PKCE do
// login OAuth são "host-only" (sem atributo Domain) e não são partilhados
// entre dolado.pt e portal.dolado.pt. Um utilizador que chegasse a /login
// via dolado.pt (ex. link relativo "Área do Utilizador" na landing) ficava
// com o cookie do code verifier gravado em dolado.pt, mas o callback do
// Google volta sempre a portal.dolado.pt — o cookie nunca era encontrado.
const PAGINAS_SO_MARKETING = [
  "/",
  "/termos",
  "/privacidade",
  "/livre-resolucao",
  "/resolucao-de-litigios",
  "/como-funciona",
  "/transparencia",
  "/sobre-nos",
  "/contacto",
  "/simulador-elegibilidade",
  "/calculadora-cancelamento",
  "/mudanca-de-casa",
  "/perguntas-frequentes",
  "/precario",
  "/ferramentas-gratuitas",
];

// Versões dos Termos e da Política de Privacidade (/termos/<versão>,
// /privacidade/<versão>) — mesmas regras que /termos e /privacidade.
function ehVersaoDosTermos(pathname: string) {
  return pathname.startsWith("/termos/") || pathname.startsWith("/privacidade/");
}

// Páginas públicas de revisão do texto (link do e-mail, sem login): não
// precisam da sessão Supabase.
function ehPaginaDeRevisaoDoTexto(pathname: string) {
  return pathname.startsWith("/texto/");
}

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

  if (
    (host === "dolado.pt" || host === "www.dolado.pt") &&
    !PAGINAS_SO_MARKETING.includes(pathname) &&
    !ehVersaoDosTermos(pathname)
  ) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, "https://portal.dolado.pt"),
      308,
    );
  }

  // portal.dolado.pt é o subdomínio da aplicação — a raiz deve cair no
  // acesso (login/registo), não na landing de marketing servida em dolado.pt.
  if (pathname === "/" && host.startsWith("portal.")) {
    // Ligação de confirmação de e-mail antiga (enviada para o "Site URL" do
    // projeto, sem /auth/callback): troca o código pela sessão em vez de o
    // perder no redirecionamento para /entrar.
    if (request.nextUrl.searchParams.has("code")) {
      return NextResponse.redirect(new URL(`/auth/callback${search}`, process.env.NEXT_PUBLIC_SITE_URL ?? request.url));
    }
    // Ligação de recuperação da palavra-passe com o redirectTo não autorizado
    // (a Supabase usa então o "Site URL"): segue para a página certa.
    if (request.nextUrl.searchParams.has("token_hash")) {
      return NextResponse.redirect(new URL(`/redefinir-palavra-passe${search}`, process.env.NEXT_PUBLIC_SITE_URL ?? request.url));
    }
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  if (ROTAS_SEM_REFRESH_DE_SESSAO.includes(pathname) || ehVersaoDosTermos(pathname) || ehPaginaDeRevisaoDoTexto(pathname)) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
