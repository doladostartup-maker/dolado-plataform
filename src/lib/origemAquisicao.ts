// Origem de aquisição (?ref=…): regras puras, sem I/O.
//
// Só atribuição: saber de onde veio um cliente (ex.: ?ref=contabilista_marta).
// Nunca dá plano, desconto, casos disponíveis, permissões nem acesso — e é
// independente dos vouchers do Stripe (quem usa um cupão não fica atribuído
// à origem com o mesmo nome; quem veio por um link e não usa cupão continua
// atribuído).
//
// Fluxo (revisto a 08/10/2026): só depois de o Cookiebot confirmar o
// consentimento de estatística, o browser grava a marca dolado_estatisticas=1
// e a primeira origem válida em dolado_origem (first-touch, 30 dias); o
// servidor grava-a em utilizadores.acquisition_source. Recusa ou retirada:
// marca dolado_estatisticas=0, dolado_origem apagado e a origem da conta
// apagada (na hora, se houver sessão; senão na próxima interação autenticada).
// Nunca é enviada à Stripe nem a parceiros.

export const COOKIE_ORIGEM = "dolado_origem";
export const COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM = "dolado_estatisticas";
export const ORIGEM_JANELA_DIAS = 30;
export const PARAMETRO_ORIGEM = "ref";
/** Valores da marca dolado_estatisticas: consentimento de estatística dado / recusado ou retirado. */
export const CONSENTIMENTO_DADO = "1";
export const CONSENTIMENTO_RETIRADO = "0";

const MAX_COMPRIMENTO = 64;
// Letras minúsculas, números, "_" e "-"; começa por letra ou número; pelo
// menos uma letra (um valor só com dígitos pode ser um telefone ou um NIF).
const FORMATO = /^[a-z0-9][a-z0-9_-]{1,63}$/;
// Tolerância para relógios diferentes entre servidores.
const FOLGA_MS = 5 * 60 * 1000;

/** Ligado só com ORIGEM_AQUISICAO_ATIVO=1 e após consentimento de estatística. */
export function origemAquisicaoAtiva(valor: string | undefined = process.env.ORIGEM_AQUISICAO_ATIVO) {
  return valor === "1";
}

/** Identificador de origem normalizado, ou null se inválido. Nunca corrige: um valor fora do formato é ignorado. */
export function normalizarOrigem(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim().toLowerCase();
  if (v.length > MAX_COMPRIMENTO || !FORMATO.test(v) || !/[a-z]/.test(v)) return null;
  return v;
}

export type OrigemGuardada = { origem: string; primeiraVisita: Date };

/** Valor do cookie: "<origem>.<segundos da primeira visita>". */
export function valorCookieOrigem(origem: string, agoraMs: number) {
  return `${origem}.${Math.floor(agoraMs / 1000)}`;
}

/** Lê o cookie; null se mal formado, expirado (> 30 dias) ou no futuro. */
export function lerCookieOrigem(valor: string | null | undefined, agoraMs: number): OrigemGuardada | null {
  if (!valor) return null;
  const m = /^([a-z0-9_-]{2,64})\.(\d{1,12})$/.exec(valor);
  if (!m) return null;
  const origem = normalizarOrigem(m[1]);
  const ms = Number(m[2]) * 1000;
  if (!origem || !Number.isFinite(ms)) return null;
  if (ms > agoraMs + FOLGA_MS || ms < agoraMs - ORIGEM_JANELA_DIAS * 24 * 3600 * 1000) return null;
  return { origem, primeiraVisita: new Date(ms) };
}

/**
 * First-touch: devolve o valor a gravar no cookie, ou null quando não há
 * nada a fazer (sem ?ref=, ?ref= inválido, ou já existe uma origem válida —
 * uma visita posterior com outro ?ref= nunca substitui a primeira).
 */
export function cookieOrigemParaDefinir(
  ref: string | null | undefined,
  cookieAtual: string | null | undefined,
  agoraMs: number,
): string | null {
  const origem = normalizarOrigem(ref);
  if (!origem) return null;
  if (lerCookieOrigem(cookieAtual, agoraMs)) return null;
  return valorCookieOrigem(origem, agoraMs);
}

export type EstadoConsentimentoOrigem = "dado" | "retirado" | "desconhecido";

