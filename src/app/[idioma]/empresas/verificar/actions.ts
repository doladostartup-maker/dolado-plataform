"use server";

// Segundo factor da entrada das empresas (sessão aal1 → aal2).

import { redirect } from "next/navigation";
import { requireEmpresa } from "@/lib/auth";
import { verificarFactorDaSessao } from "@/lib/mfaAcoes";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { comMensagem } from "@/lib/empresas/sessaoServidor";

export async function verificarSegundoFactor(formData: FormData) {
  const { supabase } = await requireEmpresa("empresas/verificar:acao", { mfa: "nenhum" });
  const r = await verificarFactorDaSessao(supabase, String(formData.get("factor") ?? ""), String(formData.get("codigo") ?? ""));
  if (!r.ok) redirect(comMensagem(ROTAS_EMPRESA.verificar, "erro", r.erro));
  redirect(ROTAS_EMPRESA.painel);
}
