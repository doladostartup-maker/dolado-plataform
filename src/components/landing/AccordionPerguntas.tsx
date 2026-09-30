"use client";

import { useId, useState } from "react";

export type Pergunta = {
  id: string;
  pergunta: string;
  resposta: React.ReactNode;
};

// Accordion acessível: cada pergunta é um <button> dentro de um heading, com
// aria-expanded/aria-controls a apontar para o painel da resposta. Várias
// respostas podem estar abertas ao mesmo tempo.
export function AccordionPerguntas({
  perguntas,
  nivelTitulo = 3,
}: {
  perguntas: Pergunta[];
  nivelTitulo?: 2 | 3 | 4;
}) {
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
    <div className="border-t border-[var(--color-hairline)]">
      {perguntas.map((p) => {
        const aberta = abertas.has(p.id);
        const botaoId = `${base}-${p.id}-pergunta`;
        const painelId = `${base}-${p.id}-resposta`;
        return (
          <div key={p.id} className="border-b border-[var(--color-hairline)]">
            <Titulo className="m-0">
              <button
                id={botaoId}
                type="button"
                onClick={() => alternar(p.id)}
                aria-expanded={aberta}
                aria-controls={painelId}
                className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-input)] py-4 text-left text-[15px] font-semibold leading-snug text-[var(--color-ink)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                <span>{p.pergunta}</span>
                <span
                  aria-hidden="true"
                  className="flex-none text-[20px] font-normal leading-none text-[var(--color-brand)]"
                >
                  {aberta ? "−" : "+"}
                </span>
              </button>
            </Titulo>
            <div
              id={painelId}
              role="region"
              aria-labelledby={botaoId}
              hidden={!aberta}
              className="pb-5 pr-0 text-[14px] leading-relaxed text-[var(--color-ink-muted)] sm:pr-10"
            >
              {p.resposta}
            </div>
          </div>
        );
      })}
    </div>
  );
}
