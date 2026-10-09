import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM, COOKIE_ORIGEM, dominioCookiesOrigem, estadoConsentimentoOrigem } from "@/lib/origemAquisicao";
import { COOKIE_INDICACAO } from "@/lib/indicacoes/regras";
import { cookiebotAceitouMarketing } from "@/lib/indicacoes/consentimento";
import {
  CABECALHO_IDIOMA,
  COOKIE_IDIOMA,
  SEGMENTO,
  VALIDADE_COOKIE_IDIOMA_S,
  caminhoNoIdioma,
  dominioCookieIdioma,
  ehCaminhoSemIdioma,
  separarIdioma,
} from "@/i18n/config";

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
  "/empresas",
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
  "/api/indicacoes/visita",
  // Webhook de receção de respostas (Resend): sem sessão, como o do Stripe.
  "/api/webhooks/resend/inbound",
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
  "/empresas",
];

// Versões dos Termos e da Política de Privacidade (/termos/<versão>,
// /privacidade/<versão>) — mesmas regras que /termos e /privacidade.
function ehVersaoDosTermos(pathname: string) {
  return pathname.startsWith("/termos/") || pathname.startsWith("/privacidade/");
}

// Links de indicação (/r/<código>): página pública no domínio com Cookiebot.
function ehLinkDeIndicacao(pathname: string) {
  return pathname.startsWith("/r/");
}

function ehApiIndicacao(pathname: string) {
  return pathname === "/api/indicacoes/visita";
}

// Páginas públicas de revisão do texto (link do e-mail, sem login): não
// precisam da sessão Supabase.
function ehPaginaDeRevisaoDoTexto(pathname: string) {
  return pathname.startsWith("/texto/");
}

export async function middleware(request: NextRequest) {
  const resposta = await encaminhar(request);
  return semOrigemSemConsentimento(request, resposta);
}

// Cookies de aquisição e indicação: dolado_origem só é criado no browser após
// consentimento de estatística; dolado_indicacao só é emitido pelo endpoint após
// consentimento de marketing no Cookiebot. O middleware apaga ambos quando a
// escolha correspondente é recusada/retirada (incluindo cookies httpOnly).
function semOrigemSemConsentimento(request: NextRequest, resposta: NextResponse) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (
    request.cookies.has(COOKIE_ORIGEM) &&
    estadoConsentimentoOrigem(request.cookies.get(COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM)?.value) !== "dado"
  ) {
    const dominioOrigem = dominioCookiesOrigem(host);
    resposta.cookies.delete({ name: COOKIE_ORIGEM, path: "/", ...(dominioOrigem ? { domain: dominioOrigem } : {}) });
  }
  const consentimentoMarketing = request.cookies.get("CookieConsent")?.value;
  const hostMarketing = host === "dolado.pt" || host === "www.dolado.pt";
  if (
    request.cookies.has(COOKIE_INDICACAO) &&
    ((consentimentoMarketing !== undefined && !cookiebotAceitouMarketing(consentimentoMarketing)) ||
      (hostMarketing && consentimentoMarketing === undefined))
  ) {
    resposta.cookies.delete({ name: COOKIE_INDICACAO, path: "/", domain: ".dolado.pt" });
  }
  return resposta;
}

