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
