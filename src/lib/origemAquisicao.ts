// Origem de aquisição (?ref=…): regras puras, sem I/O.
//
// Só atribuição: saber de onde veio um cliente (ex.: ?ref=contabilista_marta).
// Nunca dá plano, desconto, casos disponíveis, permissões nem acesso — e é
// independente dos vouchers do Stripe (quem usa um cupão não fica atribuído
// à origem com o mesmo nome; quem veio por um link e não usa cupão continua
// atribuído).
//
// Fluxo: o middleware lê ?ref= e guarda a primeira origem válida num cookie
// (first-touch, 30 dias) → o servidor grava-a em utilizadores.acquisition_source
// (função origem_aquisicao_registar: só se vazia, só para contas criadas
// depois da visita) → vai na metadata das Checkout Sessions.
// Fonte de verdade: utilizadores.acquisition_source. O Stripe é só cópia.

export const COOKIE_ORIGEM = "dolado_origem";
export const ORIGEM_JANELA_DIAS = 30;
export const PARAMETRO_ORIGEM = "ref";
export const CHAVE_METADATA_ORIGEM = "acquisition_source";

const MAX_COMPRIMENTO = 64;
// Letras minúsculas, números, "_" e "-"; começa por letra ou número; pelo
// menos uma letra (um valor só com dígitos pode ser um telefone ou um NIF).
const FORMATO = /^[a-z0-9][a-z0-9_-]{1,63}$/;
// Tolerância para relógios diferentes entre servidores.
const FOLGA_MS = 5 * 60 * 1000;

/** Ligado só com ORIGEM_AQUISICAO_ATIVO=1 (Política de Privacidade e cookies têm de o descrever antes). */
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

/** Opções do cookie: partilhado entre dolado.pt e portal.dolado.pt (a conta e o Checkout vivem no portal). */
export function opcoesCookieOrigem(host: string, producao: boolean) {
  const dominio = host === "dolado.pt" || host.endsWith(".dolado.pt") ? ".dolado.pt" : undefined;
  return {
    httpOnly: true,
    secure: producao,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ORIGEM_JANELA_DIAS * 24 * 3600,
    ...(dominio ? { domain: dominio } : {}),
  };
}

/**
 * Acrescenta a origem à metadata do Stripe sem substituir nada do que já lá
 * está. Sem origem válida, devolve a metadata tal como veio.
 */
export function comOrigemNaMetadata(metadata: Record<string, string>, origem: string | null | undefined) {
  const valida = normalizarOrigem(origem);
  if (!valida || CHAVE_METADATA_ORIGEM in metadata) return metadata;
  return { ...metadata, [CHAVE_METADATA_ORIGEM]: valida };
}

/** Origem lida da metadata de uma Checkout Session (só valores no formato). */
export function origemDaMetadata(metadata: Record<string, string> | null | undefined) {
  return normalizarOrigem(metadata?.[CHAVE_METADATA_ORIGEM]);
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
