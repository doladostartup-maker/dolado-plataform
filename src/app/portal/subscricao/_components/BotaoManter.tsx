"use client";

import { useFormStatus } from "react-dom";
import { BOTAO_PRIMARIO } from "@/components/portal/ui";

export function BotaoManter() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}
    >
      {pending ? "A guardar…" : "Manter subscrição"}
    </button>
  );
}
