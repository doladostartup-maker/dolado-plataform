import { caminhoAtivacaoLanding, type Utm } from "./landing30Dias.ts";

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
// MORADA_SEDE é a morada legal registada. A mudança de sede prevista foi
// posta de lado: mantém-se esta morada (decisão de Thiago, 20/10/2026). Se um
// dia mudar: novas versões dos Termos e da Política, rodapé e ENTIDADES_RAL
// em legal.ts (a entidade RAL de referência depende da localização).
export const ENTIDADE_LEGAL = "Competent Domain - Consultoria em Informática Unipessoal Lda";
export const NIPC = "515609773";
export const MORADA_SEDE = "Rua Cidade de Manchester, n.º 35, r/c, 1170-099 Lisboa";

// Início do fluxo "Tratar o meu caso" (formulário → conta → modalidade →
// pagamento). Corre sempre em portal.dolado.pt: a conta é criada antes do
// pagamento e os cookies de sessão são do domínio do portal, para o regresso
// do Stripe já chegar autenticado. Absoluto, para os CTAs de dolado.pt.
export const URL_TRATAR_CASO = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/tratar-caso`;

/** Link para "Tratar o meu caso", com a origem do clique (para medição). */
export function urlTratarCaso(origem?: string) {
  return origem ? `${URL_TRATAR_CASO}?origem=${encodeURIComponent(origem)}` : URL_TRATAR_CASO;
}

// Compra de uma subscrição a partir do preçário de dolado.pt. A decisão é
// sempre tomada em portal.dolado.pt, onde está a sessão (cookies host-only):
// quem já tem conta compra com o Customer da conta e nunca abre uma segunda
// subscrição desligada dela.
/** Ativação da Proteção gratuita (portal.dolado.pt), com a página de origem (só métricas). */
export function urlExperimentarProtecao(origem: "homepage" | "precario" | "protecao") {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/experimentar-protecao?origem=${origem}`;
}

/** Caminho absoluto em portal.dolado.pt (sessão, registo, activação). */
export function urlPortal(caminho: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${caminho}`;
}

/** Activação vinda da landing /30-dias-gratis, com os UTM do anúncio (src/lib/landing30Dias.ts). */
export function urlAtivacaoLanding(utm: Utm = {}) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${caminhoAtivacaoLanding(utm)}`;
}

/** Oferta da Proteção gratuita ligada nas páginas públicas (lido no build). */
export function ofertaProtecaoGratuitaPublica() {
  return process.env.PROTECAO_GRATUITA_ATIVA === "1";
}

export function urlComprar(plano: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/comprar?plano=${encodeURIComponent(plano)}`;
}
