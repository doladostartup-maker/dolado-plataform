"use client";

import { useCallback, useEffect, useState } from "react";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { FormularioGuiado } from "./FormularioGuiado";
import { SiteHeader } from "./SiteHeader";

type Ator = "VOCÊ" | "DOLADO";

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
    ator: "VOCÊ",
    titulo: "Conta o que aconteceu",
    descricao:
      "Descreve o problema e anexa a fatura ou o contrato. Sem formulários intermináveis — perguntas guiadas, uma de cada vez.",
  },
  {
    numero: 2,
    cor: "brand",
    ator: "DOLADO",
    titulo: "Analisamos o mérito do caso",
    descricao:
      "Verificamos se há fundamento legal e identificamos o artigo de lei aplicável ao seu setor — Telecom, Energia ou Água & Resíduos.",
  },
  {
    numero: 3,
    cor: "brand",
    ator: "DOLADO",
    titulo: "Recebe a carta pronta",
    descricao:
      "Carta formal, com a lei citada e o pedido claro — já no seu e-mail, pronta a copiar e enviar.",
  },
  {
    numero: 4,
    cor: "brand",
    ator: "VOCÊ",
    titulo: "Envia e coloca-nos em cópia",
    descricao: (
      <>
        Envia a carta a partir do seu próprio e-mail para a empresa, com{" "}
        <span className="font-medium text-[var(--color-ink)]">reclamacoes@dolado.pt</span> em
        CC — para haver prova de envio e vermos a resposta assim que chegar.
      </>
    ),
  },
  {
    numero: 5,
    cor: "pending",
    ator: "DOLADO",
    titulo: "Acompanhamos o prazo de resposta",
    descricao:
      "Telecom: 10 dias úteis sem resposta substantiva. Energia e Água & Resíduos seguem os prazos regulatórios próprios do setor.",
  },
  {
    numero: 6,
    cor: "brand",
    ator: "DOLADO",
    titulo: "Sem resposta útil, escalamos por si",
    descricao:
      "Submetemos ao Livro de Reclamações em seu nome — esta é a única etapa em que agimos diretamente por si, sempre com a sua autorização prévia.",
  },
  {
    numero: "check",
    cor: "success",
    ator: "DOLADO",
    titulo: "Acompanhamos até ao fim",
    descricao: "Seguimos o caso até haver desfecho — correção, reembolso ou resposta formal da empresa.",
  },
];

const CIRCULO_COR: Record<Passo["cor"], string> = {
  brand: "var(--color-brand)",
  pending: "var(--color-status-pending)",
  success: "var(--color-status-success)",
};

const BADGE_ESTILO: Record<Ator, string> = {
  VOCÊ: "bg-[var(--color-brand-wash)] text-[var(--color-brand)]",
  DOLADO: "bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]",
};

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

export function ComoFunciona() {
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback((origemClique: string) => {
    track(origemClique);
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, closeForm]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* ===== Secção 1: Nav ===== */}
      <SiteHeader
        ctaLabel="Escrever a minha reclamação"
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
          A DoLado escreve a carta com a lei do seu lado. Você envia-a a partir do seu próprio
          e-mail — assim há sempre prova de envio e visibilidade da resposta.
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
                    {p.ator}
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
            Nos passos 1 a 5, apenas organizamos factos e citamos a lei — nunca decidimos a sua
            estratégia legal. A submissão ao Livro de Reclamações (passo 6) é a única ação que
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
          Escrever a minha reclamação
        </button>
      </section>

      {/* Modal do formulário */}
      {formOpen && (
        <div
          onClick={closeForm}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(23,26,33,0.42)] px-4 py-8 sm:px-8"
        >
          <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-[640px] flex-none">
            <FormularioGuiado onClose={closeForm} onSuccess={trackFormSuccess} origem={origem} />
          </div>
        </div>
      )}
    </div>
  );
}
