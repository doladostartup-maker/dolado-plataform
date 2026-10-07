import Link from "next/link";
import { redirect } from "next/navigation";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { obterAcesso } from "@/lib/auth";
import { opcoesDoPedido, pedidoPorPagar, type ModalidadeCaso } from "@/lib/pedidoCaso";
import { pedidoDaConta } from "@/lib/pedidoCasoServidor";
import { CASO_EXTRA, IVA_INCLUIDO, PLANOS, formatarPreco, precoComUnidade, textoCasosDisponiveis } from "@/lib/planos";
import { TEXTOS_INDICACAO, escolherDescontoCheckout, precoComDescontoCentimos } from "@/lib/indicacoes/regras";
import { situacaoIndicacaoNaCompra } from "@/lib/indicacoes/servidor";
import { casosDoMes } from "@/lib/casoExtra";
import { casoExtraConfigurado } from "@/lib/stripe/planos";
import { CTA_CASO_EXTRA, PrecoCasoExtra, textoProximoCaso } from "@/components/portal/CasoExtra";
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
import { Aviso } from "@/components/portal/Aviso";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO as SECUNDARIO,
  CARTAO,
  CARTAO_ACAO,
  CARTAO_INFO,
  EYEBROW,
  LIGACAO,
  METADADOS,
  TEXTO_SECUNDARIO,
  TITULO_CARTAO,
  TITULO_PAGINA,
} from "@/components/portal/ui";

