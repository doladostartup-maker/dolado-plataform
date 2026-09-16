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
      <header className="flex items-center justify-between border-b px-6 py-4">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/portal/casos">Os meus casos</Link>
          <Link href="/portal/casos/novo">Abrir novo caso</Link>
          <Link href="/conta">A minha conta</Link>
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
