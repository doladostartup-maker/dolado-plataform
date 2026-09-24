"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function alterarPassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmarPassword = formData.get("confirmar_password") as string;

  if (password.length < 8) {
    redirect(
      `/portal/perfil?erro=${encodeURIComponent("A palavra-passe tem de ter pelo menos 8 caracteres.")}`,
    );
  }

  if (password !== confirmarPassword) {
    redirect(
      `/portal/perfil?erro=${encodeURIComponent("As palavras-passe não coincidem.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/portal/perfil?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/portal/perfil?guardado=1");
}

const SETORES_VALIDOS = ["Telecomunicações", "Energia", "Água"];

export async function guardarPreferenciasSetor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const setores = formData.getAll("setor").filter((s): s is string => typeof s === "string" && SETORES_VALIDOS.includes(s));

  // Guardado sempre como apagar tudo + inserir de novo — mais simples do
  // que calcular o diff de checkboxes, e o volume é sempre no máximo 3 linhas.
  const { error: erroApagar } = await supabase
    .from("preferencias_setor")
    .delete()
    .eq("utilizador_id", user.id);

  if (erroApagar) {
    redirect(`/portal/perfil?erro=${encodeURIComponent(erroApagar.message)}`);
  }

  if (setores.length > 0) {
    const { error: erroInserir } = await supabase
      .from("preferencias_setor")
      .insert(setores.map((setor) => ({ utilizador_id: user.id, setor })));

    if (erroInserir) {
      redirect(`/portal/perfil?erro=${encodeURIComponent(erroInserir.message)}`);
    }
  }

  redirect("/portal/perfil?preferencias_guardadas=1");
}
