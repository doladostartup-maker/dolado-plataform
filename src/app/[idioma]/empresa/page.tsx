import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CARTAO, CARTAO_INFO, LIGACAO, TEXTO, TEXTO_SECUNDARIO, TITULO_CARTAO, TITULO_SECCAO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { BarrasMensais, BarrasParcelas } from "@/components/empresas/Graficos";
import { requireEmpresa } from "@/lib/auth";
import { APRESENTACAO_ESTADO, ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { dataPorExtenso } from "@/lib/empresas/ciclo";
import { acessoEmpresa, carregarDadosPortal, hojeLisboa } from "@/lib/empresas/portalServidor";
import {
  TEXTO_PRAZO,
  despesasPorMes,
  eurosComIva,
  evolucao,
  nomeServico,
  porInstalacao,
  porSector,
  proximosPrazos,
  quandoPrazo,
  rotuloMes,
} from "@/lib/empresas/painel";
import { CONTACTO_EMAIL } from "@/lib/site";
import { terminarSessao } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "A sua empresa — DoLado Empresas", robots: { index: false, follow: false } };

// Painel da empresa (Fase 7). Com acesso (total ou só consulta), o portal;
// sem acesso (à espera de aprovação, rejeitada, fim da consulta), o estado da
// conta. Leitura sempre com a sessão (RLS: membro com aal2).
export default async function PainelEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, user, organizacao } = await requireEmpresa("empresa");
  const params = await searchParams;
  const acesso = await acessoEmpresa(supabase, organizacao.id);

  if (acesso === "nenhum") {
    const estado = APRESENTACAO_ESTADO[organizacao.estado];
    return (
      <MolduraConta
        semIdioma
        contexto={organizacao.nome}
        titulo={estado.titulo}
        depois={
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href={ROTAS_EMPRESA.seguranca} prefetch={false} className={LIGACAO}>
              Autenticação em dois passos
            </Link>
            <form action={terminarSessao}>
              <button type="submit" className={`${TEXTO_SECUNDARIO} underline underline-offset-4`}>
                Sair
              </button>
            </form>
          </div>
        }
      >
        {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
        {params.info && <Aviso tom="sucesso">{params.info}</Aviso>}
        <p className={TEXTO}>{estado.texto}</p>
        <div className={CARTAO_INFO}>
          <p className={TEXTO_SECUNDARIO}>
            Dúvidas? Escreva-nos para{" "}
            <a href={`mailto:${CONTACTO_EMAIL}`} className={LIGACAO}>
              {CONTACTO_EMAIL}
            </a>
            .
          </p>
        </div>
      </MolduraConta>
    );
  }

  const { hoje, mes } = hojeLisboa();
  const [dados, { data: quota }, { data: metas }] = await Promise.all([
    carregarDadosPortal(supabase, organizacao.id, user.id),
    supabase.rpc("empresa_quota_sessao"),
    supabase.from("empresa_documentos").select("documento_id, revisao_necessaria, revisto_em").eq("organizacao_id", organizacao.id).limit(500),
  ]);
  const ids = (metas ?? []).map((m) => m.documento_id);
  const { data: docs } = ids.length
    ? await supabase.from("documentos_monitor").select("id, etapa, contrato_id, associacao_estado").in("id", ids)
    : { data: [] };

  const meses = despesasPorMes(dados.faturas, mes);
  const evo = evolucao(meses);
  const mesesPainel = meses.map((m) => m.mes);
  const sectores = porSector(dados.faturas, dados.servicos, mesesPainel);
  const instalacoes = porInstalacao(dados.faturas, dados.servicos, dados.instalacoes, mesesPainel);
  const prazos = proximosPrazos(dados.servicos, hoje).slice(0, 5);
  const servico = new Map(dados.servicos.map((s) => [s.id, s]));
  const nomeInst = new Map(dados.instalacoes.map((i) => [i.id, i.nome]));
  const emVerificacao = dados.faturas.filter((f) => f.em_verificacao).length;
  const porAssociar = (docs ?? []).filter((d) => !d.contrato_id && (d.associacao_estado === "possivel" || d.associacao_estado === "conflito")).length;
  const emAnalise = (docs ?? []).filter((d) => d.etapa && !["concluido", "repetido", "falhou"].includes(d.etapa)).length;
  const q = quota as { limite: number; usadas: number; disponiveis: number } | null;

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="painel"
      titulo="Painel"
      descricao="Despesas, prazos e documentos de todas as instalações. Os valores são os totais das facturas, com IVA."
      mensagens={params}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={CARTAO}>
          <p className={TEXTO_SECUNDARIO}>Facturas analisadas este mês</p>
          <p className="text-[24px] font-bold">{q ? `${q.usadas} de ${q.limite}` : "—"}</p>
        </div>
        <div className={CARTAO}>
          <p className={TEXTO_SECUNDARIO}>Documentos</p>
          <p className="text-[15px]">
            {emAnalise} em análise · {porAssociar} precisam da sua confirmação
          </p>
          {porAssociar > 0 && (
            <Link href="/empresa/documentos" prefetch={false} className={LIGACAO}>
              Ver os documentos
            </Link>
          )}
        </div>
        <div className={CARTAO}>
          <p className={TEXTO_SECUNDARIO}>Próximo prazo</p>
          {prazos[0] ? (
            <p className="text-[15px]">
              {TEXTO_PRAZO[prazos[0].tipo]} — {dataPorExtenso(prazos[0].data)} ({quandoPrazo(prazos[0].dias)})
            </p>
          ) : (
            <p className="text-[15px]">Sem prazos nos próximos 90 dias.</p>
          )}
        </div>
      </div>

      <section className={`${CARTAO} flex flex-col gap-4`} aria-labelledby="despesas">
        <h2 id="despesas" className={TITULO_SECCAO}>
          Despesas por mês
        </h2>
        {meses.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className={TEXTO_SECUNDARIO}>Ainda não há facturas analisadas. Carregue as facturas de cada instalação para ver as despesas.</p>
            {acesso === "total" && (
              <Link href="/empresa/documentos" prefetch={false} className={`${BOTAO_PRIMARIO} self-start`}>
                Carregar facturas
              </Link>
            )}
          </div>
        ) : (
          <>
            <BarrasMensais meses={meses} />
            {evo.suficiente ? (
              <p className={TEXTO}>
                {rotuloMes(evo.atual.mes)} face a {rotuloMes(evo.anterior.mes)}:{" "}
                <strong>
                  {evo.diferencaCents === 0
                    ? "sem diferença"
                    : `${evo.diferencaCents > 0 ? "mais" : "menos"} ${eurosComIva(Math.abs(evo.diferencaCents))}`}
                </strong>{" "}
                ({eurosComIva(evo.atual.totalCents)}).
              </p>
            ) : (
              <p className={TEXTO_SECUNDARIO}>
                Histórico ainda insuficiente para mostrar a evolução: são precisos pelo menos dois meses completos, com as facturas de todos os
                serviços.
              </p>
            )}
          </>
        )}
      </section>

      {meses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={`${CARTAO} flex flex-col gap-4`} aria-labelledby="sectores">
            <h2 id="sectores" className={TITULO_SECCAO}>
              Por sector
            </h2>
            <p className={TEXTO_SECUNDARIO}>
              {rotuloMes(mesesPainel[0])} a {rotuloMes(mesesPainel[mesesPainel.length - 1])}
            </p>
            <BarrasParcelas parcelas={sectores} />
          </section>
          <section className={`${CARTAO} flex flex-col gap-4`} aria-labelledby="instalacoes">
            <h2 id="instalacoes" className={TITULO_SECCAO}>
              Por instalação
            </h2>
            {instalacoes.length > 1 ? (
              <BarrasParcelas parcelas={instalacoes} />
            ) : (
              <p className={TEXTO_SECUNDARIO}>A comparação aparece quando houver facturas de mais do que uma instalação.</p>
            )}
          </section>
        </div>
      )}

      <section className={`${CARTAO} flex flex-col gap-3`} aria-labelledby="prazos">
        <h2 id="prazos" className={TITULO_SECCAO}>
          Próximos prazos
        </h2>
        {prazos.length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>Nenhum fim de fidelização ou de promoção nos próximos 90 dias, com base nos documentos carregados.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-[15px]">
            {prazos.map((p) => {
              const s = servico.get(p.servicoId);
              return (
                <li key={`${p.servicoId}-${p.tipo}`}>
                  <span className="font-semibold">
                    {TEXTO_PRAZO[p.tipo]}: {dataPorExtenso(p.data)}
                  </span>{" "}
                  ({quandoPrazo(p.dias)})
                  {s && (
                    <span className={`${TEXTO_SECUNDARIO} block`}>
                      {nomeServico(s)}
                      {s.instalacao_id ? ` · ${nomeInst.get(s.instalacao_id) ?? ""}` : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/empresa/alertas" prefetch={false} className={LIGACAO}>
          Ver todos os alertas
        </Link>
      </section>

      <section className={`${CARTAO} flex flex-col gap-3`} aria-labelledby="diferencas">
        <h2 id="diferencas" className={TITULO_SECCAO}>
          Diferenças potenciais
        </h2>
        {emVerificacao > 0 && (
          <p className={TEXTO}>
            {emVerificacao === 1 ? "1 factura está" : `${emVerificacao} facturas estão`} em verificação pela DoLado.
          </p>
        )}
        {dados.achados.length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>
            {emVerificacao > 0 ? "Ainda não há situações comunicadas." : "Não há situações comunicadas nos documentos analisados."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3 text-[15px]">
            {dados.achados.slice(0, 3).map((a) => {
              const s = servico.get(a.contrato_id);
              return (
                <li key={a.id} className="border-t border-[var(--v2-line)] pt-3">
                  {s && <p className={TITULO_CARTAO}>{nomeServico(s)}</p>}
                  <p>{a.texto_cliente}</p>
                  <p className={TEXTO_SECUNDARIO}>Comunicado a {dataPorExtenso(String(a.comunicado_em).slice(0, 10))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PortalEmpresa>
  );
}
