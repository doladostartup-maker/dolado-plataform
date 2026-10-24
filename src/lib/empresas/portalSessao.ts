// DoLado Empresas — guarda das páginas do portal (Fase 7). Sessão da empresa
// com aal2 (requireEmpresa) e acesso da organização (empresa_tem_acesso);
// sem acesso, volta à página da conta, que explica o estado. Nunca usa a
// service role.

import { redirect } from "next/navigation";
import { requireEmpresa } from "@/lib/auth";
import { ROTAS_EMPRESA } from "./contas.ts";
import { acessoEmpresa, type AcessoEmpresa } from "./portalServidor.ts";

export async function portalEmpresa(contexto: string) {
  const sessao = await requireEmpresa(contexto);
  const acesso = await acessoEmpresa(sessao.supabase, sessao.organizacao.id);
  if (acesso === "nenhum") redirect(ROTAS_EMPRESA.painel);
  return { ...sessao, acesso: acesso as Exclude<AcessoEmpresa, "nenhum"> };
}

