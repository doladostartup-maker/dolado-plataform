import Link from "next/link";
import { iniciarCompraAvulsoComConta, iniciarUpgradeParaAssinatura } from "@/app/actions/stripe";
import { obterAcesso, requireUser } from "@/lib/auth";
import { PLANOS, precoComUnidade } from "@/lib/planos";
import { criarCasoCliente } from "../actions";
import { ClienteCasoForm } from "../_components/ClienteCasoForm";

const BOTAO_PRIMARIO =
  "w-full rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "w-full rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

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
    const temCasoProtecao = acesso.temProtecao && acesso.plano === "caso_protecao";

    return (
      <div className="flex max-w-xl flex-col gap-6">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Abrir novo caso
        </h1>

        {pendente ? (
          <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]">
            <p className="mb-1 font-semibold">Pagamento em confirmação</p>
            <p className="leading-relaxed text-[var(--color-ink-muted)]">
              O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns
              métodos, como o débito direto SEPA, podem demorar alguns dias úteis; assim que o
              pagamento for confirmado, pode abrir o seu caso aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)]">
            <div>
              <p className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">
                Não tem casos disponíveis
              </p>
              <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                {temCasoProtecao
                  ? "Já usou os casos incluídos no seu plano Caso + Proteção. Recebe um novo caso na próxima renovação mensal; se precisar de abrir um caso agora, pode comprar um caso Avulso."
                  : acesso.temProtecao
                    ? "O plano Proteção não inclui casos. Para abrir um caso agora, pode comprar um caso Avulso. Os seus casos anteriores continuam disponíveis em “A sua reclamação”."
                    : "Para abrir um novo caso, escolha uma das opções abaixo. Os seus casos anteriores continuam disponíveis em “A sua reclamação”."}
              </p>
            </div>
            <form action={iniciarCompraAvulsoComConta}>
              <button type="submit" className={acesso.temProtecao ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}>
                Comprar um caso {PLANOS.avulso.nome} — {precoComUnidade("avulso")} (IVA incluído)
              </button>
            </form>
            {/* Já com subscrição ativa não se abre outra (iniciarAdesao recusa). */}
            {!acesso.temProtecao && (
              <form action={iniciarUpgradeParaAssinatura}>
                <button type="submit" className={BOTAO_PRIMARIO}>
                  Escolher {PLANOS.caso_protecao.nome} — {precoComUnidade("caso_protecao")} (IVA incluído)
                </button>
              </form>
            )}
          </div>
        )}

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
      {acesso.casoConsomeCredito && (
        <p className="text-sm text-[var(--color-ink-muted)]">
          {acesso.creditos === 1
            ? "Tem 1 caso disponível. Abrir este caso usa-o."
            : `Tem ${acesso.creditos} casos disponíveis. Abrir este caso usa um deles.`}
        </p>
      )}
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
