import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth/actions";

function IconCasos() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M2 4.5a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconConta() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="7.5" r="1.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 10.5c.3-1 1-1.5 1.5-1.5s1.2.5 1.5 1.5M9 6.5h4M9 9h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPerfil() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
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

function IconAlertas() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M8 2.5c-2 0-3.5 1.6-3.5 3.6v2.1L3 10.5h10L11.5 8.2V6.1c0-2-1.5-3.6-3.5-3.6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.5 12.5c.3.7.9 1 1.5 1s1.2-.3 1.5-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPromocao() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconFaturas() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSubscricao() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
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
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
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

function ItemNav({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-brand)]"
    >
      {icon}
      {children}
    </Link>
  );
}

function ItemDesactivado({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-2.5 rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium text-[var(--color-ink-faint)]"
    >
      {icon}
      <span className="flex-1">{children}</span>
      <BadgeEmBreve />
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
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-6">
        <Link href="/portal/casos" className="mb-6 flex items-center px-2">
          <Image
            src="/brand/dolado-logo-horizontal.svg"
            alt="DoLado"
            width={120}
            height={28}
            priority
          />
        </Link>

        <Link
          href="/portal/casos/novo"
          className="mb-6 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-center text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          + Abrir novo caso
        </Link>

        <nav className="flex flex-col gap-1">
          <ItemNav href="/portal/casos" icon={<IconCasos />}>
            Os meus casos
          </ItemNav>
          <ItemNav href="/portal/alertas" icon={<IconAlertas />}>
            Alertas
          </ItemNav>
          <ItemNav href="/portal/promocoes" icon={<IconPromocao />}>
            Promoções
          </ItemNav>
          <ItemNav href="/portal/faturas" icon={<IconFaturas />}>
            Comparador de Faturas
          </ItemNav>
          <ItemNav href="/conta" icon={<IconConta />}>
            A minha conta
          </ItemNav>
          <ItemNav href="/portal/perfil" icon={<IconPerfil />}>
            Gestão de Perfil
          </ItemNav>
          <ItemDesactivado icon={<IconSubscricao />}>Gestão de Subscrição</ItemDesactivado>
          <ItemDesactivado icon={<IconFacturacao />}>Faturação</ItemDesactivado>
        </nav>

        <div className="mt-auto pt-6">
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left text-sm text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}
