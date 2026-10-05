"use client";

import { useFormStatus } from "react-dom";

// Botão de formulário que mostra que a ação está a decorrer e evita cliques
// repetidos (ex.: a leitura de um documento pela Claude API pode demorar até
// um minuto).
export function BotaoSubmeter({
  children,
  aDecorrer = "A guardar…",
  className,
  formAction,
  disabled,
}: {
  children: React.ReactNode;
  aDecorrer?: string;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait`}
    >
      {pending ? aDecorrer : children}
    </button>
  );
}
