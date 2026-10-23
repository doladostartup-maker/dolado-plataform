"use server";

// Terminar a sessão a partir das páginas das empresas (DoLado Empresas,
// Fase 4) — também uma sessão particular aberta neste navegador, antes de
// entrar com a conta da empresa (uma sessão por navegador).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { exigirEmpresasAtivo } from "@/lib/empresas/sessaoServidor";

export async function terminarSessao() {
  exigirEmpresasAtivo();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(ROTAS_EMPRESA.entrar);
}
