"use client";

import { useFormStatus } from "react-dom";

// Botão de formulário que mostra que a ação está a decorrer (a leitura de um
// documento pela Claude API pode demorar até um minuto) e evita cliques
// repetidos.
export function BotaoAcao({ children, aDecorrer, className }: { children: React.ReactNode; aDecorrer: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? aDecorrer : children}
    </button>
  );
}
