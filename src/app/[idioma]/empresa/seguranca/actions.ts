"use server";

// MFA da conta de empresa (DoLado Empresas, Fase 4): as regras e as chamadas
// à Supabase estão em src/lib/mfaAcoes.ts (partilhadas com o admin).

import { revalidatePath } from "next/cache";
import { requireEmpresa } from "@/lib/auth";
import {
  inscreverFactorDaSessao,
  removerFactorDaSessao,
  verificarFactorDaSessao,
  type ResultadoAcao,
  type ResultadoInscricao,
} from "@/lib/mfaAcoes";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";

export async function inscreverFactorEmpresa(): Promise<ResultadoInscricao> {
  const { supabase, user } = await requireEmpresa("empresa/seguranca:acao", { mfa: "inscricao" });
  return inscreverFactorDaSessao(supabase, user.id);
}

export async function verificarFactorEmpresa(factorId: string, codigo: string): Promise<ResultadoAcao> {
  const { supabase } = await requireEmpresa("empresa/seguranca:acao", { mfa: "inscricao" });
  const r = await verificarFactorDaSessao(supabase, factorId, codigo);
  if (r.ok) revalidatePath(ROTAS_EMPRESA.seguranca);
  return r;
}

export async function removerFactorEmpresa(factorId: string): Promise<ResultadoAcao> {
  const { supabase } = await requireEmpresa("empresa/seguranca:acao", { mfa: "inscricao" });
  const r = await removerFactorDaSessao(supabase, factorId);
  if (r.ok) revalidatePath(ROTAS_EMPRESA.seguranca);
  return r;
}
