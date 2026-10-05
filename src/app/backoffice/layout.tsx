import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/auth/actions";

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase } = await requireAdmin();
  const { count: conversoesPorResolver } = await supabase
    .from("conversoes_avulso")
    .select("id", { count: "exact", head: true })
    .eq("requer_intervencao", true);

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
          <Link href="/backoffice/monitor" className="hover:text-[var(--color-brand)]">
            Monitor
          </Link>
          <Link href="/backoffice/regras-juridicas" className="hover:text-[var(--color-brand)]">
            Base jurídica
          </Link>
          <Link href="/backoffice/compras" className="hover:text-[var(--color-brand)]">
            Compras
          </Link>
          <Link href="/backoffice/conversoes" className="inline-flex items-center gap-1.5 hover:text-[var(--color-brand)]">
            Conversões
            {!!conversoesPorResolver && (
              <span
                aria-label={`${conversoesPorResolver} por resolver`}
                className="rounded-[var(--radius-pill)] bg-[var(--color-status-danger)] px-1.5 text-[11px] font-semibold text-white"
              >
                {conversoesPorResolver}
              </span>
            )}
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
