"use server";

// Acções da conta da empresa (DoLado Empresas): terminar a sessão (Fase 4)
// e pedir/retirar o cancelamento da Protecção Empresas (Fase 5).

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmpresa } from "@/lib/auth";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { enviarAvisosEmpresas } from "@/lib/empresas/avisosServidor";
import { comMensagem, exigirEmpresasAtivo } from "@/lib/empresas/sessaoServidor";

/** Também uma sessão particular aberta neste navegador, antes de entrar com a conta da empresa. */
export async function terminarSessao() {
  exigirEmpresasAtivo();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(ROTAS_EMPRESA.entrar);
}

/**
 * Cancelamento pelo cliente (confirmação explícita): a Protecção continua
 * activa até ao fim do período pago; depois, 30 dias só de consulta.
 */
export async function pedirCancelamento(formData: FormData) {
  const { user } = await requireEmpresa("empresa:cancelar");
  if (formData.get("confirmar") !== "on") {
    redirect(comMensagem(ROTAS_EMPRESA.definicoes, "erro", "Para cancelar, confirme que leu as condições do cancelamento."));
  }
  const { data, error } = await createAdminClient().rpc("empresa_pedir_cancelamento", { p_user: user.id });
  if (error) throw new Error(`empresa_pedir_cancelamento: ${error.message}`);
  const resultado = (data as { resultado: string }).resultado;
  if (resultado !== "agendado" && resultado !== "ja_agendado") {
    redirect(comMensagem(ROTAS_EMPRESA.definicoes, "erro", "Neste momento não é possível cancelar pela conta. Contacte-nos."));
  }
  after(() => enviarAvisosEmpresas().catch(() => undefined));
  redirect(comMensagem(ROTAS_EMPRESA.definicoes, "info", "Recebemos o pedido de cancelamento."));
}

export async function retirarCancelamento() {
  const { user } = await requireEmpresa("empresa:retirar-cancelamento");
  const { data, error } = await createAdminClient().rpc("empresa_retirar_cancelamento", { p_user: user.id });
  if (error) throw new Error(`empresa_retirar_cancelamento: ${error.message}`);
  if (data !== "retirado") redirect(comMensagem(ROTAS_EMPRESA.definicoes, "erro", "Não há nenhum pedido de cancelamento para retirar."));
  after(() => enviarAvisosEmpresas().catch(() => undefined));
  redirect(comMensagem(ROTAS_EMPRESA.definicoes, "info", "A Protecção Empresas continua activa."));
}
