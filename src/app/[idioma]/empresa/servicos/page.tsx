import Link from "next/link";
import { BOTAO_PRIMARIO, CARTAO, TEXTO_SECUNDARIO, TITULO_CARTAO, TITULO_SECCAO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { carregarDadosPortal } from "@/lib/empresas/portalServidor";
import { eurosComIva, mesDaFatura, nomeServico, rotuloMes } from "@/lib/empresas/painel";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contratos e serviços — DoLado Empresas", robots: { index: false, follow: false } };

// Serviços acompanhados por instalação (Fase 7): fornecedor, datas lidas dos
// documentos e última factura. Leitura com a sessão (RLS, aal2).
export default async function ServicosEmpresaPage() {
  const { supabase, user, organizacao, acesso } = await portalEmpresa("empresa/servicos");
  const dados = await carregarDadosPortal(supabase, organizacao.id, user.id);
  const grupos = [
    ...dados.instalacoes.map((i) => ({ id: i.id, nome: i.nome })),
    ...(dados.servicos.some((s) => !s.instalacao_id) ? [{ id: null, nome: "Sem instalação" }] : []),
  ];

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="servicos"
      titulo="Contratos e serviços"
      descricao="Os serviços que a DoLado acompanha em cada instalação, com as datas lidas dos contratos e das facturas."
    >
      {dados.servicos.length === 0 ? (
        <div className={`${CARTAO} flex flex-col gap-3`}>
          <p className={TEXTO_SECUNDARIO}>Ainda não há serviços. Cada serviço aparece quando carregar a primeira factura ou o contrato.</p>
          {acesso === "total" && (
            <Link href="/empresa/documentos" prefetch={false} className={`${BOTAO_PRIMARIO} self-start`}>
              Carregar documentos
            </Link>
          )}
        </div>
      ) : (
        grupos.map((g) => {
          const servicos = dados.servicos.filter((s) => (s.instalacao_id ?? null) === g.id);
          if (servicos.length === 0) return null;
          return (
            <section key={g.id ?? "sem"} className={`${CARTAO} flex flex-col gap-3`} aria-label={g.nome}>
              <h2 className={TITULO_SECCAO}>{g.nome}</h2>
              <ul className="flex flex-col gap-3 text-[15px]">
                {servicos.map((s) => {
                  const ultima = dados.faturas.find((f) => f.contrato_id === s.id);
                  const mes = ultima ? mesDaFatura(ultima) : null;
                  const n = dados.faturas.filter((f) => f.contrato_id === s.id).length;
                  return (
                    <li key={s.id} className="flex flex-col gap-0.5 border-t border-[var(--v2-line)] pt-3">
                      <span className={TITULO_CARTAO}>{nomeServico(s)}</span>
                      <span className={TEXTO_SECUNDARIO}>
                        {n === 1 ? "1 factura" : `${n} facturas`}
                        {ultima && mes ? ` · última: ${rotuloMes(mes)}${ultima.total_cents !== null ? `, ${eurosComIva(ultima.total_cents)}` : ""}` : ""}
                      </span>
                      {s.data_fim_fidelizacao && <span>Fim da fidelização: {dataPorExtenso(s.data_fim_fidelizacao)}</span>}
                      {s.data_fim_promocao && <span>Fim da promoção: {dataPorExtenso(s.data_fim_promocao)}</span>}
                      {!s.data_fim_fidelizacao && !s.data_fim_promocao && (
                        <span className={TEXTO_SECUNDARIO}>Sem datas de fidelização ou de promoção nos documentos carregados.</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </PortalEmpresa>
  );
}
