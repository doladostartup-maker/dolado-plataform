import Image from "next/image";
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
        <div className="flex items-center gap-8">
          <Link href="/portal/casos" className="flex items-center">
            <Image
              src="/brand/dolado-logo-horizontal.svg"
              alt="DoLado"
              width={120}
              height={28}
              priority
            />
          </Link>
          <nav className="flex gap-6 text-sm font-medium text-[var(--color-ink)]">
            <Link href="/portal/casos" className="hover:text-[var(--color-brand)]">
              Os meus casos
            </Link>
            <Link href="/conta" className="hover:text-[var(--color-brand)]">
              A minha conta
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/casos/novo"
            className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Abrir novo caso
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-6 py-8">{children}</main>
    </div>
  );
}
