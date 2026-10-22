// Landing page das campanhas Meta Ads (/30-dias-gratis, 20/10/2026) —
// regras sem I/O (testáveis com `node --test`, landing30Dias.test.mjs).
//
// A landing não tem registo próprio: o CTA leva à activação de sempre em
// portal.dolado.pt (/experimentar-protecao?origem=landing_30d). Sem sessão,
// essa página passa logo ao /registo (21/10/2026: a explicação intermédia
// repetia a landing) e volta a si depois do registo e da confirmação do
// e-mail, onde a pessoa aceita os Termos e activa.
// Os parâmetros UTM do anúncio seguem no URL ao longo desse percurso (só
// apresentação: nunca decidem acesso e não são gravados). A origem
// 'landing_30d' é só métrica (protecao_gratuita.origem e, no registo,
// user_metadata.origem_registo) — nunca acesso, plano nem preço.

export const CAMINHO_LANDING_30_DIAS = "/30-dias-gratis";
export const ORIGEM_LANDING_30_DIAS = "landing_30d";
const ROTA_EXPERIMENTAR = "/experimentar-protecao";

/**
 * Valores dos dois exemplos da landing (fictícios, assinalados como tal):
 * fim de uma promoção e alteração numa factura. Em cêntimos; a diferença é
 * calculada, nunca escrita à mão.
 */
export const EXEMPLOS_LANDING = {
  promocao: { mensalidadeCents: 2990, fim: "2026-12-15T12:00:00Z" },
  factura: { anteriorCents: 3290, actualCents: 3990 },
} as const;

export const PARAMETROS_UTM =["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type Utm = Partial<Record<(typeof PARAMETROS_UTM)[number], string>>;

const MAXIMO_UTM = 150;

type Parametros = URLSearchParams | Record<string, string | string[] | undefined>;

function valor(params: Parametros, nome: string): unknown {
  if (params instanceof URLSearchParams) return params.get(nome);
  const v = params[nome];
  return Array.isArray(v) ? v[0] : v;
}

/** Só os cinco UTM, em texto simples (sem caracteres de controlo, até 150 caracteres). */
export function lerUtm(params: Parametros): Utm {
  const utm: Utm = {};
  for (const nome of PARAMETROS_UTM) {
    const v = valor(params, nome);
    if (typeof v !== "string") continue;
    const limpo = v.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (limpo && limpo.length <= MAXIMO_UTM) utm[nome] = limpo;
  }
  return utm;
}

/** Os UTM como continuação de uma query ("&utm_source=…"), sempre pela mesma ordem. */
export function consultaUtm(utm: Utm): string {
  return PARAMETROS_UTM.filter((n) => utm[n])
    .map((n) => `&${n}=${encodeURIComponent(utm[n] as string)}`)
    .join("");
}

/** Caminho da activação a partir da landing (relativo ao portal), com os UTM. */
export function caminhoAtivacaoLanding(utm: Utm = {}): string {
  return `${ROTA_EXPERIMENTAR}?origem=${ORIGEM_LANDING_30_DIAS}${consultaUtm(utm)}`;
}

/**
 * A activação sem sessão salta a explicação intermédia e vai directa ao
 * registo — só quando se chega da landing ou do diagnóstico gratuito, que já
 * explicaram a oferta (as outras origens mantêm a página com o resumo e as
 * duas opções, criar conta ou iniciar sessão).
 */
export function saltarParaRegisto(origem: string, temSessao: boolean): boolean {
  return !temSessao && (origem === ORIGEM_LANDING_30_DIAS || origem === "diagnostico");
}

/**
 * Origem do registo a gravar na conta nova: só quando o destino do /registo
 * é a activação vinda da landing (com ou sem /en). Qualquer outro destino → null.
 */
export function origemRegistoDoDestino(next: unknown): typeof ORIGEM_LANDING_30_DIAS | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(next, "https://dolado.invalid");
  } catch {
    return null;
  }
  const caminho = url.pathname.replace(/^\/en(?=\/)/, "");
  return caminho === ROTA_EXPERIMENTAR && url.searchParams.get("origem") === ORIGEM_LANDING_30_DIAS
    ? ORIGEM_LANDING_30_DIAS
    : null;
}
