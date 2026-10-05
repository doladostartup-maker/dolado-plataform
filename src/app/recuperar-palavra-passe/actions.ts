"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import {
  ROTA_RECUPERAR,
  ROTA_REDEFINIR,
  emailComFormatoValido,
  pedidoRecuperacaoPermitido,
} from "@/lib/recuperarPalavraPasse";

/**
 * Pede o e-mail de recuperação da palavra-passe. A resposta depende só do
 * que este servidor sabe (?enviado=1, ou &recente=1 para um segundo pedido
 * em menos de um minuto), nunca de a conta existir: os erros da Supabase (incluindo
 * o limite por e-mail, que só existe para contas reais) e o limite por IP
 * nunca chegam ao cliente. Só um e-mail mal escrito é recusado — isso não
 * revela nada.
 */
export async function pedirRecuperacao(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailComFormatoValido(email)) {
    redirect(`${ROTA_RECUPERAR}?erro=${encodeURIComponent("Insira um e-mail válido.")}`);
  }

  // Um novo pedido substitui a ligação do anterior: se o primeiro e-mail
  // chegar depois de pedir outro, a ligação dele já não funciona. Por isso,
  // no máximo um pedido por minuto para cada endereço (exista ou não a conta).
  if (!pedidoRecuperacaoPermitido(email)) redirect(`${ROTA_RECUPERAR}?enviado=1&recente=1`);

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";

  if (!excedeuLimiteTaxa(`recuperar:${ip}`)) {
    const supabase = await createClient();
    // O e-mail leva <redirectTo>?token_hash=… (supabase/templates/recuperacao.html):
    // funciona noutro dispositivo. Com o template por omissão da Supabase,
    // volta com ?code= (fluxo PKCE, só neste navegador) — também aceite.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${ROTA_REDEFINIR}`,
    });
    // Nunca o e-mail no registo — só o código do erro.
    if (error) console.error("[recuperar-palavra-passe] resetPasswordForEmail:", error.code ?? error.status);
  }

  redirect(`${ROTA_RECUPERAR}?enviado=1`);
}
