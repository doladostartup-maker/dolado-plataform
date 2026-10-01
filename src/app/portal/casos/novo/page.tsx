import Link from "next/link";
import { redirect } from "next/navigation";
import { obterAcesso, requireUser } from "@/lib/auth";
import { criarCasoCliente } from "../actions";
import { ClienteCasoForm } from "../_components/ClienteCasoForm";

export default async function NovoCasoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; pagamento?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const acesso = await obterAcesso(supabase, user.id);

  if (!acesso.podeCriarCaso) {
    const { data: ultimo } = await supabase
      .from("stripe_payments")
      .select("estado")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const pendente = ultimo?.estado === "pendente" || params.pagamento === "1";

    // Sem casos disponíveis: o caso é descrito primeiro e pago no fim, no
    // fluxo "Tratar o meu caso" (o pedido só passa a caso depois de o
    // pagamento ser confirmado).
    if (!pendente) redirect("/tratar-caso");

    return (
      <div className="flex max-w-xl flex-col gap-6">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Abrir novo caso
        </h1>
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]">
          <p className="mb-1 font-semibold">Pagamento em confirmação</p>
          <p className="leading-relaxed text-[var(--color-ink-muted)]">
            O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns
            métodos, como o débito direto SEPA, podem demorar alguns dias úteis; assim que o
            pagamento for confirmado, pode abrir o seu caso aqui.
          </p>
        </div>
        <Link href="/portal/casos" className="text-sm text-[var(--color-ink-muted)] underline">
          Ver os meus casos
        </Link>
      </div>
    );
  }

  const { data: perfil } = user
    ? await supabase
        .from("utilizadores")
        .select("nome, email")
        .eq("id", user.id)
        .single()
    : { data: null };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Abrir novo caso
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        {acesso.creditos === 1
          ? "Tem 1 caso disponível. Abrir este caso usa-o."
          : `Tem ${acesso.creditos} casos disponíveis. Abrir este caso usa um deles.`}
      </p>
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}
      <ClienteCasoForm
        action={criarCasoCliente}
        valoresIniciais={{
          nome: perfil?.nome ?? "",
          email: perfil?.email ?? user?.email ?? "",
        }}
      />
    </div>
  );
}
