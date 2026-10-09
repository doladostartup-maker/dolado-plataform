import Link from "@/i18n/Link";
import { localizarHref } from "@/i18n/config";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
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
  params: paramsPagina,
}: {
  searchParams: Promise<{ session_id?: string; erro?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tConta[idioma].criarConta;
  const msg = (m: string) => traduzirMensagemConta(idioma, m);
  const params = await searchParams;

  if (!params.session_id) {
    redirect(localizarHref(idioma, `${MARKETING_SITE_URL}/#precario`));
  }

  // A sessão é lida ao Stripe; o session_id do endereço só diz qual procurar.
  const session = await getStripe()
    .checkout.sessions.retrieve(params.session_id)
    .catch(() => null);
  if (!session) redirect(localizarHref(idioma, `${MARKETING_SITE_URL}/#precario`));

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
    if (avaliacao.motivo === "sessao_invalida") redirect(localizarHref(idioma, `${MARKETING_SITE_URL}/#precario`));
    if (avaliacao.motivo === "email_com_conta") {
      const associar = `/associar-compra?session_id=${encodeURIComponent(params.session_id)}`;
      return (
        <MolduraConta contexto={t.pagamentoRecebido} titulo={t.associarTitulo}>
          <p className={TEXTO}>{msg(MENSAGEM_EMAIL_COM_CONTA)}</p>
          <Link href={`/login?next=${encodeURIComponent(localizarHref(idioma, associar))}`} className={BOTAO_PRIMARIO}>
            {t.iniciarSessao}
          </Link>
        </MolduraConta>
      );
    }
    redirect(localizarHref(idioma, `/login?info=${encodeURIComponent(msg("Esta compra já tem uma conta associada. Inicie sessão."))}`));
  }
  const { pagamentoConfirmado } = avaliacao;

  return (
    <MolduraConta
      contexto={pagamentoConfirmado ? t.pagamentoConfirmado : t.pagamentoEmConfirmacao}
      titulo={t.titulo}
    >
      {!pagamentoConfirmado && (
        <Aviso tom="info">
          {t.sepa}
        </Aviso>
      )}

      {params.erro && <Aviso tom="erro">{msg(params.erro)}</Aviso>}

      <form action={criarContaComPagamento} className="flex flex-col gap-4">
        <input type="hidden" name="session_id" value={params.session_id} />

        <label className={ROTULO}>
          {t.nome}
          <input name="nome" type="text" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          {t.email}
          <input type="email" value={avaliacao.email} readOnly disabled className={`${CAMPO} text-[var(--v2-muted)]`} />
        </label>
        <label className={ROTULO}>
          {t.palavraPasse}
          <input name="password" type="password" required minLength={6} className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          {t.criar}
        </button>
      </form>
    </MolduraConta>
  );
}
