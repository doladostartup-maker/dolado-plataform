"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

/**
 * Regista a resolução manual de uma subscrição duplicada. Corre com a
 * sessão do admin (RLS: só o admin, e só nas colunas de resolução). Não
 * cancela nem reembolsa nada — isso é feito no Stripe Dashboard.
 */
export async function resolverSubscricaoDuplicada(novaSubscriptionId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const nota = ((formData.get("nota") as string | null) ?? "").trim();
  if (!nota) {
    redirect(`/backoffice/compras?erro=${encodeURIComponent("Descreva o que foi feito antes de marcar como resolvida.")}`);
  }

  const { data, error } = await supabase
    .from("subscricoes_duplicadas")
    .update({ estado: "resolvida", resolvido_em: new Date().toISOString(), nota_resolucao: nota })
    .eq("nova_subscription_id", novaSubscriptionId)
    .eq("estado", "por_rever")
    .select("nova_subscription_id")
    .maybeSingle();
  if (error || !data) {
    redirect(`/backoffice/compras?erro=${encodeURIComponent("Não foi possível marcar como resolvida (pode já ter sido resolvida).")}`);
  }

  revalidatePath("/backoffice/compras");
  redirect("/backoffice/compras?resolvida=1");
}
