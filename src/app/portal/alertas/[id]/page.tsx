import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { actualizarAlertaFidelizacaoPortal, apagarAlertaFidelizacaoPortal } from "../actions";
import { AlertaFidelizacaoPortalForm } from "../_components/AlertaFidelizacaoPortalForm";

export default async function EditarAlertaFidelizacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: alerta } = await supabase
    .from("alertas_fidelizacao_portal")
    .select("id, operadora, data_inicio_contrato, data_fim_fidelizacao")
    .eq("id", id)
    .single();

  if (!alerta) {
    notFound();
  }

  const actualizar = actualizarAlertaFidelizacaoPortal.bind(null, id);
  const apagar = apagarAlertaFidelizacaoPortal.bind(null, id);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Editar alerta
        </h1>
        <Link href="/portal/alertas" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <AlertaFidelizacaoPortalForm
        action={actualizar}
        email={user.email ?? ""}
        valoresIniciais={{
          operadora: alerta.operadora,
          data_inicio_contrato: alerta.data_inicio_contrato,
          data_fim_fidelizacao: alerta.data_fim_fidelizacao,
        }}
        textoBotao="Guardar alterações"
      />

      <form action={apagar}>
        <button type="submit" className="text-sm text-[var(--color-status-danger)] underline">
          Apagar este alerta
        </button>
      </form>
    </div>
  );
}
