"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmarCompra } from "@/components/compra/ConfirmarCompra";
import type { ResumoPlano } from "@/lib/acesso";
import {
  IVA_INCLUIDO,
  LIMITE_CASOS_ACUMULADOS,
  PLANOS,
  formatarPreco,
  precoComUnidade,
  textoCasosDisponiveis,
} from "@/lib/planos";
import { MARKETING_SITE_URL } from "@/lib/site";

type OfertaConversao = { mensalidade: number; reembolso: number } | null;

// Escolher uma opção abre a confirmação da compra (ConfirmarCompra); só essa
// envia o identificador do plano à Server Action. O Price ID e o acesso são
// decididos no servidor.
const OPCOES = [
  {
    plano: "protecao",
    descricao:
      "Acompanhamento das suas faturas, avisos antes de datas importantes dos contratos e alertas sobre alterações no seu setor. Não inclui casos.",
    cta: "Aderir à Proteção",
  },
  {
    plano: "caso_protecao",
    descricao: `Tudo o que a Proteção inclui, mais 1 caso por mês (acumulável até ${LIMITE_CASOS_ACUMULADOS}).`,
    cta: "Escolher Caso + Proteção",
  },
] as const;

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}

function nomeDoPlano(resumo: ResumoPlano) {
  return resumo.plano === "sem_plano" ? "Sem subscrição ativa" : PLANOS[resumo.plano].nome;
}

function OSeuPlano({
  resumo,
  pagamentoPendente,
  onEscolherSubscricao,
}: {
  resumo: ResumoPlano;
  pagamentoPendente: boolean;
  onEscolherSubscricao: () => void;
}) {
  const semSubscricao = resumo.plano === "sem_plano";
  const linhas: { label: string; valor: string }[] = [];
  if (!semSubscricao) {
    linhas.push({ label: "Preço", valor: `${precoComUnidade(resumo.plano as "protecao" | "caso_protecao")} (${IVA_INCLUIDO})` });
    if (resumo.estado) linhas.push({ label: "Estado da subscrição", valor: resumo.estado });
    if (resumo.renovacao) linhas.push({ label: "Próxima renovação", valor: formatarData(resumo.renovacao) });
    if (resumo.fimAgendado) linhas.push({ label: "Proteção ativa até", valor: formatarData(resumo.fimAgendado) });
  }
  if (resumo.casosDisponiveis !== null) {
    linhas.push({ label: "Casos disponíveis", valor: textoCasosDisponiveis(resumo.casosDisponiveis) });
  } else if (resumo.plano === "protecao") {
    linhas.push({ label: "Casos disponíveis", valor: "O plano Proteção não inclui casos" });
  }

  return (
    <section
      aria-labelledby="o-seu-plano"
      data-plano={resumo.plano}
      className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-[22px] shadow-[var(--shadow-subtle)]"
    >
      <p id="o-seu-plano" className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
        O seu plano
      </p>
      <p className="mb-3 text-[17px] font-semibold text-[var(--color-ink)]">{nomeDoPlano(resumo)}</p>
      <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
        {linhas.map((l) => (
          <div key={l.label}>
            <dt className="text-[var(--color-ink-muted)]">{l.label}</dt>
            <dd className="font-medium text-[var(--color-ink)]">{l.valor}</dd>
          </div>
        ))}
      </dl>
      {pagamentoPendente && (
        <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">
          Tem um pagamento em confirmação. Não precisa de voltar a pagar.
        </p>
      )}
      {!semSubscricao && (
        <Link
          href="/portal/subscricao"
          className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Gerir subscrição
        </Link>
      )}
      {semSubscricao && !pagamentoPendente && (
        <button
          type="button"
          onClick={onEscolherSubscricao}
          className="mt-4 min-h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Ver subscrições
        </button>
      )}
    </section>
  );
}

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
    slug: "contratos",
    titulo: "🛡️ Os meus serviços",
    descricao: "Carregue uma fatura: acompanhamos a evolução do serviço mês a mês. Com o contrato, verificamos também as condições contratadas.",
    href: "/portal/contratos",
  },
  {
    slug: "sectorial",
    titulo: "📢 Sectorial",
    descricao: "Avisamos quando o seu operador anunciar subida de preços no setor.",
    href: "/portal/perfil",
  },
];

export function PortalDashboard({
  resumo,
  temProtecao,
  temPlanoStripe,
  pagamentoPendente,
  conversaoProtecao,
  conversaoCasoProtecao,
  bloqueadoInicial,
}: {
  /** Calculado no servidor (src/lib/acesso.ts) — aqui só decide o que mostrar. */
  resumo: ResumoPlano;
  temProtecao: boolean;
  temPlanoStripe: boolean;
  pagamentoPendente: boolean;
  /** O que um Avulso pago cobre em cada plano (null = sem conversão). */
  conversaoProtecao: OfertaConversao;
  conversaoCasoProtecao: OfertaConversao;
  bloqueadoInicial?: string;
}) {
  const [modalAberto, setModalAberto] = useState(Boolean(bloqueadoInicial));
  const [aConfirmar, setAConfirmar] = useState<"protecao" | "caso_protecao" | null>(null);

  const assinante = temProtecao;
  // Conta com plano Stripe pode aderir daqui (com conversão do Avulso, se
  // tiver um elegível); sem nenhuma compra vê os planos.
  const podeSubscreverAqui = temPlanoStripe && !pagamentoPendente;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        O seu painel
      </h1>

      {/* Contas sem nenhuma compra não veem este bloco. */}
      {temPlanoStripe && (
        <OSeuPlano
          resumo={resumo}
          pagamentoPendente={pagamentoPendente}
          onEscolherSubscricao={() => setModalAberto(true)}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const activo = card.sempreActivo || assinante;

          const conteudo = (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[14.5px] font-semibold text-[var(--color-ink)]">{card.titulo}</p>
                {!activo && (
                  <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-faint)]">
                    Incluído na Proteção
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
                  ? "Escolha uma subscrição"
                  : "Esta funcionalidade faz parte da Proteção"}
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
                        {PLANOS[opcao.plano].nome} — {precoComUnidade(opcao.plano)}
                      </p>
                      <p className="text-[12px] text-[var(--color-ink-faint)]">{IVA_INCLUIDO}</p>
                      <p className="mb-3 mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                        {opcao.descricao}
                        {conversao && (
                          <>
                            {" "}
                            Utilizamos {formatarPreco(conversao.mensalidade)} do seu pagamento Avulso para
                            cobrir o primeiro mês
                            {conversao.reembolso > 0 && (
                              <>
                                {" "}e reembolsamos os restantes <strong>{formatarPreco(conversao.reembolso)}</strong>{" "}
                                para o método de pagamento original
                              </>
                            )}
                            . A cobrança normal começa no ciclo seguinte.
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setModalAberto(false);
                          setAConfirmar(opcao.plano);
                        }}
                        className="w-full rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
                      >
                        {opcao.cta}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                Os planos Proteção e Caso + Proteção ajudam a identificar situações que possam tornar-se
                num problema: alterações nas suas faturas, datas importantes, como o fim de promoções e de
                períodos de fidelização, e alterações relevantes no seu setor.
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
      {aConfirmar && (
        <ConfirmarCompra
          plano={aConfirmar}
          fluxo="adesao"
          origem="portal"
          conversao={aConfirmar === "protecao" ? conversaoProtecao : conversaoCasoProtecao}
          onFechar={() => setAConfirmar(null)}
        />
      )}
    </div>
  );
}
