// DoLado Empresas — separação entre contas particulares e de empresa (regras
// sem I/O). Fase 3 do piloto (docs/especificacoes/DOLADO_EMPRESAS_PILOTO.md).
//
// Uma conta de empresa nunca usa um fluxo particular (portal, casos,
// Protecção, compras, indicações, diagnóstico particular). Quando chega a um,
// é encaminhada para a entrada das empresas (Fase 4).

export type TipoConta = "particular" | "empresa";

export const ROTAS_EMPRESA = {
  entrar: "/empresas/entrar",
  registo: "/empresas/registo",
  verificar: "/empresas/verificar",
  recuperar: "/empresas/recuperar-palavra-passe",
  redefinir: "/empresas/redefinir-palavra-passe",
  recuperacaoAssistida: "/empresas/recuperacao-assistida",
  painel: "/empresa",
  seguranca: "/empresa/seguranca",
} as const;

/** Caminhos das contas de empresa (só em português, D1): /en → 308 sem prefixo. */
export function ehCaminhoDeContaEmpresa(caminho: string): boolean {
  return (
    caminho === "/empresa" ||
    caminho.startsWith("/empresa/") ||
    Object.values(ROTAS_EMPRESA).some((r) => r.startsWith("/empresas/") && (caminho === r || caminho.startsWith(`${r}/`)))
  );
}

export const DESTINO_CONTA_EMPRESA = ROTAS_EMPRESA.entrar;
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
