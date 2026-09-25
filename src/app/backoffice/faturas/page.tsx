import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function FaturasParaReverPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; revisto?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: faturas } = await supabase
    .from("comparacoes_fatura_portal")
    .select("id, nome, email, operadora, status, created_at")
    .in("status", ["needs_manual_review", "extraction_failed", "processing"])
    .order("created_at", { ascending: true });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Faturas para rever
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Casos em que a leitura automática não teve confiança suficiente — o fallback do
        Comparador de Faturas. Reveja e envie manualmente ao cliente.
      </p>

      {params.revisto && (
        <p className="text-sm text-[var(--color-status-success)]">✓ Fatura revista e enviada ao cliente.</p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      {faturas && faturas.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-sunken)]">
              <tr>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Cliente</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Operadora</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Recebida em</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]" />
              </tr>
            </thead>
            <tbody>
              {faturas.map((f) => (
                <tr key={f.id} className="border-t border-[var(--color-hairline)]">
                  <td className="px-3 py-2 text-[var(--color-ink)]">
                    {f.nome}
                    <span className="block text-[12px] text-[var(--color-ink-faint)]">{f.email}</span>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-ink)]">{f.operadora ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--color-ink-muted)]">
                    {new Date(f.created_at).toLocaleString("pt-PT")}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/backoffice/faturas/${f.id}`} className="text-[var(--color-brand)] underline">
                      Rever
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">Sem faturas por rever de momento.</p>
      )}
    </div>
  );
}
