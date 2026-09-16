import Link from "next/link";
import { login, loginComGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; info?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Entrar
      </h1>

      {params.info && (
        <p className="text-sm text-[var(--color-status-pending)]">{params.info}</p>
      )}
      {params.erro && (
        <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>
      )}

      <form action={login} className="flex flex-col gap-4">
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
            className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Entrar
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
        <span className="h-px flex-1 bg-[var(--color-hairline)]" />
        ou
        <span className="h-px flex-1 bg-[var(--color-hairline)]" />
      </div>

      <form action={loginComGoogle}>
        <button
          type="submit"
          className="w-full rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Entrar com Google
        </button>
      </form>

      <p className="text-sm text-[var(--color-ink-muted)]">
        Não tens conta?{" "}
        <Link href="/registo" className="text-[var(--color-brand)] underline">
          Regista-te
        </Link>
      </p>
    </main>
  );
}
