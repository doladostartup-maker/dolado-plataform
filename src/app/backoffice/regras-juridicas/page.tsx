import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { RegraJuridica } from "@/lib/rascunhoIA/regras";
import { criarRegra } from "./actions";
import { RegraForm } from "./_components/RegraForm";

export default async function RegrasJuridicasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("regras_juridicas")
    .select("*")
    .order("ativa", { ascending: false })
    .order("setor", { nullsFirst: true })
    .order("codigo");
  const regras = (data ?? []) as RegraJuridica[];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Base jurídica</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Regras que a IA pode usar na sugestão do texto da reclamação. A IA só recebe regras ativas, revistas e em vigor, do setor e
          da categoria do caso — e não pode citar mais nenhuma. As regras não se apagam: desative-as.
        </p>
      </div>

      {params.ok && <p className="text-sm text-[var(--color-status-success)]">{params.ok}</p>}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
        {regras.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-ink-muted)]">
            Ainda não há regras. Sem regras, a sugestão da IA descreve os factos e o pedido, sem fundamentação legal.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-sunken)]">
              <tr>
                {["Código", "Setor / categoria", "Diploma", "Revista", "Estado"].map((h) => (
                  <th key={h} className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-hairline)]">
                  <td className="px-3 py-2">
                    <Link href={`/backoffice/regras-juridicas/${r.id}`} prefetch={false} className="font-medium text-[var(--color-brand)] underline">
                      {r.codigo}
                    </Link>
                    <p className="text-[12px] text-[var(--color-ink-muted)]">{r.titulo}</p>
                  </td>
                  <td className="px-3 py-2 text-[13px]">
                    {r.setor ?? "Todos"} · {r.categoria ?? "Todas"}
                  </td>
                  <td className="px-3 py-2 text-[13px]">
                    {r.diploma}
                    {r.artigo ? `, ${r.artigo}` : ""}
                  </td>
                  <td className="px-3 py-2 text-[13px]">{r.revista_em ?? "—"}</td>
                  <td className="px-3 py-2 text-[13px]">
                    {r.ativa ? "Ativa" : "Inativa"}
                    {r.revogada_em ? ` · revogada em ${r.revogada_em}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details>
        <summary className="cursor-pointer text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">Nova regra</summary>
        <div className="mt-3">
          <RegraForm action={criarRegra} submitLabel="Criar regra" />
        </div>
      </details>
    </div>
  );
}
