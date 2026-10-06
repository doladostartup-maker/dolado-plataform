"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { lerRegraDoFormulario } from "@/lib/rascunhoIA/regras";

// Base jurídica da DoLado. Escrita com a sessão do admin (RLS: só admin).
// As regras nunca se apagam: desativar. Cada geração da IA guarda uma cópia
// das regras que recebeu, por isso rever uma regra não altera a auditoria.

const LISTA = "/backoffice/regras-juridicas";

const AVISO_REVISAO_RETIRADA =
  "Regra guardada. Como o conteúdo jurídico mudou, deixou de estar revista e ficou inativa. Depois de rever o texto, indique a nova data de revisão e volte a ativá-la.";

export async function criarRegra(formData: FormData) {
  const { supabase } = await requireAdmin();
  const r = lerRegraDoFormulario((c) => formData.get(c));
  if (!r.ok) redirect(`${LISTA}?erro=${encodeURIComponent(r.erro)}`);
  const { error } = await supabase.from("regras_juridicas").insert(r.dados);
  if (error) {
    const msg = error.code === "23505" ? "Já existe uma regra com este código." : "Não foi possível guardar a regra.";
    redirect(`${LISTA}?erro=${encodeURIComponent(msg)}`);
  }
  revalidatePath(LISTA);
  redirect(`${LISTA}?ok=${encodeURIComponent("Regra criada.")}`);
}

export async function atualizarRegra(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const r = lerRegraDoFormulario((c) => formData.get(c));
  if (!r.ok) redirect(`${LISTA}/${id}?erro=${encodeURIComponent(r.erro)}`);
  const { data, error } = await supabase.from("regras_juridicas").update(r.dados).eq("id", id).select("revista_em").maybeSingle();
  if (error || !data) {
    const msg = error?.code === "23505" ? "Já existe uma regra com este código." : "Não foi possível guardar a regra.";
    redirect(`${LISTA}/${id}?erro=${encodeURIComponent(msg)}`);
  }
  revalidatePath(LISTA);
  // A base de dados retira a revisão quando o conteúdo jurídico muda sem nova
  // data de revisão (20261006150000_regras_juridicas_revisao_ao_alterar.sql).
  if (r.dados.revista_em && !data.revista_em) {
    revalidatePath(`${LISTA}/${id}`);
    redirect(`${LISTA}/${id}?aviso=${encodeURIComponent(AVISO_REVISAO_RETIRADA)}`);
  }
  redirect(`${LISTA}?ok=${encodeURIComponent("Regra atualizada.")}`);
}
