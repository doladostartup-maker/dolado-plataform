"use server";

// Decisões do admin sobre as contas de empresa (DoLado Empresas, Fase 4).
// As transições são das funções da base de dados (só service_role, com a
// verificação do admin lá dentro); aqui requireAdmin() primeiro.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mensagemAprovacao } from "@/lib/empresas/registo";
import { enviarEmailEmpresa } from "@/lib/empresas/contaServidor";

const PAGINA = "/backoffice/empresas";
const voltar = (chave: "erro" | "ok", texto: string): never => redirect(`${PAGINA}?${chave}=${encodeURIComponent(texto)}`);

async function contaDaOrganizacao(organizacaoId: string) {
  const { data, error } = await createAdminClient()
    .from("organizacoes_membros")
    .select("utilizador_id, organizacoes(nome)")
    .eq("organizacao_id", organizacaoId)
    .is("removido_em", null)
    .maybeSingle();
  if (error) throw new Error(`organizacoes_membros.select: ${error.message}`);
  if (!data) return null;
  return { userId: data.utilizador_id as string, nome: (data.organizacoes as { nome?: string } | null)?.nome ?? "" };
}

export async function aprovarEmpresa(organizacaoId: string) {
  const { user } = await requireAdmin();
  const { data, error } = await createAdminClient().rpc("empresa_aprovar", { p_org: organizacaoId, p_admin: user.id });
  if (error) throw new Error(`empresa_aprovar: ${error.message}`);
  const resultado = String(data);
  if (resultado === "aprovada" || resultado === "lista_espera") {
    const conta = await contaDaOrganizacao(organizacaoId);
    if (conta) await enviarEmailEmpresa(conta.userId, resultado === "aprovada" ? "aprovada" : "listaEspera", { nome: conta.nome });
    revalidatePath(PAGINA);
    voltar("ok", mensagemAprovacao(resultado));
  }
  voltar("erro", mensagemAprovacao(resultado));
}

export async function rejeitarEmpresa(organizacaoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const mensagemCliente = String(formData.get("mensagem_cliente") ?? "").trim().slice(0, 1000);
  if (!motivo) voltar("erro", "Indique o motivo da rejeição.");

  const { data, error } = await createAdminClient().rpc("empresa_rejeitar", {
    p_org: organizacaoId,
    p_admin: user.id,
    p_motivo: motivo,
  });
  if (error) throw new Error(`empresa_rejeitar: ${error.message}`);
  if (data !== "rejeitada") voltar("erro", data === "motivo_em_falta" ? "Motivo em falta ou demasiado longo." : "Esta organização já não pode ser rejeitada.");

  const conta = await contaDaOrganizacao(organizacaoId);
  if (conta) await enviarEmailEmpresa(conta.userId, "rejeitada", { nome: conta.nome, motivo: mensagemCliente || null });
  revalidatePath(PAGINA);
  voltar("ok", "Pedido rejeitado. O cliente foi avisado por e-mail.");
}

/**
 * Recuperação assistida: só depois da validação reforçada (contacto pelo
 * telefone oficial ou pela morada fiscal, dados do registo). A nota descreve
 * como foi feita e fica no histórico da organização.
 */
export async function reporMfaEmpresa(organizacaoId: string, pedidoId: string | null, formData: FormData) {
  const { user } = await requireAdmin();
  const nota = String(formData.get("nota") ?? "").trim();
  if (!nota) voltar("erro", "Descreva como confirmou a identidade antes de repor o MFA.");
  if (formData.get("confirmar") !== "on") voltar("erro", "Confirme que validou a identidade pelos contactos oficiais.");

  const { data, error } = await createAdminClient().rpc("empresa_mfa_reposicao", {
    p_org: organizacaoId,
    p_admin: user.id,
    p_motivo: nota,
    p_pedido: pedidoId,
  });
  if (error) throw new Error(`empresa_mfa_reposicao: ${error.message}`);
  if (data === null) voltar("erro", "Não foi possível repor o MFA (organização sem conta ou nota em falta).");

  const conta = await contaDaOrganizacao(organizacaoId);
  if (conta) await enviarEmailEmpresa(conta.userId, "mfaReposto", { nome: conta.nome });
  revalidatePath(PAGINA);
  voltar("ok", `MFA reposto (${data} ${data === 1 ? "factor retirado" : "factores retirados"}). As sessões da conta foram terminadas.`);
}

export async function recusarPedidoRecuperacao(pedidoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 1000);
  if (!nota) voltar("erro", "Indique o motivo.");
  const { data, error } = await createAdminClient()
    .from("empresa_pedidos_recuperacao")
    .update({ estado: "recusado", resolvido_por: user.id, resolvido_em: new Date().toISOString(), nota })
    .eq("id", pedidoId)
    .eq("estado", "pendente")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`empresa_pedidos_recuperacao.update: ${error.message}`);
  if (!data) voltar("erro", "Este pedido já foi resolvido.");
  revalidatePath(PAGINA);
  voltar("ok", "Pedido recusado.");
}
