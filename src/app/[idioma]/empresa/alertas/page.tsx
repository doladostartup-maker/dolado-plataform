import Link from "next/link";
import { CARTAO, LIGACAO, TEXTO_SECUNDARIO, TITULO_CARTAO, TITULO_SECCAO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { carregarDadosPortal, hojeLisboa } from "@/lib/empresas/portalServidor";
import { TEXTO_PRAZO, nomeServico, proximosPrazos, quandoPrazo } from "@/lib/empresas/painel";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alertas — DoLado Empresas", robots: { index: false, follow: false } };

// Alertas (Fase 7): prazos dos próximos 12 meses e situações já revistas e
// comunicadas pela DoLado. Nunca situações por rever. Sessão (RLS, aal2).
export default async function AlertasEmpresaPage() {
  const { supabase, user, organizacao } = await portalEmpresa("empresa/alertas");
  const { hoje } = hojeLisboa();
  const dados = await carregarDadosPortal(supabase, organizacao.id, user.id);
  const prazos = proximosPrazos(dados.servicos, hoje, 365);
  const servico = new Map(dados.servicos.map((s) => [s.id, s]));
  const nomeInst = new Map(dados.instalacoes.map((i) => [i.id, i.nome]));
  const onde = (id: string) => {
    const s = servico.get(id);
    return s ? `${nomeServico(s)}${s.instalacao_id ? ` · ${nomeInst.get(s.instalacao_id) ?? ""}` : ""}` : "";
  };

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="alertas"
      titulo="Alertas"
      descricao={
        <>
          Prazos dos serviços e situações que a DoLado verificou e lhe comunicou. Os avisos também chegam por e-mail.{" "}
          <Link href="/empresa/resumos" prefetch={false} className={LIGACAO}>
            Ver os resumos mensais
          </Link>
          .
        </>
      }
    >
      <section className={`${CARTAO} flex flex-col gap-3`} aria-labelledby="prazos">
        <h2 id="prazos" className={TITULO_SECCAO}>
          Prazos nos próximos 12 meses
        </h2>
        {prazos.length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>Nenhum fim de fidelização ou de promoção nos próximos 12 meses, com base nos documentos carregados.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-[15px]">
            {prazos.map((p) => (
              <li key={`${p.servicoId}-${p.tipo}`} className="border-t border-[var(--v2-line)] pt-3">
                <span className="font-semibold">
                  {TEXTO_PRAZO[p.tipo]}: {dataPorExtenso(p.data)}
                </span>{" "}
                ({quandoPrazo(p.dias)})<span className={`${TEXTO_SECUNDARIO} block`}>{onde(p.servicoId)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${CARTAO} flex flex-col gap-3`} aria-labelledby="situacoes">
        <h2 id="situacoes" className={TITULO_SECCAO}>
          Situações comunicadas
        </h2>
        {dados.achados.length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>Não há situações comunicadas nos documentos analisados.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-[15px]">
            {dados.achados.map((a) => (
              <li key={a.id} className="border-t border-[var(--v2-line)] pt-3">
                <p className={TITULO_CARTAO}>{onde(a.contrato_id)}</p>
                <p>{a.texto_cliente}</p>
                <p className={TEXTO_SECUNDARIO}>Comunicado a {dataPorExtenso(String(a.comunicado_em).slice(0, 10))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalEmpresa>
  );
}
