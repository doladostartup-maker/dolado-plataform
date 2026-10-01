import Link from "next/link";
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

const BOTAO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[22px] py-2.5 text-[15px] font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const CARTAO = "rounded-[16px] bg-white p-6 shadow-[var(--shadow-subtle)] sm:p-8";

// Regresso do Stripe Checkout (success_url). Esta página NÃO confirma
// pagamentos nem cria casos: só lê o estado do pedido, gravado pelo webhook
// depois de o Stripe confirmar o pagamento. A sessão foi aberta antes do
// Checkout neste mesmo domínio, por isso o cliente chega já autenticado.
export default async function RecebidoPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  const aqui = `/tratar-caso/recebido?pedido=${ehUuid(params.pedido) ? params.pedido : ""}`;
  if (!userId) redirect(`/login?next=${encodeURIComponent(aqui)}`);

  const pedido = ehUuid(params.pedido) ? await pedidoDaConta(params.pedido, userId) : null;
  if (!pedido) redirect("/portal/casos");

  if (pedido.estado === "convertido" && pedido.caso_id) {
    return (
      <>
        <RegistarEvento nome="pagamento_concluido" parametros={{ plano: pedido.plano_escolhido ?? "caso_disponivel" }} />
        <div className={`${CARTAO} text-center`}>
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-[999px] bg-[var(--color-brand-wash)] px-3 py-1 text-[13px] font-semibold text-[var(--color-brand)]">
            {pedido.plano_escolhido ? "✓ Pagamento confirmado" : "✓ Caso disponível utilizado"}
          </span>
          <h1 className="mb-2 text-[24px] font-bold text-[var(--color-ink)]">Recebemos o seu caso.</h1>
          <p className="mx-auto mb-6 max-w-[46ch] text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
            Enviámos uma confirmação para o seu e-mail. Pode acompanhar o tratamento do seu caso no portal.
          </p>
          <Link href={`/portal/casos/${pedido.caso_id}`} className={BOTAO}>
            Acompanhar o meu caso
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
          <h1 className="mb-2 text-[20px] font-bold text-[var(--color-ink)]">O pagamento não foi concluído</h1>
          <p className="mb-5 text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
            O seu pedido continua guardado, mas ainda não é um caso. Pode tentar pagar de novo, com o mesmo ou com outro
            método de pagamento.
          </p>
          <Link href={modalidade} className={BOTAO}>
            Escolher a modalidade
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
          <h1 className="mb-2 text-[20px] font-bold text-[var(--color-ink)]">Pagamento em confirmação</h1>
          <p className="mb-5 text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
            O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns métodos, como o débito direto
            SEPA, podem demorar alguns dias úteis; assim que o pagamento for confirmado, o seu caso é recebido e avisamos
            por e-mail.
          </p>
          <Link href="/portal" className="text-[14px] font-medium text-[var(--color-brand)] underline">
            Ir para o portal
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
        <h1 className="mb-2 text-[20px] font-bold text-[var(--color-ink)]">Obrigado. Estamos a confirmar o pagamento.</h1>
        <p className="mb-4 text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
          Assim que o Stripe confirmar o pagamento, o seu caso é recebido e esta página é atualizada.
        </p>
        {acesso && acesso.creditos > 0 ? (
          <form action={usarCasoDisponivel}>
            <input type="hidden" name="pedido_id" value={pedido.id} />
            <button type="submit" className={BOTAO}>
              Concluir o pedido
            </button>
          </form>
        ) : (
          <AguardarConfirmacao />
        )}
      </div>
    </>
  );
}
