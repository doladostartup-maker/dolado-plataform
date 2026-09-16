import Link from "next/link";
import { registar } from "./actions";

export default async function RegistoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Criar conta
      </h1>

      {params.erro && (
        <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>
      )}

      <form action={registar} className="flex flex-col gap-4">
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
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Senha
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
          Criar conta
        </button>
      </form>

      <p className="text-sm text-[var(--color-ink-muted)]">
        Já tens conta?{" "}
        <Link href="/login" className="text-[var(--color-brand)] underline">
          Entra
        </Link>
      </p>
    </main>
  );
}
