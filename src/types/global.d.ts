export {};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    /** Cookiebot (consent.cookiebot.com/uc.js): só existe depois de carregado. */
    Cookiebot?: {
      hasResponse?: boolean;
      consent?: { necessary?: boolean; preferences?: boolean; statistics?: boolean; marketing?: boolean };
      renew?: () => void;
    };
    /** Pixel da Meta (connect.facebook.net/…/fbevents.js): só com consentimento de marketing. */
    fbq?: (...args: unknown[]) => void;
  }
}
