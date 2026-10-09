import Link from "@/i18n/Link";
import { tPortal, traduzirMensagemPortal } from "@/i18n/mensagens/portal";
import { caminho, idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { redirect } from "next/navigation";
import { obterAcesso, requireUser } from "@/lib/auth";
import { criarCasoCliente } from "../actions";
import { ClienteCasoForm } from "../_components/ClienteCasoForm";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { CARTAO, LIGACAO } from "@/components/portal/ui";

export default async function NovoCasoClientePage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ erro?: string; pagamento?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tPortal[idioma].novoCaso;
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
    if (!pendente) redirect(await caminho("/tratar-caso"));

    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <CabecalhoPagina voltar={{ href: "/portal/casos", texto: t.voltar }} titulo={t.titulo} />
        <Aviso tom="info" titulo={t.pagamentoConfirmacao}>
          {t.pagamentoConfirmacaoTexto}
        </Aviso>
        <Link href="/portal/casos" className={`${LIGACAO} self-start`}>
          {t.verCasos}
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
        voltar={{ href: "/portal/casos", texto: t.voltar }}
        titulo={t.titulo}
        descricao={
          <>
            {t.descricao}{" "}
            <span className="font-semibold text-[var(--v2-navy)]">
              {acesso.creditos === 1 ? t.umCaso : t.variosCasos(acesso.creditos)}
            </span>
          </>
        }
      />
      {params.erro && <Aviso tom="erro">{traduzirMensagemPortal(idioma, params.erro)}</Aviso>}
      <div className={CARTAO}>
        <ClienteCasoForm
          idioma={idioma}
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
