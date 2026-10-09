// Idioma preferido de uma conta — regras puras (sem I/O), testadas com
// `node --test` (src/lib/idiomaConta.test.mjs).
//
// Onde fica: `user_metadata.idioma` da Supabase Auth ("pt-PT" | "en-GB").
// Não há coluna nem tabela própria: os templates da Supabase Auth
// (confirmação, recuperação) só conseguem ler os metadados da conta
// (`{{ .Data.idioma }}`), e o servidor lê o mesmo valor com a service role
// (idiomaContaServidor.ts). Uma só fonte.
//
// Quando é gravado: ao criar a conta, com o idioma do percurso onde foi
// criada (/ → pt-PT, /en → en-GB) — signUp por e-mail (dadosContaNova) e,
// nas contas novas pelo Google, no /auth/callback.
//
// Só apresentação (idioma dos e-mails): nunca decide acesso, planos,
// pagamentos nem regras. O cliente consegue alterar os próprios
// user_metadata, por isso este valor NUNCA pode ser usado para autorizar
// nada. Contas antigas (sem valor) e qualquer valor desconhecido → pt-PT.

import { IDIOMA_PADRAO, normalizarIdioma, type Idioma } from "../i18n/config.ts";

/** Chave em user_metadata (raw_user_meta_data) da Supabase Auth. */
export const CHAVE_IDIOMA_CONTA = "idioma";

/** Janela em que uma conta conta como "acabada de criar" no /auth/callback (Google). */
export const JANELA_CONTA_NOVA_MS = 15 * 60 * 1000;

/** Idioma preferido a partir dos metadados da conta; sem valor/desconhecido → português. */
export function idiomaDosMetadados(metadados: unknown): Idioma {
  if (!metadados || typeof metadados !== "object") return IDIOMA_PADRAO;
  return normalizarIdioma((metadados as Record<string, unknown>)[CHAVE_IDIOMA_CONTA]);
}

/** true quando os metadados já têm um idioma válido guardado. */
export function temIdiomaGuardado(metadados: unknown): boolean {
  if (!metadados || typeof metadados !== "object") return false;
  const v = (metadados as Record<string, unknown>)[CHAVE_IDIOMA_CONTA];
  return v === "pt-PT" || v === "en-GB";
}

/**
 * No /auth/callback: gravar o idioma só numa conta acabada de criar (Google)
 * que ainda não o tem. Contas antigas sem idioma continuam em português —
 * o idioma é o do percurso em que a conta foi criada, não o da última visita.
 */
export function deveGravarIdiomaNoCallback(metadados: unknown, criadaEm: string | null | undefined, agora: Date = new Date()): boolean {
  if (temIdiomaGuardado(metadados) || !criadaEm) return false;
  const criada = Date.parse(criadaEm);
  if (Number.isNaN(criada)) return false;
  return agora.getTime() - criada <= JANELA_CONTA_NOVA_MS;
}

/** Idioma guardado nos metadados, ou null quando a conta não tem (conta antiga). */
export function preferenciaDosMetadados(metadados: unknown): Idioma | null {
  return temIdiomaGuardado(metadados) ? idiomaDosMetadados(metadados) : null;
}

/**
 * E-mail de pagamento confirmado: o idioma da conta; sem conta (compra sem
 * sessão) ou conta sem idioma, o do Checkout — `locale` "en-GB" só é posto
 * nas compras feitas em /en (em português o Stripe não recebe locale).
 */
export function idiomaDoEmailPagamento(preferenciaConta: Idioma | null, localeCheckout: string | null | undefined): Idioma {
  if (preferenciaConta) return preferenciaConta;
  return typeof localeCheckout === "string" && localeCheckout.toLowerCase().startsWith("en") ? "en-GB" : IDIOMA_PADRAO;
}
