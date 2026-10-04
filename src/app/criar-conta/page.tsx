import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { contaExisteComEmail } from "@/lib/compra/servidor";
import { MENSAGEM_EMAIL_COM_CONTA, avaliarSessaoParaCriarConta } from "@/lib/stripe/criarConta";
import { criarContaComPagamento } from "./actions";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, ROTULO, TEXTO } from "@/components/portal/ui";

export default async function CriarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; erro?: string }>;
}) {
  const params = await searchParams;

  if (!params.session_id) {
    redirect(`${MARKETING_SITE_URL}/#precario`);
  }

  // A sessão é lida ao Stripe; o session_id do endereço só diz qual procurar.
  const session = await getStripe()
    .checkout.sessions.retrieve(params.session_id)
    .catch(() => null);
  if (!session) redirect(`${MARKETING_SITE_URL}/#precario`);

  const { data: pagamento } = await createAdminClient()
    .from("stripe_payments")
    .select("user_id")
    .eq("stripe_session_id", params.session_id)
    .maybeSingle();

  const email = session.customer_details?.email;
  const avaliacao = avaliarSessaoParaCriarConta(
    session,
    pagamento?.user_id ?? null,
    !!email && !pagamento?.user_id && (await contaExisteComEmail(email)),
  );
  if (!avaliacao.ok) {
    if (avaliacao.motivo === "sessao_invalida") redirect(`${MARKETING_SITE_URL}/#precario`);
    if (avaliacao.motivo === "email_com_conta") {
      const associar = `/associar-compra?session_id=${encodeURIComponent(params.session_id)}`;
      return (
        <MolduraConta contexto="Pagamento recebido" titulo="Associar a compra">
          <p className={TEXTO}>{MENSAGEM_EMAIL_COM_CONTA}</p>
          <Link href={`/login?next=${encodeURIComponent(associar)}`} className={BOTAO_PRIMARIO}>
            Iniciar sessão
          </Link>
        </MolduraConta>
      );
    }
    redirect(`/login?info=${encodeURIComponent("Esta compra já tem uma conta associada. Inicie sessão.")}`);
  }
  const { pagamentoConfirmado } = avaliacao;

  return (
    <MolduraConta
      contexto={pagamentoConfirmado ? "Pagamento confirmado" : "Pagamento em confirmação"}
      titulo="Criar a sua conta"
    >
      {!pagamentoConfirmado && (
        <Aviso tom="info">
          Alguns métodos de pagamento, como o débito direto SEPA, podem demorar alguns dias úteis a ser confirmados.
          Pode criar já a sua conta e não precisa de voltar a pagar: assim que o pagamento for confirmado, o acesso é
          ativado automaticamente e avisamos por e-mail.
        </Aviso>
      )}

      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={criarContaComPagamento} className="flex flex-col gap-4">
        <input type="hidden" name="session_id" value={params.session_id} />

        <label className={ROTULO}>
          Nome
          <input name="nome" type="text" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          E-mail
          <input type="email" value={avaliacao.email} readOnly disabled className={`${CAMPO} text-[var(--v2-muted)]`} />
        </label>
        <label className={ROTULO}>
          Palavra-passe
          <input name="password" type="password" required minLength={6} className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Criar conta e aceder ao portal
        </button>
      </form>
    </MolduraConta>
  );
}
