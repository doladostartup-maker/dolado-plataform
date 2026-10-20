"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { mensagemErroConta } from "@/lib/mensagensErro";
import {
  ROTA_REDEFINIR,
  codigoPkceComFormatoValido,
  estadoLigacaoDoErro,
  tokenRecuperacaoComFormatoValido,
  urlRedefinir,
  validarNovaPalavraPasse,
} from "@/lib/recuperarPalavraPasse";
import { caminho } from "@/i18n/servidor";

/**
 * Define a nova palavra-passe a partir da ligação do e-mail (POST explícito).
 *
 * 1. Valida a palavra-passe antes de gastar a ligação (que é de uso único).
 * 2. Troca a ligação por uma sessão: token_hash (template da DoLado, funciona
 *    noutro dispositivo) ou code (template por omissão, fluxo PKCE).
 *    Sem ligação, só continua quem já tem a sessão aberta por uma tentativa
 *    anterior (ex.: a Supabase recusou a palavra-passe depois de a ligação
 *    ter sido validada).
 * 3. Altera a palavra-passe e termina todas as sessões da conta — o cliente
 *    entra de novo em /login com a palavra-passe nova.
 */
export async function redefinirPalavraPasse(formData: FormData) {
  const tokenBruto = formData.get("token_hash");
  const codigoBruto = formData.get("code");
  const token = tokenRecuperacaoComFormatoValido(tokenBruto) ? tokenBruto : null;
  const codigo = !token && codigoPkceComFormatoValido(codigoBruto) ? codigoBruto : null;
  const voltar = (erro: string) => urlRedefinir({ token, codigo, continuar: !token && !codigo, erro });

  const erroValidacao = validarNovaPalavraPasse(formData.get("password"), formData.get("confirmar_password"));
  if (erroValidacao) redirect(await caminho(voltar(erroValidacao)));
  const password = formData.get("password") as string;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  if (excedeuLimiteTaxa(`redefinir:${ip}`)) {
    redirect(await caminho(voltar("Demasiadas tentativas. Aguarde alguns minutos e tente novamente.")));
  }

  const supabase = await createClient();

  if (token) {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: token });
    if (error) redirect(await caminho(`${ROTA_REDEFINIR}?ligacao=${estadoLigacaoDoErro(error.code, error.message)}`));
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) redirect(await caminho(`${ROTA_REDEFINIR}?ligacao=${estadoLigacaoDoErro(error.code, error.message)}`));
  } else {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect(await caminho(`${ROTA_REDEFINIR}?ligacao=invalida`));
  }

  // A ligação já foi usada: a partir daqui, um erro volta à página com a
  // sessão aberta (?continuar=1), para tentar outra palavra-passe.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[redefinir-palavra-passe] updateUser:", error.code ?? error.status);
    redirect(await caminho(urlRedefinir({ continuar: true, erro: mensagemErroConta(error.code, error.message) })));
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect(await caminho("/login?alterada=1"));
}
