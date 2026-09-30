// dolado.pt serve só as páginas de marketing; tudo o resto (login, portal,
// backoffice) corre em portal.dolado.pt — ver o comentário em
// src/middleware.ts sobre PAGINAS_SO_MARKETING. Um link para "/" ou
// "/#precario" gerado a partir de código que corre no portal tem de
// apontar de volta para este domínio, nunca para o próprio portal (a raiz
// de portal.dolado.pt redirecciona sempre para /entrar).
export const MARKETING_SITE_URL = "https://dolado.pt";

// Contactos institucionais (decisão de 30/09/2026 — ver CLAUDE.md):
// contacto geral/comercial vs. privacidade/RGPD. O e-mail pessoal do
// Thiago não é usado como contacto público.
export const CONTACTO_EMAIL = "contacto@dolado.pt";
export const PRIVACIDADE_EMAIL = "privacidade@dolado.pt";
