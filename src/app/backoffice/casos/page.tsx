import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CasosTable } from "../_components/CasosTable";

const STATUSES = [
  "Novo",
  "Em investigação",
  "Aguardando operador",
  "Aguardando decisão cliente",
  "Resolvido",
  "Bloqueado",
];

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
      "id, nome, empresa_parceira, sector, status, data_fim_fidelidade, valor_indicado, data_envio_reclamacao, created_at, primeira_resposta_em",
    )
    .order("data_fim_fidelidade", { ascending: true, nullsFirst: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.sector) query = query.eq("sector", params.sector);
  if (params.empresa) query = query.ilike("empresa_parceira", `%${params.empresa}%`);

  const { data: casos, error } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Todos os casos
        </h1>
        <Link
          href="/backoffice/casos/novo"
          className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          + Novo caso
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 text-sm">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-ink)]"
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
          className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-ink)]"
        >
          <option value="">Todos os setores</option>
          <option value="Telecomunicações">Telecomunicações</option>
          <option value="Energia">Energia</option>
          <option value="Água">Água</option>
        </select>
        <input
          name="empresa"
          defaultValue={params.empresa ?? ""}
          placeholder="Empresa parceira"
          className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-1 text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Filtrar
        </button>
      </form>

      {error && <p className="text-sm text-[var(--color-status-danger)]">{error.message}</p>}
      <CasosTable casos={casos ?? []} mostrarDiasRestantes mostrarPrimeiraResposta />
    </div>
  );
}
