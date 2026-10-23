// DoLado Empresas — contas de empresa nos fluxos particulares (servidor).
// Regras em contas.ts. Fase 3 do piloto.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { contextoOcorrencia, entrouPorOAuth, tipoContaDe, type TipoConta } from "./contas.ts";

/** Tipo da conta, lido com o cliente indicado (a sessão lê o próprio perfil). */
export async function tipoContaDoUtilizador(supabase: SupabaseClient, userId: string): Promise<TipoConta> {
  const { data, error } = await supabase.from("utilizadores").select("tipo_conta").eq("id", userId).maybeSingle();
  // Falha fechada: um erro de leitura nunca passa por conta particular.
  if (error) throw new Error(`utilizadores.select: ${error.message}`);
  return tipoContaDe(data?.tipo_conta);
}

/**
 * Regista que um guarda recusou uma conta de empresa (empresa_ocorrencias:
 * só o tipo e a rota, sem conteúdo). Nunca impede a recusa.
 */
export async function registarGuardaRecusado(userId: string, contexto: string): Promise<void> {
  try {
    await createAdminClient()
      .from("empresa_ocorrencias")
      .insert({ utilizador_id: userId, tipo: "guarda_recusado", contexto: contextoOcorrencia(contexto) });
  } catch {
    // A recusa acontece na mesma; o registo é só instrumentação.
  }
}

/**
 * Sessão acabada de criar num percurso particular (login, código, Google).
 * Se a conta for de empresa: retira a identidade Google (uma conta de
 * empresa nunca entra pelo Google — a Supabase liga identidades com o mesmo
 * e-mail), termina a sessão neste browser e regista a ocorrência.
 * Devolve true quando a conta era de empresa (o chamador encaminha para
 * destinoContaEmpresa()).
 */
export async function recusarSessaoDeEmpresa(
  supabase: SupabaseClient,
  userId: string,
  contexto: string,
  accessToken?: string | null,
): Promise<boolean> {
  if ((await tipoContaDoUtilizador(supabase, userId)) !== "empresa") return false;

  // Resultado da retirada no contexto da ocorrência: ":google_por_retirar"
  // fica para o admin (a retirada pela sessão exige a ligação manual de
  // identidades activa na Supabase — validação V3 do plano).
  let google = "";
  if (accessToken && entrouPorOAuth(lerClaim(accessToken, "amr"))) {
    google = ":google_por_retirar";
    try {
      const { data } = await supabase.auth.getUserIdentities();
      const identidade = data?.identities.find((i) => i.provider === "google");
      if (identidade && (data?.identities.length ?? 0) > 1) {
        const { error } = await supabase.auth.unlinkIdentity(identidade);
        if (!error) google = ":google_retirada";
      }
    } catch {
      // Sem a retirada, a sessão termina na mesma; o guarda recusa sempre.
    }
  }
  await supabase.auth.signOut({ scope: "local" });
  await registarGuardaRecusado(userId, contexto + google);
  return true;
}

function lerClaim(token: string, nome: string): unknown {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"))?.[nome];
  } catch {
    return undefined;
  }
}
