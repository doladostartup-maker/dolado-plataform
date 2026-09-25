import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/auth/actions";

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--color-hairline)] bg-[var(--color-surface)] px-6 py-4">
        <nav className="flex gap-4 text-sm font-medium text-[var(--color-ink)]">
          <Link href="/backoffice/casos" className="hover:text-[var(--color-brand)]">
            Casos
          </Link>
          <Link href="/backoffice/urgentes" className="hover:text-[var(--color-brand)]">
            Urgentes
          </Link>
          <Link href="/backoffice/revisao" className="hover:text-[var(--color-brand)]">
            Revisão
          </Link>
          <Link href="/backoffice/avisos" className="hover:text-[var(--color-brand)]">
            Avisos Sectoriais
          </Link>
          <Link href="/backoffice/faturas" className="hover:text-[var(--color-brand)]">
            Faturas para rever
          </Link>
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]"
          >
            Terminar sessão
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-[1120px] px-6 py-8">{children}</main>
    </div>
  );
}
