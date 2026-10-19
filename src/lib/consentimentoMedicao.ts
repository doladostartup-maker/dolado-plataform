// Que scripts de medição podem correr, consoante o consentimento dado no
// banner do Cookiebot. Sem resposta, ou sem Cookiebot (bloqueado, domínio não
// autorizado, erro de rede), nada corre: falha sempre fechada.
//
// - Estatística → GA4 (G-B4PQKLZ2BF, G-KD6C514Q1Q).
// - Marketing → Google Ads (AW-…) e conversões melhoradas (e-mail em hash).
// - Marketing → Pixel da Meta (só com NEXT_PUBLIC_META_PIXEL_ID definido;
//   ver metaPixelId()).
// - GTM: o contentor carrega etiquetas de GA4 e de Google Ads, por isso só
//   corre com as duas categorias.

export type ConsentimentoMedicao = { estatisticas: boolean; marketing: boolean };

export const SEM_CONSENTIMENTO: ConsentimentoMedicao = { estatisticas: false, marketing: false };

type CookiebotMinimo = { hasResponse?: boolean; consent?: { statistics?: boolean; marketing?: boolean } } | undefined;

export function lerConsentimento(cookiebot: CookiebotMinimo): ConsentimentoMedicao {
  if (!cookiebot?.hasResponse || !cookiebot.consent) return SEM_CONSENTIMENTO;
  return { estatisticas: cookiebot.consent.statistics === true, marketing: cookiebot.consent.marketing === true };
}

export function scriptsDeMedicao({ estatisticas, marketing }: ConsentimentoMedicao) {
  return {
    /** Biblioteca gtag.js (necessária ao GA4 e ao Google Ads). */
    gtag: estatisticas || marketing,
    ga4: estatisticas,
    ads: marketing,
    gtm: estatisticas && marketing,
    meta: marketing,
  };
}

/**
 * ID do Pixel da Meta (só dígitos). Lido no build: mudar exige novo build.
 * Vazio ou inválido = Pixel desligado, mesmo com consentimento.
 */
export function metaPixelId(valor: string | undefined = process.env.NEXT_PUBLIC_META_PIXEL_ID): string | null {
  const id = valor?.trim() ?? "";
  return /^\d{10,20}$/.test(id) ? id : null;
}
