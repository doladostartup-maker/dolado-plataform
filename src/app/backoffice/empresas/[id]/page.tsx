import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { Aviso } from "@/components/portal/Aviso";
import {
  BOTAO_DESTRUTIVO,
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAIXA_SELECAO,
  CAMPO,
  CODIGO,
  LIGACAO,
  LINHA_SELECAO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
  TEXTO,
} from "@/components/backoffice/ui";
import { APRESENTACAO_ESTADO, TIPOS_ENTIDADE, ehEstadoOrganizacao, ehTipoEntidade } from "@/lib/empresas/registo";
import { ACOES_ADMIN, dataPorExtenso, medicaoPagamentos, precoSemIva, prazosDoVencimento, type PeriodoResumo } from "@/lib/empresas/ciclo";
import { activarEmpresa, confirmarPagamentoEmpresa, transicaoEmpresa } from "../actions";

// Ficha de uma organização (DoLado Empresas, Fase 5): activação, mensalidades
// (pagamento manual por transferência), suspender/reactivar/cancelar com
// motivo, histórico e medição. Leitura com a sessão do admin (RLS).

export const dynamic = "force-dynamic";

type Periodo = PeriodoResumo & { id: string };

function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—";
}

function rotuloEstado(estado: string) {
  return ehEstadoOrganizacao(estado) ? APRESENTACAO_ESTADO[estado].titulo : estado;
}

const PAGAMENTO = { por_pagar: "Por pagar", pago: "Pago", anulado: "Anulado" } as const;

