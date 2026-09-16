import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CasosTable } from "../_components/CasosTable";

const STATUSES = ["Novo", "Em Análise", "Aguardando Decisão", "Resolvido", "Bloqueado"];

export default async function CasosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sector?: string; empresa?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("casos")
    .select(
      "id, nome, empresa_parceira, sector, status, data_fim_fidelidade, valor_indicado",
    )
    .order("data_fim_fidelidade", { ascending: true, nullsFirst: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.sector) query = query.eq("sector", params.sector);
  if (params.empresa) query = query.ilike("empresa_parceira", `%${params.empresa}%`);

  const { data: casos, error } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Todos os casos</h1>
        <Link
          href="/backoffice/casos/novo"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          + Novo caso
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 text-sm">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded border px-2 py-1"
        >
          <option value="">Todos os estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="sector"
          defaultValue={params.sector ?? ""}
          className="rounded border px-2 py-1"
        >
          <option value="">Todos os sectores</option>
          <option value="Telecomunicações">Telecomunicações</option>
          <option value="Energia">Energia</option>
          <option value="Água">Água</option>
        </select>
        <input
          name="empresa"
          defaultValue={params.empresa ?? ""}
          placeholder="Empresa parceira"
          className="rounded border px-2 py-1"
        />
        <button type="submit" className="rounded border px-3 py-1">
          Filtrar
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <CasosTable casos={casos ?? []} />
    </div>
  );
}
