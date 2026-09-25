import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("role")
    .eq("id", user.id)
    .single();

  if (perfil?.role !== "admin") {
    redirect("/conta");
  }

  return { supabase, user };
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export type NivelAcesso = "nenhum" | "avulso" | "assinatura";

/**
 * Nível de acesso do canal B2C (Stripe). Contas antigas / criadas por
 * outras vias (ex. futura porta da Remax) não têm linha em `user_access`
 * e caem em "nenhum" — o chamador decide o que isso significa no seu
 * contexto (hoje: só o dashboard do portal usa isto para gating).
 */
export async function obterNivelAcesso(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<NivelAcesso> {
  const { data } = await supabase
    .from("user_access")
    .select("nivel_acesso")
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.nivel_acesso as NivelAcesso | undefined) ?? "nenhum";
}

/**
 * Bloqueia o acesso a funcionalidades exclusivas de assinantes. Quem tem
 * plano "avulso" ou "nenhum" é reencaminhado para o dashboard do portal,
 * onde o modal de upgrade explica a oferta.
 */
export async function requireAssinatura(origem: string) {
  const { supabase, user } = await requireUser();
  const nivel = await obterNivelAcesso(supabase, user.id);

  if (nivel !== "assinatura") {
    redirect(`/portal?bloqueado=${encodeURIComponent(origem)}`);
  }

  return { supabase, user };
}
