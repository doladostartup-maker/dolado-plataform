"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { confirmarCompra, type EstadoCompra } from "@/app/actions/stripe";
import { ofertaIndicacaoNaCompra, type OfertaIndicacaoCompra } from "@/app/actions/indicacoes";
import {
  CAMPO_ACEITA_TERMOS,
  CAMPO_INICIO_IMEDIATO,
  CAMPO_SEM_DESCONTO_INDICACAO,
  VALOR_ACEITE,
  type FluxoCompra,
  type OrigemCompra,
} from "@/lib/consentimentoCompra";
import {
  ACEITACAO_TERMOS,
  COMO_EXERCER_LIVRE_RESOLUCAO,
  RESUMO_LIVRE_RESOLUCAO,
  ROTAS_LEGAIS,
  consentimentoInicioImediato,
} from "@/lib/legal";
import { track } from "@/lib/analytics";
import { CASO_EXTRA, IVA_INCLUIDO, PLANOS, TEXTO_BENEFICIO_SUBSCRITOR, formatarPreco, type PlanoId } from "@/lib/planos";
import { TEXTOS_INDICACAO, precoComDescontoCentimos, textoDescontoNaCompra } from "@/lib/indicacoes/regras";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAIXA_SELECAO } from "@/components/portal/ui";

export type OfertaConversao = { mensalidade: number; reembolso: number } | null;

const LINK = "font-semibold text-[var(--v2-green)] underline underline-offset-4";

/**
 * Passo obrigatório antes do Stripe Checkout, comum a todos os pontos de
 * compra. Informação comercial de src/lib/planos.ts e textos legais de
 * src/lib/legal.ts — nada escrito à mão aqui. As checkboxes começam
 * desmarcadas e o servidor (confirmarCompra) volta a validá-las.
 * A Política de Privacidade é só disponibilizada (ligação), nunca uma
 * checkbox de aceitação.
 *
 * Design System V2: o modal traz o próprio tema (.tema-portal + fonte), para
 * ter o mesmo aspeto no portal, em /comprar e em /tratar-caso.
 */
