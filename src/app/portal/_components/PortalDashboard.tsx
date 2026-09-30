"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { iniciarUpgradeParaAssinatura, iniciarUpgradeParaProtecao } from "@/app/actions/stripe";
import { MARKETING_SITE_URL } from "@/lib/site";
import { formatarEuros } from "@/lib/stripe/conversao";

type OfertaConversao = { mensalidade: number; reembolso: number } | null;

const OPCOES = [
  {
    plano: "protecao",
    nome: "Proteção",
    preco: "4,99 €/mês",
    descricao: "Alertas, aviso sectorial, comparador de faturas e simulador de elegibilidade.",
    acao: iniciarUpgradeParaProtecao,
  },
  {
    plano: "caso_protecao",
    nome: "Caso + Proteção",
    preco: "7,99 €/mês",
    descricao: "Tudo o que a Proteção inclui, mais 1 caso por mês (acumulável até 4).",
    acao: iniciarUpgradeParaAssinatura,
  },
] as const;

type Card = {
  slug: string;
  titulo: string;
  descricao: string;
  href: string;
  sempreActivo?: boolean;
};

const CARDS: Card[] = [
  {
    slug: "casos",
    titulo: "📋 A sua reclamação",
    descricao: "Abra um novo caso ou acompanhe os que já tem em curso.",
    href: "/portal/casos",
    sempreActivo: true,
  },
  {
    slug: "alertas",
    titulo: "⏰ Fidelização",
    descricao: "Avisamos quando o período de fidelização do seu contrato terminar.",
    href: "/portal/alertas",
  },
  {
    slug: "promocoes",
    titulo: "🏷️ Promoção",
    descricao: "Avisamos antes de uma promoção contratada terminar.",
    href: "/portal/promocoes",
  },
  {
    slug: "sectorial",
    titulo: "📢 Sectorial",
    descricao: "Avisamos quando o seu operador anunciar subida de preços no setor.",
    href: "/portal/perfil",
  },
  {
    slug: "faturas",
    titulo: "📊 Faturas",
    descricao: "Compare a fatura com o mês anterior e detete cobranças fora do padrão.",
    href: "/portal/faturas",
  },
  {
    slug: "elegibilidade",
    titulo: "🧑‍🤝‍🧑 Elegibilidade",
    descricao: "Veja em poucas perguntas se o seu caso parece ter fundamento.",
    href: "/portal/elegibilidade",
  },
];

export function PortalDashboard({
  temProtecao,
  temPlanoStripe,
  pagamentoPendente,
  conversaoProtecao,
  conversaoCasoProtecao,
  bloqueadoInicial,
}: {
  /** Calculado no servidor (src/lib/acesso.ts) — aqui só decide o que mostrar. */
  temProtecao: boolean;
  temPlanoStripe: boolean;
  pagamentoPendente: boolean;
  /** O que um Avulso pago cobre em cada plano (null = sem conversão). */
  conversaoProtecao: OfertaConversao;
  conversaoCasoProtecao: OfertaConversao;
  bloqueadoInicial?: string;
}) {
  const [modalAberto, setModalAberto] = useState(Boolean(bloqueadoInicial));
  const [aSubscrever, iniciarSubscricao] = useTransition();

  const assinante = temProtecao;
  // Conta com plano Stripe pode aderir daqui (com conversão do Avulso, se
  // tiver um elegível); sem plano (Remax / registo livre) vê os planos.
  const podeSubscreverAqui = temPlanoStripe && !pagamentoPendente;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        O seu painel
      </h1>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const activo = card.sempreActivo || assinante;

          const conteudo = (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[14.5px] font-semibold text-[var(--color-ink)]">{card.titulo}</p>
                {!activo && (
                  <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-faint)]">
                    Somente Assinantes
                  </span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {card.descricao}
              </p>
            </>
          );

          const className = `rounded-[var(--radius-card)] border p-[22px] text-left transition ${
            activo
              ? "border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)] hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-md)]"
              : "border-[var(--color-hairline)] bg-[var(--color-surface)] opacity-50 hover:opacity-70"
          }`;

          if (activo) {
            return (
              <Link key={card.slug} href={card.href} className={className}>
                {conteudo}
              </Link>
            );
          }

          return (
            <button
              key={card.slug}
              type="button"
              onClick={() => setModalAberto(true)}
              className={className}
            >
              {conteudo}
            </button>
          );
        })}
      </div>

      {!assinante && modalAberto && (
        <div
          onClick={() => setModalAberto(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(23,26,33,0.42)] px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[460px] rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-md)]"
          >
            <h2 className="mb-3 text-[17px] font-semibold text-[var(--color-ink)]">
              {pagamentoPendente
                ? "O seu pagamento está em confirmação"
                : podeSubscreverAqui
                  ? "Escolha uma assinatura"
                  : "Esta funcionalidade é exclusiva de assinantes"}
            </h2>

            {pagamentoPendente ? (
              <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                Assim que o pagamento for confirmado, o acesso é ativado automaticamente. Não precisa
                de voltar a pagar.
              </p>
            ) : podeSubscreverAqui ? (
              <div className="mb-5 flex flex-col gap-3">
                {OPCOES.map((opcao) => {
                  const conversao = opcao.plano === "protecao" ? conversaoProtecao : conversaoCasoProtecao;
                  return (
                    <div
                      key={opcao.plano}
                      className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] p-4"
                    >
                      <p className="text-[14px] font-semibold text-[var(--color-ink)]">
                        {opcao.nome} — {opcao.preco}
                      </p>
                      <p className="mb-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                        {opcao.descricao}
                        {conversao && (
                          <>
                            {" "}
                            O primeiro mês fica coberto pelo seu pagamento Avulso
                            {conversao.reembolso > 0 && (
                              <>
                                {" "}e reembolsamos <strong>{formatarEuros(conversao.reembolso)}</strong> para o
                                método de pagamento original
                              </>
                            )}
                            . A mensalidade normal começa no mês seguinte.
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        disabled={aSubscrever}
                        onClick={() => iniciarSubscricao(() => opcao.acao())}
                        className="w-full rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
                      >
                        {aSubscrever ? "A abrir…" : `Aderir ao plano ${opcao.nome}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                Assine para desbloquear alertas, comparador de faturas e simulador de elegibilidade.
              </p>
            )}

            <div className="flex gap-3">
              {!pagamentoPendente && !podeSubscreverAqui && (
                <Link
                  href={`${MARKETING_SITE_URL}/#precario`}
                  className="flex-1 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
                >
                  Ver planos
                </Link>
              )}
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex-1 rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
              >
                {pagamentoPendente || podeSubscreverAqui ? "Fechar" : "Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
