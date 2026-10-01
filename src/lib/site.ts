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

// Identificação legal da entidade que opera a marca DoLado. Fonte única para
// footer, Termos, Privacidade, modelo de livre resolução e e-mails.
//
// ATENÇÃO — sede em processo de alteração: MORADA_SEDE é a morada legal
// atualmente registada. Só trocar quando a nova sede estiver oficialmente
// registada (checklist em CLAUDE.md, "Pendência da nova sede"). A mudança de
// sede pode alterar a entidade RAL de referência (ENTIDADES_RAL em legal.ts).
export const ENTIDADE_LEGAL = "Competent Domain - Consultoria em Informática Unipessoal Lda";
export const NIPC = "515609773";
export const MORADA_SEDE = "Rua Cidade de Manchester, n.º 35, r/c, 1170-099 Lisboa";
