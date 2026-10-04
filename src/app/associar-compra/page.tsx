import type Stripe from "stripe";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contaComEmailConfirmado } from "@/lib/auth";
import { MENSAGENS_ASSOCIACAO, avaliarSessaoParaAssociar, type ResultadoAssociacao } from "@/lib/compra/associacao";
import { CONTACTO_EMAIL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { associarCompra } from "./actions";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, LIGACAO, TEXTO } from "@/components/portal/ui";

export const metadata = { title: "Associar compra — DoLado", robots: { index: false } };

const SUCESSO: ReadonlySet<string> = new Set(["associada", "ja_associada"]);
const LINK = LIGACAO;

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
    <MolduraConta
      contexto="A sua compra"
      titulo="Associar a compra à sua conta"
      depois={
        <>
          <Link href="/portal" className={LINK}>
            Ir para o portal
          </Link>{" "}
          · Precisa de ajuda?{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
            {CONTACTO_EMAIL}
          </a>
        </>
      }
    >
      {mensagem && <Aviso tom={sucesso ? "sucesso" : "erro"}>{mensagem}</Aviso>}

      {podeAssociar && (
        <form action={associarCompra} className="flex flex-col gap-4">
          <input type="hidden" name="session_id" value={sessionId} />
          <p className={TEXTO}>
            Esta compra foi paga com o e-mail <strong>{conta.email}</strong>, o mesmo da sua conta. Ao confirmar, a
            compra passa a estar associada a esta conta.
          </p>
          <button type="submit" className={BOTAO_PRIMARIO}>
            Associar esta compra à minha conta
          </button>
        </form>
      )}
    </MolduraConta>
  );
}
