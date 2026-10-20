// Chat em direto (Crisp) nas páginas públicas: regras sem I/O.
//
// - Só em PAGINAS_COM_CRISP (homepage, preçário, simulador), nunca no portal,
//   backoffice, /tratar-caso, /comprar nem checkout (teste em crisp.test.mjs).
// - Desligado por omissão: CRISP_ATIVO=1 liga (lido no servidor, no build das
//   páginas estáticas — mudar exige novo build).
// - Só carrega depois de o Cookiebot confirmar a categoria "preferências"
//   (funcionalidades). Sem Cookiebot ou sem resposta no banner, nada corre
//   (falha fechada, como a medição). Retirar o consentimento apaga os cookies
//   do Crisp e recarrega a página, para que o widget deixe de correr.
// - Nunca enviar dados ao Crisp: nada de user:email, user:nickname,
//   session:data nem segmentos. O visitante escreve o que quiser na conversa.
//
// O Crisp (Crisp IM SAS, França) usa cookies `crisp-client/…` (sessão do chat,
// 6 meses; o nome chega codificado: `crisp-client%2Fsession%2F<id>`), chaves
// `crisp-client/…` no localStorage (verificado a 19/10/2026, apesar de a
// documentação do Crisp dizer que só usa cookies) e guarda o IP no servidor
// (~30 min sem conversa; mais tempo se houver conversa). Ver docs/legal/rascunho-privacidade-crisp.md.

import type { Idioma } from "@/i18n/config";

export const CRISP_WEBSITE_ID = "cfb093ab-62ad-4315-8103-1430f3a89faa";
export const CRISP_SCRIPT_URL = "https://client.crisp.chat/l.js";
/** id do <script> inserido: evita carregamentos duplicados. */
export const CRISP_SCRIPT_ID = "crisp-chat";

/** Caminhos lógicos (sem /en) onde o chat pode aparecer. */
export const PAGINAS_COM_CRISP = ["/", "/precario", "/simulador-elegibilidade"] as const;

/** Categoria do Cookiebot que liberta o Crisp (também em data-cookieconsent). */
export const CATEGORIA_COOKIEBOT_CRISP = "preferences";

export function crispAtivo(valor: string | undefined = process.env.CRISP_ATIVO) {
  return valor === "1";
}

type CookiebotMinimo = { hasResponse?: boolean; consent?: { preferences?: boolean } } | undefined;

/** Pode carregar o Crisp? Só com resposta no banner e "preferências" aceites. */
export function crispPermitido(cookiebot: CookiebotMinimo): boolean {
  return cookiebot?.hasResponse === true && cookiebot.consent?.preferences === true;
}

/** Locale da interface do Crisp (ISO 639-1), igual ao idioma da página. */
export function localeCrisp(idioma: Idioma): "pt" | "en" {
  return idioma === "en-GB" ? "en" : "pt";
}

/** Cookie ou chave de armazenamento do Crisp (nome em claro ou codificado). */
export function ehCookieCrisp(nome: string): boolean {
  return nome.startsWith("crisp-client");
}

/**
 * Linhas de document.cookie que apagam um cookie do Crisp: sem domínio, no
 * próprio host e no domínio-base (ex.: .dolado.pt), onde o Crisp o pode ter
 * criado para o partilhar entre subdomínios.
 */
export function linhasApagarCookieCrisp(nome: string, hostname: string): string[] {
  const expira = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  const dominios = new Set<string>();
  const partes = hostname.split(".");
  if (partes.length >= 2 && !/^\d+$/.test(partes[partes.length - 1])) {
    dominios.add(hostname);
    dominios.add(partes.slice(-2).join("."));
  }
  return [`${nome}=; ${expira}`, ...[...dominios].map((d) => `${nome}=; ${expira}; domain=.${d}`)];
}
