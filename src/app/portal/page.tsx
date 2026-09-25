import { obterNivelAcesso, requireUser } from "@/lib/auth";
import { PortalDashboard } from "./_components/PortalDashboard";

export default async function PortalIndex({
  searchParams,
}: {
  searchParams: Promise<{ bloqueado?: string; upgraded?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const nivelAcesso = await obterNivelAcesso(supabase, user.id);

  let valorAvulsoCentimos: number | null = null;
  if (nivelAcesso === "avulso") {
    const { data } = await supabase
      .from("stripe_payments")
      .select("valor_total_centimos")
      .eq("user_id", user.id)
      .eq("plano", "avulso")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    valorAvulsoCentimos = data?.valor_total_centimos ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      {params.upgraded && (
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] font-medium text-[var(--color-brand)]">
          Assinatura ativada! Todas as funcionalidades já estão desbloqueadas.
        </div>
      )}
      <PortalDashboard
        nivelAcesso={nivelAcesso}
        valorAvulsoCentimos={valorAvulsoCentimos}
        bloqueadoInicial={params.bloqueado}
      />
    </div>
  );
}
