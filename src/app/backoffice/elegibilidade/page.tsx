import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const BADGE_CONFIANCA: Record<string, { texto: string; cor: string; bg: string }> = {
  high: { texto: "Alta confiança", cor: "var(--color-status-success)", bg: "var(--color-status-success-wash)" },
  medium: { texto: "Confiança média", cor: "var(--color-status-urgent)", bg: "var(--color-status-urgent-wash)" },
  low: { texto: "Confiança baixa", cor: "var(--color-status-urgent)", bg: "var(--color-status-urgent-wash)" },
  unavailable: { texto: "Sem sugestão da IA", cor: "var(--color-ink-muted)", bg: "var(--color-surface-sunken)" },
};

const LABEL_SUGESTAO: Record<string, string> = {
  elegivel: "Elegível",
  nao_elegivel: "Não elegível",
  pouco_claro: "Pouco claro",
};

export default async function ElegibilidadePendentePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; revisto?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: casos } = await supabase
    .from("casos_elegibilidade_portal")
    .select("id, nome, email, setor, sugestao_ia_estado, confianca_ia, created_at")
    .eq("estado_elegibilidade", "em_revisao")
    .order("created_at", { ascending: true });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Elegibilidade — casos por rever
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Casos que a Fase 1 (regras) não conseguiu decidir. A sugestão da IA, quando existe, é só
        um apoio — a decisão final é sempre sua antes de qualquer contacto com o cliente.
      </p>

      {params.revisto && (
        <p className="text-sm text-[var(--color-status-success)]">✓ Caso revisto e cliente notificado.</p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      {casos && casos.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-sunken)]">
              <tr>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Cliente</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Setor</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Sugestão IA</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]" />
              </tr>
            </thead>
            <tbody>
              {casos.map((c) => {
                const badge = BADGE_CONFIANCA[c.confianca_ia ?? "unavailable"];
                return (
                  <tr key={c.id} className="border-t border-[var(--color-hairline)]">
                    <td className="px-3 py-2 text-[var(--color-ink)]">
                      {c.nome}
                      <span className="block text-[12px] text-[var(--color-ink-faint)]">{c.email}</span>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-ink)]">{c.setor}</td>
                    <td className="px-3 py-2">
                      {c.sugestao_ia_estado ? (
                        <span className="flex flex-col gap-1">
                          <span className="text-[var(--color-ink)]">{LABEL_SUGESTAO[c.sugestao_ia_estado]}</span>
                          <span
                            className="w-fit rounded-[var(--radius-pill)] px-2 py-0.5 text-[11.5px] font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.cor }}
                          >
                            {badge.texto}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-faint)]">Sem sugestão da IA</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/backoffice/elegibilidade/${c.id}`} className="text-[var(--color-brand)] underline">
                        Rever
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">Sem casos por rever de momento.</p>
      )}
    </div>
  );
}