async function encaminhar(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;
  // Idioma: português sem prefixo, inglês em /en. Todas as regras abaixo
  // (domínios, páginas públicas, sessão) olham para o caminho sem o prefixo.
  const { idioma, caminho, prefixado } = separarIdioma(pathname);

  // cleverapps.io é só para testes internos (nunca deve ficar exposto em
  // links partilhados, emails, ou redirects para clientes reais).
  if (host.endsWith(".cleverapps.io")) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, "https://portal.dolado.pt"),
      308,
    );
  }

  // APIs, webhooks, /auth/*, backoffice e ficheiros nunca têm idioma: um
  // prefixo /en é retirado (só em navegação) e o resto segue como sempre.
  if (ehCaminhoSemIdioma(caminho)) {
    if (prefixado && (request.method === "GET" || request.method === "HEAD")) {
      return NextResponse.redirect(new URL(`${caminho}${search}`, request.url), 308);
    }
    return encaminharSemIdioma(request, host, pathname, search);
  }

  // O segmento interno do português nunca aparece no URL público.
  if (!prefixado && (pathname === "/pt" || pathname.startsWith("/pt/"))) {
    return NextResponse.redirect(new URL(`${pathname.slice(3) || "/"}${search}`, request.url), 308);
  }

  if (host.startsWith("portal.") && ehLinkDeIndicacao(caminho)) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, "https://dolado.pt"), 308);
  }

  if (
    (host === "dolado.pt" || host === "www.dolado.pt") &&
    !PAGINAS_SO_MARKETING.includes(caminho) &&
    !ehVersaoDosTermos(caminho) &&
    !ehLinkDeIndicacao(caminho)
  ) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, "https://portal.dolado.pt"),
      308,
    );
  }

  // portal.dolado.pt é o subdomínio da aplicação — a raiz deve cair no
  // acesso (login/registo), não na landing de marketing servida em dolado.pt.
  if (caminho === "/" && host.startsWith("portal.")) {
    // Ligação de confirmação de e-mail antiga (enviada para o "Site URL" do
    // projeto, sem /auth/callback): troca o código pela sessão em vez de o
    // perder no redirecionamento para /entrar.
    if (request.nextUrl.searchParams.has("code")) {
      return NextResponse.redirect(new URL(`/auth/callback${search}`, process.env.NEXT_PUBLIC_SITE_URL ?? request.url));
    }
    // Ligação de recuperação da palavra-passe com o redirectTo não autorizado
    // (a Supabase usa então o "Site URL"): segue para a página certa.
    if (request.nextUrl.searchParams.has("token_hash")) {
      return NextResponse.redirect(new URL(`${caminhoNoIdioma(idioma, "/redefinir-palavra-passe")}${search}`, process.env.NEXT_PUBLIC_SITE_URL ?? request.url));
    }
    return NextResponse.redirect(new URL(caminhoNoIdioma(idioma, "/entrar"), request.url));
  }

  // Preferência guardada: quem escolheu inglês e abre uma página sem prefixo
  // (ligação antiga, e-mail, regresso do Stripe ou do login) continua em
  // inglês. Só navegação (GET/HEAD): Server Actions e formulários nunca são
  // redirecionados. Sem cookie, o português é o idioma por omissão — o
  // idioma do browser nunca é usado.
  const preferido = request.cookies.get(COOKIE_IDIOMA)?.value;
  if (!prefixado && preferido === "en-GB" && (request.method === "GET" || request.method === "HEAD")) {
    return NextResponse.redirect(new URL(`${caminhoNoIdioma("en-GB", caminho)}${search}`, request.url), 307);
  }

  // Pedido para a página no segmento interno [idioma], com o idioma num
  // cabeçalho (Server Actions e páginas dinâmicas leem-no em obterIdioma()).
  const destino = request.nextUrl.clone();
  destino.pathname = `/${SEGMENTO[idioma]}${caminho === "/" ? "" : caminho}`;
  const criarResposta = (pedido: NextRequest) => {
    const cabecalhos = new Headers(pedido.headers);
    cabecalhos.set(CABECALHO_IDIOMA, idioma);
    return prefixado
      ? NextResponse.next({ request: { headers: cabecalhos } })
      : NextResponse.rewrite(destino, { request: { headers: cabecalhos } });
  };

  const resposta =
    ROTAS_SEM_REFRESH_DE_SESSAO.includes(caminho) ||
    ehVersaoDosTermos(caminho) ||
    ehPaginaDeRevisaoDoTexto(caminho) ||
    ehLinkDeIndicacao(caminho)
      ? criarResposta(request)
      : await updateSession(request, criarResposta);

  // Quem abre uma página em inglês fica com o inglês como preferência (para
  // os regressos sem prefixo: login, Stripe, e-mails). Cookie funcional, só
  // com o idioma.
  if (prefixado && preferido !== idioma) {
    const dominio = dominioCookieIdioma(host);
    resposta.cookies.set(COOKIE_IDIOMA, idioma, {
      path: "/",
      maxAge: VALIDADE_COOKIE_IDIOMA_S,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      ...(dominio ? { domain: dominio } : {}),
    });
  }
  return resposta;
}

// Rotas sem idioma (APIs, webhooks, /auth/*, backoffice): as regras de
// sempre, sem prefixo e sem reescrita.
async function encaminharSemIdioma(request: NextRequest, host: string, pathname: string, search: string): Promise<NextResponse> {
  if (
    (host === "dolado.pt" || host === "www.dolado.pt") &&
    !PAGINAS_SO_MARKETING.includes(pathname) &&
    !ehApiIndicacao(pathname)
  ) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, "https://portal.dolado.pt"),
      308,
    );
  }

  if (ROTAS_SEM_REFRESH_DE_SESSAO.includes(pathname)) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
