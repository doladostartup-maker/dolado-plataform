import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        A tua conta
      </h1>
      <dl className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-sm shadow-[var(--shadow-subtle)]">
        <div>
          <dt className="text-[var(--color-ink-muted)]">Email</dt>
          <dd className="text-[var(--color-ink)]">{user.email}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Nome</dt>
          <dd className="text-[var(--color-ink)]">{perfil?.nome ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Perfil</dt>
          <dd className="text-[var(--color-ink)]">{perfil?.role ?? "cliente"}</dd>
        </div>
      </dl>
      <Link
        href="/portal/casos"
        className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-center text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
      >
        Ver os meus casos
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Terminar sessão
        </button>
      </form>
    </main>
  );
}
