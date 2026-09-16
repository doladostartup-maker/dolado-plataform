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
      <header className="flex items-center justify-between border-b px-6 py-4">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/backoffice/casos">Casos</Link>
          <Link href="/backoffice/urgentes">Urgentes</Link>
          <Link href="/backoffice/revisao">Revisão</Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="text-sm text-neutral-500 underline">
            Terminar sessão
          </button>
        </form>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
