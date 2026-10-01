"use client";

import { useFormStatus } from "react-dom";

export function BotaoManter() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
    >
      {pending ? "A guardar…" : "Manter subscrição"}
    </button>
  );
}
