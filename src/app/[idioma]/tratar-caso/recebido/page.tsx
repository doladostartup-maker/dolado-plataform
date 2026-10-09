import Link from "@/i18n/Link";
import { localizarHref } from "@/i18n/config";
import { tTratarCaso } from "@/i18n/mensagens/tratarCaso";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { redirect } from "next/navigation";
import { obterAcesso } from "@/lib/auth";
import { ehUuid } from "@/lib/pedidoCaso";
import { pedidoDaConta } from "@/lib/pedidoCasoServidor";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usarCasoDisponivel } from "../actions";
import { Etapas } from "../_components/Etapas";
import { RegistarEvento } from "../_components/RegistarEvento";
import { AguardarConfirmacao } from "./AguardarConfirmacao";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { BOTAO_PRIMARIO as BOTAO, CARTAO as CARTAO_BASE, LIGACAO, TEXTO_SECUNDARIO } from "@/components/portal/ui";

const CARTAO = `${CARTAO_BASE} sm:p-8`;
const TITULO = "mb-2 text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--v2-navy)]";

// Regresso do Stripe Checkout (success_url). Esta página NÃO confirma
// pagamentos nem cria casos: só lê o estado do pedido, gravado pelo webhook
// depois de o Stripe confirmar o pagamento. A sessão foi aberta antes do
// Checkout neste mesmo domínio, por isso o cliente chega já autenticado.
export default async function RecebidoPage({
  searchParams,
  params: paramsPagina,
}: { searchParams: Promise<{ pedido?: string }> } & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tTratarCaso[idioma].recebido;
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  const aqui = `/tratar-caso/recebido?pedido=${ehUuid(params.pedido) ? params.pedido : ""}`;
  if (!userId) redirect(localizarHref(idioma, `/login?next=${encodeURIComponent(localizarHref(idioma, aqui))}`));

  const pedido = ehUuid(params.pedido) ? await pedidoDaConta(params.pedido, userId) : null;
  if (!pedido) redirect(localizarHref(idioma, "/portal/casos"));

  if (pedido.estado === "convertido" && pedido.caso_id) {
    return (
      <>
        <RegistarEvento nome="pagamento_concluido" parametros={{ plano: pedido.plano_escolhido ?? "caso_disponivel" }} />
        {pedido.plano_escolhido === "caso_extra" && (
          <>
            {/* O webhook deu o Caso Extra e este pedido já o usou (modo vinculado). */}
            <RegistarEvento nome="extra_case_purchased" />
            <RegistarEvento nome="extra_case_used" />
          </>
        )}
        <div className={`${CARTAO} text-center`}>
          <div className="mb-4 flex justify-center">
            <Etiqueta tom="concluido">{pedido.plano_escolhido ? t.pagamentoConfirmado : t.casoUtilizado}</Etiqueta>
          </div>
          <h1 className="mb-2 text-[28px] font-extrabold tracking-[-0.025em] text-[var(--v2-navy)]">{t.titulo}</h1>
          <p className={`${TEXTO_SECUNDARIO} mx-auto mb-6 max-w-[46ch]`}>{t.texto}</p>
          <Link href={`/portal/casos/${pedido.caso_id}`} className={BOTAO}>
            {t.acompanhar}
          </Link>
        </div>
      </>
    );
  }

  // Ainda não é um caso: ver o estado real do pagamento deste pedido.
  const { data: pagamento } = pedido.checkout_session_id
    ? await createAdminClient()
        .from("stripe_payments")
        .select("estado")
        .eq("stripe_session_id", pedido.checkout_session_id)
        .maybeSingle()
    : { data: null };
  const estado = (pagamento?.estado as string | undefined) ?? null;
  const modalidade = `/tratar-caso/modalidade?pedido=${pedido.id}`;

  // Sem registo do webhook ainda: o Checkout chegou a ser concluído? (Só
  // para escolher a mensagem — concluído não é o mesmo que pago.)
  let checkoutConcluido = estado !== null;
  if (!checkoutConcluido && pedido.checkout_session_id) {
    const sessionId = pedido.checkout_session_id;
    const sessao = await Promise.resolve()
      .then(() => getStripe().checkout.sessions.retrieve(sessionId))
      .catch(() => null);
    // Sem resposta do Stripe: na dúvida, espera pelo webhook.
    checkoutConcluido = !sessao || sessao.status === "complete";
  }

  if (estado === "falhado" || !checkoutConcluido) {
    return (
      <>
        <Etapas atual={4} />
        <div className={CARTAO}>
          <h1 className={TITULO}>{t.naoConcluido}</h1>
          <p className={`${TEXTO_SECUNDARIO} mb-5`}>{t.naoConcluidoTexto}</p>
          <Link href={modalidade} className={BOTAO}>
            {t.escolherModalidade}
          </Link>
        </div>
      </>
    );
  }

  if (estado === "pendente") {
    return (
      <>
        <Etapas atual={4} />
        <div className={CARTAO}>
          <h1 className={TITULO}>{t.emConfirmacao}</h1>
          <p className={`${TEXTO_SECUNDARIO} mb-5`}>{t.emConfirmacaoTexto}</p>
          <Link href="/portal" className={`${LIGACAO} text-[14.5px]`}>
            {t.irPortal}
          </Link>
        </div>
      </>
    );
  }

  // Pagamento concluído, mas o pedido não passou a caso (raro): se a conta
  // tem o caso pago por usar, o cliente pode usá-lo já.
  const acesso = estado === "concluido" ? await obterAcesso(supabase, userId) : null;

  return (
    <>
      <Etapas atual={4} />
      <div className={CARTAO}>
        <h1 className={TITULO}>{t.obrigado}</h1>
        <p className={`${TEXTO_SECUNDARIO} mb-4`}>{t.obrigadoTexto}</p>
        {acesso && acesso.creditos > 0 ? (
          <form action={usarCasoDisponivel}>
            <input type="hidden" name="pedido_id" value={pedido.id} />
            <button type="submit" className={BOTAO}>
              {t.concluir}
            </button>
          </form>
        ) : (
          <AguardarConfirmacao />
        )}
      </div>
    </>
  );
}
