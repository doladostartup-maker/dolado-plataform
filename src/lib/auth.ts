import { cache } from "react";
import { redirect } from "next/navigation";
import { calcularAcesso, type Acesso } from "@/lib/acesso";
import { createClient } from "@/lib/supabase/server";
import { destinoDepoisDeAutenticar } from "@/lib/authServidor";
import { localizarHref, type Idioma } from "@/i18n/config";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Um único cliente e uma única verificação de sessão por pedido: layout e
// página partilham o resultado em vez de repetirem a ida à Supabase.
const clientePorPedido = cache(createClient);

/**
 * getClaims() valida o JWT localmente (chaves assimétricas, JWKS em cache)
 * e só vai à rede se o token tiver expirado — o refresh é feito no
 * middleware. Substitui getUser(), que fazia uma chamada de rede por uso.
 */
const utilizadorPorPedido = cache(async () => {
  const supabase = await clientePorPedido();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { supabase, user: null };
  return {
    supabase,
    user: { id: claims.sub, email: claims.email as string | undefined },
  };
});

export async function requireAdmin() {
  const { supabase, user } = await utilizadorPorPedido();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("role")
    .eq("id", user.id)
    .single();

  if (perfil?.role !== "admin") {
    redirect("/portal/casos");
  }

  return { supabase, user };
}

/**
 * Páginas de acesso (/login, /entrar) abertas por quem já tem sessão: segue
 * para o ?next= seguro ou, sem ele, para o Painel (admin: backoffice). Sem
 * sessão, não faz nada. Só navegação — não mexe em acesso nem planos.
 */
export async function redirecionarSeComSessao(idioma: Idioma, next?: unknown) {
  const { supabase, user } = await utilizadorPorPedido();
  if (!user) return;
  redirect(localizarHref(idioma, await destinoDepoisDeAutenticar(supabase, user.id, { nextExplicito: next })));
}

/** Utilizador da sessão, sem redirecionar (null sem sessão). */
export async function utilizadorAtual() {
  return utilizadorPorPedido();
}

/**
 * Conta da sessão com o estado de confirmação do e-mail. Usa getUser() (vai
 * à Supabase Auth): o JWT não traz email_confirmed_at de forma fiável, e
 * associar uma compra exige o e-mail confirmado no momento.
 */
export async function contaComEmailConfirmado() {
  const supabase = await clientePorPedido();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return null;
  return { id: user.id, email: user.email ?? null, emailConfirmado: !!user.email_confirmed_at };
}

export async function requireUser() {
  const { supabase, user } = await utilizadorPorPedido();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

/**
 * Acesso da conta por plano (ver src/lib/acesso.ts para as regras). Contas
 * sem linha em `user_access` (sem nenhuma compra) não têm proteção nem casos
 * disponíveis.
 */
export async function obterAcesso(supabase: SupabaseServer, userId: string): Promise<Acesso> {
  const { data } = await supabase
    .from("user_access")
    .select("subscription_plan, subscription_status, case_credits, avulso_credits, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  return calcularAcesso(data);
}

/**
 * Para Server Actions e Route Handlers: o gating das páginas
 * (requireProtecao) não protege uma ação chamada diretamente.
 */
export async function temProtecao(supabase: SupabaseServer, userId: string) {
  return (await obterAcesso(supabase, userId)).temProtecao;
}

/**
 * Bloqueia o acesso a funcionalidades de proteção. Sem Proteção ativa, o
 * cliente é reencaminhado para o painel, onde o modal explica os planos.
 */
export async function requireProtecao(origem: string) {
  const { supabase, user } = await requireUser();

  if (!(await temProtecao(supabase, user.id))) {
    redirect(`/portal?bloqueado=${encodeURIComponent(origem)}`);
  }

  return { supabase, user };
}
