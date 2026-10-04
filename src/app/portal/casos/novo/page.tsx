import Link from "next/link";
import { redirect } from "next/navigation";
import { obterAcesso, requireUser } from "@/lib/auth";
import { criarCasoCliente } from "../actions";
import { ClienteCasoForm } from "../_components/ClienteCasoForm";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { CARTAO, LIGACAO } from "@/components/portal/ui";

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
      <div className="flex max-w-2xl flex-col gap-6">
        <CabecalhoPagina voltar={{ href: "/portal/casos", texto: "Os meus casos" }} titulo="Abrir novo caso" />
        <Aviso tom="info" titulo="Pagamento em confirmação">
          O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns métodos, como o débito direto
          SEPA, podem demorar alguns dias úteis; assim que o pagamento for confirmado, pode abrir o seu caso aqui.
        </Aviso>
        <Link href="/portal/casos" className={`${LIGACAO} self-start`}>
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
    <div className="flex max-w-2xl flex-col gap-6">
      <CabecalhoPagina
        voltar={{ href: "/portal/casos", texto: "Os meus casos" }}
        titulo="Abrir novo caso"
        descricao={
          <>
            Conte-nos o que aconteceu. A DoLado analisa o caso, prepara a reclamação e mostra-lha antes de qualquer
            envio.{" "}
            <span className="font-semibold text-[var(--v2-navy)]">
              {acesso.creditos === 1
                ? "Tem 1 caso disponível. Abrir este caso usa-o."
                : `Tem ${acesso.creditos} casos disponíveis. Abrir este caso usa um deles.`}
            </span>
          </>
        }
      />
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      <div className={CARTAO}>
        <ClienteCasoForm
          action={criarCasoCliente}
          valoresIniciais={{
            nome: perfil?.nome ?? "",
            email: perfil?.email ?? user?.email ?? "",
          }}
        />
      </div>
    </div>
  );
}
