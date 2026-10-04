"use client";

import { useId, useState } from "react";

export type Pergunta = {
  id: string;
  pergunta: string;
  resposta: React.ReactNode;
};

// Estilos por linguagem visual: "v1" (site atual) e "v2" (Design System V2,
// dentro de PaginaV2 — FAQAccordionV2). O comportamento é o mesmo.
const ESTILOS = {
  v1: {
    lista: "border-t border-[var(--color-hairline)]",
    item: "border-b border-[var(--color-hairline)]",
    botao:
      "flex w-full items-center justify-between gap-4 rounded-[var(--radius-input)] py-4 text-left text-[15px] font-semibold leading-snug text-[var(--color-ink)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
    sinal: "flex-none text-[20px] font-normal leading-none text-[var(--color-brand)]",
    resposta: "pb-5 pr-0 text-[14px] leading-relaxed text-[var(--color-ink-muted)] sm:pr-10",
  },
  v2: {
    lista: "border-t border-[var(--v2-line)]",
    item: "border-b border-[var(--v2-line)]",
    botao:
      "flex min-h-14 w-full items-center justify-between gap-4 rounded-[8px] py-5 text-left text-[17px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)] hover:text-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]",
    sinal: "flex-none text-[24px] font-normal leading-none text-[var(--v2-green)]",
    resposta: "pb-6 pr-0 text-[15.5px] leading-[1.65] text-[var(--v2-muted)] sm:pr-12",
  },
} as const;

// Accordion acessível: cada pergunta é um <button> dentro de um heading, com
// aria-expanded/aria-controls a apontar para o painel da resposta. Várias
// respostas podem estar abertas ao mesmo tempo.
export function AccordionPerguntas({
  perguntas,
  nivelTitulo = 3,
  variante = "v1",
}: {
  perguntas: Pergunta[];
  nivelTitulo?: 2 | 3 | 4;
  variante?: keyof typeof ESTILOS;
}) {
  const estilos = ESTILOS[variante];
  const base = useId();
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set());
  const Titulo = `h${nivelTitulo}` as const;

  const alternar = (id: string) =>
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });

  return (
    <div className={estilos.lista}>
      {perguntas.map((p) => {
        const aberta = abertas.has(p.id);
        const botaoId = `${base}-${p.id}-pergunta`;
        const painelId = `${base}-${p.id}-resposta`;
        return (
          <div key={p.id} className={estilos.item}>
            <Titulo className="m-0">
              <button
                id={botaoId}
                type="button"
                onClick={() => alternar(p.id)}
                aria-expanded={aberta}
                aria-controls={painelId}
                className={estilos.botao}
              >
                <span>{p.pergunta}</span>
                <span aria-hidden="true" className={estilos.sinal}>
                  {aberta ? "−" : "+"}
                </span>
              </button>
            </Titulo>
            <div
              id={painelId}
              role="region"
              aria-labelledby={botaoId}
              hidden={!aberta}
              className={estilos.resposta}
            >
              {p.resposta}
            </div>
          </div>
        );
      })}
    </div>
  );
}