export default async function FichaEmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const avisos = await searchParams;

  const [{ data: org }, { data: periodosBrutos }, { data: historico }] = await Promise.all([
    supabase
      .from("organizacoes")
      .select(
        "id, nome, tipo_entidade, nif, responsavel_nome, estado, activada_em, ciclo_ancora, revisao_obrigatoria_ate, preco_mensal_cents, preco_garantido_ate, cancelamento_pedido_em, motivo_cancelamento, acesso_consulta_ate, eliminacao_prevista_em, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("empresa_periodos")
      .select("id, numero, inicio, fim, valor_cents, estado_pagamento, pago_em, referencia_factura")
      .eq("organizacao_id", id)
      .order("inicio", { ascending: false }),
    supabase
      .from("organizacoes_historico")
      .select("estado_antes, estado_depois, motivo, created_at")
      .eq("organizacao_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!org) notFound();
  const periodos = (periodosBrutos ?? []) as Periodo[];
  const medicao = medicaoPagamentos(periodos);
  const acoes = Object.entries(ACOES_ADMIN).filter(([, a]) => (a.estados as readonly string[]).includes(org.estado));

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto={
          <Link href="/backoffice/empresas" prefetch={false} className={LIGACAO}>
            Empresas
          </Link>
        }
        titulo={org.nome}
        descricao={`${rotuloEstado(org.estado)} · ${ehTipoEntidade(org.tipo_entidade) ? TIPOS_ENTIDADE[org.tipo_entidade] : org.tipo_entidade} · NIPC/NIF ${org.nif}`}
      />
      {avisos.erro && <Aviso tom="erro">{avisos.erro}</Aviso>}
      {avisos.ok && <Aviso tom="sucesso">{avisos.ok}</Aviso>}

      <section className={`${PAINEL} ${PAINEL_CORPO} grid gap-2 text-[14px] sm:grid-cols-2`}>
        <p>Responsável: {org.responsavel_nome ?? "—"}</p>
        <p>Registo: {dataHora(org.created_at)}</p>
        <p>Mensalidade: {precoSemIva(org.preco_mensal_cents)}</p>
        <p>Activada: {dataHora(org.activada_em)}</p>
        {org.ciclo_ancora && (
          <p>
            Vence no dia {Number(org.ciclo_ancora.slice(8, 10))} de cada mês
            {Number(org.ciclo_ancora.slice(8, 10)) > 28 ? " (no último dia, nos meses mais curtos)" : ""} — desde{" "}
            {dataPorExtenso(org.ciclo_ancora)}
          </p>
        )}
        {org.revisao_obrigatoria_ate && <p>Revisão humana obrigatória até {dataHora(org.revisao_obrigatoria_ate)}</p>}
        {org.preco_garantido_ate && <p>Preço garantido até {dataHora(org.preco_garantido_ate)}</p>}
        {org.cancelamento_pedido_em && <p className="font-semibold">Cancelamento pedido a {dataHora(org.cancelamento_pedido_em)} (fim do período pago)</p>}
        {org.motivo_cancelamento && <p>Cancelamento: {org.motivo_cancelamento}</p>}
        {org.acesso_consulta_ate && <p>Consulta até {dataHora(org.acesso_consulta_ate)}</p>}
        {org.eliminacao_prevista_em && <p>Eliminação prevista a partir de {dataPorExtenso(org.eliminacao_prevista_em)}</p>}
        <p className={METADADOS}>
          Medição: {medicao.periodosPagos} {medicao.periodosPagos === 1 ? "mensalidade paga" : "mensalidades pagas"} ·{" "}
          {precoSemIva(medicao.receitaCents)} · {medicao.diasAtraso} dias de atraso acumulados
        </p>
      </section>

      {org.estado === "aprovada" && (
        <section aria-labelledby="activar" className="flex flex-col gap-3">
          <TituloSeccao
            id="activar"
            titulo="Activar"
            descricao="Depois de emitir a factura da primeira mensalidade (fora da plataforma) e de receber a transferência. A activação verifica a vaga: sem vaga, a organização vai para a lista de espera."
          />
          <form action={activarEmpresa.bind(null, org.id)} className={`${PAINEL} ${PAINEL_CORPO} flex max-w-[420px] flex-col gap-3`}>
            <label className="flex flex-col gap-1 text-[13px] font-semibold">
              Referência da factura emitida
              <input name="referencia" required maxLength={100} className={CAMPO} />
            </label>
            <label className={LINHA_SELECAO}>
              <input type="checkbox" name="confirmar" required className={CAIXA_SELECAO} />
              Confirmei a transferência da primeira mensalidade ({precoSemIva(org.preco_mensal_cents)})
            </label>
            <BotaoSubmeter className={`${BOTAO_PRIMARIO} self-start`} aDecorrer="A activar…">
              Activar a Protecção Empresas
            </BotaoSubmeter>
          </form>
        </section>
      )}

      <section aria-labelledby="mensalidades" className="flex flex-col gap-3">
        <TituloSeccao id="mensalidades" titulo="Mensalidades" contagem={periodos.length} />
        {periodos.length === 0 ? (
          <p className={TEXTO}>Ainda não há mensalidades.</p>
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Período</th>
                  <th scope="col" className={TABELA_TH}>Valor</th>
                  <th scope="col" className={TABELA_TH}>Pagamento</th>
                  <th scope="col" className={TABELA_TH}>Confirmar</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => (
                  <tr key={p.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      {p.numero ? `${p.numero}.º · ` : ""}
                      {dataPorExtenso(p.inicio)} a {dataPorExtenso(p.fim)}
                      {p.estado_pagamento === "por_pagar" && (
                        <span className={`${METADADOS} block`}>
                          Vence a {dataPorExtenso(p.inicio)} · suspensa a {dataPorExtenso(prazosDoVencimento(p.inicio).suspensaEm)} · cancelada a{" "}
                          {dataPorExtenso(prazosDoVencimento(p.inicio).canceladaEm)}
                        </span>
                      )}
                    </td>
                    <td className={TABELA_TD}>{precoSemIva(p.valor_cents)}</td>
                    <td className={TABELA_TD}>
                      {PAGAMENTO[p.estado_pagamento]}
                      {p.pago_em && <span className={`${METADADOS} block`}>{dataHora(p.pago_em)}</span>}
                      {p.referencia_factura && <span className={`${CODIGO} block`}>{p.referencia_factura}</span>}
                    </td>
                    <td className={TABELA_TD}>
                      {p.estado_pagamento === "por_pagar" ? (
                        <form action={confirmarPagamentoEmpresa.bind(null, org.id, p.id)} className="flex min-w-[220px] flex-col gap-2">
                          <input name="referencia" required maxLength={100} placeholder="Referência da factura" className={CAMPO} />
                          <label className={LINHA_SELECAO}>
                            <input type="checkbox" name="confirmar" required className={CAIXA_SELECAO} />
                            Transferência recebida
                          </label>
                          <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO} self-start`}>Confirmar pagamento</BotaoSubmeter>
                        </form>
                      ) : (
                        <span className={METADADOS}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {acoes.length > 0 && (
        <section aria-labelledby="accoes" className="flex flex-col gap-3">
          <TituloSeccao
            id="accoes"
            titulo="Acções"
            descricao="Sempre com motivo (fica no histórico). Reactivar só depois de confirmar as mensalidades vencidas. Cancelar dá 30 dias de consulta."
          />
          <form action={transicaoEmpresa.bind(null, org.id)} className={`${PAINEL} ${PAINEL_CORPO} flex max-w-[480px] flex-col gap-3`}>
            <label className="flex flex-col gap-1 text-[13px] font-semibold">
              Motivo
              <input name="motivo" required maxLength={500} className={CAMPO} />
            </label>
            <div className="flex flex-wrap gap-2">
              {acoes.map(([acao, a]) => (
                <button
                  key={acao}
                  type="submit"
                  name="acao"
                  value={acao}
                  className={`${acao === "cancelar" ? BOTAO_DESTRUTIVO : BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}
                >
                  {a.rotulo}
                </button>
              ))}
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="historico" className="flex flex-col gap-3">
        <TituloSeccao id="historico" titulo="Histórico" contagem={(historico ?? []).length} />
        <ul className={`${PAINEL} divide-y divide-[var(--v2-line)]`}>
          {(historico ?? []).map((h, i) => (
            <li key={i} className="px-4 py-2.5 text-[14px]">
              <span className="font-semibold">
                {h.estado_antes ? `${rotuloEstado(h.estado_antes)} → ` : ""}
                {rotuloEstado(h.estado_depois)}
              </span>
              {h.motivo && <span> — {h.motivo}</span>}
              <span className={`${METADADOS} block`}>{dataHora(h.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
