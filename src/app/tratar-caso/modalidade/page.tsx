import Link from "next/link";
import { redirect } from "next/navigation";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { obterAcesso } from "@/lib/auth";
import { opcoesDoPedido, pedidoPorPagar, type ModalidadeCaso } from "@/lib/pedidoCaso";
import { pedidoDaConta } from "@/lib/pedidoCasoServidor";
import { IVA_INCLUIDO, PLANOS, precoComUnidade, textoCasosDisponiveis } from "@/lib/planos";
import {
  escolherAvulsoParaConversao,
  sessoesAvulsoDisponiveis,
  type ConversaoExistente,
  type CreditoConcedido,
  type PagamentoAvulso,
} from "@/lib/stripe/conversao";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usarCasoDisponivel } from "../actions";
import { Etapas } from "../_components/Etapas";
import { RegistarEvento } from "../_components/RegistarEvento";

const BOTAO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-white px-[18px] py-2.5 text-[14px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";
const CAIXA_INFO =
  "rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] leading-relaxed text-[var(--color-ink)]";

const CTA: Record<ModalidadeCaso, string> = {
  avulso: "Escolher Avulso",
  caso_protecao: "Escolher Caso + Proteção",
};

// Etapa 3 — modalidade. Mostra só o que a conta pode realmente escolher
// (acesso lido da base de dados). Daqui só se sai para o Stripe Checkout
// (modal de confirmação) ou, se a conta já tiver casos pagos por usar, para
// usarCasoDisponivel. Nada aqui cria um caso sem pagamento.
export default async function ModalidadePage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; cancelado?: string; erro?: string; conta?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect("/tratar-caso/conta");

  const pedido = await pedidoDaConta(params.pedido ?? null, userId);
  if (!pedido) redirect("/tratar-caso");
  const recebido = `/tratar-caso/recebido?pedido=${pedido.id}`;
  if (pedido.estado === "convertido") redirect(recebido);
  if (!pedidoPorPagar(pedido.estado)) redirect("/tratar-caso");

  // Checkout anterior deste pedido com pagamento em confirmação (ex.: SEPA):
  // não se oferece outro pagamento.
  if (pedido.checkout_session_id) {
    const { data: pagamento } = await createAdminClient()
      .from("stripe_payments")
      .select("estado")
      .eq("stripe_session_id", pedido.checkout_session_id)
      .maybeSingle();
    if (pagamento?.estado === "pendente") redirect(recebido);
  }

  const acesso = await obterAcesso(supabase, userId);
  const opcoes = opcoesDoPedido(acesso);

  // O que um Avulso pago cobre no Caso + Proteção (regra existente de conversão).
  let conversao: { mensalidade: number; reembolso: number } | null = null;
  if (opcoes.modalidades.includes("caso_protecao")) {
    const [{ data: pagamentos }, { data: conversoes }, { data: creditos }] = await Promise.all([
      supabase
        .from("stripe_payments")
        .select("id, stripe_session_id, user_id, plano, estado, valor_total_centimos, created_at")
        .eq("user_id", userId)
        .eq("plano", "avulso"),
      supabase.from("conversoes_avulso").select("id, stripe_payment_id, estado, checkout_session_id").eq("user_id", userId),
      supabase.from("case_credit_grants").select("origem, estado").eq("user_id", userId).eq("estado", "disponivel"),
    ]);
    const escolha = escolherAvulsoParaConversao(
      (pagamentos ?? []) as PagamentoAvulso[],
      (conversoes ?? []) as ConversaoExistente[],
      userId,
      "caso_protecao",
      sessoesAvulsoDisponiveis((creditos ?? []) as CreditoConcedido[]),
    );
    if (escolha) conversao = { mensalidade: escolha.calculo.mensalidade, reembolso: escolha.calculo.reembolso };
  }

  return (
    <>
      {params.conta === "nova" && <RegistarEvento nome="conta_criada" />}
      {params.cancelado === "1" && <RegistarEvento nome="checkout_abandonado" />}
      <Etapas atual={3} />

      <div className="flex flex-col gap-5">
        <div>
          <h1 className="mb-1 text-[22px] font-bold text-[var(--color-ink)]">Como quer que a DoLado trate o seu caso?</h1>
          <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
            O seu pedido está guardado. Só começamos a tratar o caso depois de o pagamento ser confirmado.
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white p-5 text-[14px]">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">O seu pedido</p>
          <p className="font-semibold text-[var(--color-ink)]">
            {pedido.empresa} · {pedido.sector}
          </p>
          <p className="text-[var(--color-ink-muted)]">{pedido.problema_tipo}</p>
          {pedido.descricao && <p className="mt-2 line-clamp-3 text-[13.5px] text-[var(--color-ink-muted)]">{pedido.descricao}</p>}
          <Link href="/tratar-caso" className="mt-2 inline-block text-[13px] font-medium text-[var(--color-brand)] underline">
            Alterar o pedido
          </Link>
        </div>

        {params.cancelado === "1" && (
          <div className={CAIXA_INFO}>
            O pagamento não foi concluído e nada foi cobrado. O seu pedido continua guardado: pode escolher a modalidade e
            pagar quando quiser.
          </div>
        )}
        {params.erro === "sem-casos" && (
          <div className={CAIXA_INFO}>Não tem casos disponíveis neste momento. Escolha uma das modalidades abaixo.</div>
        )}

        {opcoes.usarCasoDisponivel ? (
          <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-brand)] bg-white p-5 shadow-[var(--shadow-md)]">
            <p className="text-[15px] font-semibold text-[var(--color-ink)]">Usar um dos seus casos disponíveis</p>
            <p className="mb-4 mt-1 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
              {textoCasosDisponiveis(acesso.creditos)} na sua conta. Este pedido usa um deles, sem novo pagamento.
            </p>
            <form action={usarCasoDisponivel}>
              <input type="hidden" name="pedido_id" value={pedido.id} />
              <button type="submit" className={BOTAO}>
                Usar um caso disponível
              </button>
            </form>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {opcoes.modalidades.map((id) => {
              const plano = PLANOS[id];
              const destaque = id === "caso_protecao";
              return (
                <div
                  key={id}
                  className={`flex flex-col rounded-[var(--radius-card)] bg-white p-5 ${
                    destaque
                      ? "border-2 border-[var(--color-brand)] shadow-[var(--shadow-md)]"
                      : "border border-[var(--color-hairline)] shadow-[var(--shadow-subtle)]"
                  }`}
                >
                  <p className="text-[15px] font-semibold text-[var(--color-ink)]">{plano.nome}</p>
                  <p className="mt-1 text-[20px] font-semibold text-[var(--color-ink)]">{precoComUnidade(id)}</p>
                  <p className="mb-3 text-[12px] text-[var(--color-ink-faint)]">
                    {plano.subscricao ? `Subscrição mensal · ${IVA_INCLUIDO}` : `Pagamento único · ${IVA_INCLUIDO}`}
                  </p>
                  <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{plano.descricaoCurta}</p>
                  <BotaoComprar
                    plano={id}
                    fluxo="pedido_caso"
                    origem="tratar_caso"
                    pedidoId={pedido.id}
                    conversao={id === "caso_protecao" ? conversao : null}
                    className={`mt-auto ${destaque ? BOTAO : BOTAO_SECUNDARIO}`}
                  >
                    {CTA[id]}
                  </BotaoComprar>
                </div>
              );
            })}
          </div>
        )}

        {acesso.temProtecao && !opcoes.usarCasoDisponivel && (
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            A sua subscrição atual não tem casos disponíveis neste momento. Pode tratar este caso com um caso{" "}
            {PLANOS.avulso.nome}.
          </p>
        )}
      </div>
    </>
  );
}
