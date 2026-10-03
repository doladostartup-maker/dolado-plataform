"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dadosContaNova, destinoDepoisDeAutenticar, guardarDestinoPosLogin } from "@/lib/authServidor";
import { DESTINO_POS_LOGIN, ehDestinoSeguro, urlConfirmarEmail } from "@/lib/destinoAuth";
import { mensagemErroConta } from "@/lib/mensagensErro";

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
    options: dadosContaNova({ nome }),
  });

  if (error) {
    const voltar = ehDestinoSeguro(next) ? `&next=${encodeURIComponent(next)}` : "";
    redirect(`/registo?erro=${encodeURIComponent(mensagemErroConta(error.code, error.message))}${voltar}`);
  }

  // Sem confirmação de e-mail ativa (ex.: stack local), já há sessão.
  if (data.session && data.user) {
    redirect(await destinoDepoisDeAutenticar(supabase, data.user.id, { nextExplicito: next }));
  }

  await guardarDestinoPosLogin(destino);
  redirect(urlConfirmarEmail(destino));
}
