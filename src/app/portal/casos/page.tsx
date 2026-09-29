import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MeusCasosTable } from "../_components/MeusCasosTable";

export default async function MeusCasosPage() {
  const { supabase, user } = await requireUser();

  const { data: casos } = await supabase
    .from("casos")
    .select("id, empresa_parceira, sector, tipo_problema, status, data_fim_fidelidade")
    .eq("utilizador_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Os meus casos
        </h1>
        <Link
          href="/portal/casos/novo"
          className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          + Abrir novo caso
        </Link>
      </div>
      <MeusCasosTable casos={casos ?? []} />
    </div>
  );
}
