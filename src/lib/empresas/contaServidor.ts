// DoLado Empresas — contas de empresa nos fluxos particulares (servidor).
// Regras em contas.ts. Fase 3 do piloto.

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import { ASSUNTOS_EMPRESA, montarHtmlAvisoEquipaEmpresa, montarHtmlEmpresa, type MomentoEmpresa } from "@/lib/email/empresas";
import { contextoOcorrencia, entrouPorOAuth, tipoContaDe, type TipoConta } from "./contas.ts";
import { ehEstadoOrganizacao, type EstadoOrganizacao } from "./registo.ts";

/** Tipo da conta, lido com o cliente indicado (a sessão lê o próprio perfil). */
export async function tipoContaDoUtilizador(supabase: SupabaseClient, userId: string): Promise<TipoConta> {
  const { data, error } = await supabase.from("utilizadores").select("tipo_conta").eq("id", userId).maybeSingle();
  // Falha fechada: um erro de leitura nunca passa por conta particular.
  if (error) throw new Error(`utilizadores.select: ${error.message}`);
  return tipoContaDe(data?.tipo_conta);
}

/**
 * Regista que um guarda recusou uma conta de empresa (empresa_ocorrencias:
 * só o tipo e a rota, sem conteúdo). Nunca impede a recusa.
 */
export async function registarGuardaRecusado(userId: string, contexto: string): Promise<void> {
  try {
    await createAdminClient()
      .from("empresa_ocorrencias")
      .insert({ utilizador_id: userId, tipo: "guarda_recusado", contexto: contextoOcorrencia(contexto) });
  } catch {
    // A recusa acontece na mesma; o registo é só instrumentação.
  }
}

/**
 * Sessão acabada de criar num percurso particular (login, código, Google).
 * Se a conta for de empresa: retira a identidade Google (uma conta de
 * empresa nunca entra pelo Google — a Supabase liga identidades com o mesmo
 * e-mail), termina a sessão neste browser e regista a ocorrência.
 * Devolve true quando a conta era de empresa (o chamador encaminha para
 * destinoContaEmpresa()).
 */
export async function recusarSessaoDeEmpresa(
  supabase: SupabaseClient,
  userId: string,
  contexto: string,
  accessToken?: string | null,
): Promise<boolean> {
  if ((await tipoContaDoUtilizador(supabase, userId)) !== "empresa") return false;

  // Entrada pelo Google: a identidade Google é retirada no servidor (a
  // ligação manual de identidades está desligada na Supabase, por isso não
  // pode ser feita pela sessão). O resultado fica no contexto da ocorrência.
  let google = "";
  if (accessToken && entrouPorOAuth(lerClaim(accessToken, "amr"))) {
    google = (await retirarIdentidadeGoogle(userId)) ? ":google_retirada" : ":google_por_retirar";
  }
  await supabase.auth.signOut({ scope: "local" });
  await registarGuardaRecusado(userId, contexto + google);
  return true;
}

function lerClaim(token: string, nome: string): unknown {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"))?.[nome];
  } catch {
    return undefined;
  }
}

/** Retira a identidade Google de uma conta de empresa (empresa_retirar_identidade_google). */
export async function retirarIdentidadeGoogle(userId: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("empresa_retirar_identidade_google", { p_user: userId });
    return !error && Number(data) > 0;
  } catch {
    return false;
  }
}

/**
 * A sessão acabou de ser criada por um percurso que aceita contas de empresa
 * (/auth/callback, depois de confirmar o e-mail)? Diz se a entrada foi pelo
 * Google — uma conta de empresa nunca entra assim.
 */
export function sessaoPeloGoogle(accessToken: string | null | undefined): boolean {
  return !!accessToken && entrouPorOAuth(lerClaim(accessToken, "amr"));
}

export type OrganizacaoDaConta = { id: string; nome: string; estado: EstadoOrganizacao };

/**
 * Organização da conta de empresa, com o estado acertado ao que já
 * aconteceu (e-mail confirmado, dois factores verificados —
 * empresa_sincronizar_estado). Lida com a service role: antes do segundo
 * factor a conta ainda não lê a organização pelo RLS (exige aal2). O
 * chamador já validou a sessão e o tipo de conta (requireEmpresa).
 */
export async function organizacaoDaConta(userId: string): Promise<OrganizacaoDaConta | null> {
  const admin = createAdminClient();
  const { data: sinc, error } = await admin.rpc("empresa_sincronizar_estado", { p_user: userId });
  if (error) throw new Error(`empresa_sincronizar_estado: ${error.message}`);
  const r = sinc as { organizacao_id: string; estado: string; passou_a_aguardar: boolean } | null;
  if (!r) return null;
  const { data: org, error: erroOrg } = await admin.from("organizacoes").select("id, nome, estado").eq("id", r.organizacao_id).maybeSingle();
  if (erroOrg) throw new Error(`organizacoes.select: ${erroOrg.message}`);
  if (!org || !ehEstadoOrganizacao(org.estado)) return null;
  if (r.passou_a_aguardar) {
    after(() => avisarPedidoRecebido(userId, org.nome));
  }
  return { id: org.id, nome: org.nome, estado: org.estado };
}

/** E-mail confirmado da conta (destinatário dos e-mails da organização). */
async function emailDaConta(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  return data.user?.email_confirmed_at ? (data.user.email ?? null) : null;
}

/** E-mail à conta da organização. Uma falha nunca impede a acção. */
export async function enviarEmailEmpresa(userId: string, momento: MomentoEmpresa, dados: { nome: string; motivo?: string | null }) {
  try {
    const email = await emailDaConta(userId);
    if (email) await enviarEmailBrevo(email, ASSUNTOS_EMPRESA[momento], montarHtmlEmpresa(momento, dados));
  } catch (e) {
    console.error(`[empresas] e-mail ${momento}:`, (e as { code?: string }).code ?? "erro");
  }
}

/** Aviso interno à equipa. Uma falha nunca impede a acção. */
export async function avisarEquipaEmpresas(assunto: string, texto: string) {
  try {
    await enviarEmailBrevo(ADMIN_EMAIL, `${assunto} — DoLado Empresas`, montarHtmlAvisoEquipaEmpresa(texto));
  } catch (e) {
    console.error("[empresas] aviso à equipa:", (e as { code?: string }).code ?? "erro");
  }
}

async function avisarPedidoRecebido(userId: string, nome: string) {
  await enviarEmailEmpresa(userId, "pedidoRecebido", { nome });
  await avisarEquipaEmpresas("Novo pedido de adesão", `${nome} concluiu o registo e aguarda aprovação.`);
}
