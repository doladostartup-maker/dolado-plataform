"use client";

import { useFormStatus } from "react-dom";

// Botão de formulário: fica desativado enquanto a ação decorre (evita
// cliques repetidos) e mostra o que está a acontecer.
export function BotaoSubmeter({
  children,
  aDecorrer = "A guardar…",
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  aDecorrer?: string;
  className: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? aDecorrer : children}
    </button>
  );
}
