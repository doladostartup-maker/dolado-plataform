// MFA (TOTP) das contas da DoLado — regras sem I/O.
//
// Fase 1A do piloto DoLado Empresas: o admin inscreve dois factores TOTP
// (principal e de reserva) e confirma uma sessão aal2. Nesta fase o
// backoffice ainda não exige aal2 (isso é a Fase 1B, depois de a inscrição e
// a recuperação estarem testadas em produção). Procedimento de recuperação em
// docs/operacao/recuperacao-mfa-admin.md.

export type NivelAal = "aal1" | "aal2";

export type FactorResumo = {
  id: string;
  nome: string;
  verificado: boolean;
  criadoEm: string;
};

/**
 * - sem_factores: nenhum factor verificado (inscrever o principal);
 * - por_verificar: há factores, mas a sessão é aal1 (introduzir um código);
 * - so_principal: sessão aal2 com um só factor (falta o de reserva);
 * - completo: sessão aal2 com dois ou mais factores.
 */
export type EstadoMfa = "sem_factores" | "por_verificar" | "so_principal" | "completo";

/** Factores necessários: o principal e um de reserva. */
export const FACTORES_NECESSARIOS = 2;

export const NOME_PRINCIPAL = "Principal";
export const NOME_RESERVA = "Reserva";

export function estadoMfa(nivel: NivelAal, factores: FactorResumo[]): EstadoMfa {
  const verificados = factores.filter((f) => f.verificado).length;
  if (verificados === 0) return "sem_factores";
  if (nivel !== "aal2") return "por_verificar";
  return verificados >= FACTORES_NECESSARIOS ? "completo" : "so_principal";
}

/**
 * Nome do próximo factor (o nome tem de ser único por conta na Supabase):
 * o primeiro livre de "Principal", "Reserva", "Reserva 2", "Reserva 3"…
 * (substituir o principal perdido volta a dar "Principal").
 */
export function proximoNomeFactor(factores: FactorResumo[]): string {
  const nomes = new Set(factores.filter((f) => f.verificado).map((f) => f.nome));
  if (!nomes.has(NOME_PRINCIPAL)) return NOME_PRINCIPAL;
  if (!nomes.has(NOME_RESERVA)) return NOME_RESERVA;
  for (let n = 2; ; n++) {
    const nome = `${NOME_RESERVA} ${n}`;
    if (!nomes.has(nome)) return nome;
  }
}

/**
 * Inscrever um factor: sem factores verificados, basta a sessão; com
 * factores, a Supabase exige aal2 (insufficient_aal) — confirmamos antes.
 */
export function podeInscrever(nivel: NivelAal, factores: FactorResumo[]): boolean {
  return factores.every((f) => !f.verificado) || nivel === "aal2";
}

/**
 * Retirar um factor só com aal2 e nunca o último: ficar sem factores pela
 * interface não é possível (a recuperação de último recurso é pelo Dashboard
 * da Supabase, ver o procedimento).
 */
export function podeRemover(nivel: NivelAal, factores: FactorResumo[], factorId: string): boolean {
  const verificados = factores.filter((f) => f.verificado);
  return nivel === "aal2" && verificados.length >= 2 && verificados.some((f) => f.id === factorId);
}

/** Código TOTP de 6 dígitos (aceita espaços, como as aplicações o mostram). */
export function normalizarCodigo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const codigo = valor.replace(/\s/g, "");
  return /^\d{6}$/.test(codigo) ? codigo : null;
}
