"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { caminho } from "@/i18n/servidor";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Página de login no idioma de onde se saiu (o portal e o backoffice usam
  // esta ação; o backoffice é sempre português).
  redirect(await caminho("/login"));
}