/** Lê a marca dolado_estatisticas. Sem marca (ou outro valor) = desconhecido: não grava nem apaga. */
export function estadoConsentimentoOrigem(marca: string | null | undefined): EstadoConsentimentoOrigem {
  if (marca === CONSENTIMENTO_DADO) return "dado";
  if (marca === CONSENTIMENTO_RETIRADO) return "retirado";
  return "desconhecido";
}

/** Cookie a gravar no browser (valor null = apagar). */
export type CookieOrigemBrowser = { nome: string; valor: string | null };

/**
 * O que o browser faz com os cookies da origem depois de ler o Cookiebot.
 * Falha fechada: sem resposta no banner (ou sem Cookiebot) não cria nada.
 * `avisarRetirada` = pedir ao servidor que apague a origem da conta (só na
 * passagem de consentido para recusado, para não repetir o pedido a cada página).
 */
export function decidirCookiesOrigem(p: {
  ativo: boolean;
  temResposta: boolean;
  estatisticas: boolean;
  marcaAtual: string | null | undefined;
  origemAtual: string | null | undefined;
  ref: string | null | undefined;
  agoraMs: number;
}): { cookies: CookieOrigemBrowser[]; avisarRetirada: boolean } {
  const apagarOrigem: CookieOrigemBrowser[] = p.origemAtual ? [{ nome: COOKIE_ORIGEM, valor: null }] : [];
  if (!p.ativo || !p.temResposta) {
    // Desligado: limpa só o cookie de origem antigo. Sem resposta: nada muda.
    return { cookies: p.ativo ? [] : apagarOrigem, avisarRetirada: false };
  }
  if (!p.estatisticas) {
    return {
      cookies: [{ nome: COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM, valor: CONSENTIMENTO_RETIRADO }, ...apagarOrigem],
      avisarRetirada: estadoConsentimentoOrigem(p.marcaAtual) === "dado",
    };
  }
  const cookies: CookieOrigemBrowser[] = [{ nome: COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM, valor: CONSENTIMENTO_DADO }];
  const origem = cookieOrigemParaDefinir(p.ref, p.origemAtual, p.agoraMs);
  if (origem) cookies.push({ nome: COOKIE_ORIGEM, valor: origem });
  return { cookies, avisarRetirada: false };
}

/** Domínio dos cookies: partilhado entre dolado.pt e portal.dolado.pt; host-only noutros (localhost). */
export function dominioCookiesOrigem(host: string): string | undefined {
  return host === "dolado.pt" || host.endsWith(".dolado.pt") ? ".dolado.pt" : undefined;
}

/** Linha document.cookie (30 dias; valor null = apagar). */
export function linhaCookieOrigem(c: CookieOrigemBrowser, host: string, https: boolean) {
  const dominio = dominioCookiesOrigem(host);
  const maxAge = c.valor === null ? 0 : ORIGEM_JANELA_DIAS * 24 * 3600;
  return `${c.nome}=${c.valor === null ? "" : encodeURIComponent(c.valor)}; Max-Age=${maxAge}; Path=/${dominio ? `; Domain=${dominio}` : ""}; SameSite=Lax${https ? "; Secure" : ""}`;
}

/**
 * Pedido feito por uma página deste mesmo host (proteção contra pedidos de
 * outros sites): Origin obrigatório e igual ao host; Sec-Fetch-Site, quando o
 * browser o envia, tem de ser same-origin.
 */
export function pedidoDoProprioSite(origin: string | null, host: string | null, secFetchSite: string | null) {
  if (!origin || !host) return false;
  if (secFetchSite && secFetchSite !== "same-origin") return false;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

// Nomes amigáveis para o backoffice. Origem nova = nova linha aqui (opcional:
// sem nome, aparece o identificador técnico).
export const NOMES_ORIGEM: Record<string, string> = {
  contabilista_marta: "Contabilista Marta",
  remax_duplo_prestigio: "Remax Duplo Prestígio",
  felipe_wesley: "Felipe Wesley",
  carlos_correia: "Carlos Correia",
};

/** Nome a mostrar no backoffice (o identificador técnico quando não há nome). */
export function rotuloOrigem(origem: string | null | undefined) {
  if (!origem) return null;
  return Object.hasOwn(NOMES_ORIGEM, origem) ? NOMES_ORIGEM[origem] : origem;
}
