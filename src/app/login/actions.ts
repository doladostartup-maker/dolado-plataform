"use server";

import { redirect } from "next/navigation";
import { destinoSeguro } from "@/lib/pedidoCaso";
import { createClient } from "@/lib/supabase/server";
import { mensagemErroConta } from "@/lib/mensagensErro";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Só caminhos deste site (ex.: regresso a /tratar-caso/recebido).
  const next = destinoSeguro(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const voltar = next === "/conta" ? "" : `&next=${encodeURIComponent(next)}`;
    redirect(`/login?erro=${encodeURIComponent(mensagemErroConta(error.code, error.message))}${voltar}`);
  }

  redirect(next);
}
