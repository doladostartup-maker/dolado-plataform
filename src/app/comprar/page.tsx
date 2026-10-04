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
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CARTAO,
  EYEBROW,
  LIGACAO,
  METADADOS,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_PAGINA,
} from "@/components/portal/ui";
import { CompraConfirmacao } from "./CompraConfirmacao";

export const metadata = { title: "Comprar — DoLado", robots: { index: false } };

const PRECARIO = `${MARKETING_SITE_URL}/precario`;
const LINK = `${LIGACAO} underline`;

// Ponto de entrada de todas as compras do preçário de dolado.pt. Corre em
// portal.dolado.pt, onde está a sessão: decide aqui (e de novo no servidor,
// em confirmarCompra) se a compra é da conta ou pública.
// Design System V2 (mesmo tema do portal: .tema-portal).
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
    <div
      className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}
    >
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-md items-center px-4">
          <Logotipo />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className={`${CARTAO} flex flex-col gap-5`}>
          <div className="flex flex-col gap-2">
            <p className={EYEBROW}>Preçário</p>
            <h1 className={TITULO_PAGINA}>{nome}</h1>
          </div>

          {decisao.acao === "ja_tem_subscricao" && (
            <>
              <p className={TEXTO}>{decisao.mesmoPlano ? MENSAGEM_MESMA_SUBSCRICAO : MENSAGEM_OUTRA_SUBSCRICAO}</p>
              <div className="flex flex-col gap-3">
                <Link href="/portal/subscricao" className={BOTAO_PRIMARIO}>
                  Ver a minha subscrição
                </Link>
                <Link href="/portal" className={BOTAO_SECUNDARIO}>
                  Ir para o portal
                </Link>
              </div>
            </>
          )}

          {decisao.acao === "publico" && (
            <>
              <p className={TEXTO_SECUNDARIO}>
                Se já tem conta na DoLado, inicie sessão antes de comprar: a compra fica logo associada à sua conta.
              </p>
              <div className="flex flex-col gap-3">
                <Link href={`/login?next=${encodeURIComponent(destinoCompra(plano))}`} className={BOTAO_PRIMARIO}>
                  Iniciar sessão
                </Link>
                <BotaoComprar plano={plano} fluxo="publico" origem="landing" className={`${BOTAO_SECUNDARIO} w-full`}>
                  Ainda não tenho conta — continuar
                </BotaoComprar>
              </div>
              <p className={`${METADADOS} border-t border-[var(--v2-line)] pt-4 leading-relaxed`}>
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
        </div>
      </main>
    </div>
  );
}
