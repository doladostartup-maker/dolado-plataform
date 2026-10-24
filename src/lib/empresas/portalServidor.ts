// DoLado Empresas — leitura dos dados do portal (servidor). Fase 7.
// Recebe o cliente Supabase de quem chama: no portal é a sessão da empresa
// (RLS, aal2 — nunca a service role); no backoffice, o cliente do admin. As
// agregações estão em painel.ts, para os números serem iguais nos dois.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaturaPainel, InstalacaoPainel, ServicoPainel } from "./painel.ts";

export type AcessoEmpresa = "total" | "consulta" | "nenhum";

/** Acesso da organização (empresa_tem_acesso: membro com aal2 ou admin). */
export async function acessoEmpresa(supabase: SupabaseClient, organizacaoId: string): Promise<AcessoEmpresa> {
  const { data, error } = await supabase.rpc("empresa_tem_acesso", { p_organizacao: organizacaoId });
  if (error) throw new Error(`empresa_tem_acesso: ${error.message}`);
  return data === "total" || data === "consulta" ? data : "nenhum";
}

export type DadosPortal = {
  instalacoes: InstalacaoPainel[];
  servicos: (ServicoPainel & { estado: string | null; mensalidade_cents: number | null; created_at: string; preaviso_dias: number | null })[];
  faturas: FaturaPainel[];
  /** Situações já revistas e comunicadas pela DoLado (nunca as por rever). */
  achados: { id: string; contrato_id: string; fatura_id: string | null; tipo: string; texto_cliente: string | null; comunicado_em: string }[];
};

/**
 * Instalações, serviços e facturas da organização. Os serviços e as
 * facturas do Monitor pertencem ao utilizador da organização (uma conta =
 * uma organização no piloto); o filtro por utilizador é explícito também
 * para o cliente do admin.
 */
export async function carregarDadosPortal(supabase: SupabaseClient, organizacaoId: string, utilizadorId: string): Promise<DadosPortal> {
  const [{ data: instalacoes, error: e1 }, { data: servicos, error: e2 }, { data: faturas, error: e3 }, { data: achados, error: e4 }] = await Promise.all([
    supabase.from("instalacoes").select("id, nome").eq("organizacao_id", organizacaoId).is("desativada_em", null).order("created_at"),
    supabase
      .from("contratos_monitorizados")
      .select("id, setor, fornecedor, instalacao_id, data_fim_fidelizacao, data_fim_promocao, estado, mensalidade_cents, created_at, preaviso_dias")
      .eq("utilizador_id", utilizadorId)
      .is("desativado_em", null)
      .order("created_at"),
    supabase
      .from("faturas_monitor")
      .select("id, contrato_id, documento_id, periodo_inicio, periodo_fim, data_emissao, total_cents, em_verificacao")
      .eq("utilizador_id", utilizadorId)
      .order("periodo_inicio", { ascending: false, nullsFirst: false })
      .limit(500),
    supabase
      .from("achados_monitor")
      .select("id, contrato_id, fatura_id, tipo, texto_cliente, comunicado_em")
      .eq("utilizador_id", utilizadorId)
      .eq("estado", "comunicado")
      .order("comunicado_em", { ascending: false })
      .limit(100),
  ]);
  const erro = e1 ?? e2 ?? e3 ?? e4;
  if (erro) throw new Error(`portal da empresa: ${erro.message}`);
  return { instalacoes: instalacoes ?? [], servicos: servicos ?? [], faturas: faturas ?? [], achados: achados ?? [] };
}

/** Hoje e o mês actual em Lisboa (AAAA-MM-DD, AAAA-MM). */
export function hojeLisboa(agora = new Date()): { hoje: string; mes: string } {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  return { hoje, mes: hoje.slice(0, 7) };
}
