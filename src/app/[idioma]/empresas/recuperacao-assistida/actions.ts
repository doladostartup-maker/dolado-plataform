"use server";

// Pedido de recuperação assistida do MFA (perda dos dois factores) — sem
// sessão. A resposta é sempre a mesma (nunca revela se o e-mail tem conta).
// O pedido fica em empresa_pedidos_recuperacao, ligado à organização quando o
// e-mail é de uma conta de empresa, e a equipa é avisada. A reposição só
// acontece no backoffice, depois da validação reforçada (contacto pelos
// meios oficiais da empresa).

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { ROTAS_EMPRESA, validarPedidoRecuperacao } from "@/lib/empresas/registo";
import { avisarEquipaEmpresas } from "@/lib/empresas/contaServidor";
import { comMensagem, exigirEmpresasAtivo, ipDoPedido } from "@/lib/empresas/sessaoServidor";

const RECEBIDO = `${ROTAS_EMPRESA.recuperacaoAssistida}?enviado=1`;

export async function pedirRecuperacaoAssistida(formData: FormData) {
  exigirEmpresasAtivo();
  // Armadilha para robôs: um campo escondido que as pessoas não preenchem.
  if (String(formData.get("website") ?? "") !== "") redirect(RECEBIDO);

  const v = validarPedidoRecuperacao({ email: formData.get("email"), nif: formData.get("nif"), mensagem: formData.get("mensagem") });
  if (!v.ok) redirect(comMensagem(ROTAS_EMPRESA.recuperacaoAssistida, "erro", v.erro));
  if (excedeuLimiteTaxa(`empresas-recuperacao-assistida:${await ipDoPedido()}`)) redirect(RECEBIDO);

  const admin = createAdminClient();
  const { data: conta } = await admin
    .from("utilizadores")
    .select("id")
    .eq("email", v.email)
    .eq("tipo_conta", "empresa")
    .maybeSingle();
  let organizacaoId: string | null = null;
  let nome: string | null = null;
  if (conta) {
    const { data: membro } = await admin
      .from("organizacoes_membros")
      .select("organizacao_id, organizacoes(nome)")
      .eq("utilizador_id", conta.id)
      .is("removido_em", null)
      .maybeSingle();
    organizacaoId = membro?.organizacao_id ?? null;
    nome = (membro?.organizacoes as { nome?: string } | null)?.nome ?? null;
  }

  const { error } = await admin.from("empresa_pedidos_recuperacao").insert({
    email: v.email,
    nif: v.nif,
    mensagem: v.mensagem,
    organizacao_id: organizacaoId,
  });
  if (error) throw new Error(`empresa_pedidos_recuperacao.insert: ${error.message}`);

  await avisarEquipaEmpresas(
    "Pedido de recuperação do MFA",
    nome
      ? `Pedido de recuperação assistida para ${nome}. Validar pelos contactos oficiais antes de repor.`
      : "Pedido de recuperação assistida sem conta de empresa correspondente.",
  );
  redirect(RECEBIDO);
}
