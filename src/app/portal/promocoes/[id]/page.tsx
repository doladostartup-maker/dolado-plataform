import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { actualizarAlertaPromocaoPortal, apagarAlertaPromocaoPortal } from "../actions";

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

export default async function EditarAlertaPromocaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: alerta } = await supabase
    .from("alertas_promocao_portal")
    .select("id, operadora, descricao_promocao, data_fim_promocao")
    .eq("id", id)
    .single();

  if (!alerta) {
    notFound();
  }

  const actualizar = actualizarAlertaPromocaoPortal.bind(null, id);
  const apagar = apagarAlertaPromocaoPortal.bind(null, id);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Editar alerta de promoção
        </h1>
        <Link href="/portal/promocoes" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <form action={actualizar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Operadora / prestador
          <input
            name="operadora"
            defaultValue={alerta.operadora}
            required
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Descrição da promoção
          <input
            name="descricao_promocao"
            defaultValue={alerta.descricao_promocao}
            required
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Data de fim da promoção
          <input
            type="date"
            name="data_fim_promocao"
            defaultValue={alerta.data_fim_promocao}
            required
            className={INPUT_CLASS}
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Guardar alterações
        </button>
      </form>

      <form action={apagar}>
        <button type="submit" className="text-sm text-[var(--color-status-danger)] underline">
          Apagar este alerta
        </button>
      </form>
    </div>
  );
}
