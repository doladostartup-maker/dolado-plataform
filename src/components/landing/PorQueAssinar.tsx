"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AlertaFidelizacaoForm } from "./AlertaFidelizacaoForm";
import { SiteHeader } from "./SiteHeader";

type Linha = {
  label: string;
  sozinho: string;
  dolado: React.ReactNode;
  deco: React.ReactNode;
  ultima?: boolean;
};

const LINHAS: Linha[] = [
  {
    label: "Custo",
    sozinho: "Grátis (só o seu tempo)",
    dolado: (
      <>
        Alerta grátis · reclamação avulsa por caso ou assinatura{" "}
        <span className="font-normal italic">(valores a definir)</span>
      </>
    ),
    deco: (
      <>
        Quota anual <span className="italic">(valor a confirmar)</span>
      </>
    ),
  },
  {
    label: "Aviso de fim de fidelização",
    sozinho: "Tem de guardar a data você mesmo",
    dolado: "Avisamos automaticamente",
    deco: <span className="italic text-[var(--color-ink-faint)]">Não é o foco</span>,
  },
  {
    label: "Identifica a lei aplicável ao caso",
    sozinho: "Tem de pesquisar sozinho",
    dolado: "Específico ao seu caso",
    deco: "Aconselhamento geral",
  },
  {
    label: "Carta formal pronta a enviar",
    sozinho: "Escreve do zero",
    dolado: "Gerada em minutos",
    deco: "Modelos genéricos",
  },
  {
    label: "Escala ao Livro de Reclamações",
    sozinho: "Tem de submeter sozinho",
    dolado: "Fazemos por si, com autorização",
    deco: "Aconselha, não submete",
  },
  {
    label: "Foco em Telecom / Energia / Água",
    sozinho: "Nenhum",
    dolado: "Especialização total nestes 3 setores",
    deco: "Cobertura generalista",
    ultima: true,
  },
];

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

