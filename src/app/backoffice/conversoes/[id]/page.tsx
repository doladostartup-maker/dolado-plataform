import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { estadoReembolsoPt, formatarEuros, NOME_PLANO, type PlanoDestino } from "@/lib/stripe/conversao";
import { resolverIntervencao } from "../actions";

// Os ids vêm da nossa base de dados (gravados pelo webhook), não do browser.
const STRIPE_DASHBOARD = "https://dashboard.stripe.com";

type Um<T> = T | T[] | null;
const um = <T,>(v: Um<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type Conversao = {
  id: string;
  plano_destino: PlanoDestino;
  estado: string;
  valor_avulso_centimos: number;
  valor_primeira_mensalidade_centimos: number;
  refund_montante_centimos: number;
  checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  payment_intent_id: string | null;
  refund_id: string | null;
  refund_estado: string | null;
  requer_intervencao: boolean;
  intervencao_motivo: string | null;
  intervencao_resolvida_em: string | null;
  intervencao_nota: string | null;
  convertido_em: string | null;
  refund_atualizado_em: string | null;
  stripe_payments: Um<{ email: string; stripe_session_id: string; created_at: string }>;
  cliente: Um<{ nome: string | null }>;
  resolvida_por: Um<{ nome: string | null }>;
};

function data(valor: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-PT") : "—";
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 border-t border-[var(--color-hairline)] py-2 text-sm first:border-t-0">
      <dt className="text-[var(--color-ink-muted)]">{rotulo}</dt>
      <dd className="break-all text-[var(--color-ink)]">{children}</dd>
    </div>
  );
}

function LigacaoStripe({ caminho, id }: { caminho: string; id: string | null }) {
  if (!id) return <>—</>;
  return (
    <a href={`${STRIPE_DASHBOARD}/${caminho}/${id}`} target="_blank" rel="noreferrer" className="text-[var(--color-brand)] underline">
      {id}
    </a>
  );
}

export default async function ConversaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: linha } = await supabase
    .from("conversoes_avulso")
    .select(
      `id, plano_destino, estado, valor_avulso_centimos, valor_primeira_mensalidade_centimos, refund_montante_centimos,
       checkout_session_id, stripe_subscription_id, payment_intent_id, refund_id, refund_estado,
       requer_intervencao, intervencao_motivo, intervencao_resolvida_em, intervencao_nota, convertido_em, refund_atualizado_em,
       stripe_payments(email, stripe_session_id, created_at),
       cliente:utilizadores!conversoes_avulso_user_id_fkey(nome),
       resolvida_por:utilizadores!conversoes_avulso_intervencao_resolvida_por_fkey(nome)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!linha) notFound();
  const c = linha as unknown as Conversao;
  const avulso = um(c.stripe_payments);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/backoffice/conversoes" className="text-sm text-[var(--color-ink-muted)] underline">
        ← Conversões com intervenção
      </Link>
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Conversão para {NOME_PLANO[c.plano_destino]}
      </h1>

      {c.requer_intervencao && (
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-status-danger)] bg-[var(--color-surface-sunken)] px-5 py-4 text-sm text-[var(--color-ink)]">
          <p className="mb-1 font-semibold text-[var(--color-status-danger)]">Requer intervenção</p>
          <p className="text-[var(--color-ink-muted)]">Motivo: {c.intervencao_motivo ?? "—"}</p>
        </div>
      )}

      <dl className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-5 py-3 shadow-[var(--shadow-subtle)]">
        <Campo rotulo="Cliente">
          {um(c.cliente)?.nome ?? "—"}
          <span className="block text-[12px] text-[var(--color-ink-faint)]">{avulso?.email ?? "—"}</span>
        </Campo>
        <Campo rotulo="Avulso pago">
          {formatarEuros(c.valor_avulso_centimos)} em {data(avulso?.created_at ?? null)}
        </Campo>
        <Campo rotulo="1.ª mensalidade coberta">{formatarEuros(c.valor_primeira_mensalidade_centimos)}</Campo>
        <Campo rotulo="Reembolso devido">{formatarEuros(c.refund_montante_centimos)}</Campo>
        <Campo rotulo="Estado do reembolso">
          {estadoReembolsoPt(c.refund_estado) ?? "não criado"}
          {c.refund_atualizado_em && (
            <span className="block text-[12px] text-[var(--color-ink-faint)]">atualizado em {data(c.refund_atualizado_em)}</span>
          )}
        </Campo>
        <Campo rotulo="Refund">{c.refund_id ?? "—"}</Campo>
        <Campo rotulo="Pagamento Avulso">
          <LigacaoStripe caminho="payments" id={c.payment_intent_id} />
        </Campo>
        <Campo rotulo="Subscrição">
          <LigacaoStripe caminho="subscriptions" id={c.stripe_subscription_id} />
        </Campo>
        <Campo rotulo="Checkout do Avulso">{avulso?.stripe_session_id ?? "—"}</Campo>
        <Campo rotulo="Checkout da adesão">{c.checkout_session_id ?? "—"}</Campo>
        <Campo rotulo="Convertida em">{data(c.convertido_em)}</Campo>
      </dl>

      {c.requer_intervencao ? (
        <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
          <div className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
            <p className="mb-2 font-semibold text-[var(--color-ink)]">Como resolver</p>
            <ol className="list-decimal pl-5">
              <li>Abra o pagamento Avulso no Stripe e confirme se já existe algum reembolso.</li>
              <li>
                Se não existir nenhum reembolso concluído, crie um de{" "}
                <strong>{formatarEuros(c.refund_montante_centimos)}</strong> nesse pagamento.
              </li>
              <li>Se o método de pagamento original não aceitar o reembolso, contacte o cliente.</li>
              <li>Registe abaixo o que foi feito. A assinatura não é alterada por esta página.</li>
            </ol>
          </div>
          {erro && <p className="text-sm text-[var(--color-status-danger)]">{erro}</p>}
          <form action={resolverIntervencao.bind(null, c.id)} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
              O que foi feito
              <textarea
                name="nota"
                required
                rows={3}
                placeholder="Ex.: reembolso de 10,00 € criado manualmente no Stripe (re_…) em 02/10."
                className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
            >
              Marcar como resolvida
            </button>
          </form>
        </section>
      ) : (
        c.intervencao_resolvida_em && (
          <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-sm shadow-[var(--shadow-subtle)]">
            <p className="mb-1 font-semibold text-[var(--color-status-success)]">
              Resolvida em {data(c.intervencao_resolvida_em)}
              {um(c.resolvida_por)?.nome ? ` por ${um(c.resolvida_por)?.nome}` : ""}
            </p>
            <p className="whitespace-pre-wrap text-[var(--color-ink-muted)]">{c.intervencao_nota}</p>
            {c.intervencao_motivo && (
              <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">Motivo original: {c.intervencao_motivo}</p>
            )}
          </section>
        )
      )}
    </div>
  );
}
