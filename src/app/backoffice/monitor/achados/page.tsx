import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_ACHADO_POR_DECIDIR, ROTULO_ACHADO } from "@/lib/monitor/achados";

const ESTADO: Record<string, string> = {
  detetado: "Por rever",
  em_revisao: "Em revisão",
  confirmado: "Confirmado",
  comunicado: "Comunicado",
  descartado: "Descartado",
  obsoleto: "Já não se verifica (reanálise)",
};

export default async function AchadosPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const params = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  let consulta = admin
    .from("achados_monitor")
    .select("id, tipo, estado, created_at, contrato_id, utilizador_id")
    .order("created_at", { ascending: true })
    .limit(200);
  if (!params.todos) consulta = consulta.in("estado", ESTADOS_ACHADO_POR_DECIDIR);
  const { data: achados } = await consulta;

  const contratos = [...new Set((achados ?? []).map((a) => a.contrato_id))];
  const { data: dadosContratos } = contratos.length
    ? await admin.from("contratos_monitorizados").select("id, fornecedor").in("id", contratos)
    : { data: [] };
  const fornecedor = new Map((dadosContratos ?? []).map((c) => [c.id, c.fornecedor]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Situações detetadas</h1>
        <Link href="/backoffice/monitor" className="text-sm text-[var(--color-ink-muted)] underline">
          Monitor
        </Link>
      </div>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Resultados das regras sobre as faturas. Nada chega ao cliente sem revisão: confirme os factos, ajuste o texto e
        comunique, ou descarte com o motivo.{" "}
        <Link href={params.todos ? "/backoffice/monitor/achados" : "/backoffice/monitor/achados?todos=1"} className="text-[var(--color-brand)] underline">
          {params.todos ? "Só por decidir" : "Ver todos"}
        </Link>
      </p>

      {achados && achados.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-sunken)]">
              <tr>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Situação</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Fornecedor</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Estado</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Detetada em</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {achados.map((a) => (
                <tr key={a.id} className="border-t border-[var(--color-hairline)]">
                  <td className="px-3 py-2 text-[var(--color-ink)]">{ROTULO_ACHADO[a.tipo] ?? a.tipo}</td>
                  <td className="px-3 py-2 text-[var(--color-ink)]">{fornecedor.get(a.contrato_id) ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--color-ink-muted)]">{ESTADO[a.estado] ?? a.estado}</td>
                  <td className="px-3 py-2 text-[var(--color-ink-muted)]">{new Date(a.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</td>
                  <td className="px-3 py-2">
                    <Link href={`/backoffice/monitor/achados/${a.id}`} className="text-[var(--color-brand)] underline">
                      Rever
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">Sem situações por decidir.</p>
      )}
    </div>
  );
}
