/** Consentimento registado pelo Cookiebot no cookie CookieConsent. */
export function cookiebotAceitouMarketing(valor: string | null | undefined): boolean {
  if (!valor || valor === "-1") return false;
  try {
    const consentimento = JSON.parse(decodeURIComponent(valor)) as { marketing?: unknown };
    return consentimento.marketing === true;
  } catch {
    return false;
  }
}
