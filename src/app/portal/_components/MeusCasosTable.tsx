import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { SectorChip } from "@/components/SectorChip";

type Caso = {
  id: string;
  empresa_parceira: string | null;
  sector: string | null;
  tipo_problema: string | null;
  status: string;
  data_fim_fidelidade: string | null;
};

export function MeusCasosTable({ casos }: { casos: Caso[] }) {
  if (casos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        Ainda não tem nenhum caso aberto.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Empresa
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Setor
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Problema
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Estado
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Fim fidelidade
            </th>
          </tr>
        </thead>
        <tbody>
          {casos.map((caso) => (
            <tr
              key={caso.id}
              className="border-t border-[var(--color-hairline)] hover:bg-[var(--color-surface-sunken)]"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/portal/casos/${caso.id}`}
                  className="font-medium text-[var(--color-brand)] underline"
                >
                  {caso.empresa_parceira ?? "O meu caso"}
                </Link>
              </td>
              <td className="px-3 py-2">
                <SectorChip sector={caso.sector} />
              </td>
              <td className="px-3 py-2 text-[var(--color-ink)]">
                {caso.tipo_problema ?? "—"}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={caso.status} />
              </td>
              <td className="px-3 py-2 text-[var(--color-ink)]">
                {caso.data_fim_fidelidade ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
