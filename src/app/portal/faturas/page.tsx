import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarComparacaoFaturaPortal } from "./actions";
import { ComparadorFaturaForm } from "./_components/ComparadorFaturaForm";
import { ComparacoesFaturaPortalTable } from "./_components/ComparacoesFaturaPortalTable";

export default async function ComparadorFaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: comparacoes } = await supabase
    .from("comparacoes_fatura_portal")
    .select("id, operadora, valor_mes_atual, diferenca_pct, status, created_at")
    .eq("utilizador_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Comparador de Faturas
      </h1>
      <p className="max-w-[60ch] text-sm text-[var(--color-ink-muted)]">
        Envie a sua fatura e comparamos automaticamente com o mês anterior. Se não conseguirmos
        ler o valor com confiança, verificamos manualmente e respondemos no prazo máximo de 24
        horas úteis.
      </p>

      {params.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">
          ✓ Fatura enviada — a analisar. Vai receber o resultado por e-mail.
        </p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <div className="max-w-xl rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Nova comparação
        </h2>
        <ComparadorFaturaForm action={criarComparacaoFaturaPortal} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Histórico
        </h2>
        <ComparacoesFaturaPortalTable comparacoes={comparacoes ?? []} />
      </div>
    </div>
  );
}
