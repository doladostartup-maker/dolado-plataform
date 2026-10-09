"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dadosContaNova, destinoDepoisDeAutenticar, guardarDestinoPosLogin } from "@/lib/authServidor";
import { DESTINO_POS_LOGIN, ehDestinoSeguro, urlConfirmarEmail } from "@/lib/destinoAuth";
import { mensagemErroConta } from "@/lib/mensagensErro";
import { registarOrigemDaConta } from "@/lib/origemAquisicaoServidor";
import { localizarHref } from "@/i18n/config";
import { traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { obterIdioma } from "@/i18n/servidor";

export async function registar(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nome = formData.get("nome") as string;
  // Destino a seguir à confirmação (ex.: /comprar?plano=… quando a conta é
  // criada a meio de uma compra). Sem destino: /portal/casos.
  const next = formData.get("next");
  const destino = ehDestinoSeguro(next) ? next : DESTINO_POS_LOGIN;

  // Este fluxo não tem campo para o código: o e-mail leva só a ligação.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: dadosContaNova({ nome, idioma: await obterIdioma() }),
  });

  const idioma = await obterIdioma();
  if (error) {
    const voltar = ehDestinoSeguro(next) ? `&next=${encodeURIComponent(next)}` : "";
    const erro = traduzirMensagemConta(idioma, mensagemErroConta(error.code, error.message));
    redirect(localizarHref(idioma, `/registo?erro=${encodeURIComponent(erro)}${voltar}`));
  }

  // Origem de aquisição (?ref=): só atribuição, nunca acesso.
  if (data.user && (data.user.identities?.length ?? 0) > 0) await registarOrigemDaConta(data.user.id);

  // Sem confirmação de e-mail ativa (ex.: stack local), já há sessão.
  if (data.session && data.user) {
    redirect(localizarHref(idioma, await destinoDepoisDeAutenticar(supabase, data.user.id, { nextExplicito: next })));
  }

  await guardarDestinoPosLogin(localizarHref(idioma, destino));
  redirect(localizarHref(idioma, urlConfirmarEmail(destino)));
}
