"use server";

// Pré-aviso de denúncia de um serviço (DoLado Empresas, Fase 8): o primeiro
// aviso do fim da fidelização passa a sair a max(60, pré-aviso + 30) dias.
// requireEmpresa (aal2) e acesso total; a base de dados confirma que o
// serviço é da própria conta de empresa (empresa_definir_preaviso).

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEmpresa } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { acessoEmpresa } from "@/lib/empresas/portalServidor";
import { MENSAGENS_PREAVISO } from "@/lib/empresas/monitorPortal";

const VOLTAR = "/empresa/servicos";

function voltar(chave: "erro" | "info", texto: string): never {
  redirect(`${VOLTAR}?${chave}=${encodeURIComponent(texto)}`);
}

export async function definirPreaviso(formData: FormData) {
  const { supabase, user, organizacao } = await requireEmpresa("empresa/servicos:preaviso");
  if ((await acessoEmpresa(supabase, organizacao.id)) !== "total") voltar("erro", MENSAGENS_PREAVISO.sem_acesso);
  const contrato = String(formData.get("contrato_id") ?? "");
  const bruto = String(formData.get("dias") ?? "").trim();
  const dias = bruto === "" ? null : Number(bruto);
  if (dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 365)) voltar("erro", MENSAGENS_PREAVISO.invalido);

  const { data, error } = await createAdminClient().rpc("empresa_definir_preaviso", { p_user: user.id, p_contrato: contrato, p_dias: dias });
  if (error) throw new Error(`empresa_definir_preaviso: ${error.message}`);
  if (data !== "guardado") voltar("erro", MENSAGENS_PREAVISO[data as keyof typeof MENSAGENS_PREAVISO] ?? MENSAGENS_PREAVISO.nao_encontrado);
  revalidatePath(VOLTAR);
  voltar("info", dias === null ? MENSAGENS_PREAVISO.retirado : MENSAGENS_PREAVISO.guardado);
}