export function ConfirmarCompra({
  plano,
  fluxo,
  origem,
  conversao = null,
  pedidoId,
  onFechar,
}: {
  plano: PlanoId;
  fluxo: FluxoCompra;
  origem: OrigemCompra;
  /** Conversão de um Avulso elegível na 1.ª mensalidade (só no portal). */
  conversao?: OfertaConversao;
  /** Pedido de caso a pagar (fluxo "pedido_caso"); a posse é validada no servidor. */
  pedidoId?: string;
  onFechar: () => void;
}) {
  const [estado, submeter, aSubmeter] = useActionState<EstadoCompra, FormData>(confirmarCompra, { erro: null });
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [pedeInicio, setPedeInicio] = useState(false);
  // Caso Extra: plano "avulso" (tratamento de 1 caso, pagamento único) com o
  // preço de subscritor. O servidor confirma o direito e escolhe o preço.
  const casoExtra = fluxo === "caso_extra";
  const info = casoExtra ? { ...PLANOS.avulso, ...CASO_EXTRA } : PLANOS[plano];
  const inicioImediato = consentimentoInicioImediato(plano);

  // Desconto de indicação: só para mostrar (o servidor decide de novo ao abrir
  // o Checkout). O cliente pode preferir um código promocional — não acumulam.
  const [oferta, setOferta] = useState<OfertaIndicacaoCompra | null>(null);
  const [prescindiu, setPrescindiu] = useState(false);
  useEffect(() => {
    if (casoExtra) return;
    let ativo = true;
    ofertaIndicacaoNaCompra(plano, fluxo, !!conversao)
      .then((r) => ativo && setOferta(r))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [plano, fluxo, conversao, casoExtra]);
  const descontoIndicacao = !prescindiu ? (oferta?.desconto ?? null) : null;

  return (
    <div
      onClick={onFechar}
      className={`tema-portal ${fonteV2.className} fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(11,37,69,0.42)] px-4 py-6 antialiased sm:items-center`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-compra-titulo"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-[540px] overflow-y-auto rounded-[20px] bg-white p-6 text-left text-[var(--v2-navy)] shadow-[0_24px_48px_-16px_rgba(11,37,69,0.35)] sm:p-7"
      >
        <h2 id="confirmar-compra-titulo" className="mb-4 text-[21px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
          Confirmar compra
        </h2>

        <div className="mb-4 rounded-[14px] border border-[var(--v2-line)] bg-[var(--v2-blue-bg)] p-4">
          <p className="text-[16px] font-bold text-[var(--v2-navy)]">{info.nome}</p>
          {casoExtra && <p className="text-[13.5px] font-semibold text-[var(--v2-green-dark)]">{TEXTO_BENEFICIO_SUBSCRITOR}</p>}
          <p className="text-[15px] font-semibold text-[var(--v2-navy)]">
            {(casoExtra || descontoIndicacao) && (
              <>
                <span className="font-normal text-[var(--v2-muted)] line-through">
                  <span className="sr-only">Preço normal: </span>
                  {formatarPreco(casoExtra ? CASO_EXTRA.precoReferenciaCentimos : info.precoCentimos)}
                </span>{" "}
              </>
            )}
            {formatarPreco(descontoIndicacao ? precoComDescontoCentimos(info.precoCentimos) : info.precoCentimos)}
            {descontoIndicacao && info.subscricao
              ? " no primeiro mês"
              : info.subscricao
                ? " por mês"
                : " — pagamento único"}{" "}
            ({IVA_INCLUIDO})
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--v2-muted)]">
            {info.subscricao
              ? "Subscrição mensal com renovação automática todos os meses, até a cancelar."
              : "Pagamento único, sem renovação."}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{info.descricaoCurta}</p>
        </div>

        <div className="mb-4 flex flex-col gap-2 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">
          {conversao && (
            <p>
              Utilizamos {formatarPreco(conversao.mensalidade)} do seu pagamento Avulso para cobrir o primeiro mês
              {conversao.reembolso > 0 &&
                ` e reembolsamos os restantes ${formatarPreco(conversao.reembolso)} para o método de pagamento original`}
              . A partir do mês seguinte, é cobrado o preço do plano.
            </p>
          )}
          {info.subscricao && (
            <p>
              Pode cancelar a qualquer momento em Gestão de Subscrição, na sua área de cliente. O cancelamento produz
              efeitos no fim do período já pago.
            </p>
          )}
          {casoExtra && (
            <p>O desconto de subscritor já está aplicado no preço e não acumula com códigos promocionais.</p>
          )}
          {descontoIndicacao && (
            <>
              <p className="font-semibold text-[var(--v2-green-dark)]">
                {textoDescontoNaCompra(descontoIndicacao, info.subscricao)}
              </p>
              <p>
                O desconto de indicação não acumula com códigos promocionais.{" "}
                <button type="button" onClick={() => setPrescindiu(true)} className={LINK}>
                  Prefiro usar um código promocional
                </button>
              </p>
            </>
          )}
          {prescindiu && oferta?.desconto && (
            <p>
              Não aplicamos o desconto de indicação nesta compra: pode introduzir o seu código promocional no passo de
              pagamento.{" "}
              <button type="button" onClick={() => setPrescindiu(false)} className={LINK}>
                Usar o desconto de indicação
              </button>
            </p>
          )}
          {plano === "caso_protecao" && oferta?.novoClienteIndicado && <p>{TEXTOS_INDICACAO.casoProtecaoSemDesconto}</p>}
          {oferta?.semContaComIndicacao && (
            <p className="font-semibold text-[var(--v2-navy)]">{TEXTOS_INDICACAO.semConta}</p>
          )}
          {!conversao && !casoExtra && !descontoIndicacao && (
            <p>
              {info.subscricao
                ? "Se tiver um código promocional, pode aplicá-lo no passo de pagamento. Mesmo com desconto ou com valor de 0 €, a subscrição renova-se todos os meses, ao preço do plano ou nas condições do código aplicado, até a cancelar."
                : "Se tiver um código promocional, pode aplicá-lo no passo de pagamento."}
            </p>
          )}
        </div>

        <div className="mb-4 rounded-[14px] bg-[var(--v2-surface)] p-4 text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
          <p className="mb-1 font-semibold">Direito de livre resolução</p>
          <p>{RESUMO_LIVRE_RESOLUCAO}</p>
          <p className="mt-2">{COMO_EXERCER_LIVRE_RESOLUCAO}</p>
          <p className="mt-2">
            <Link href={ROTAS_LEGAIS.livreResolucao} target="_blank" className={LINK}>
              Informação completa sobre livre resolução
            </Link>{" "}
            ·{" "}
            <Link href={ROTAS_LEGAIS.termos} target="_blank" className={LINK}>
              Termos e Condições
            </Link>
          </p>
        </div>

        <p className="mb-5 text-[13.5px] text-[var(--v2-muted)]">
          Para saber como tratamos os seus dados, consulte a{" "}
          <Link href={ROTAS_LEGAIS.privacidade} target="_blank" className={LINK}>
            Política de Privacidade
          </Link>
          .
        </p>

        <form
          action={submeter}
          onSubmit={() => {
            track("checkout_iniciado", { plano, fluxo });
            if (casoExtra) track("extra_case_checkout_started");
          }}
          className="flex flex-col gap-4 border-t border-[var(--v2-line)] pt-5"
        >
          <input type="hidden" name="plano" value={plano} />
          <input type="hidden" name="fluxo" value={fluxo} />
          <input type="hidden" name="origem" value={origem} />
          {pedidoId && <input type="hidden" name="pedido_id" value={pedidoId} />}
          {prescindiu && <input type="hidden" name={CAMPO_SEM_DESCONTO_INDICACAO} value={VALOR_ACEITE} />}

          <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
            <input
              type="checkbox"
              name={CAMPO_ACEITA_TERMOS}
              value={VALOR_ACEITE}
              required
              checked={aceitaTermos}
              onChange={(e) => setAceitaTermos(e.target.checked)}
              className={CAIXA_SELECAO}
            />
            <span>
              {ACEITACAO_TERMOS.antes}
              <Link href={ROTAS_LEGAIS.termos} target="_blank" className={LINK}>
                {ACEITACAO_TERMOS.ligacao}
              </Link>
              {ACEITACAO_TERMOS.depois}
            </span>
          </label>

          <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
            <input
              type="checkbox"
              name={CAMPO_INICIO_IMEDIATO}
              value={VALOR_ACEITE}
              required
              checked={pedeInicio}
              onChange={(e) => setPedeInicio(e.target.checked)}
              className={CAIXA_SELECAO}
            />
            <span>{inicioImediato.texto}</span>
          </label>

          {estado.erro && (
            <p role="alert" className="rounded-[12px] border border-[#F3C9C4] bg-[#FDEDEB] px-3.5 py-2.5 text-[14px] font-medium text-[var(--v2-erro)]">
              {estado.erro}
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onFechar}
              className={`${BOTAO_SECUNDARIO} flex-1`}
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={!aceitaTermos || !pedeInicio || aSubmeter}
              className={`${BOTAO_PRIMARIO} flex-1`}
            >
              {aSubmeter ? "A abrir pagamento…" : "Continuar para pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
