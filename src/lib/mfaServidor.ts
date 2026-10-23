// Leitura do MFA da sessão (servidor). Regras em mfa.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FactorResumo, NivelAal } from "./mfa.ts";

/** Nível da sessão e factores TOTP da conta (verificados e por verificar). */
export async function lerMfa(supabase: SupabaseClient): Promise<{ nivel: NivelAal; factores: FactorResumo[] }> {
  const [{ data: aal }, { data: lista }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  const factores = (lista?.all ?? [])
    .filter((f) => f.factor_type === "totp")
    .map((f) => ({
      id: f.id,
      nome: f.friendly_name ?? "",
      verificado: f.status === "verified",
      criadoEm: f.created_at,
    }));
  return { nivel: aal?.currentLevel === "aal2" ? "aal2" : "aal1", factores };
}
