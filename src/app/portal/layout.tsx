import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth/actions";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--color-hairline)] bg-[var(--color-surface)] px-6 py-4">
        <nav className="flex gap-4 text-sm font-medium text-[var(--color-ink)]">
          <Link href="/portal/casos" className="hover:text-[var(--color-brand)]">
            Os meus casos
          </Link>
          <Link href="/portal/casos/novo" className="hover:text-[var(--color-brand)]">
            Abrir novo caso
          </Link>
          <Link href="/conta" className="hover:text-[var(--color-brand)]">
            A minha conta
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
