// Recuperação da palavra-passe — regras puras, testáveis com `node --test`
// (recuperarPalavraPasse.test.mjs).
//
// Fluxo: /login → "Esqueceu-se da palavra-passe?" → /recuperar-palavra-passe
// (e-mail; resposta sempre igual) → e-mail da Supabase (template
// supabase/templates/recuperacao.html) → /redefinir-palavra-passe?token_hash=…
// → nova palavra-passe (POST) → /login?alterada=1.
//
// Nunca se revela se um e-mail tem conta: o pedido mostra sempre a mesma
// mensagem (com ou sem conta, com erro da Supabase ou limite de pedidos).
// A ligação do e-mail só é validada no POST explícito — abrir a página (GET,
// ex. pelo verificador de ligações de um cliente de e-mail) não gasta o token.

export const ROTA_RECUPERAR = "/recuperar-palavra-passe";
export const ROTA_REDEFINIR = "/redefinir-palavra-passe";

/** Mostrada depois de qualquer pedido de recuperação, exista ou não a conta. */
export const MSG_PEDIDO_RECUPERACAO =
  "Se existir uma conta associada a este endereço, receberá um e-mail com instruções para definir uma nova palavra-passe.";

export const MSG_PALAVRA_PASSE_ALTERADA =
  "A sua palavra-passe foi alterada. Inicie sessão com a nova palavra-passe.";

export const PALAVRA_PASSE_MIN = 8;
/** Limite do bcrypt usado pela Supabase Auth (bytes a mais são ignorados). */
export const PALAVRA_PASSE_MAX = 72;

export const REQUISITOS_PALAVRA_PASSE = `Pelo menos ${PALAVRA_PASSE_MIN} caracteres, com letras e números.`;

export function emailComFormatoValido(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Valida a nova palavra-passe antes de gastar a ligação. Devolve a mensagem de erro ou null. */
export function validarNovaPalavraPasse(palavraPasse: unknown, confirmacao: unknown): string | null {
  if (typeof palavraPasse !== "string" || palavraPasse.length === 0) return "Introduza a nova palavra-passe.";
  if (palavraPasse.length < PALAVRA_PASSE_MIN) {
    return `A palavra-passe tem de ter pelo menos ${PALAVRA_PASSE_MIN} caracteres.`;
  }
  if (new TextEncoder().encode(palavraPasse).length > PALAVRA_PASSE_MAX) {
    return `A palavra-passe é demasiado longa. Use no máximo ${PALAVRA_PASSE_MAX} caracteres.`;
  }
  if (!/\p{L}/u.test(palavraPasse) || !/\p{N}/u.test(palavraPasse)) {
    return "A palavra-passe tem de ter letras e números.";
  }
  if (palavraPasse !== confirmacao) return "As palavras-passe não coincidem.";
  return null;
}

/** token_hash do e-mail (hexadecimal, ou com prefixo pkce_). Evita mandar lixo à Supabase. */
export function tokenRecuperacaoComFormatoValido(token: unknown): token is string {
  return typeof token === "string" && /^(pkce_)?[A-Za-z0-9_-]{16,128}$/.test(token);
}

/** code do fluxo PKCE (template por omissão da Supabase, mesmo browser). */
export function codigoPkceComFormatoValido(codigo: unknown): codigo is string {
  return typeof codigo === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo);
}

export type EstadoLigacao = "expirada" | "invalida";

/** Erro da Supabase ao validar a ligação → estado mostrado na página (sem detalhes técnicos). */
export function estadoLigacaoDoErro(codigo: string | undefined, mensagem: string | undefined): EstadoLigacao {
  if (codigo === "otp_expired" || codigo === "flow_state_expired" || /expired/i.test(mensagem ?? "")) return "expirada";
  return "invalida";
}

export const MSG_LIGACAO: Record<EstadoLigacao, { titulo: string; texto: string }> = {
  expirada: {
    titulo: "Esta ligação expirou ou já não é válida.",
    texto: "Por segurança, cada ligação só pode ser usada uma vez e é válida durante um período limitado. Peça uma nova ligação.",
  },
  invalida: {
    titulo: "Esta ligação não é válida.",
    texto: "Abra a ligação do e-mail mais recente que lhe enviámos ou peça uma nova ligação.",
  },
};

export function estadoLigacaoValido(estado: unknown): estado is EstadoLigacao {
  return estado === "expirada" || estado === "invalida";
}

/** URL de regresso a esta página, com a ligação do e-mail (nunca dados pessoais). */
export function urlRedefinir(dados: { token?: string | null; codigo?: string | null; continuar?: boolean; erro?: string }) {
  const p = new URLSearchParams();
  if (dados.token) p.set("token_hash", dados.token);
  else if (dados.codigo) p.set("code", dados.codigo);
  else if (dados.continuar) p.set("continuar", "1");
  if (dados.erro) p.set("erro", dados.erro);
  const q = p.toString();
  return q ? `${ROTA_REDEFINIR}?${q}` : ROTA_REDEFINIR;
}
