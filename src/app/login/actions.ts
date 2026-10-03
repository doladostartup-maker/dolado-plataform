"use server";

import { redirect } from "next/navigation";
import { destinoDepoisDeAutenticar } from "@/lib/authServidor";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { createClient } from "@/lib/supabase/server";
import { mensagemErroConta } from "@/lib/mensagensErro";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Só caminhos deste site (ex.: regresso a /comprar ou /tratar-caso/recebido).
  const next = formData.get("next");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const voltar = ehDestinoSeguro(next) ? `&next=${encodeURIComponent(next)}` : "";
    redirect(`/login?erro=${encodeURIComponent(mensagemErroConta(error?.code, error?.message))}${voltar}`);
  }

  // Sem destino explícito: /portal/casos (ou o backoffice, para o admin).
  redirect(await destinoDepoisDeAutenticar(supabase, data.user.id, { nextExplicito: next }));
}
