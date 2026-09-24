import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarAlertaPromocaoPortal } from "./actions";
import { AlertaPromocaoPortalForm } from "./_components/AlertaPromocaoPortalForm";
import { AlertasPromocaoPortalTable } from "./_components/AlertasPromocaoPortalTable";

export default async function AlertasPromocaoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string; apagado?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: alertas } = await supabase
    .from("alertas_promocao_portal")
    .select(
      "id, operadora, descricao_promocao, data_fim_promocao, origem_data, alerta_30d_enviado_em, alerta_7d_enviado_em, alerta_1d_enviado_em",
    )
    .eq("utilizador_id", user.id)
    .order("data_fim_promocao", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Alertas de fim de promoção
      </h1>
      <p className="max-w-[60ch] text-sm text-[var(--color-ink-muted)]">
        Indique a data manualmente ou anexe o contrato — tentamos ler a data automaticamente,
        mas confirma sempre antes de o alerta ficar activo. Avisamos-lhe 30, 7 e 1 dia antes.
      </p>

      {params.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">✓ Alerta guardado.</p>
      )}
      {params.apagado && <p className="text-sm text-[var(--color-status-success)]">Alerta apagado.</p>}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <div className="max-w-xl rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Novo alerta
        </h2>
        <AlertaPromocaoPortalForm action={criarAlertaPromocaoPortal} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Os meus alertas
        </h2>
        <AlertasPromocaoPortalTable alertas={alertas ?? []} />
      </div>
    </div>
  );
}
