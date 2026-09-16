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
      <h1 className="text-2xl font-semibold">A tua conta</h1>
      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Nome</dt>
          <dd>{perfil?.nome ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Perfil</dt>
          <dd>{perfil?.role ?? "cliente"}</dd>
        </div>
      </dl>
      <form action={logout}>
        <button type="submit" className="rounded border px-4 py-2">
          Terminar sessão
        </button>
      </form>
    </main>
  );
}