const BOTAO = `${BOTAO_PRIMARIO} w-full`;
const BOTAO_SECUNDARIO = `${SECUNDARIO} w-full`;

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
  const opcoes = opcoesDoPedido(acesso, casoExtraConfigurado());
  const mes = casosDoMes(acesso);

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

  // Programa de indicação: só para mostrar o preço (o Checkout decide de novo).
  const indicacao = await situacaoIndicacaoNaCompra(userId);

  return (
    <>
      {params.conta === "nova" && <RegistarEvento nome="conta_criada" />}
      {params.cancelado === "1" && <RegistarEvento nome="checkout_abandonado" />}
      <Etapas atual={3} />

      <div className="flex flex-col gap-5">
        <div>
          <h1 className={`${TITULO_PAGINA} mb-2`}>Como quer que a DoLado trate o seu caso?</h1>
          <p className={TEXTO_SECUNDARIO}>
            O seu pedido está guardado. Só começamos a tratar o caso depois de o pagamento ser confirmado.
          </p>
        </div>

        <div className={`${CARTAO_INFO} flex flex-col gap-1`}>
          <p className={`${EYEBROW} mb-1`}>O seu pedido</p>
          <p className={TITULO_CARTAO}>
            {pedido.empresa} · {pedido.sector}
          </p>
          <p className={TEXTO_SECUNDARIO}>{pedido.problema_tipo}</p>
          {pedido.descricao && <p className={`${METADADOS} mt-1 line-clamp-3`}>{pedido.descricao}</p>}
          <Link href="/tratar-caso" className={`${LIGACAO} mt-1 self-start text-[14px]`}>
            Alterar o pedido
          </Link>
        </div>

        {params.cancelado === "1" && (
          <Aviso tom="info">
            O pagamento não foi concluído e nada foi cobrado. O seu pedido continua guardado: pode escolher a modalidade e
            pagar quando quiser.
          </Aviso>
        )}
        {params.erro === "sem-casos" && (
          <Aviso tom="info">Não tem casos disponíveis neste momento. Escolha uma das modalidades abaixo.</Aviso>
        )}
        {params.erro === "caso-extra-indisponivel" && (
          <Aviso tom="info">
            Não foi possível confirmar o benefício de subscritor neste momento, por isso nada foi cobrado. O seu pedido
            continua guardado: tente novamente dentro de alguns minutos ou veja abaixo as opções disponíveis.
          </Aviso>
        )}

        {opcoes.usarCasoDisponivel ? (
          <div className={CARTAO_ACAO}>
            <p className={TITULO_CARTAO}>Usar um dos seus casos disponíveis</p>
            <p className={`${TEXTO_SECUNDARIO} mb-4 mt-1`}>
              {textoCasosDisponiveis(acesso.creditos)} na sua conta. Este pedido usa um deles, sem novo pagamento.
            </p>
            <form action={usarCasoDisponivel}>
              <input type="hidden" name="pedido_id" value={pedido.id} />
              <button type="submit" className={BOTAO}>
                Usar um caso disponível
              </button>
            </form>
          </div>
        ) : opcoes.casoExtra ? (
          <div className={`${CARTAO_ACAO} flex flex-col gap-4`}>
            <RegistarEvento nome="extra_case_offer_viewed" parametros={{ local: "modalidade" }} />
            <div className="flex flex-col gap-1">
              <p className={TITULO_CARTAO}>Já utilizou o seu caso incluído neste mês</p>
              {mes && textoProximoCaso(mes) && <p className={TEXTO_SECUNDARIO}>{textoProximoCaso(mes)}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold text-[var(--v2-navy)]">Tem um problema que não pode esperar?</p>
              <p className={TEXTO_SECUNDARIO}>
                Como subscritor DoLado, pode tratar este caso como {CASO_EXTRA.nome}, com{" "}
                {CASO_EXTRA.descontoPercentagem}% de desconto.
              </p>
            </div>
            <PrecoCasoExtra />
            <BotaoComprar
              plano="avulso"
              fluxo="caso_extra"
              origem="tratar_caso"
              pedidoId={pedido.id}
              className={BOTAO}
            >
              {CTA_CASO_EXTRA}
            </BotaoComprar>
            <p className={METADADOS}>
              A sua subscrição {PLANOS.caso_protecao.nome} continua ativa e não é alterada: o {CASO_EXTRA.nome} só
              acrescenta o tratamento deste caso.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {opcoes.modalidades.map((id) => {
              const plano = PLANOS[id];
              const destaque = id === "caso_protecao";
              const descontoIndicacao = indicacao
                ? escolherDescontoCheckout({
                    plano: id,
                    fluxo: "pedido_caso",
                    conversao: id === "caso_protecao" && !!conversao,
                    ...indicacao,
                    prescindiu: false,
                  })
                : null;
              return (
                <div
                  key={id}
                  className={`flex flex-col ${destaque ? CARTAO_ACAO : CARTAO}`}
                >
                  <p className={TITULO_CARTAO}>{plano.nome}</p>
                  {descontoIndicacao ? (
                    <>
                      <p className="mt-1 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
                        <span className="mr-2 text-[16px] font-semibold text-[var(--v2-muted)] line-through">
                          <span className="sr-only">Preço normal: </span>
                          {formatarPreco(plano.precoCentimos)}
                        </span>
                        {formatarPreco(precoComDescontoCentimos(plano.precoCentimos))}
                      </p>
                      <p className="text-[13.5px] font-semibold text-[var(--v2-green-dark)]">
                        {descontoIndicacao === "novo_cliente" ? "Desconto de indicação" : "Com 1 dos seus descontos de indicação"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{precoComUnidade(id)}</p>
                  )}
                  <p className={`${METADADOS} mb-3`}>
                    {plano.subscricao ? `Subscrição mensal · ${IVA_INCLUIDO}` : `Pagamento único · ${IVA_INCLUIDO}`}
                  </p>
                  <p className={`${TEXTO_SECUNDARIO} mb-5`}>{plano.descricaoCurta}</p>
                  {id === "caso_protecao" && indicacao?.novoClienteIndicado && (
                    <p className={`${METADADOS} -mt-3 mb-5`}>{TEXTOS_INDICACAO.casoProtecaoSemDesconto}</p>
                  )}
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

        {acesso.temProtecao && !opcoes.usarCasoDisponivel && !opcoes.casoExtra && (
          <p className={METADADOS}>
            A sua subscrição atual não tem casos disponíveis neste momento. Pode tratar este caso com um caso{" "}
            {PLANOS.avulso.nome}.
          </p>
        )}
      </div>
    </>
  );
}
