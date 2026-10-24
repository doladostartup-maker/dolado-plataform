import Link from "next/link";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, CARTAO, TEXTO_SECUNDARIO, TITULO_CARTAO, TITULO_SECCAO } from "@/components/portal/ui";
import { definirPreaviso } from "./actions";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { carregarDadosPortal } from "@/lib/empresas/portalServidor";
import { eurosComIva, mesDaFatura, nomeServico, rotuloMes } from "@/lib/empresas/painel";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contratos e serviços — DoLado Empresas", robots: { index: false, follow: false } };

// Serviços acompanhados por instalação (Fase 7): fornecedor, datas lidas dos
// documentos e última factura. Leitura com a sessão (RLS, aal2).
export default async function ServicosEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, user, organizacao, acesso } = await portalEmpresa("empresa/servicos");
  const params = await searchParams;
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
      mensagens={params}
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
                      {s.preaviso_dias && <span>Pré-aviso para não renovar: {s.preaviso_dias} dias</span>}
                      {acesso === "total" && (
                        <details className="mt-1">
                          <summary className={`${TEXTO_SECUNDARIO} cursor-pointer underline underline-offset-4`}>
                            {s.preaviso_dias ? "Alterar o pré-aviso" : "Indicar o pré-aviso do contrato"}
                          </summary>
                          <form action={definirPreaviso} className="mt-2 flex flex-wrap items-end gap-3">
                            <input type="hidden" name="contrato_id" value={s.id} />
                            <label className="flex flex-col gap-1 text-[14.5px]">
                              Dias de pré-aviso (em branco para retirar)
                              <input name="dias" type="number" min={1} max={365} defaultValue={s.preaviso_dias ?? ""} className={`${CAMPO} w-32`} />
                            </label>
                            <button type="submit" className={BOTAO_SECUNDARIO}>
                              Guardar
                            </button>
                          </form>
                          <p className={`${TEXTO_SECUNDARIO} mt-2`}>
                            Com o pré-aviso, o primeiro alerta do fim da fidelização chega com tempo para comunicar ao fornecedor.
                          </p>
                        </details>
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
