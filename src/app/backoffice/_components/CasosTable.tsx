import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { SectorChip } from "@/components/SectorChip";

type Caso = {
  id: string;
  nome: string;
  empresa_parceira: string | null;
  sector: string | null;
  status: string;
  data_fim_fidelidade: string | null;
  valor_indicado: number | null;
};

function diasRestantes(data: string | null) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export function CasosTable({ casos }: { casos: Caso[] }) {
  if (casos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">Sem casos para mostrar.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Nome
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Empresa
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Sector
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Estado
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Fim fidelidade
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {casos.map((caso) => {
            const dias = diasRestantes(caso.data_fim_fidelidade);
            const urgente = dias !== null && dias <= 15;
            return (
              <tr
                key={caso.id}
                className="border-t border-[var(--color-hairline)] hover:bg-[var(--color-surface-sunken)]"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/backoffice/casos/${caso.id}`}
                    className="font-medium text-[var(--color-brand)] underline"
                  >
                    {caso.nome}
                  </Link>
                </td>
                <td className="px-3 py-2 text-[var(--color-ink)]">
                  {caso.empresa_parceira ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <SectorChip sector={caso.sector} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={caso.status} />
                </td>
                <td className="px-3 py-2 text-[var(--color-ink)]">
                  {caso.data_fim_fidelidade ?? "—"}
                  {urgente && (
                    <span
                      className="ml-2 rounded-[var(--radius-pill)] px-[8px] py-[2px] text-[12px] font-medium"
                      style={{
                        backgroundColor: "var(--color-status-urgent-wash)",
                        color: "var(--color-status-urgent)",
                      }}
                    >
                      {dias! < 0 ? "expirado" : `${dias}d`}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--color-ink)]">
                  {caso.valor_indicado != null ? `${caso.valor_indicado} €` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
