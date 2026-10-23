"use server";

// Inscrição, verificação e retirada de factores TOTP do admin (Fase 1A).
// Tudo com a sessão do próprio (cliente com cookies): a Supabase aplica as
// suas regras (insufficient_aal, nomes únicos) e nós confirmamos antes as
// nossas (mfa.ts). A única operação com a service role é apagar factores
// POR VERIFICAR da própria conta — restos de uma inscrição abandonada, que
// bloqueariam o nome na inscrição seguinte. Os segredos e os códigos nunca
// vão para logs.

import { revalidatePath } from "next/cache";
import { requireAdminSemMfa } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarCodigo, podeInscrever, podeRemover, proximoNomeFactor } from "@/lib/mfa";
import { lerMfa } from "@/lib/mfaServidor";

export type ResultadoInscricao =
  | { ok: true; factorId: string; nome: string; qrCode: string; segredo: string }
  | { ok: false; erro: string };

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const ERRO_GENERICO = "Não foi possível concluir o pedido. Tente de novo.";

export async function inscreverFactor(): Promise<ResultadoInscricao> {
  const { supabase, user } = await requireAdminSemMfa();
  const { nivel, factores } = await lerMfa(supabase);

  if (!podeInscrever(nivel, factores)) {
    return { ok: false, erro: "Para acrescentar um factor, verifique primeiro um código de um factor já inscrito." };
  }

  const porVerificar = factores.filter((f) => !f.verificado);
  if (porVerificar.length > 0) {
    const admin = createAdminClient();
    for (const f of porVerificar) {
      await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    }
  }

  const nome = proximoNomeFactor(factores);
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: nome, issuer: "DoLado" });
  if (error || !data) {
    if (error?.code === "mfa_totp_enroll_not_enabled") {
      return { ok: false, erro: "A autenticação com aplicação (TOTP) não está activa na Supabase." };
    }
    return { ok: false, erro: ERRO_GENERICO };
  }
  return { ok: true, factorId: data.id, nome, qrCode: data.totp.qr_code, segredo: data.totp.secret };
}

export async function verificarFactor(factorId: string, codigoIntroduzido: string): Promise<ResultadoAcao> {
  const { supabase } = await requireAdminSemMfa();
  const codigo = normalizarCodigo(codigoIntroduzido);
  if (!codigo) return { ok: false, erro: "Introduza o código de 6 dígitos da aplicação." };

  const { factores } = await lerMfa(supabase);
  if (!factores.some((f) => f.id === factorId)) return { ok: false, erro: ERRO_GENERICO };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo });
  if (error) {
    return {
      ok: false,
      erro:
        error.code === "mfa_verification_failed"
          ? "Código incorrecto ou expirado. Confirme a hora do telemóvel e tente com o código seguinte."
          : ERRO_GENERICO,
    };
  }
  revalidatePath("/auth/mfa");
  return { ok: true };
}

export async function removerFactor(factorId: string): Promise<ResultadoAcao> {
  const { supabase } = await requireAdminSemMfa();
  const { nivel, factores } = await lerMfa(supabase);
  if (!podeRemover(nivel, factores, factorId)) {
    return { ok: false, erro: "Só pode retirar um factor com a sessão verificada e mantendo pelo menos outro." };
  }
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, erro: ERRO_GENERICO };
  revalidatePath("/auth/mfa");
  return { ok: true };
}
