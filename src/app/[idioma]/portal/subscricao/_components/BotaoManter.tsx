"use client";

import { useFormStatus } from "react-dom";
import { BOTAO_PRIMARIO } from "@/components/portal/ui";
import { useTextos } from "@/i18n/cliente";
import { tSubscricao } from "@/i18n/mensagens/subscricao";

export function BotaoManter() {
  const { pending } = useFormStatus();
  const t = useTextos(tSubscricao).cancelar;
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}
    >
      {pending ? t.aGuardar : t.manter}
    </button>
  );
}
