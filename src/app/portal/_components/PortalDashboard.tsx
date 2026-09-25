"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { iniciarUpgradeParaAssinatura } from "@/app/actions/stripe";
import type { NivelAcesso } from "@/lib/auth";
import { MARKETING_SITE_URL } from "@/lib/site";

// Mantido igual ao preçário da homepage (src/components/landing/Homepage.tsx)
const PRECO_ASSINATURA = "7,99 €/mês";

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
  nivelAcesso,
  valorAvulsoCentimos,
  bloqueadoInicial,
}: {
  nivelAcesso: NivelAcesso;
  valorAvulsoCentimos: number | null;
  bloqueadoInicial?: string;
}) {
  const [modalAberto, setModalAberto] = useState(Boolean(bloqueadoInicial));
  const [aSubscrever, iniciarSubscricao] = useTransition();

  const assinante = nivelAcesso === "assinatura";
  const valorAvulso =
    valorAvulsoCentimos != null ? (valorAvulsoCentimos / 100).toFixed(2).replace(".", ",") : null;

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
            className="w-full max-w-[420px] rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-md)]"
          >
            <h2 className="mb-3 text-[17px] font-semibold text-[var(--color-ink)]">
              {nivelAcesso === "avulso"
                ? "Quer mudar para a Assinatura Mensal?"
                : "Esta funcionalidade é exclusiva de assinantes"}
            </h2>
            <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
              {nivelAcesso === "avulso" ? (
                <>
                  A Assinatura Mensal custa <strong>{PRECO_ASSINATURA}</strong> e desbloqueia
                  esta e todas as outras funcionalidades.
                  {valorAvulso && (
                    <>
                      {" "}
                      Já pagou <strong>{valorAvulso} €</strong> pela sua reclamação avulsa — esse
                      valor fica creditado automaticamente e é descontado da primeira
                      mensalidade.
                    </>
                  )}
                </>
              ) : (
                "Assine para desbloquear alertas, comparador de faturas e simulador de elegibilidade."
              )}
            </p>
            <div className="flex gap-3">
              {nivelAcesso === "avulso" ? (
                <button
                  type="button"
                  disabled={aSubscrever}
                  onClick={() => iniciarSubscricao(() => iniciarUpgradeParaAssinatura())}
                  className="flex-1 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
                >
                  {aSubscrever ? "A abrir…" : `Confirmar e subscrever por ${PRECO_ASSINATURA}`}
                </button>
              ) : (
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
                className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
