// DoLado Empresas — separação entre contas particulares e de empresa (regras
// sem I/O). Fase 3 do piloto (docs/especificacoes/DOLADO_EMPRESAS_PILOTO.md).
//
// Uma conta de empresa nunca usa um fluxo particular (portal, casos,
// Protecção, compras, indicações, diagnóstico particular). Quando chega a um,
// é encaminhada para a entrada das empresas — a página nasce na Fase 4;
// até lá não existem contas de empresa (EMPRESAS_ATIVO desligado).

export type TipoConta = "particular" | "empresa";

export const DESTINO_CONTA_EMPRESA = "/empresas/entrar";
export const MOTIVO_CONTA_EMPRESA = "conta_empresa";

/** Destino de uma conta de empresa que chegou a um fluxo particular. */
export function destinoContaEmpresa(): string {
  return `${DESTINO_CONTA_EMPRESA}?motivo=${MOTIVO_CONTA_EMPRESA}`;
}

/** Valor lido da base de dados → tipo de conta (desconhecido = particular, o de sempre). */
export function tipoContaDe(valor: unknown): TipoConta {
  return valor === "empresa" ? "empresa" : "particular";
}

/**
 * Métodos de autenticação da sessão (claim amr do JWT) incluem um fornecedor
 * externo (Google)? Uma conta de empresa nunca entra assim.
 */
export function entrouPorOAuth(amr: unknown): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((m) => (typeof m === "string" ? m : (m as { method?: unknown })?.method) === "oauth");
}

/** Contexto de uma ocorrência (rota/acção): curto, sem dados pessoais. */
export function contextoOcorrencia(contexto: string): string {
  const limpo = contexto.replace(/[^a-z0-9/_\-.:]/gi, "").slice(0, 200);
  return limpo || "desconhecido";
}
