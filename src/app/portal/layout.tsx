import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth/actions";

function IconPerfil() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 13c0-2.2 2.2-4 5-4s5 1.8 5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSubscricao() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12.5 4.5H5.5A2.5 2.5 0 003 7v1M3.5 11.5h7A2.5 2.5 0 0013 9V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 2.5L12.5 4.5L10.5 6.5M5.5 9.5L3.5 11.5L5.5 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFacturacao() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 2h8v12l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1L4 14V2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 5.5h4M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BadgeEmBreve() {
  return (
    <span className="rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)] px-[10px] py-[4px] text-[12px] font-medium text-[var(--color-ink-muted)]">
      Em breve
    </span>
  );
}

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
          <nav className="flex items-center gap-6 text-sm font-medium text-[var(--color-ink)]">
            <Link href="/portal/casos" className="hover:text-[var(--color-brand)]">
              Os meus casos
            </Link>
            <Link href="/conta" className="hover:text-[var(--color-brand)]">
              A minha conta
            </Link>
            <Link
              href="/portal/perfil"
              className="flex items-center gap-1.5 hover:text-[var(--color-brand)]"
            >
              <IconPerfil />
              Gestão de Perfil
            </Link>
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-1.5 text-[var(--color-ink-faint)]"
            >
              <IconSubscricao />
              Gestão de Subscrição
              <BadgeEmBreve />
            </span>
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-1.5 text-[var(--color-ink-faint)]"
            >
              <IconFacturacao />
              Facturação
              <BadgeEmBreve />
            </span>
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
