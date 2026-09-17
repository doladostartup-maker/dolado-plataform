import { createClient } from "@/lib/supabase/server";
import { CasosTable } from "../_components/CasosTable";

export default async function RevisaoPage() {
  const supabase = await createClient();

  const { data: casos, error } = await supabase
    .from("casos")
    .select(
      "id, nome, empresa_parceira, sector, status, data_fim_fidelidade, valor_indicado",
    )
    .in("status", ["Novo", "Aguardando decisão cliente"])
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Fila de revisão
      </h1>
      {error && <p className="text-sm text-[var(--color-status-danger)]">{error.message}</p>}
      <CasosTable casos={casos ?? []} />
    </div>
  );
}
