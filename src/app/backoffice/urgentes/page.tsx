import { createClient } from "@/lib/supabase/server";
import { CasosTable } from "../_components/CasosTable";

export default async function UrgentesPage() {
  const supabase = await createClient();

  const limite = new Date();
  limite.setDate(limite.getDate() + 15);
  const limiteISO = limite.toISOString().slice(0, 10);

  const { data: casos, error } = await supabase
    .from("casos")
    .select(
      "id, nome, empresa_parceira, sector, status, data_fim_fidelidade, valor_indicado",
    )
    .not("status", "in", "(Resolvido,Bloqueado)")
    .not("data_fim_fidelidade", "is", null)
    .lte("data_fim_fidelidade", limiteISO)
    .order("data_fim_fidelidade", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">
        Casos urgentes — fidelidade a terminar em ≤15 dias
      </h1>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <CasosTable casos={casos ?? []} />
    </div>
  );
}
