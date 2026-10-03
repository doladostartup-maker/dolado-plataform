import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { contaExisteComEmail } from "@/lib/compra/servidor";
import { MENSAGEM_EMAIL_COM_CONTA, avaliarSessaoParaCriarConta } from "@/lib/stripe/criarConta";
import { criarContaComPagamento } from "./actions";

export default async function CriarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; erro?: string }>;
}) {
  const params = await searchParams;

  if (!params.session_id) {
    redirect(`${MARKETING_SITE_URL}/#precario`);
  }

  // A sessão é lida ao Stripe; o session_id do endereço só diz qual procurar.
  const session = await getStripe()
    .checkout.sessions.retrieve(params.session_id)
    .catch(() => null);
  if (!session) redirect(`${MARKETING_SITE_URL}/#precario`);

  const { data: pagamento } = await createAdminClient()
    .from("stripe_payments")
    .select("user_id")
    .eq("stripe_session_id", params.session_id)
    .maybeSingle();

  const email = session.customer_details?.email;
  const avaliacao = avaliarSessaoParaCriarConta(
    session,
    pagamento?.user_id ?? null,
    !!email && !pagamento?.user_id && (await contaExisteComEmail(email)),
  );
  if (!avaliacao.ok) {
    if (avaliacao.motivo === "sessao_invalida") redirect(`${MARKETING_SITE_URL}/#precario`);
    if (avaliacao.motivo === "email_com_conta") {
      const associar = `/associar-compra?session_id=${encodeURIComponent(params.session_id)}`;
      return (
        <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-[var(--color-brand)]">Pagamento recebido</p>
            <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Associar a compra</h1>
          </div>
          <p className="text-sm leading-relaxed text-[var(--color-ink)]">{MENSAGEM_EMAIL_COM_CONTA}</p>
          <Link
            href={`/login?next=${encodeURIComponent(associar)}`}
            className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-center text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Iniciar sessão
          </Link>
        </main>
      );
    }
    redirect(`/login?info=${encodeURIComponent("Esta compra já tem uma conta associada. Inicie sessão.")}`);
  }
  const { pagamentoConfirmado } = avaliacao;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <p className="mb-1 text-sm font-semibold text-[var(--color-brand)]">
          {pagamentoConfirmado ? "Pagamento confirmado" : "Pagamento em confirmação"}
        </p>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Criar a sua conta
        </h1>
      </div>

      {!pagamentoConfirmado && (
        <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Alguns métodos de pagamento, como o débito direto SEPA, podem demorar alguns dias úteis a
          ser confirmados. Pode criar já a sua conta e não precisa de voltar a pagar: assim que o
          pagamento for confirmado, o acesso é ativado automaticamente e avisamos por e-mail.
        </p>
      )}

      {params.erro && (
        <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>
      )}

      <form action={criarContaComPagamento} className="flex flex-col gap-4">
        <input type="hidden" name="session_id" value={params.session_id} />

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Nome
          <input
            name="nome"
            type="text"
            required
            className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          E-mail
          <input
            type="email"
            value={avaliacao.email}
            readOnly
            disabled
            className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[var(--color-ink-muted)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Palavra-passe
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Criar conta e aceder ao portal
        </button>
      </form>
    </main>
  );
}
