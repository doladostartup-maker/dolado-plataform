import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { CARTAO, CARTAO_INFO, LIGACAO, TEXTO_SECUNDARIO, TITULO_CARTAO, TITULO_SECCAO } from "@/components/portal/ui";
import { CarregarDocumentoEmpresa } from "@/components/empresas/CarregarDocumentoEmpresa";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { carregarDadosPortal } from "@/lib/empresas/portalServidor";
import { eurosComIva, mesDaFatura, nomeServico, rotuloMes } from "@/lib/empresas/painel";
import { TEXTO_CLASSIFICACAO, classificarFatura } from "@/lib/empresas/classificacao";
import { QUOTA_TEXTO, TEXTO_ESTADO_DOCUMENTO, estadoDocumentoEmpresa } from "@/lib/empresas/monitorPortal";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturas e análises — DoLado Empresas", robots: { index: false, follow: false } };

// Facturas e análises da empresa: carregar (instalação e tipo obrigatórios),
// o estado de cada documento e cada factura analisada com a classificação do
// resultado (Fase 6B). Leitura com a sessão (RLS, aal2) — nunca com a
// service role.
export default async function DocumentosEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, user, organizacao, acesso } = await portalEmpresa("empresa/documentos");
  const params = await searchParams;
  const ativa = acesso === "total";

  const [dados, { data: instalacoes }, { data: org }, { data: quota }, { data: metas }] = await Promise.all([
    carregarDadosPortal(supabase, organizacao.id, user.id),
    supabase.from("instalacoes").select("id, nome").eq("organizacao_id", organizacao.id).is("desativada_em", null).order("created_at"),
    supabase.from("organizacoes").select("revisao_obrigatoria_ate").eq("id", organizacao.id).maybeSingle(),
    supabase.rpc("empresa_quota_sessao"),
    supabase
      .from("empresa_documentos")
      .select("documento_id, instalacao_id, configuracao_inicial, estado_quota, revisao_necessaria, revisto_em, created_at")
      .eq("organizacao_id", organizacao.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const ids = (metas ?? []).map((m) => m.documento_id);
  const { data: docs } = ids.length
    ? await supabase.from("documentos_monitor").select("id, tipo, nome_ficheiro, etapa, estado, contrato_id, associacao_estado").in("id", ids)
    : { data: [] };
  const nomeInstalacao = new Map((instalacoes ?? []).map((i) => [i.id, i.nome]));
  const q = quota as { limite: number; usadas: number; disponiveis: number } | null;
  const revisaoPendente = new Set((metas ?? []).filter((m) => m.revisao_necessaria && !m.revisto_em).map((m) => m.documento_id));
  const servico = new Map(dados.servicos.map((s) => [s.id, s]));
  const nomeInst = new Map(dados.instalacoes.map((i) => [i.id, i.nome]));
  const faturas = dados.faturas.slice(0, 50);
  const configuracaoDisponivel = !!org?.revisao_obrigatoria_ate && new Date(org.revisao_obrigatoria_ate) > new Date();

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="documentos"
      titulo="Facturas e análises"
      descricao="Carregue as facturas e os contratos de cada instalação. A DoLado lê-os e acompanha os serviços."
      mensagens={params}
    >
      {q && (
        <div className={CARTAO_INFO}>
          <p className={TITULO_CARTAO}>
            Facturas analisadas este mês: {q.usadas} de {q.limite}
          </p>
          <p className={TEXTO_SECUNDARIO}>Contratos, facturas antigas da configuração inicial e erros técnicos não contam.</p>
        </div>
      )}
      {ativa && (instalacoes ?? []).length === 0 && (
        <Aviso tom="atencao">
          Crie primeiro uma{" "}
          <Link href="/empresa/instalacoes" prefetch={false} className={LIGACAO}>
            instalação
          </Link>
          .
        </Aviso>
      )}
      {ativa && (instalacoes ?? []).length > 0 && (
        <CarregarDocumentoEmpresa instalacoes={instalacoes ?? []} configuracaoDisponivel={configuracaoDisponivel} />
      )}
      {!ativa && <Aviso tom="info">Com a Protecção Empresas suspensa ou terminada, não é possível carregar documentos novos.</Aviso>}

      {faturas.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`} aria-labelledby="facturas">
          <h2 id="facturas" className={TITULO_SECCAO}>
            Facturas analisadas
          </h2>
          <ul className="flex flex-col gap-3 text-[15px]">
            {faturas.map((f) => {
              const s = servico.get(f.contrato_id);
              const mes = mesDaFatura(f);
              const { classificacao, provisorio } = classificarFatura(f, !!f.documento_id && revisaoPendente.has(f.documento_id));
              return (
                <li key={f.id} className="flex flex-col gap-0.5 border-t border-[var(--v2-line)] pt-3">
                  <span className="font-semibold">
                    {s ? nomeServico(s) : "Serviço"}
                    {mes ? ` · ${rotuloMes(mes)}` : ""}
                  </span>
                  <span className={TEXTO_SECUNDARIO}>
                    {s?.instalacao_id ? `${nomeInst.get(s.instalacao_id) ?? "—"} · ` : ""}
                    {f.total_cents !== null ? eurosComIva(f.total_cents) : "Total não lido"}
                  </span>
                  <span>
                    {TEXTO_CLASSIFICACAO[classificacao]}
                    {provisorio ? " (provisório — em verificação pela DoLado)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(metas ?? []).length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`} aria-labelledby="documentos">
        <h2 id="documentos" className={TITULO_SECCAO}>
          Documentos carregados
        </h2>
        <ul className="flex flex-col gap-3 text-[15px]">
          {(metas ?? []).slice(0, 50).map((m) => {
            const d = (docs ?? []).find((x) => x.id === m.documento_id);
            if (!d) return null;
            const estado = estadoDocumentoEmpresa(d, m.revisao_necessaria && !m.revisto_em);
            return (
              <li key={m.documento_id} className="border-t border-[var(--v2-line)] pt-3">
                <span className="font-semibold">{d.nome_ficheiro ?? (d.tipo === "contrato" ? "Contrato" : "Factura")}</span>
                <span className={`${TEXTO_SECUNDARIO} block`}>
                  {nomeInstalacao.get(m.instalacao_id) ?? "—"} · {d.tipo === "contrato" ? "contrato" : m.configuracao_inicial ? "factura antiga" : "factura"} ·{" "}
                  {dataPorExtenso(String(m.created_at).slice(0, 10))} · {QUOTA_TEXTO[m.estado_quota as keyof typeof QUOTA_TEXTO]}
                </span>
                {estado === "por_associar" ? (
                  <Link href={`/empresa/documentos/${d.id}`} prefetch={false} className={LIGACAO}>
                    {TEXTO_ESTADO_DOCUMENTO[estado]}
                  </Link>
                ) : (
                  <span className="block">{TEXTO_ESTADO_DOCUMENTO[estado]}</span>
                )}
              </li>
            );
          })}
        </ul>
        </section>
      )}
    </PortalEmpresa>
  );
}
