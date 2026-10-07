import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatarPreco } from "@/lib/planos";
import { indicacoesAtivas } from "@/lib/indicacoes/regras";
import { reverRecompensaIndicacao } from "./actions";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PEQUENO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CODIGO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";

// Programa de indicação: números para acompanhar (sem dashboard complexo) e
// descontos em revisão por possível auto-indicação. Os dados vêm de
// indicacoes_metricas() (só admin); a receita conta só os pagamentos por
// Checkout (as renovações mensais não estão em stripe_payments).

type Metricas = {
  visitas: number;
  atribuicoes: number;
  compras: number;
  compras_rejeitadas: number;
  compras_revertidas: number;
  compras_por_produto: Record<string, number>;
  receita_primeira_compra_centimos: number;
  desconto_novos_clientes_centimos: number;
  recompensas_emitidas: number;
  recompensas_disponiveis: number;
  recompensas_usadas: number;
  recompensas_em_revisao: number;
  recompensas_anuladas: number;
  recompensas_expiradas: number;
  desconto_recompensas_centimos: number;
  valor_medio_indicados_centimos: number;
  clientes_indicados: number;
  valor_medio_nao_indicados_centimos: number;
  clientes_nao_indicados: number;
};

type EmRevisao = { id: string; user_id: string; indicacao_id: string; motivo: string | null; criado_em: string };

function percentagem(parte: number, total: number) {
  return total > 0 ? `${((parte / total) * 100).toFixed(1).replace(".", ",")}%` : "—";
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string | number; detalhe?: string }) {
  return (
    <div className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-1`}>
      <p className={METADADOS}>{rotulo}</p>
      <p className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{valor}</p>
      {detalhe && <p className={METADADOS}>{detalhe}</p>}
    </div>
  );
}

export default async function IndicacoesBackofficePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; decidida?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [{ data: metricas }, { data: emRevisao }] = await Promise.all([
    supabase.rpc("indicacoes_metricas"),
    createAdminClient()
      .from("indicacoes_recompensas")
      .select("id, user_id, indicacao_id, motivo, criado_em")
      .eq("estado", "em_revisao")
      .order("criado_em", { ascending: true }),
  ]);
  const m = (metricas ?? null) as Metricas | null;
  const custoDescontos = m ? m.desconto_novos_clientes_centimos + m.desconto_recompensas_centimos : 0;

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Pagamentos"
        titulo="Programa de indicação"
        descricao="20% para quem indica e 20% para o novo cliente. Caso + Proteção não é elegível para o desconto de aquisição; uma recompensa já ganha pode ser usada numa renovação mensal futura do Caso + Proteção. Mesmo cartão = revisão manual, nunca bloqueio automático; o IP nunca é usado."
      />
      {!indicacoesAtivas() && (
        <Aviso tom="info">O programa está desligado (INDICACOES_ATIVO). Os links não registam visitas e não há descontos.</Aviso>
      )}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.decidida && <Aviso tom="sucesso">Decisão registada.</Aviso>}

      {m && (
        <section aria-labelledby="numeros" className="flex flex-col gap-3">
          <TituloSeccao id="numeros" titulo="Números" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Numero rotulo="Visitas por link" valor={m.visitas} />
            <Numero rotulo="Contas atribuídas" valor={m.atribuicoes} detalhe={`${percentagem(m.atribuicoes, m.visitas)} das visitas`} />
            <Numero
              rotulo="Primeiras compras confirmadas"
              valor={m.compras}
              detalhe={`Conversão: ${percentagem(m.compras, m.visitas)} das visitas · ${percentagem(m.compras, m.atribuicoes)} das contas`}
            />
            <Numero
              rotulo="Receita das primeiras compras"
              valor={formatarPreco(m.receita_primeira_compra_centimos)}
              detalhe={Object.entries(m.compras_por_produto)
                .map(([produto, n]) => `${produto}: ${n}`)
                .join(" · ") || undefined}
            />
            <Numero
              rotulo="Descontos de quem indicou"
              valor={m.recompensas_emitidas}
              detalhe={`${m.recompensas_usadas} usados · ${m.recompensas_disponiveis} por usar · ${m.recompensas_expiradas} expirados (12 meses) · ${m.recompensas_anuladas} anulados`}
            />
            <Numero
              rotulo="CAC implícito"
              valor={m.compras > 0 ? formatarPreco(Math.round(custoDescontos / m.compras)) : "—"}
              detalhe={`Descontos dados: ${formatarPreco(custoDescontos)} (novos clientes + quem indicou)`}
            />
            <Numero
              rotulo="Valor médio por cliente indicado"
              valor={formatarPreco(m.valor_medio_indicados_centimos)}
              detalhe={`${m.clientes_indicados} clientes · só compras por Checkout`}
            />
            <Numero
              rotulo="Valor médio por cliente não indicado"
              valor={formatarPreco(m.valor_medio_nao_indicados_centimos)}
              detalhe={`${m.clientes_nao_indicados} clientes · só compras por Checkout`}
            />
          </div>
          <p className={METADADOS}>
            Compras sem recompensa: {m.compras_rejeitadas} (0 €, mesmo cliente Stripe ou não era a primeira compra) ·
            revertidas por reembolso integral ou disputa: {m.compras_revertidas}.
          </p>
        </section>
      )}

      <section aria-labelledby="revisao" className="flex flex-col gap-3">
        <TituloSeccao
          id="revisao"
          titulo="Descontos em revisão"
          contagem={(emRevisao ?? []).length}
          descricao="Primeira compra paga com o mesmo meio de pagamento de quem indicou. Aprovar dá o desconto; recusar anula-o."
        />
        {(emRevisao ?? []).length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhum por rever." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Quem indicou</th>
                  <th scope="col" className={TABELA_TH}>Sinal</th>
                  <th scope="col" className={TABELA_TH}>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {(emRevisao as EmRevisao[]).map((r) => (
                  <tr key={r.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <span className={CODIGO}>{r.user_id}</span>
                      <span className={`${CODIGO} block`}>indicação {r.indicacao_id}</span>
                    </td>
                    <td className={`${TABELA_TD} text-[13px]`}>
                      {r.motivo ?? "—"}
                      <span className="block text-[12.5px] text-[var(--v2-muted)]">
                        {new Date(r.criado_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
                      </span>
                    </td>
                    <td className={TABELA_TD}>
                      <div className="flex min-w-[240px] flex-col gap-2">
                        <form action={reverRecompensaIndicacao.bind(null, r.id, true)}>
                          <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Aprovar desconto</BotaoSubmeter>
                        </form>
                        <form action={reverRecompensaIndicacao.bind(null, r.id, false)} className="flex flex-col gap-2">
                          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                            Motivo da recusa
                            <textarea name="motivo" required rows={2} className={CAMPO} />
                          </label>
                          <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO} self-start`}>Recusar desconto</BotaoSubmeter>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
