// Leituras partilhadas do backoffice (layout, painel e lista de casos): casos
// com o texto em curso e contagens das filas operacionais. Só leitura.
//
// Cada função valida o papel admin (requireAdmin, partilhado por pedido)
// antes de qualquer leitura; a service role só é usada para as tabelas do
// Monitor, como nas páginas do Monitor.

import { cache } from "react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FILTRO_FINAIS, type CasoTriagem, type TextoResumo } from "./triagem";

export type CasoLista = CasoTriagem & {
  id: string;
  nome: string;
  email: string | null;
  empresa: string | null;
  empresa_parceira: string | null;
  sector: string | null;
  problema_tipo: string | null;
  tipo_problema: string | null;
  status: string;
  created_at: string;
  valor_indicado: number | null;
};

export const COLUNAS_CASO_LISTA =
  "id, nome, email, empresa, empresa_parceira, sector, problema_tipo, tipo_problema, status, created_at, primeira_resposta_em, data_envio_reclamacao, data_fim_fidelidade, valor_indicado";

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/**
 * Junta a cada caso a versão mais recente do texto (ou null), as
 * comunicações recebidas por analisar e o prazo indicado no último envio.
 */
export async function juntarTextos(supabase: Supabase, casos: Omit<CasoLista, "texto">[]): Promise<CasoLista[]> {
  if (casos.length === 0) return [];
  const ids = casos.map((c) => c.id);
  const [{ data }, { data: porAnalisar }, { data: envios }] = await Promise.all([
    supabase.from("casos_textos").select("caso_id, versao, estado, origem, revisto_em").in("caso_id", ids).order("versao", { ascending: false }),
    supabase.from("casos_comunicacoes_recebidas").select("caso_id").in("caso_id", ids).eq("estado_analise", "por_analisar"),
    supabase.from("casos_textos_envios").select("caso_id, prazo_resposta_em").in("caso_id", ids).order("enviado_em", { ascending: false }),
  ]);
  const atual = new Map<string, TextoResumo>();
  for (const t of data ?? []) {
    if (!atual.has(t.caso_id as string)) atual.set(t.caso_id as string, t as unknown as TextoResumo);
  }
  const contagem = new Map<string, number>();
  for (const c of porAnalisar ?? []) contagem.set(c.caso_id as string, (contagem.get(c.caso_id as string) ?? 0) + 1);
  const prazo = new Map<string, string | null>();
  for (const e of envios ?? []) if (!prazo.has(e.caso_id as string)) prazo.set(e.caso_id as string, (e.prazo_resposta_em as string | null) ?? null);
  return casos.map((c) => ({
    ...c,
    texto: atual.get(c.id) ?? null,
    comunicacoesPorAnalisar: contagem.get(c.id) ?? 0,
    prazoRespostaEm: prazo.get(c.id) ?? null,
  }));
}

/** Casos em curso (sem estado final) com o texto atual. */
export const casosEmCurso = cache(async (): Promise<CasoLista[]> => {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("casos")
    .select(COLUNAS_CASO_LISTA)
    .not("status", "in", FILTRO_FINAIS)
    .order("created_at", { ascending: true });
  return juntarTextos(supabase, (data ?? []) as unknown as Omit<CasoLista, "texto">[]);
});

export type ContagensFilas = {
  documentosMonitor: number | null;
  achados: number | null;
  compras: number | null;
  conversoes: number | null;
  /** E-mails recebidos que não foi possível associar a um caso (quarentena). */
  naoAssociadas: number | null;
};

/** Contagens das filas fora dos casos (null = não foi possível ler). */
export const contagensFilas = cache(async (): Promise<ContagensFilas> => {
  const { supabase } = await requireAdmin();
  const admin = createAdminClient();
  const [documentos, achados, duplicadas, semConta, conversoes, naoAssociadas] = await Promise.all([
    admin
      .from("documentos_monitor")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendente", "a_rever"])
      .is("desativado_em", null),
    admin.from("achados_monitor").select("id", { count: "exact", head: true }).in("estado", ["detetado", "em_revisao", "confirmado"]),
    supabase.from("subscricoes_duplicadas").select("nova_subscription_id", { count: "exact", head: true }).eq("estado", "por_rever"),
    supabase.from("compras_sem_conta").select("stripe_session_id", { count: "exact", head: true }).is("resolvido_em", null),
    supabase.from("conversoes_avulso").select("id", { count: "exact", head: true }).eq("requer_intervencao", true),
    supabase.from("comunicacoes_nao_associadas").select("id", { count: "exact", head: true }).is("revista_em", null),
  ]);
  const n = (r: { count: number | null; error: unknown }) => (r.error ? null : (r.count ?? 0));
  const d = n(duplicadas);
  const s = n(semConta);
  return {
    documentosMonitor: n(documentos),
    achados: n(achados),
    compras: d === null || s === null ? null : d + s,
    conversoes: n(conversoes),
    naoAssociadas: n(naoAssociadas),
  };
});
