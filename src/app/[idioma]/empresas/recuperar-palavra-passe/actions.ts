"use server";

// Recuperação da palavra-passe de uma conta de empresa: as mesmas regras da
// recuperação dos particulares (src/lib/recuperarPalavraPasse.ts — a resposta
// nunca depende de a conta existir), com a ligação para
// /empresas/redefinir-palavra-passe (URL autorizado nas Redirect URLs da
// Supabase). Depois da troca, a entrada continua a pedir o segundo factor.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { emailComFormatoValido, pedidoRecuperacaoPermitido } from "@/lib/recuperarPalavraPasse";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { comMensagem, exigirEmpresasAtivo, ipDoPedido } from "@/lib/empresas/sessaoServidor";

export async function pedirRecuperacaoEmpresa(formData: FormData) {
  exigirEmpresasAtivo();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailComFormatoValido(email)) redirect(comMensagem(ROTAS_EMPRESA.recuperar, "erro", "Insira um e-mail válido."));
  if (!pedidoRecuperacaoPermitido(email)) redirect(`${ROTAS_EMPRESA.recuperar}?enviado=1&recente=1`);

  if (!excedeuLimiteTaxa(`empresas-recuperar:${await ipDoPedido()}`)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${ROTAS_EMPRESA.redefinir}`,
    });
    // Nunca o e-mail no registo — só o código do erro.
    if (error) console.error("[empresas/recuperar-palavra-passe] resetPasswordForEmail:", error.code ?? error.status);
  }
  redirect(`${ROTAS_EMPRESA.recuperar}?enviado=1`);
}
