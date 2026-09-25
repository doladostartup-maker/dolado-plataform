import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe/client";
import { criarContaComPagamento } from "./actions";

export default async function CriarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; erro?: string }>;
}) {
  const params = await searchParams;

  if (!params.session_id) {
    redirect("/#precario");
  }

  const session = await stripe.checkout.sessions.retrieve(params.session_id);
  const email = session.customer_details?.email;

  if (!email || session.payment_status !== "paid") {
    redirect("/#precario");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <p className="mb-1 text-sm font-semibold text-[var(--color-brand)]">
          Pagamento confirmado
        </p>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Criar a sua conta
        </h1>
      </div>

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
            value={email}
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
