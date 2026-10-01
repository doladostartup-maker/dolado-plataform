"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarEquipaAlteracoes } from "@/lib/textoCasoServidor";

// O mesmo fluxo das páginas públicas, para o cliente autenticado. As regras
// são as mesmas funções da base de dados; aqui a identidade vem da sessão e
// a base de dados confirma que o caso é do cliente.

function voltar(casoId: string, resultado: string): never {
  revalidatePath(`/portal/casos/${casoId}`);
  redirect(`/portal/casos/${casoId}?texto=${encodeURIComponent(resultado)}#texto`);
}

export async function autorizarTextoNoPortal(casoId: string, textoId: string) {
  const { user } = await requireUser();
  const { data, error } = await createAdminClient().rpc("texto_autorizar_no_portal", {
    p_texto_id: textoId,
    p_utilizador: user.id,
  });
  voltar(casoId, error ? "erro" : ((data as { resultado?: string })?.resultado ?? "erro"));
}

export async function pedirAlteracoesNoPortal(casoId: string, textoId: string, formData: FormData) {
  const { user } = await requireUser();
  const mensagem = (formData.get("mensagem") as string | null) ?? "";
  if (!mensagem.trim()) voltar(casoId, "mensagem_invalida");
  const { data, error } = await createAdminClient().rpc("texto_pedir_alteracoes_no_portal", {
    p_texto_id: textoId,
    p_utilizador: user.id,
    p_mensagem: mensagem,
  });
  const r = error ? "erro" : ((data as { resultado?: string; versao?: number })?.resultado ?? "erro");
  if (r === "pedido_registado") await avisarEquipaAlteracoes(casoId, (data as { versao?: number }).versao ?? null);
  voltar(casoId, r);
}
