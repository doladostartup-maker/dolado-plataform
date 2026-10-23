import { cache } from "react";
import { redirect } from "next/navigation";
import { calcularAcesso, type Acesso } from "@/lib/acesso";
import { createClient } from "@/lib/supabase/server";
import { destinoDepoisDeAutenticar } from "@/lib/authServidor";
import { localizarHref, type Idioma } from "@/i18n/config";
import { destinoContaEmpresa, tipoContaDe } from "@/lib/empresas/contas";
import { registarGuardaRecusado } from "@/lib/empresas/contaServidor";

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

/**
 * Perfil da conta da sessão (papel e tipo de conta), lido uma vez por pedido.
 * O cliente lê o próprio perfil (RLS); null sem sessão.
 */
const perfilPorPedido = cache(async () => {
  const { supabase, user } = await utilizadorPorPedido();
  if (!user) return null;
  const { data, error } = await supabase.from("utilizadores").select("role, tipo_conta").eq("id", user.id).maybeSingle();
  // Falha fechada: sem o perfil não se sabe se a conta é de empresa.
  if (error) throw new Error(`utilizadores.select: ${error.message}`);
  return { role: (data?.role as string | undefined) ?? null, tipoConta: tipoContaDe(data?.tipo_conta) };
});

/**
 * Conta de empresa num fluxo particular (DoLado Empresas, Fase 3): regista a
 * ocorrência e encaminha para a entrada das empresas. Nunca devolve.
 */
async function recusarContaEmpresa(userId: string, contexto: string): Promise<never> {
  await registarGuardaRecusado(userId, contexto);
  redirect(destinoContaEmpresa());
}

export async function requireAdmin() {
  return requireAdminSemMfa();
}

/**
 * Admin sem exigir aal2 — só para as páginas de inscrição e verificação do
 * MFA (/auth/mfa), que têm de abrir com a sessão aal1. Nesta fase (1A) é
 * igual a requireAdmin(); na Fase 1B, requireAdmin() passa a exigir aal2.
 */
export async function requireAdminSemMfa() {
  const { supabase, user } = await utilizadorPorPedido();

  if (!user) {
    redirect("/login");
  }

  const perfil = await perfilPorPedido();

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

/**
 * Conta particular com sessão (portal, casos, Protecção, compras). Uma conta
 * de empresa é recusada e encaminhada para a entrada das empresas — nas
 * páginas e também nas Server Actions chamadas directamente. `contexto`
 * identifica a rota/acção na ocorrência registada (sem dados pessoais).
 */
export async function requireParticular(contexto: string) {
  const { supabase, user } = await requireUser();
  if ((await perfilPorPedido())?.tipoConta === "empresa") await recusarContaEmpresa(user.id, contexto);
  return { supabase, user };
}

/** Como utilizadorAtual(), mas uma sessão de conta de empresa é recusada. */
export async function utilizadorParticularAtual(contexto: string) {
  const resultado = await utilizadorPorPedido();
  if (resultado.user && (await perfilPorPedido())?.tipoConta === "empresa") {
    await recusarContaEmpresa(resultado.user.id, contexto);
  }
  return resultado;
}

/** Como contaComEmailConfirmado(), mas uma conta de empresa é recusada. */
export async function contaParticularComEmailConfirmado(contexto: string) {
  const conta = await contaComEmailConfirmado();
  if (conta && (await perfilPorPedido())?.tipoConta === "empresa") await recusarContaEmpresa(conta.id, contexto);
  return conta;
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
  const [{ data }, { data: gratuita }, { data: patrocinado }] = await Promise.all([
    supabase
      .from("user_access")
      .select("subscription_plan, subscription_status, case_credits, avulso_credits, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .maybeSingle(),
    // Proteção gratuita de 30 dias (RLS: só a da própria conta).
    supabase
      .from("protecao_gratuita")
      .select("id, estado, inicio_em, termina_em, lembretes_desativados_em")
      .eq("user_id", userId)
      .maybeSingle(),
    // Protecção oferecida por um parceiro (RLS: só a da própria conta; o mais recente).
    supabase
      .from("acessos_patrocinados")
      .select("id, estado, inicio_em, termina_em")
      .eq("user_id", userId)
      .order("termina_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return calcularAcesso(data, gratuita, new Date(), patrocinado);
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
  const { supabase, user } = await requireParticular(`protecao:${origem}`);

  if (!(await temProtecao(supabase, user.id))) {
    redirect(`/portal?bloqueado=${encodeURIComponent(origem)}`);
  }

  return { supabase, user };
}
