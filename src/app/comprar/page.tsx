import Link from "next/link";
import { redirect } from "next/navigation";
import { obterAcesso, utilizadorAtual } from "@/lib/auth";
import {
  MENSAGEM_MESMA_SUBSCRICAO,
  MENSAGEM_OUTRA_SUBSCRICAO,
  decidirCompra,
  type PlanoSubscricaoAtiva,
} from "@/lib/compra/decisao";
import { customerDaConta, ofertaConversaoDaConta, subscricoesAtivasDoCustomer } from "@/lib/compra/servidor";
import { PLANOS, ehPlanoId } from "@/lib/planos";
import { MARKETING_SITE_URL, urlTratarCaso } from "@/lib/site";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { destinoCompra } from "@/lib/destinoAuth";
import { CompraConfirmacao } from "./CompraConfirmacao";

export const metadata = { title: "Comprar — DoLado", robots: { index: false } };

const PRECARIO = `${MARKETING_SITE_URL}/#precario`;
const LINK = "font-medium text-[var(--color-brand)] underline";

// Ponto de entrada de todas as compras do preçário de dolado.pt. Corre em
// portal.dolado.pt, onde está a sessão: decide aqui (e de novo no servidor,
// em confirmarCompra) se a compra é da conta ou pública.
export default async function ComprarPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  if (!ehPlanoId(plano)) redirect(PRECARIO);

  const { supabase, user } = await utilizadorAtual();
  let subscricoesAtivasStripe: PlanoSubscricaoAtiva[] = [];
  let acesso = null;
  if (user) {
    acesso = await obterAcesso(supabase, user.id);
    // Se o Stripe falhar, a Server Action volta a verificar antes de abrir o Checkout.
    subscricoesAtivasStripe = await subscricoesAtivasDoCustomer(await customerDaConta(user.id)).catch(() => []);
  }
  const decisao = decidirCompra({ plano, autenticado: !!user, acesso, subscricoesAtivasStripe });

  if (decisao.acao === "tratar_caso") redirect(urlTratarCaso("precario"));

  const nome = PLANOS[plano].nome;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div>
        <p className="mb-1 text-sm font-semibold text-[var(--color-brand)]">Preçário</p>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{nome}</h1>
      </div>

      {decisao.acao === "ja_tem_subscricao" && (
        <>
          <p className="text-sm leading-relaxed text-[var(--color-ink)]">
            {decisao.mesmoPlano ? MENSAGEM_MESMA_SUBSCRICAO : MENSAGEM_OUTRA_SUBSCRICAO}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            <Link href="/portal/subscricao" className={LINK}>
              Ver a minha subscrição
            </Link>{" "}
            ·{" "}
            <Link href="/portal" className={LINK}>
              Ir para o portal
            </Link>
          </p>
        </>
      )}

      {decisao.acao === "publico" && (
        <>
          <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Se já tem conta na DoLado, inicie sessão antes de comprar: a compra fica logo associada à sua conta.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/login?next=${encodeURIComponent(destinoCompra(plano))}`}
              className="min-h-11 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
            >
              Iniciar sessão
            </Link>
            <BotaoComprar
              plano={plano}
              fluxo="publico"
              origem="landing"
              className="min-h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
            >
              Ainda não tenho conta — continuar
            </BotaoComprar>
          </div>
          <p className="text-[13px] text-[var(--color-ink-muted)]">
            Sem conta, cria a sua conta depois do pagamento. Prefere criá-la já?{" "}
            <Link href={`/registo?next=${encodeURIComponent(destinoCompra(plano))}`} className={LINK}>
              Criar conta e continuar
            </Link>
            .{" "}
            <a href={PRECARIO} className={LINK}>
              Voltar ao preçário
            </a>
          </p>
        </>
      )}

      {decisao.acao === "adesao" && user && (
        <CompraConfirmacao
          plano={plano}
          fluxo="adesao"
          conversao={plano === "avulso" ? null : await ofertaConversaoDaConta(user.id, plano)}
          voltarPara={PRECARIO}
        />
      )}
    </main>
  );
}
