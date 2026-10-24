import { CARTAO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { carregarDadosPortal } from "@/lib/empresas/portalServidor";
import { TEXTO_AVISO_ENVIADO, nomeServico, ordenarHistorico, type EntradaHistorico } from "@/lib/empresas/painel";
import { dataPorExtenso } from "@/lib/empresas/ciclo";
import { rotuloMesLongo } from "@/lib/empresas/alertas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Histórico — DoLado Empresas", robots: { index: false, follow: false } };

// Histórico (Fase 7): o que a DoLado fez pela empresa — documentos recebidos
// e revistos, situações comunicadas, avisos de datas e mensalidades pagas.
// Leitura com a sessão (RLS, aal2).
export default async function HistoricoEmpresaPage() {
  const { supabase, user, organizacao } = await portalEmpresa("empresa/historico");
  const [dados, { data: metas }, { data: periodos }, { data: avisos }, { data: faltas }, { data: resumos }] = await Promise.all([
    carregarDadosPortal(supabase, organizacao.id, user.id),
    supabase
      .from("empresa_documentos")
      .select("documento_id, instalacao_id, configuracao_inicial, revisto_em, created_at")
      .eq("organizacao_id", organizacao.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("empresa_periodos").select("inicio, fim, pago_em, estado_pagamento").eq("organizacao_id", organizacao.id),
    supabase
      .from("contratos_alertas_envios")
      .select("contrato_id, regra, enviado_em, contratos_monitorizados!inner(utilizador_id)")
      .eq("contratos_monitorizados.utilizador_id", user.id)
      .limit(200),
    supabase.from("empresa_alertas_envios").select("contrato_id, enviado_em").eq("organizacao_id", organizacao.id).eq("estado", "enviado").limit(200),
    supabase.from("empresa_resumos_mensais").select("mes_referencia, enviado_em").eq("organizacao_id", organizacao.id).eq("estado", "enviado"),
  ]);
  const ids = (metas ?? []).map((m) => m.documento_id);
  const { data: docs } = ids.length ? await supabase.from("documentos_monitor").select("id, tipo, nome_ficheiro").in("id", ids) : { data: [] };
  const doc = new Map((docs ?? []).map((d) => [d.id, d]));
  const nomeInst = new Map(dados.instalacoes.map((i) => [i.id, i.nome]));
  const servico = new Map(dados.servicos.map((s) => [s.id, s]));
  const nomeDoc = (id: string) => {
    const d = doc.get(id);
    return d?.nome_ficheiro ?? (d?.tipo === "contrato" ? "Contrato" : "Factura");
  };

  const entradas = ordenarHistorico([
    ...(metas ?? []).map((m): EntradaHistorico => ({
      data: String(m.created_at),
      texto: `${doc.get(m.documento_id)?.tipo === "contrato" ? "Contrato recebido" : m.configuracao_inicial ? "Factura antiga recebida" : "Factura recebida"}`,
      detalhe: `${nomeDoc(m.documento_id)} · ${nomeInst.get(m.instalacao_id) ?? "—"}`,
    })),
    ...(metas ?? []).map((m) =>
      m.revisto_em ? { data: String(m.revisto_em), texto: "Documento revisto pela DoLado", detalhe: nomeDoc(m.documento_id) } : null,
    ),
    ...dados.achados.map((a) => {
      const s = servico.get(a.contrato_id);
      return { data: String(a.comunicado_em), texto: "Situação comunicada", detalhe: s ? nomeServico(s) : undefined };
    }),
    ...(avisos ?? []).map((a) => {
      const s = servico.get(a.contrato_id);
      return { data: String(a.enviado_em), texto: TEXTO_AVISO_ENVIADO[a.regra] ?? "Aviso enviado", detalhe: s ? nomeServico(s) : undefined };
    }),
    ...(faltas ?? []).map((f) => {
      const s = servico.get(f.contrato_id);
      return { data: String(f.enviado_em), texto: "Lembrete enviado: factura em falta", detalhe: s ? nomeServico(s) : undefined };
    }),
    ...(resumos ?? []).map((r) => ({
      data: String(r.enviado_em),
      texto: "Resumo mensal enviado",
      detalhe: rotuloMesLongo(String(r.mes_referencia).slice(0, 7)),
    })),
    ...(periodos ?? []).map((p) =>
      p.estado_pagamento === "pago" && p.pago_em
        ? { data: String(p.pago_em), texto: "Mensalidade paga", detalhe: `${dataPorExtenso(p.inicio)} a ${dataPorExtenso(p.fim)}` }
        : null,
    ),
  ]);

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="historico"
      titulo="Histórico"
      descricao="O que a DoLado recebeu, verificou e comunicou, do mais recente para o mais antigo."
    >
      <section className={CARTAO} aria-label="Histórico">
        {entradas.length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>Ainda não há actividade.</p>
        ) : (
          <ol className="flex flex-col gap-3 text-[15px]">
            {entradas.map((e, i) => (
              <li key={`${e.data}-${i}`} className="flex flex-col gap-0.5 border-t border-[var(--v2-line)] pt-3 first:border-t-0 first:pt-0">
                <span className={TEXTO_SECUNDARIO}>{dataPorExtenso(e.data.slice(0, 10))}</span>
                <span className="font-semibold">{e.texto}</span>
                {e.detalhe && <span className={TEXTO_SECUNDARIO}>{e.detalhe}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </PortalEmpresa>
  );
}
