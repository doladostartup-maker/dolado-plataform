"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Marca um e-mail em quarentena como visto pela DoLado. Não associa a
// nenhum caso (se for de um caso, regista-se à mão em "Registar resposta da
// empresa", no próprio caso) e não apaga nada (apagado aos 90 dias).
export async function marcarRevista(id: string) {
  const { user } = await requireAdmin();
  const { error } = await createAdminClient()
    .from("comunicacoes_nao_associadas")
    .update({ revista_em: new Date().toISOString(), revista_por: user.id })
    .eq("id", id)
    .is("revista_em", null);
  revalidatePath("/backoffice/respostas-sem-caso");
  redirect(`/backoffice/respostas-sem-caso?${error ? "erro=1" : "revista=1"}`);
}