export function PorQueAssinar() {
  const [formOpen, setFormOpen] = useState(false);

  const openForm = useCallback(() => setFormOpen(true), []);
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
      <SiteHeader ctaLabel="Subscrever grátis" onCtaClick={openForm} />

      {/* ===== Secção 2: Hero ===== */}
      <section className="mx-auto max-w-[760px] px-4 pt-16 pb-10 text-center sm:px-10 sm:pt-[72px]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          Por quê assinar
        </p>
        <h1 className="mb-5 text-[clamp(26px,4.6vw,38px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Saiba antes de a sua fidelização acabar — e tenha a lei do seu lado quando precisar.
        </h1>
        <p className="mx-auto max-w-[560px] text-base leading-relaxed text-[var(--color-ink-muted)]">
          Subscrever é grátis: avisamos-lhe quando o período de fidelização do seu contrato de
          telecom, energia ou água terminar, para poder negociar ou mudar sem penalização. E se
          surgir um problema entretanto, já nos conhece.
        </p>
      </section>

      {/* ===== Secção 3: Tabela comparativa ===== */}
      <section className="px-4 pt-6 pb-4 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
          {/* Tabela — desktop/tablet */}
          <table className="hidden w-full table-fixed overflow-hidden rounded-[12px] border-collapse bg-[var(--color-surface)] shadow-[var(--shadow-subtle)] sm:table">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-[34%] border-b border-[var(--color-hairline)] bg-[var(--color-surface)] px-5 py-4 text-left text-[12.5px] font-semibold text-[var(--color-ink-faint)]"
                />
                <th
                  scope="col"
                  className="border-b border-[var(--color-hairline)] bg-[var(--color-surface)] px-5 py-4 text-left text-[13px] font-semibold text-[var(--color-ink)]"
                >
                  Sozinho
                </th>
                <th
                  scope="col"
                  className="border-b-2 border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-left text-[13px] font-bold text-[var(--color-brand)]"
                >
                  DoLado
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--color-hairline)] bg-[var(--color-surface)] px-5 py-4 text-left text-[13px] font-semibold text-[var(--color-ink)]"
                >
                  DECO Proteste
                </th>
              </tr>
            </thead>
            <tbody>
              {LINHAS.map((linha) => (
                <tr key={linha.label}>
                  <th
                    scope="row"
                    className={`px-5 py-3.5 text-left text-[13px] font-medium text-[var(--color-ink)] ${
                      linha.ultima ? "" : "border-b border-[var(--color-hairline)]"
                    }`}
                  >
                    {linha.label}
                  </th>
                  <td
                    className={`bg-[var(--color-surface)] px-5 py-3.5 text-[13px] text-[var(--color-ink-muted)] ${
                      linha.ultima ? "" : "border-b border-[var(--color-hairline)]"
                    }`}
                  >
                    {linha.sozinho}
                  </td>
                  <td
                    className={`bg-[var(--color-brand-wash)] px-5 py-3.5 text-[13px] font-medium text-[var(--color-ink)] ${
                      linha.ultima ? "" : "border-b border-[var(--color-hairline)]"
                    }`}
                  >
                    <span className="font-bold text-[var(--color-brand)]">✓</span> {linha.dolado}
                  </td>
                  <td
                    className={`bg-[var(--color-surface)] px-5 py-3.5 text-[13px] text-[var(--color-ink-faint)] ${
                      linha.ultima ? "" : "border-b border-[var(--color-hairline)]"
                    }`}
                  >
                    {linha.deco}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tabela — mobile (cards empilhados) */}
          <div className="flex flex-col gap-4 sm:hidden">
            {LINHAS.map((linha) => (
              <div
                key={linha.label}
                className="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-subtle)]"
              >
                <p className="mb-3 text-[13px] font-semibold text-[var(--color-ink)]">{linha.label}</p>
                <dl className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[12px] font-semibold text-[var(--color-ink-faint)]">Sozinho</dt>
                    <dd className="max-w-[62%] text-right text-[12.5px] text-[var(--color-ink-muted)]">
                      {linha.sozinho}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-[8px] bg-[var(--color-brand-wash)] px-2.5 py-1.5">
                    <dt className="text-[12px] font-bold text-[var(--color-brand)]">DoLado</dt>
                    <dd className="max-w-[62%] text-right text-[12.5px] font-medium text-[var(--color-ink)]">
                      <span className="font-bold text-[var(--color-brand)]">✓</span> {linha.dolado}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[12px] font-semibold text-[var(--color-ink-faint)]">DECO Proteste</dt>
                    <dd className="max-w-[62%] text-right text-[12.5px] text-[var(--color-ink-faint)]">
                      {linha.deco}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-2.5 text-[11.5px] leading-[1.5] text-[var(--color-ink-faint)]">
            Comparação ilustrativa para efeitos de mockup — serviços e valores da DECO Proteste a
            confirmar antes de qualquer publicação real.
          </p>
        </div>
      </section>

      {/* ===== Secção 4: CTA final ===== */}
      <section className="flex flex-col items-center px-4 py-14 pb-[72px] text-center sm:px-10">
        <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Sabe quando acaba a sua fidelização?
        </h2>
        <button type="button" onClick={openForm} className={`${BOTAO_PRIMARIO} text-[14px] font-semibold`}>
          Subscrever o alerta, grátis
        </button>
      </section>

      {/* Modal do alerta de fim de fidelização */}
      {formOpen && (
        <div
          onClick={closeForm}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(23,26,33,0.42)] px-4 py-8 sm:px-8"
        >
          <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-[480px] flex-none">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-[12px] bg-white px-5 py-3 shadow-[var(--shadow-subtle)]">
              <div className="flex items-center gap-2">
                <Image src="/brand/dolado-logo-icon.svg" alt="" width={24} height={24} />
                <span className="text-[14px] font-bold tracking-tight">
                  <span className="text-[var(--color-ink)]">Do</span>
                  <span className="text-[var(--color-brand)]">Lado</span>
                </span>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Fechar"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius-input)] text-lg text-[var(--color-ink-muted)]"
              >
                ×
              </button>
            </div>
            <AlertaFidelizacaoForm />
          </div>
        </div>
      )}
    </div>
  );
}
