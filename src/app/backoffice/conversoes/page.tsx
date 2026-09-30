import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { estadoReembolsoPt, formatarEuros, NOME_PLANO, type PlanoDestino } from "@/lib/stripe/conversao";

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

const TH = "px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]";

function emailDe(l: Linha) {
  const p = Array.isArray(l.stripe_payments) ? l.stripe_payments[0] : l.stripe_payments;
  return p?.email ?? "—";
}

function Tabela({ linhas, resolvidas }: { linhas: Linha[]; resolvidas?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <th className={TH}>Cliente</th>
            <th className={TH}>Plano</th>
            <th className={TH}>Reembolso</th>
            <th className={TH}>{resolvidas ? "Resolvida em" : "Motivo"}</th>
            <th className={TH} />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-t border-[var(--color-hairline)]">
              <td className="px-3 py-2 text-[var(--color-ink)]">{emailDe(l)}</td>
              <td className="px-3 py-2 text-[var(--color-ink)]">{NOME_PLANO[l.plano_destino]}</td>
              <td className="px-3 py-2 text-[var(--color-ink)]">
                {formatarEuros(l.refund_montante_centimos)}
                <span className="block text-[12px] text-[var(--color-ink-faint)]">
                  {l.refund_estado ? `Stripe: ${estadoReembolsoPt(l.refund_estado)}` : "Sem reembolso criado"}
                </span>
              </td>
              <td className="px-3 py-2 text-[var(--color-ink-muted)]">
                {resolvidas
                  ? new Date(l.intervencao_resolvida_em!).toLocaleString("pt-PT")
                  : (l.intervencao_motivo ?? "—")}
              </td>
              <td className="px-3 py-2">
                <Link href={`/backoffice/conversoes/${l.id}`} className="text-[var(--color-brand)] underline">
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
  const [{ data: porResolver }, { data: resolvidas }] = await Promise.all([
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
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Conversões com intervenção
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Conversões de um Avulso numa subscrição cujo reembolso parcial falhou ou foi recusado pelo
        Stripe. A subscrição do cliente continua ativa e nenhum reembolso é repetido
        automaticamente: resolva no Stripe e registe aqui o que foi feito.
      </p>

      {params.resolvida && (
        <p className="text-sm text-[var(--color-status-success)]">✓ Conversão marcada como resolvida.</p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Por resolver</h2>
        {porResolver && porResolver.length > 0 ? (
          <Tabela linhas={porResolver as unknown as Linha[]} />
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">Sem conversões por resolver de momento.</p>
        )}
      </section>

      {resolvidas && resolvidas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Resolvidas recentemente</h2>
          <Tabela linhas={resolvidas as unknown as Linha[]} resolvidas />
        </section>
      )}
    </div>
  );
}
