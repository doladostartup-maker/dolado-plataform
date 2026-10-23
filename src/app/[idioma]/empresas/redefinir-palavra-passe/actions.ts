"use server";

// Nova palavra-passe de uma conta de empresa a partir da ligação do e-mail
// (POST explícito). Como na recuperação dos particulares: valida a
// palavra-passe antes de gastar a ligação, troca-a por uma sessão, altera e
// termina todas as sessões. Diferença: com factores inscritos, a alteração
// exige também o código da aplicação de autenticação (sessão aal2) — o
// e-mail sozinho nunca chega para mudar a palavra-passe de uma empresa.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { mensagemErroConta } from "@/lib/mensagensErro";
import { lerMfa } from "@/lib/mfaServidor";
import { normalizarCodigo } from "@/lib/mfa";
import {
  codigoPkceComFormatoValido,
  estadoLigacaoDoErro,
  tokenRecuperacaoComFormatoValido,
  validarNovaPalavraPasse,
} from "@/lib/recuperarPalavraPasse";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { exigirEmpresasAtivo, ipDoPedido } from "@/lib/empresas/sessaoServidor";

function voltar(dados: { token?: string | null; codigo?: string | null; continuar?: boolean; erro: string }) {
  const p = new URLSearchParams();
  if (dados.token) p.set("token_hash", dados.token);
  else if (dados.codigo) p.set("code", dados.codigo);
  else if (dados.continuar) p.set("continuar", "1");
  p.set("erro", dados.erro);
  return `${ROTAS_EMPRESA.redefinir}?${p.toString()}`;
}

export async function redefinirPalavraPasseEmpresa(formData: FormData) {
  exigirEmpresasAtivo();
  const tokenBruto = formData.get("token_hash");
  const codigoBruto = formData.get("code");
  const token = tokenRecuperacaoComFormatoValido(tokenBruto) ? tokenBruto : null;
  const codigo = !token && codigoPkceComFormatoValido(codigoBruto) ? codigoBruto : null;

  const erroValidacao = validarNovaPalavraPasse(formData.get("password"), formData.get("confirmar_password"));
  if (erroValidacao) redirect(voltar({ token, codigo, continuar: !token && !codigo, erro: erroValidacao }));
  const password = formData.get("password") as string;

  if (excedeuLimiteTaxa(`empresas-redefinir:${await ipDoPedido()}`)) {
    redirect(voltar({ token, codigo, continuar: !token && !codigo, erro: "Demasiadas tentativas. Aguarde alguns minutos e tente novamente." }));
  }

  const supabase = await createClient();
  if (token) {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: token });
    if (error) redirect(`${ROTAS_EMPRESA.redefinir}?ligacao=${estadoLigacaoDoErro(error.code, error.message)}`);
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) redirect(`${ROTAS_EMPRESA.redefinir}?ligacao=${estadoLigacaoDoErro(error.code, error.message)}`);
  } else {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect(`${ROTAS_EMPRESA.redefinir}?ligacao=invalida`);
  }

  // A ligação já foi usada: a partir daqui, um erro volta com a sessão aberta.
  const { nivel, factores } = await lerMfa(supabase);
  const verificados = factores.filter((f) => f.verificado);
  if (verificados.length > 0 && nivel !== "aal2") {
    const codigoTotp = normalizarCodigo(formData.get("codigo_totp"));
    if (!codigoTotp) redirect(voltar({ continuar: true, erro: "Introduza o código de 6 dígitos da aplicação de autenticação." }));
    let verificado = false;
    for (const f of verificados) {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code: codigoTotp });
      if (!error) {
        verificado = true;
        break;
      }
    }
    if (!verificado) {
      redirect(voltar({ continuar: true, erro: "Código incorrecto ou expirado. Tente com o código seguinte da aplicação." }));
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[empresas/redefinir-palavra-passe] updateUser:", error.code ?? error.status);
    redirect(voltar({ continuar: true, erro: mensagemErroConta(error.code, error.message) }));
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect(`${ROTAS_EMPRESA.entrar}?alterada=1`);
}

