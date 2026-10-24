import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { CARTAO_INFO, LIGACAO, TEXTO_SECUNDARIO, TITULO_CARTAO } from "@/components/portal/ui";
import { CarregarDocumentoEmpresa } from "@/components/empresas/CarregarDocumentoEmpresa";
import { requireEmpresa } from "@/lib/auth";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { QUOTA_TEXTO, TEXTO_ESTADO_DOCUMENTO, estadoDocumentoEmpresa } from "@/lib/empresas/monitorPortal";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentos — DoLado Empresas", robots: { index: false, follow: false } };

// Documentos da empresa: carregar (instalação e tipo obrigatórios) e ver o
// estado de cada um. Leitura com a sessão (RLS, aal2) — nunca com a service
// role. O portal completo é a Fase 7.
export default async function DocumentosEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, organizacao } = await requireEmpresa("empresa/documentos");
  const params = await searchParams;
  const ativa = organizacao.estado === "ativa" || organizacao.estado === "pagamento_em_atraso";

  const [{ data: instalacoes }, { data: org }, { data: quota }, { data: metas }] = await Promise.all([
    supabase.from("instalacoes").select("id, nome").eq("organizacao_id", organizacao.id).is("desativada_em", null).order("created_at"),
    supabase.from("organizacoes").select("revisao_obrigatoria_ate").eq("id", organizacao.id).maybeSingle(),
    supabase.rpc("empresa_quota_sessao"),
    supabase
      .from("empresa_documentos")
      .select("documento_id, instalacao_id, configuracao_inicial, estado_quota, revisao_necessaria, revisto_em, created_at")
      .eq("organizacao_id", organizacao.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const ids = (metas ?? []).map((m) => m.documento_id);
  const { data: docs } = ids.length
    ? await supabase.from("documentos_monitor").select("id, tipo, nome_ficheiro, etapa, estado, contrato_id, associacao_estado").in("id", ids)
    : { data: [] };
  const nomeInstalacao = new Map((instalacoes ?? []).map((i) => [i.id, i.nome]));
  const q = quota as { limite: number; usadas: number; disponiveis: number } | null;
  const configuracaoDisponivel = !!org?.revisao_obrigatoria_ate && new Date(org.revisao_obrigatoria_ate) > new Date();

  return (
    <MolduraConta
      semIdioma
      contexto={organizacao.nome}
      titulo="Documentos"
      descricao="Carregue as facturas e os contratos de cada instalação. A DoLado lê-os e acompanha os serviços."
      depois={
        <Link href={ROTAS_EMPRESA.painel} prefetch={false} className={LIGACAO}>
          Voltar à conta da empresa
        </Link>
      }
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.info && <Aviso tom="sucesso">{params.info}</Aviso>}
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

      {(metas ?? []).length > 0 && (
        <ul className="flex flex-col gap-3 text-[15px]">
          {(metas ?? []).map((m) => {
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
      )}
    </MolduraConta>
  );
}
