"use server";

import { redirect } from "next/navigation";
import { destinoDepoisDeAutenticar } from "@/lib/authServidor";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { createClient } from "@/lib/supabase/server";
import { mensagemErroConta } from "@/lib/mensagensErro";
import { registarOrigemDaConta } from "@/lib/origemAquisicaoServidor";
import { localizarHref } from "@/i18n/config";
import { traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { obterIdioma } from "@/i18n/servidor";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Só caminhos deste site (ex.: regresso a /comprar ou /tratar-caso/recebido).
  const next = formData.get("next");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Idioma da página onde o formulário foi enviado (só apresentação).
  const idioma = await obterIdioma();

  if (error || !data.user) {
    const voltar = ehDestinoSeguro(next) ? `&next=${encodeURIComponent(next)}` : "";
    const erro = traduzirMensagemConta(idioma, mensagemErroConta(error?.code, error?.message));
    redirect(localizarHref(idioma, `/login?erro=${encodeURIComponent(erro)}${voltar}`));
  }

  // Origem de aquisição: aplica a escolha de cookies deste browser à conta.
  await registarOrigemDaConta(data.user.id);

  // Sem destino explícito: /portal/casos (ou o backoffice, para o admin).
  redirect(localizarHref(idioma, await destinoDepoisDeAutenticar(supabase, data.user.id, { nextExplicito: next })));
}
