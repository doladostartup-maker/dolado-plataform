import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { estadoReembolsoPt, formatarEuros, NOME_PLANO, type PlanoDestino } from "@/lib/stripe/conversao";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PEQUENO,
  BOTAO_SECUNDARIO,
  BOTAO_TERCIARIO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";

// Conversões Avulso → assinatura cujo reembolso parcial falhou ou foi
// recusado pelo Stripe. A subscrição do cliente continua ativa; o reembolso
// é resolvido à mão no Stripe e a resolução registada aqui.

type Linha = {
  id: string;
  plano_destino: PlanoDestino;
  refund_montante_centimos: number;
  refund_estado: string | null;
  intervencao_motivo: string | null;
  intervencao_resolvida_em: string | null;
  updated_at: string;
  stripe_payments: { email: string } | { email: string }[] | null;
};

function emailDe(l: Linha) {
  const p = Array.isArray(l.stripe_payments) ? l.stripe_payments[0] : l.stripe_payments;
  return p?.email ?? "—";
}

function Tabela({ linhas, resolvidas }: { linhas: Linha[]; resolvidas?: boolean }) {
  return (
    <div className={TABELA_MOLDURA}>
      <table className={TABELA}>
        <thead>
          <tr>
            <th scope="col" className={TABELA_TH}>Cliente</th>
            <th scope="col" className={TABELA_TH}>Plano</th>
            <th scope="col" className={TABELA_TH}>Reembolso</th>
            <th scope="col" className={TABELA_TH}>{resolvidas ? "Resolvida em" : "Motivo"}</th>
            <th scope="col" className={TABELA_TH}>
              <span className="sr-only">Ação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className={TABELA_TR}>
              <td className={`${TABELA_TD} font-semibold`}>{emailDe(l)}</td>
              <td className={TABELA_TD}>{NOME_PLANO[l.plano_destino]}</td>
              <td className={TABELA_TD}>
                <span className="tabular-nums">{formatarEuros(l.refund_montante_centimos)}</span>
                <span className="block text-[12.5px] text-[var(--v2-muted)]">
                  {l.refund_estado ? `Stripe: ${estadoReembolsoPt(l.refund_estado)}` : "Sem reembolso criado"}
                </span>
              </td>
              <td className={`${TABELA_TD} text-[13px] text-[var(--v2-muted)]`}>
                {resolvidas ? new Date(l.intervencao_resolvida_em!).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : (l.intervencao_motivo ?? "—")}
              </td>
              <td className={`${TABELA_TD} text-right`}>
                <Link
                  href={`/backoffice/conversoes/${l.id}`}
                  prefetch={false}
                  className={`${resolvidas ? BOTAO_TERCIARIO : BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}
                >
                  {resolvidas ? "Ver" : "Resolver"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ConversoesPage({
  searchParams,
}: {
  searchParams: Promise<{ resolvida?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const colunas =
    "id, plano_destino, refund_montante_centimos, refund_estado, intervencao_motivo, intervencao_resolvida_em, updated_at, stripe_payments(email)";
  const [{ data: porResolver }, { data: resolvidas }, { data: anuladas }] = await Promise.all([
    supabase
      .from("conversoes_avulso")
      .select(colunas)
      .eq("requer_intervencao", true)
      .order("updated_at", { ascending: true }),
    supabase
      .from("conversoes_avulso")
      .select(colunas)
      .not("intervencao_resolvida_em", "is", null)
      .order("intervencao_resolvida_em", { ascending: false })
      .limit(20),
    supabase
      .from("conversoes_avulso")
      .select("id, plano_destino, anulada_em, anulada_motivo, stripe_payments(email)")
      .eq("estado", "anulada")
      .order("anulada_em", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Pagamentos"
        titulo="Conversões com intervenção"
        descricao="Conversões de um Avulso numa subscrição cujo reembolso parcial falhou ou foi recusado pelo Stripe. A subscrição do cliente continua ativa e nenhum reembolso é repetido automaticamente: resolva no Stripe e registe aqui o que foi feito."
      />

      {params.resolvida && <Aviso tom="sucesso">Conversão marcada como resolvida.</Aviso>}

      <section aria-labelledby="por-resolver" className="flex flex-col gap-3">
        <TituloSeccao id="por-resolver" titulo="Por resolver" contagem={porResolver?.length ?? 0} />
        {porResolver && porResolver.length > 0 ? (
          <Tabela linhas={porResolver as unknown as Linha[]} />
        ) : (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Sem conversões por resolver de momento." />
        )}
      </section>

      {resolvidas && resolvidas.length > 0 && (
        <section aria-labelledby="resolvidas" className="flex flex-col gap-3">
          <TituloSeccao id="resolvidas" titulo="Resolvidas recentemente" />
          <Tabela linhas={resolvidas as unknown as Linha[]} resolvidas />
        </section>
      )}

      {anuladas && anuladas.length > 0 && (
        <section aria-labelledby="anuladas" className="flex flex-col gap-3">
          <TituloSeccao
            id="anuladas"
            titulo="Anuladas automaticamente"
            descricao="O caso do Avulso já não estava disponível quando o pagamento foi confirmado: a subscrição foi cancelada no Stripe, sem reembolso nem casos. Não é preciso fazer nada."
          />
          <ul className="flex flex-col divide-y divide-[var(--v2-line)] rounded-[14px] border border-[var(--v2-line)] bg-white">
            {(anuladas as unknown as (Linha & { anulada_em: string; anulada_motivo: string | null })[]).map((l) => (
              <li key={l.id} className="flex flex-col gap-0.5 px-4 py-3 text-[14px]">
                <span>
                  <span className="font-semibold">{emailDe(l)}</span> · {NOME_PLANO[l.plano_destino]} ·{" "}
                  {new Date(l.anulada_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
                </span>
                <span className="text-[12.5px] text-[var(--v2-muted)]">{l.anulada_motivo ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
