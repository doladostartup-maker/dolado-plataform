import Link from "@/i18n/Link";
import { caminho, idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { rotulo } from "@/i18n/mensagens/rotulos";
import { tTratarCaso } from "@/i18n/mensagens/tratarCaso";
import { redirect } from "next/navigation";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { obterAcesso } from "@/lib/auth";
import { opcoesDoPedido, pedidoPorPagar, type ModalidadeCaso } from "@/lib/pedidoCaso";
import { pedidoDaConta } from "@/lib/pedidoCasoServidor";
import { CASO_EXTRA, PLANOS } from "@/lib/planos";
import { escolherDescontoCheckout, precoComDescontoCentimos } from "@/lib/indicacoes/regras";
import { situacaoIndicacaoNaCompra } from "@/lib/indicacoes/servidor";
import { casosDoMes } from "@/lib/casoExtra";
import { casoExtraConfigurado } from "@/lib/stripe/planos";
import { PrecoCasoExtra, ctaCasoExtra, textoProximoCaso } from "@/components/portal/CasoExtra";
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


// Etapa 3 — modalidade. Mostra só o que a conta pode realmente escolher
// (acesso lido da base de dados). Daqui só se sai para o Stripe Checkout
// (modal de confirmação) ou, se a conta já tiver casos pagos por usar, para
// usarCasoDisponivel. Nada aqui cria um caso sem pagamento.
export default async function ModalidadePage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ pedido?: string; cancelado?: string; erro?: string; conta?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tTratarCaso[idioma].modalidade;
  const tce = tTratarCaso[idioma].casoExtra;
  const tp = tPlanos[idioma];
  const CTA: Record<ModalidadeCaso, string> = t.cta;
  const preco = (c: number) => precoNoIdioma(idioma, c);
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect(await caminho("/tratar-caso/conta"));

  const pedido = await pedidoDaConta(params.pedido ?? null, userId);
  if (!pedido) redirect(await caminho("/tratar-caso"));
  const recebido = await caminho(`/tratar-caso/recebido?pedido=${pedido.id}`);
  if (pedido.estado === "convertido") redirect(recebido);
  if (!pedidoPorPagar(pedido.estado)) redirect(await caminho("/tratar-caso"));

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
          <h1 className={`${TITULO_PAGINA} mb-2`}>{t.titulo}</h1>
          <p className={TEXTO_SECUNDARIO}>{t.texto}</p>
        </div>

        <div className={`${CARTAO_INFO} flex flex-col gap-1`}>
          <p className={`${EYEBROW} mb-1`}>{t.oSeuPedido}</p>
          <p className={TITULO_CARTAO}>
            {pedido.empresa} · {rotulo(idioma, "setores", pedido.sector)}
          </p>
          <p className={TEXTO_SECUNDARIO}>{rotulo(idioma, "problemas", pedido.problema_tipo)}</p>
          {pedido.descricao && <p className={`${METADADOS} mt-1 line-clamp-3`}>{pedido.descricao}</p>}
          <Link href="/tratar-caso" className={`${LIGACAO} mt-1 self-start text-[14px]`}>
            {t.alterar}
          </Link>
        </div>

        {params.cancelado === "1" && (
          <Aviso tom="info">{t.cancelado}</Aviso>
        )}
        {params.erro === "sem-casos" && (
          <Aviso tom="info">{t.semCasos}</Aviso>
        )}
        {params.erro === "caso-extra-indisponivel" && (
          <Aviso tom="info">{t.casoExtraIndisponivel}</Aviso>
        )}

        {opcoes.usarCasoDisponivel ? (
          <div className={CARTAO_ACAO}>
            <p className={TITULO_CARTAO}>{t.usarCasoTitulo}</p>
            <p className={`${TEXTO_SECUNDARIO} mb-4 mt-1`}>{t.usarCasoTexto(tp.casosDisponiveis(acesso.creditos))}</p>
            <form action={usarCasoDisponivel}>
              <input type="hidden" name="pedido_id" value={pedido.id} />
              <button type="submit" className={BOTAO}>
                {t.usarCaso}
              </button>
            </form>
          </div>
        ) : opcoes.casoExtra ? (
          <div className={`${CARTAO_ACAO} flex flex-col gap-4`}>
            <RegistarEvento nome="extra_case_offer_viewed" parametros={{ local: "modalidade" }} />
            <div className="flex flex-col gap-1">
              <p className={TITULO_CARTAO}>{tce.jaUtilizou}</p>
              {mes && textoProximoCaso(idioma, mes) && <p className={TEXTO_SECUNDARIO}>{textoProximoCaso(idioma, mes)}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold text-[var(--v2-navy)]">{tce.naoPodeEsperar}</p>
              <p className={TEXTO_SECUNDARIO}>{tce.comoSubscritorEste(tp.casoExtra.nome, CASO_EXTRA.descontoPercentagem)}</p>
            </div>
            <PrecoCasoExtra idioma={idioma} />
            <BotaoComprar
              plano="avulso"
              fluxo="caso_extra"
              origem="tratar_caso"
              pedidoId={pedido.id}
              className={BOTAO}
            >
              {ctaCasoExtra(idioma)}
            </BotaoComprar>
            <p className={METADADOS}>{t.casoExtraNota(tp.nome.caso_protecao, tp.casoExtra.nome)}</p>
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
                  <p className={TITULO_CARTAO}>{tp.nome[id]}</p>
                  {descontoIndicacao ? (
                    <>
                      <p className="mt-1 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
                        <span className="mr-2 text-[16px] font-semibold text-[var(--v2-muted)] line-through">
                          <span className="sr-only">{t.precoNormal}</span>
                          {preco(plano.precoCentimos)}
                        </span>
                        {preco(precoComDescontoCentimos(plano.precoCentimos))}
                      </p>
                      <p className="text-[13.5px] font-semibold text-[var(--v2-green-dark)]">
                        {descontoIndicacao === "novo_cliente" ? t.descontoNovo : t.descontoRecompensa}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{tp.comUnidade(preco(plano.precoCentimos), plano.subscricao)}</p>
                  )}
                  <p className={`${METADADOS} mb-3`}>
                    {`${plano.subscricao ? tp.subscricaoMensal : tp.pagamentoUnico} · ${tp.ivaIncluido}`}
                  </p>
                  <p className={`${TEXTO_SECUNDARIO} mb-5`}>{tp.descricaoCurta[id]}</p>
                  {id === "caso_protecao" && indicacao?.novoClienteIndicado && (
                    <p className={`${METADADOS} -mt-3 mb-5`}>{tIndicacoes[idioma].textos.casoProtecaoSemDesconto}</p>
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
          <p className={METADADOS}>{t.soAvulsoNota(tp.nome.avulso)}</p>
        )}
      </div>
    </>
  );
}
