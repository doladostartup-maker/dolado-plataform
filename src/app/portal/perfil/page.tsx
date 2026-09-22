import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { alterarPassword } from "./actions";

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("nome")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Gestão de Perfil
      </h1>

      <dl className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-sm shadow-[var(--shadow-subtle)]">
        <div>
          <dt className="text-[var(--color-ink-muted)]">Nome</dt>
          <dd className="text-[var(--color-ink)]">{perfil?.nome ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">E-mail</dt>
          <dd className="text-[var(--color-ink)]">{user.email}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Alterar palavra-passe
        </h2>

        {query.guardado && (
          <p className="text-sm text-[var(--color-status-success)]">
            Palavra-passe atualizada com sucesso.
          </p>
        )}
        {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

        <form action={alterarPassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
            Nova palavra-passe
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
            Confirmar nova palavra-passe
            <input
              type="password"
              name="confirmar_password"
              required
              minLength={8}
              className={INPUT_CLASS}
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
