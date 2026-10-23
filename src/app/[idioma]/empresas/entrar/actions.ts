"use server";

// Entrada das contas de empresa (DoLado Empresas, Fase 4): e-mail e
// palavra-passe, depois o segundo factor (/empresas/verificar). Sem Google.
// Uma conta particular não entra por aqui: a sessão é terminada.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mensagemErroConta } from "@/lib/mensagensErro";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { tipoContaDoUtilizador } from "@/lib/empresas/contaServidor";
import { comMensagem, exigirEmpresasAtivo, ipDoPedido } from "@/lib/empresas/sessaoServidor";

export async function entrarEmpresa(formData: FormData) {
  exigirEmpresasAtivo();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (excedeuLimiteTaxa(`empresas-entrar:${await ipDoPedido()}`)) {
    redirect(comMensagem(ROTAS_EMPRESA.entrar, "erro", "Demasiadas tentativas. Aguarde alguns minutos e tente novamente."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const erro =
      error?.code === "email_not_confirmed"
        ? "Confirme primeiro o e-mail com a ligação que lhe enviámos."
        : mensagemErroConta(error?.code, error?.message);
    redirect(comMensagem(ROTAS_EMPRESA.entrar, "erro", erro));
  }

  if ((await tipoContaDoUtilizador(supabase, data.user.id)) !== "empresa") {
    await supabase.auth.signOut({ scope: "local" });
    redirect(`${ROTAS_EMPRESA.entrar}?motivo=conta_particular`);
  }

  // O painel encaminha para o segundo factor (ou para a inscrição dos dois).
  redirect(ROTAS_EMPRESA.painel);
}
