// Inscrição, verificação e retirada de factores TOTP com a sessão do próprio
// (admin — /auth/mfa — e contas de empresa — /empresa/seguranca). O chamador
// valida a sessão e o tipo de conta ANTES (requireAdminSemMfa,
// requireEmpresa); aqui só as regras do MFA (mfa.ts). A Supabase aplica as
// suas (insufficient_aal, nomes únicos). A única operação com a service role
// é apagar factores POR VERIFICAR da própria conta — restos de uma inscrição
// abandonada, que bloqueariam o nome na inscrição seguinte. Os segredos e os
// códigos nunca vão para logs.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarCodigo, podeInscrever, podeRemover, proximoNomeFactor } from "./mfa.ts";
import { lerMfa } from "./mfaServidor.ts";

export type ResultadoInscricao =
  | { ok: true; factorId: string; nome: string; qrCode: string; segredo: string }
  | { ok: false; erro: string };

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const ERRO_GENERICO = "Não foi possível concluir o pedido. Tente de novo.";

export async function inscreverFactorDaSessao(supabase: SupabaseClient, userId: string): Promise<ResultadoInscricao> {
  const { nivel, factores } = await lerMfa(supabase);

  if (!podeInscrever(nivel, factores)) {
    return { ok: false, erro: "Para acrescentar um factor, verifique primeiro um código de um factor já inscrito." };
  }

  const porVerificar = factores.filter((f) => !f.verificado);
  if (porVerificar.length > 0) {
    const admin = createAdminClient();
    for (const f of porVerificar) {
      await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId });
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

export async function verificarFactorDaSessao(
  supabase: SupabaseClient,
  factorId: string,
  codigoIntroduzido: string,
): Promise<ResultadoAcao> {
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
  return { ok: true };
}

export async function removerFactorDaSessao(supabase: SupabaseClient, factorId: string): Promise<ResultadoAcao> {
  const { nivel, factores } = await lerMfa(supabase);
  if (!podeRemover(nivel, factores, factorId)) {
    return { ok: false, erro: "Só pode retirar um factor com a sessão verificada e mantendo pelo menos outro." };
  }
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, erro: ERRO_GENERICO };
  return { ok: true };
}
