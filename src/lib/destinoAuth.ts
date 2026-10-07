// Destino depois de autenticar (login, confirmação do e-mail, Google) —
// regras puras, testáveis com `node --test` (destinoAuth.test.mjs).
//
// Ordem de decisão (a primeira que existir ganha):
//   1. destino explícito do pedido (?next= do login);
//   2. destino guardado no cookie ao criar a conta / ao sair para o Google
//      (ex.: /comprar?plano=caso_protecao, para continuar a compra);
//   3. pedido de caso por pagar neste browser → escolha da modalidade;
//   4. por omissão: /portal/casos (cliente) ou o backoffice (admin).
// "A sua conta" (/conta) deixou de ser destino: fica só no menu do portal.

/** Destino guardado ao criar a conta ou ao sair para o Google (só caminhos deste site). */
export const COOKIE_DESTINO_POS_LOGIN = "dolado_destino_pos_login";

/** Validade do destino guardado: Google volta em segundos; o e-mail pode ser aberto mais tarde. */
export const VALIDADE_DESTINO_GOOGLE_S = 10 * 60;
export const VALIDADE_DESTINO_CONFIRMACAO_S = 24 * 60 * 60;

export const DESTINO_POS_LOGIN = "/portal/casos";
export const DESTINO_POS_LOGIN_ADMIN = "/backoffice";
export const DESTINO_PEDIDO_POR_PAGAR = "/tratar-caso/modalidade";

/** Só caminhos relativos deste site (nunca "//outro.site" nem URLs absolutas — evita open redirect). */
export function ehDestinoSeguro(next: unknown): next is string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\");
}

export function destinoSeguro(next: unknown, porOmissao = DESTINO_POS_LOGIN) {
  return ehDestinoSeguro(next) ? next : porOmissao;
}

export function destinoPorPerfil(role: string | null | undefined) {
  return role === "admin" ? DESTINO_POS_LOGIN_ADMIN : DESTINO_POS_LOGIN;
}

/**
 * Destino depois de autenticar. Devolve null quando nenhuma regra
 * específica se aplica — quem chama usa então destinoPorPerfil().
 */
export function escolherDestino(dados: {
  nextExplicito?: unknown;
  destinoGuardado?: unknown;
  haPedidoPorPagar?: boolean;
}): string | null {
  if (ehDestinoSeguro(dados.nextExplicito)) return dados.nextExplicito;
  if (ehDestinoSeguro(dados.destinoGuardado)) return dados.destinoGuardado;
  if (dados.haPedidoPorPagar) return DESTINO_PEDIDO_POR_PAGAR;
  return null;
}

/** Destino de quem vem do preçário sem conta: continua na compra do mesmo plano. */
export function destinoCompra(plano: string) {
  return `/comprar?plano=${encodeURIComponent(plano)}`;
}

/** Página "confirme o seu e-mail", com o destino que a ligação vai abrir. */
export function urlConfirmarEmail(destino: string) {
  return `/confirmar-email?next=${encodeURIComponent(destinoSeguro(destino))}`;
}

/**
 * Login absoluto no site público, com regresso ao caminho pedido (ex.: uma
 * descarga). Recebe sempre o NEXT_PUBLIC_SITE_URL, nunca o origin do pedido:
 * atrás do proxy da Clever Cloud, request.url é o endereço interno
 * (localhost:8080).
 */
export function urlLogin(siteUrl: string, next: unknown) {
  const destino = ehDestinoSeguro(next) ? `?next=${encodeURIComponent(next)}` : "";
  return `${siteUrl}/login${destino}`;
}
