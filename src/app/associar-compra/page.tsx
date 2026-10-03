import type Stripe from "stripe";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contaComEmailConfirmado } from "@/lib/auth";
import { MENSAGENS_ASSOCIACAO, avaliarSessaoParaAssociar, type ResultadoAssociacao } from "@/lib/compra/associacao";
import { CONTACTO_EMAIL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { associarCompra } from "./actions";

export const metadata = { title: "Associar compra — DoLado", robots: { index: false } };

const SUCESSO: ReadonlySet<string> = new Set(["associada", "ja_associada"]);
const LINK = "font-medium text-[var(--color-brand)] underline";

// Associação de uma compra paga sem conta à conta da sessão. Só leitura
// aqui (GET): a associação acontece apenas no POST explícito do botão.
export default async function AssociarCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; resultado?: string }>;
}) {
  const { session_id: sessionId, resultado } = await searchParams;
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect("/portal");

  const conta = await contaComEmailConfirmado();
  if (!conta) redirect(`/login?next=${encodeURIComponent(`/associar-compra?session_id=${sessionId}`)}`);

  let mensagem: string | null = null;
  let sucesso = false;
  if (resultado === "erro") {
    mensagem = "Não foi possível associar a compra. Tente novamente dentro de alguns minutos.";
  } else if (resultado && resultado in MENSAGENS_ASSOCIACAO) {
    mensagem = MENSAGENS_ASSOCIACAO[resultado as ResultadoAssociacao];
    sucesso = SUCESSO.has(resultado);
  }

  // Pré-verificação só para mostrar o estado (a ação volta a validar tudo).
  let podeAssociar = false;
  if (!mensagem) {
    const session = (await getStripe()
      .checkout.sessions.retrieve(sessionId)
      .catch(() => null)) as Stripe.Checkout.Session | null;
    const avaliacao = session ? avaliarSessaoParaAssociar(session, conta) : "sessao_invalida";
    if (avaliacao === "ok") podeAssociar = true;
    else mensagem = MENSAGENS_ASSOCIACAO[avaliacao];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <p className="mb-1 text-sm font-semibold text-[var(--color-brand)]">A sua compra</p>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Associar a compra à sua conta</h1>
      </div>

      {mensagem && (
        <p
          role={sucesso ? "status" : "alert"}
          className={`text-sm leading-relaxed ${sucesso ? "text-[var(--color-ink)]" : "text-[var(--color-status-danger)]"}`}
        >
          {mensagem}
        </p>
      )}

      {podeAssociar && (
        <form action={associarCompra} className="flex flex-col gap-4">
          <input type="hidden" name="session_id" value={sessionId} />
          <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Esta compra foi paga com o e-mail <strong>{conta.email}</strong>, o mesmo da sua conta. Ao confirmar, a compra
            passa a estar associada a esta conta.
          </p>
          <button
            type="submit"
            className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Associar esta compra à minha conta
          </button>
        </form>
      )}

      <p className="text-sm text-[var(--color-ink-muted)]">
        <Link href="/portal" className={LINK}>
          Ir para o portal
        </Link>{" "}
        · Precisa de ajuda?{" "}
        <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
          {CONTACTO_EMAIL}
        </a>
      </p>
    </main>
  );
}
