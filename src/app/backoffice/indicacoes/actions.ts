"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Decisão sobre um desconto de indicação em revisão (possível
 * auto-indicação). Só o admin; a função da base de dados só decide descontos
 * ainda "em_revisao" (idempotente).
 */
export async function reverRecompensaIndicacao(recompensaId: string, aprovar: boolean, formData: FormData) {
  await requireAdmin();
  const motivo = ((formData.get("motivo") as string | null) ?? "").trim();
  if (!aprovar && !motivo) {
    redirect(`/backoffice/indicacoes?erro=${encodeURIComponent("Indique o motivo antes de recusar o desconto.")}`);
  }
  const { data, error } = await createAdminClient().rpc("indicacao_rever_recompensa", {
    p_id: recompensaId,
    p_aprovar: aprovar,
    p_motivo: motivo || (aprovar ? "aprovada_na_revisao" : ""),
  });
  if (error || data !== true) {
    redirect(`/backoffice/indicacoes?erro=${encodeURIComponent("Não foi possível registar a decisão (pode já ter sido decidida).")}`);
  }
  revalidatePath("/backoffice/indicacoes");
  redirect(`/backoffice/indicacoes?decidida=${aprovar ? "aprovada" : "recusada"}`);
}
