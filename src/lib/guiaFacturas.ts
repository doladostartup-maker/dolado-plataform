// E-book gratuito "Está a pagar mais do que devia?" e página /guia-facturas
// (22/10/2026) — regras sem I/O (testáveis com `node --test`,
// guiaFacturas.test.mjs).
//
// Percurso: Instagram/Facebook → /guia-facturas (dolado.pt) → e-mail →
// download imediato. Sem conta, sem pagamento, nada em auth.users. O e-mail
// serve para disponibilizar o guia (registo em guias_pedidos e, no máximo
// uma vez por 24 h, um e-mail transaccional com a ligação). A autorização
// para comunicações comerciais é opcional e separada (texto e versão em
// src/lib/legal.ts) — nunca condição do download e, por agora, sem envios.
//
// Medição: a origem da campanha (instagram / facebook / meta_ads / directo /
// outro) e os UTM do primeiro pedido ficam no registo; nos eventos de
// analytics nunca vai o e-mail. Os eventos do browser só correm com
// consentimento (track() e o Pixel da Meta não existem sem ele).

import { PARAMETROS_UTM, lerUtm, type Utm } from "./landing30Dias.ts";

export const CAMINHO_GUIA_FACTURAS = "/guia-facturas";
export const GUIA_FACTURAS_ID = "guia_facturas";

/** PDF servido como ficheiro estático em dolado.pt (public/guias). */
export const FICHEIRO_GUIA_FACTURAS = "/guias/guia-facturas-dolado.pdf";
export const URL_GUIA_FACTURAS = `https://dolado.pt${FICHEIRO_GUIA_FACTURAS}`;
export const CAPA_GUIA_FACTURAS = "/guias/capa-guia-facturas.jpg";
export const PARTILHA_GUIA_FACTURAS = "/guias/partilha-guia-facturas.jpg";

/** Campos do formulário. `website` é a armadilha para robôs (escondida). */
export const CAMPOS_GUIA = {
  email: "email",
  comunicacoes: "comunicacoes",
  armadilha: "website",
  idioma: "idioma",
  origem: "origem",
} as const;
export const VALOR_COMUNICACOES = "sim";

/** Exemplo no campo do e-mail (é um endereço, não texto: fica fora dos dicionários). */
export const EXEMPLO_EMAIL = { "pt-PT": "exemplo@email.pt", "en-GB": "example@email.com" } as const;

/** Página ligada (lido no build; GUIA_FACTURAS_ATIVO=1). Desligada, redirecciona e a acção recusa. */
export function guiaFacturasAtivo(env: Record<string, string | undefined> = process.env) {
  return env.GUIA_FACTURAS_ATIVO === "1";
}

const MAXIMO_EMAIL = 254;
// Uma parte local e um domínio com pelo menos um ponto e um TLD de 2+ letras;
// sem espaços nem caracteres de controlo. Não pretende validar tudo o que o
// RFC permite — só recusar o que claramente não é um endereço.
const PADRAO_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

/** E-mail normalizado (minúsculas, sem espaços à volta) ou null se não for válido. */
export function normalizarEmail(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const email = valor.trim().toLowerCase();
  if (email.length < 6 || email.length > MAXIMO_EMAIL) return null;
  if (!PADRAO_EMAIL.test(email)) return null;
  const [local] = email.split("@");
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  return email;
}

export const ORIGENS_GUIA = ["instagram", "facebook", "meta_ads", "directo", "outro"] as const;
export type OrigemGuia = (typeof ORIGENS_GUIA)[number];

const MEIOS_PAGOS = /^(paid|paid_social|paidsocial|cpc|cpm|ads?|anuncio|anuncios)$/;

/**
 * Origem da visita, a partir dos UTM e do domínio de onde veio (só o nome
 * do anfitrião do referrer, nunca o caminho). Anúncios: utm_medium pago com
 * fonte Meta, ou o parâmetro fbclid. Sem UTM nem referrer: directo.
 */
export function classificarOrigem(utm: Utm, referrerHost: string | null = null, temFbclid = false): OrigemGuia {
  const fonte = (utm.utm_source ?? "").toLowerCase();
  const meio = (utm.utm_medium ?? "").toLowerCase();
  const daMeta = /(^|[^a-z])(ig|instagram|fb|facebook|meta)([^a-z]|$)/.test(fonte);
  if (daMeta && MEIOS_PAGOS.test(meio)) return "meta_ads";
  if (/instagram|(^|[^a-z])ig([^a-z]|$)/.test(fonte)) return "instagram";
  if (/facebook|(^|[^a-z])fb([^a-z]|$)|(^|[^a-z])meta([^a-z]|$)/.test(fonte)) return "facebook";
  if (fonte) return "outro";
  if (temFbclid) return "meta_ads";
  const host = (referrerHost ?? "").toLowerCase();
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
  if (!host) return "directo";
  return "outro";
}

/** Só valores da lista fechada (o browser pode enviar qualquer coisa). */
export function origemValida(valor: unknown): OrigemGuia {
  return ORIGENS_GUIA.includes(valor as OrigemGuia) ? (valor as OrigemGuia) : "outro";
}

/** UTM vindos do formulário (campos escondidos), reduzidos aos cinco e limpos. */
export function utmDoFormulario(form: { get(nome: string): unknown }): Utm {
  const valores: Record<string, string> = {};
  for (const nome of PARAMETROS_UTM) {
    const v = form.get(nome);
    if (typeof v === "string") valores[nome] = v;
  }
  return lerUtm(valores);
}

export { lerUtm, PARAMETROS_UTM as PARAMETROS_UTM_GUIA };
export type { Utm };
