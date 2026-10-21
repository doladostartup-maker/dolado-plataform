// Área do parceiro: leituras com a sessão do próprio (RLS e auth.uid() na
// base de dados). Nunca usa a service role — o parceiro só vê o que
// parceiro_area_resumo() devolve.
import type { createClient } from "@/lib/supabase/server";
import { areaParceiroAtiva, lerResumoArea, type ResumoArea } from "./area";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** A conta da sessão tem acesso activo à área (para a entrada na navegação). */
export async function contaTemAreaParceiro(supabase: SupabaseClient, userId: string) {
  if (!areaParceiroAtiva()) return false;
  const { data, error } = await supabase
    .from("parceiros_area_acessos")
    .select("id")
    .eq("user_id", userId)
    .is("revogado_em", null)
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

/** Resumo agregado do parceiro da sessão; null sem acesso (ou com erro). */
export async function carregarResumoArea(supabase: SupabaseClient): Promise<ResumoArea | null> {
  const { data, error } = await supabase.rpc("parceiro_area_resumo");
  if (error) return null;
  return lerResumoArea(data);
}
