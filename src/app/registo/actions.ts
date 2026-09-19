"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registar(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nome = formData.get("nome") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome } },
  });

  if (error) {
    redirect(`/registo?erro=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/conta");
  }

  redirect(
    `/login?info=${encodeURIComponent("Verifique o seu email para confirmar o registo.")}`,
  );
}
