"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { confirmarCompra, type EstadoCompra } from "@/app/actions/stripe";
import {
  CAMPO_ACEITA_TERMOS,
  CAMPO_INICIO_IMEDIATO,
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
import { IVA_INCLUIDO, PLANOS, formatarPreco, type PlanoId } from "@/lib/planos";

export type OfertaConversao = { mensalidade: number; reembolso: number } | null;

const LINK = "font-medium text-[var(--color-brand)] underline";

/**
 * Passo obrigatório antes do Stripe Checkout, comum a todos os pontos de
 * compra. Informação comercial de src/lib/planos.ts e textos legais de
 * src/lib/legal.ts — nada escrito à mão aqui. As checkboxes começam
 * desmarcadas e o servidor (confirmarCompra) volta a validá-las.
 * A Política de Privacidade é só disponibilizada (ligação), nunca uma
 * checkbox de aceitação.
 */
export function ConfirmarCompra({
  plano,
  fluxo,
  origem,
  conversao = null,
  onFechar,
}: {
  plano: PlanoId;
  fluxo: FluxoCompra;
  origem: OrigemCompra;
  /** Conversão de um Avulso elegível na 1.ª mensalidade (só no portal). */
  conversao?: OfertaConversao;
  onFechar: () => void;
}) {
  const [estado, submeter, aSubmeter] = useActionState<EstadoCompra, FormData>(confirmarCompra, { erro: null });
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [pedeInicio, setPedeInicio] = useState(false);
  const info = PLANOS[plano];
  const inicioImediato = consentimentoInicioImediato(plano);

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(23,26,33,0.42)] px-4 py-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-compra-titulo"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-[var(--radius-card)] bg-white p-6 text-left shadow-[var(--shadow-md)]"
      >
        <h2 id="confirmar-compra-titulo" className="mb-4 text-[17px] font-semibold text-[var(--color-ink)]">
          Confirmar compra
        </h2>

        <div className="mb-4 rounded-[var(--radius-input)] border border-[var(--color-hairline)] p-4">
          <p className="text-[15px] font-semibold text-[var(--color-ink)]">{info.nome}</p>
          <p className="text-[14px] text-[var(--color-ink)]">
            {formatarPreco(info.precoCentimos)}
            {info.subscricao ? " por mês" : " — pagamento único"} ({IVA_INCLUIDO})
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
            {info.subscricao
              ? "Subscrição mensal com renovação automática todos os meses, até a cancelar."
              : "Pagamento único, sem renovação."}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{info.descricaoCurta}</p>
        </div>

        <div className="mb-4 flex flex-col gap-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
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
          {!conversao && (
            <p>
              {info.subscricao
                ? "Se tiver um código promocional, pode aplicá-lo no passo de pagamento. Mesmo com desconto ou com valor de 0 €, a subscrição renova-se todos os meses, ao preço do plano ou nas condições do código aplicado, até a cancelar."
                : "Se tiver um código promocional, pode aplicá-lo no passo de pagamento."}
            </p>
          )}
        </div>

        <div className="mb-4 rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)] p-4 text-[13px] leading-relaxed text-[var(--color-ink)]">
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

        <p className="mb-4 text-[13px] text-[var(--color-ink-muted)]">
          Para saber como tratamos os seus dados, consulte a{" "}
          <Link href={ROTAS_LEGAIS.privacidade} target="_blank" className={LINK}>
            Política de Privacidade
          </Link>
          .
        </p>

        <form action={submeter} className="flex flex-col gap-3">
          <input type="hidden" name="plano" value={plano} />
          <input type="hidden" name="fluxo" value={fluxo} />
          <input type="hidden" name="origem" value={origem} />

          <label className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            <input
              type="checkbox"
              name={CAMPO_ACEITA_TERMOS}
              value={VALOR_ACEITE}
              required
              checked={aceitaTermos}
              onChange={(e) => setAceitaTermos(e.target.checked)}
              className="mt-1"
            />
            <span>
              {ACEITACAO_TERMOS.antes}
              <Link href={ROTAS_LEGAIS.termos} target="_blank" className={LINK}>
                {ACEITACAO_TERMOS.ligacao}
              </Link>
              {ACEITACAO_TERMOS.depois}
            </span>
          </label>

          <label className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            <input
              type="checkbox"
              name={CAMPO_INICIO_IMEDIATO}
              value={VALOR_ACEITE}
              required
              checked={pedeInicio}
              onChange={(e) => setPedeInicio(e.target.checked)}
              className="mt-1"
            />
            <span>{inicioImediato.texto}</span>
          </label>

          {estado.erro && (
            <p role="alert" className="text-[13px] font-medium text-[var(--color-status-danger)]">
              {estado.erro}
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onFechar}
              className="min-h-11 flex-1 rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={!aceitaTermos || !pedeInicio || aSubmeter}
              className="min-h-11 flex-1 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {aSubmeter ? "A abrir pagamento…" : "Continuar para pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
