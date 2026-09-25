import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { obterNivelAcesso, requireUser } from "@/lib/auth";
import { PortalDashboard } from "./_components/PortalDashboard";

const MENSAGENS_ERRO: Record<string, string> = {
  "upgrade-sem-pagamento":
    "Não encontrámos nenhuma reclamação avulsa paga associada à sua conta — não há upgrade a fazer.",
};

export default async function PortalIndex({
  searchParams,
}: {
  searchParams: Promise<{ bloqueado?: string; upgraded?: string; session_id?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  // Confirma o upgrade directamente com o Stripe em vez de confiar só no
  // timing do webhook — o browser pode voltar do Checkout antes de o
  // evento chegar, e sem isto o painel mostrava "desbloqueado" com as
  // funcionalidades continuando fechadas.
  if (params.upgraded && params.session_id) {
    const session = await getStripe().checkout.sessions.retrieve(params.session_id);
    if (
      session.status === "complete" &&
      session.metadata?.plano === "assinatura" &&
      session.metadata?.user_id === user.id
    ) {
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      await createAdminClient()
        .from("user_access")
        .upsert(
          {
            user_id: user.id,
            nivel_acesso: "assinatura",
            stripe_customer_id: customerId ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
    }
  }

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
      {params.upgraded && nivelAcesso === "assinatura" && (
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] font-medium text-[var(--color-brand)]">
          Assinatura ativada! Todas as funcionalidades já estão desbloqueadas.
        </div>
      )}
      {params.erro && (
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-status-danger)] bg-[var(--color-surface-sunken)] px-5 py-4 text-[13.5px] font-medium text-[var(--color-status-danger)]">
          {MENSAGENS_ERRO[params.erro] ?? "Não foi possível concluir o pedido. Tente novamente."}
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
