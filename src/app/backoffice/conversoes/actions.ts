"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

/**
 * Regista a resolução manual de uma conversão com intervenção. Corre com a
 * sessão do admin (RLS: só o admin pode, e só nas colunas de resolução) —
 * não cria reembolsos nem mexe na assinatura; isso é feito no Stripe.
 */
export async function resolverIntervencao(id: string, formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const nota = ((formData.get("nota") as string | null) ?? "").trim();

  if (!nota) {
    redirect(`/backoffice/conversoes/${id}?erro=${encodeURIComponent("Descreva o que foi feito antes de marcar como resolvida.")}`);
  }

  const agora = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversoes_avulso")
    .update({
      requer_intervencao: false,
      intervencao_resolvida_em: agora,
      intervencao_resolvida_por: user.id,
      intervencao_nota: nota,
      updated_at: agora,
    })
    .eq("id", id)
    .eq("requer_intervencao", true)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(`/backoffice/conversoes/${id}?erro=${encodeURIComponent("Não foi possível marcar como resolvida (pode já ter sido resolvida).")}`);
  }

  revalidatePath("/backoffice/conversoes");
  redirect("/backoffice/conversoes?resolvida=1");
}
