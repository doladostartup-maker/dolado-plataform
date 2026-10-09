"use client";

import Link from "@/i18n/Link";
import { useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { TextoVinculativo } from "@/i18n/TextoVinculativo";
import { tCompra } from "@/i18n/mensagens/compra";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { tJuridico } from "@/i18n/mensagens/juridico";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
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
import { CASO_EXTRA, PLANOS, type PlanoId } from "@/lib/planos";
import { precoComDescontoCentimos, type TipoDescontoIndicacao } from "@/lib/indicacoes/regras";
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
  const idioma = useIdioma();
  const t = tCompra[idioma].modal;
  const tp = tPlanos[idioma];
  const ti = tIndicacoes[idioma];
  const tj = tJuridico[idioma];
  const formatarPreco = (c: number) => precoNoIdioma(idioma, c);
  const nome = casoExtra ? tp.casoExtra.nome : tp.nome[plano];
  const descricaoCurta = casoExtra ? tp.casoExtra.descricaoCurta : tp.descricaoCurta[plano];
  const textoDescontoNaCompra = (tipo: TipoDescontoIndicacao, subscricao: boolean) =>
    tipo === "novo_cliente"
      ? subscricao
        ? ti.descontoNaCompra.novoClienteSubscricao
        : ti.descontoNaCompra.novoClienteCompra
      : subscricao
        ? ti.descontoNaCompra.recompensaSubscricao
        : ti.descontoNaCompra.recompensaCompra;

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
          {t.titulo}
        </h2>

        <div className="mb-4 rounded-[14px] border border-[var(--v2-line)] bg-[var(--v2-blue-bg)] p-4">
          <p className="text-[16px] font-bold text-[var(--v2-navy)]">{nome}</p>
          {casoExtra && <p className="text-[13.5px] font-semibold text-[var(--v2-green-dark)]">{tp.casoExtra.beneficio}</p>}
          <p className="text-[15px] font-semibold text-[var(--v2-navy)]">
            {(casoExtra || descontoIndicacao) && (
              <>
                <span className="font-normal text-[var(--v2-muted)] line-through">
                  <span className="sr-only">{t.precoNormal}</span>
                  {formatarPreco(casoExtra ? CASO_EXTRA.precoReferenciaCentimos : info.precoCentimos)}
                </span>{" "}
              </>
            )}
            {formatarPreco(descontoIndicacao ? precoComDescontoCentimos(info.precoCentimos) : info.precoCentimos)}
            {descontoIndicacao && info.subscricao ? t.noPrimeiroMes : info.subscricao ? t.porMes : t.pagamentoUnico}{" "}
            ({tp.ivaIncluido})
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--v2-muted)]">
            {info.subscricao ? t.renovacao : t.semRenovacao}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{descricaoCurta}</p>
        </div>

        <div className="mb-4 flex flex-col gap-2 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">
          {conversao && (
            <p>
              {t.conversao(formatarPreco(conversao.mensalidade))}
              {conversao.reembolso > 0 && t.conversaoReembolso(formatarPreco(conversao.reembolso))}
              {t.conversaoFim}
            </p>
          )}
          {info.subscricao && (
            <p>{t.cancelar}</p>
          )}
          {casoExtra && (
            <p>{t.descontoSubscritor}</p>
          )}
          {descontoIndicacao && (
            <>
              <p className="font-semibold text-[var(--v2-green-dark)]">
                {textoDescontoNaCompra(descontoIndicacao, info.subscricao)}
              </p>
              <p>
                {t.naoAcumula}{" "}
                <button type="button" onClick={() => setPrescindiu(true)} className={LINK}>
                  {t.prefiroCodigo}
                </button>
              </p>
            </>
          )}
          {prescindiu && oferta?.desconto && (
            <p>
              {t.semDescontoIndicacao}{" "}
              <button type="button" onClick={() => setPrescindiu(false)} className={LINK}>
                {t.usarDesconto}
              </button>
            </p>
          )}
          {plano === "caso_protecao" && oferta?.novoClienteIndicado && <p>{ti.textos.casoProtecaoSemDesconto}</p>}
          {oferta?.semContaComIndicacao && (
            <p className="font-semibold text-[var(--v2-navy)]">{ti.textos.semConta}</p>
          )}
          {!conversao && !casoExtra && !descontoIndicacao && (
            <p>
              {info.subscricao ? t.codigoSubscricao : t.codigoCompra}
            </p>
          )}
        </div>

        <div className="mb-4 rounded-[14px] bg-[var(--v2-surface)] p-4 text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
          <p className="mb-1 font-semibold">{t.livreResolucao}</p>
          <p>
            <TextoVinculativo idioma={idioma} traducao={tj.resumoLivreResolucao}>
              {RESUMO_LIVRE_RESOLUCAO}
            </TextoVinculativo>
          </p>
          <p className="mt-2">
            <TextoVinculativo idioma={idioma} traducao={tj.comoExercer}>
              {COMO_EXERCER_LIVRE_RESOLUCAO}
            </TextoVinculativo>
          </p>
          <p className="mt-2">
            <Link href={ROTAS_LEGAIS.livreResolucao} target="_blank" className={LINK}>
              {t.informacaoCompleta}
            </Link>{" "}
            ·{" "}
            <Link href={ROTAS_LEGAIS.termos} target="_blank" className={LINK}>
              {t.termos}
            </Link>
          </p>
        </div>

        <p className="mb-5 text-[13.5px] text-[var(--v2-muted)]">
          {rico(t.dados, {
            privacidade: (c) => (
              <Link href={ROTAS_LEGAIS.privacidade} target="_blank" className={LINK}>
                {c}
              </Link>
            ),
          })}
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
            {/* Consentimentos com prova: o texto mostrado e gravado é o português (legal.ts). */}
            <TextoVinculativo idioma={idioma} traducao={tj.aceitacaoTermos}>
              <span>
                {ACEITACAO_TERMOS.antes}
                <Link href={ROTAS_LEGAIS.termos} target="_blank" className={LINK}>
                  {ACEITACAO_TERMOS.ligacao}
                </Link>
                {ACEITACAO_TERMOS.depois}
              </span>
            </TextoVinculativo>
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
            <TextoVinculativo idioma={idioma} traducao={tj.inicioImediato}>
              <span>{inicioImediato.texto}</span>
            </TextoVinculativo>
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
              {t.voltar}
            </button>
            <button
              type="submit"
              disabled={!aceitaTermos || !pedeInicio || aSubmeter}
              className={`${BOTAO_PRIMARIO} flex-1`}
            >
              {aSubmeter ? t.aAbrir : t.continuar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
