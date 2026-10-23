"use server";

// MFA do admin (Fase 1A): as regras e as chamadas à Supabase estão em
// src/lib/mfaAcoes.ts (partilhadas com as contas de empresa).

import { revalidatePath } from "next/cache";
import { requireAdminSemMfa } from "@/lib/auth";
import {
  inscreverFactorDaSessao,
  removerFactorDaSessao,
  verificarFactorDaSessao,
  type ResultadoAcao,
  type ResultadoInscricao,
} from "@/lib/mfaAcoes";

export async function inscreverFactor(): Promise<ResultadoInscricao> {
  const { supabase, user } = await requireAdminSemMfa();
  return inscreverFactorDaSessao(supabase, user.id);
}

export async function verificarFactor(factorId: string, codigoIntroduzido: string): Promise<ResultadoAcao> {
  const { supabase } = await requireAdminSemMfa();
  const r = await verificarFactorDaSessao(supabase, factorId, codigoIntroduzido);
  if (r.ok) revalidatePath("/auth/mfa");
  return r;
}

export async function removerFactor(factorId: string): Promise<ResultadoAcao> {
  const { supabase } = await requireAdminSemMfa();
  const r = await removerFactorDaSessao(supabase, factorId);
  if (r.ok) revalidatePath("/auth/mfa");
  return r;
}
