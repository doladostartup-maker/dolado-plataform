import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarAlertaFidelizacaoPortal } from "./actions";
import { AlertaFidelizacaoPortalForm } from "./_components/AlertaFidelizacaoPortalForm";
import { AlertasFidelizacaoPortalTable } from "./_components/AlertasFidelizacaoPortalTable";

export default async function AlertasFidelizacaoPage({
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
    .from("alertas_fidelizacao_portal")
    .select("id, operadora, data_fim_fidelizacao, alerta_60d_enviado_em, alerta_30d_enviado_em")
    .eq("utilizador_id", user.id)
    .order("data_fim_fidelizacao", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Alertas de fim de fidelização
      </h1>
      <p className="max-w-[60ch] text-sm text-[var(--color-ink-muted)]">
        Avisamos-lhe por e-mail 60 e 30 dias antes do fim da fidelização, para poder negociar ou
        mudar sem penalização.
      </p>

      {params.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">
          ✓ Vamos avisar-lhe 60 dias antes do fim da fidelização.
        </p>
      )}
      {params.apagado && (
        <p className="text-sm text-[var(--color-status-success)]">Alerta apagado.</p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <div className="max-w-xl rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Novo alerta
        </h2>
        <AlertaFidelizacaoPortalForm
          action={criarAlertaFidelizacaoPortal}
          email={user.email ?? ""}
          pedirConsentimento
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Os meus alertas
        </h2>
        <AlertasFidelizacaoPortalTable alertas={alertas ?? []} />
      </div>
    </div>
  );
}
