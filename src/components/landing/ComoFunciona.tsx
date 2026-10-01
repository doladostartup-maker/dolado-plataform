"use client";

import { useCallback, useState } from "react";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { SiteHeader } from "./SiteHeader";

type Ator = "CLIENTE" | "DOLADO";

type Passo = {
  numero: number | "check";
  cor: "brand" | "pending" | "success";
  ator: Ator;
  titulo: string;
  descricao: React.ReactNode;
};

const PASSOS: Passo[] = [
  {
    numero: 1,
    cor: "brand",
    ator: "CLIENTE",
    titulo: "Conte o que aconteceu",
    descricao:
      "Descreva o problema e anexe a fatura ou o contrato. Sem formulários intermináveis — perguntas guiadas, uma de cada vez.",
  },
  {
    numero: 2,
    cor: "brand",
    ator: "DOLADO",
    titulo: "Analisamos o mérito do caso",
    descricao:
      "Verificamos se há fundamento legal e identificamos a legislação aplicável ao seu setor — telecomunicações, energia ou água.",
  },
  {
    numero: 3,
    cor: "brand",
    ator: "DOLADO",
    titulo: "Preparamos a reclamação",
    descricao:
      "Reclamação formal, com a legislação aplicável e o pedido claro. Mostramos-lhe o texto que pretendemos enviar para o Livro de Reclamações antes de qualquer envio.",
  },
  {
    numero: 4,
    cor: "brand",
    ator: "CLIENTE",
    titulo: "Reveja e autorize o envio",
    descricao:
      "Leia o texto com calma e confirme explicitamente se autoriza o envio. Sem a sua confirmação, nada é enviado.",
  },
  {
    numero: 5,
    cor: "brand",
    ator: "DOLADO",
    titulo: "Enviamos para o Livro de Reclamações",
    descricao:
      "Só depois da sua autorização submetemos a reclamação ao Livro de Reclamações em seu nome — esta é a única etapa em que agimos diretamente por si.",
  },
  {
    numero: 6,
    cor: "pending",
    ator: "DOLADO",
    titulo: "Acompanhamos o prazo de resposta",
    descricao:
      "Telecom: 10 dias úteis sem resposta substantiva. Energia e água seguem os prazos regulatórios próprios de cada setor.",
  },
  {
    numero: "check",
    cor: "success",
    ator: "DOLADO",
    titulo: "Acompanhamos até ao fim",
    descricao:
      "Seguimos os passos seguintes e uma eventual escalada, até haver desfecho — correção, reembolso ou resposta formal da empresa.",
  },
];

const CIRCULO_COR: Record<Passo["cor"], string> = {
  brand: "var(--color-brand)",
  pending: "var(--color-status-pending)",
  success: "var(--color-status-success)",
};

const ATOR_ROTULO: Record<Ator, string> = {
  CLIENTE: "O SEU PASSO",
  DOLADO: "A DOLADO",
};

const BADGE_ESTILO: Record<Ator, string> = {
  CLIENTE: "bg-[var(--color-brand-wash)] text-[var(--color-brand)]",
  DOLADO: "bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]",
};

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

export function ComoFunciona() {
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback((origemClique: string) => {
    track(origemClique);
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* ===== Secção 1: Nav ===== */}
      <SiteHeader
        ctaLabel="Tratar o meu caso"
        onCtaClick={() => openForm("click_nav_como_funciona")}
      />

      {/* ===== Secção 2: Hero ===== */}
      <section className="mx-auto max-w-[720px] px-4 pt-16 pb-6 text-center sm:px-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          Como funciona
        </p>
        <h1 className="mb-4 text-[clamp(26px,4.4vw,36px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Do problema à reclamação enviada, passo a passo.
        </h1>
        <p className="mx-auto max-w-[520px] text-[15.5px] leading-relaxed text-[var(--color-ink-muted)]">
          A DoLado prepara a reclamação com a lei do seu lado. Recebe o texto primeiro e só com a
          sua autorização explícita fazemos o envio para o Livro de Reclamações.
        </p>
      </section>

      {/* ===== Secção 3: Timeline ===== */}
      <section className="mx-auto max-w-[760px] px-4 pt-8 sm:px-10">
        <ol>
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-5">
              {/* Coluna esquerda: número + conector */}
              <div className="flex flex-none flex-col items-center" style={{ width: 32 }}>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ backgroundColor: CIRCULO_COR[p.cor] }}
                >
                  {p.numero === "check" ? "✓" : p.numero}
                </span>
                {i < PASSOS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="mt-1 w-0.5 flex-1 bg-[var(--color-hairline-strong)]"
                    style={{ minHeight: 36 }}
                  />
                )}
              </div>

              {/* Coluna direita: conteúdo */}
              <div className={`min-w-0 flex-1 ${i < PASSOS.length - 1 ? "pb-7" : ""}`}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[10.5px] font-semibold ${BADGE_ESTILO[p.ator]}`}
                  >
                    {ATOR_ROTULO[p.ator]}
                  </span>
                </div>
                <p className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">{p.titulo}</p>
                <p className="max-w-[520px] text-[13.5px] leading-[1.55] text-[var(--color-ink-muted)]">
                  {p.descricao}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== Secção 4: Faixa de transparência legal ===== */}
      <section className="px-4 pt-2 pb-14 sm:px-10">
        <div className="mx-auto max-w-[760px] rounded-[8px] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] px-5 py-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
            Nos passos 1 a 4, apenas organizamos factos e citamos a lei — nunca decidimos a sua
            estratégia legal. A submissão ao Livro de Reclamações (passo 5) é a única ação que
            fazemos diretamente em seu nome, e só com autorização explícita.
          </p>
        </div>
      </section>

      {/* ===== Secção 5: CTA final ===== */}
      <section className="flex flex-col items-center border-t border-[var(--color-hairline)] px-4 py-14 text-center sm:px-10">
        <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Pronto para começar?
        </h2>
        <button
          type="button"
          onClick={() => openForm("click_cta_como_funciona")}
          className={`${BOTAO_PRIMARIO} text-[14px] font-semibold`}
        >
          Tratar o meu caso
        </button>
      </section>
    </div>
  );
}
