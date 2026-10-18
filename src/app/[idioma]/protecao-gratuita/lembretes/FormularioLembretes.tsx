"use client";

import { useActionState } from "react";
import { useIdioma } from "@/i18n/cliente";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO } from "@/components/portal/ui";
import { deixarDeReceberLembretes, type EstadoLembretes } from "./actions";

export function FormularioLembretes({ id, token }: { id: string; token: string }) {
  const t = tProtecaoGratuita[useIdioma()].lembretes;
  const [estado, submeter, aSubmeter] = useActionState<EstadoLembretes, FormData>(deixarDeReceberLembretes, {
    feito: false,
    invalida: false,
  });
  if (estado.feito) return <Aviso tom="sucesso">{t.feito}</Aviso>;
  return (
    <form action={submeter} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={token} />
      {estado.invalida && <Aviso tom="erro">{t.invalida}</Aviso>}
      <button type="submit" disabled={aSubmeter} className={`${BOTAO_PRIMARIO} w-full`}>
        {t.botao}
      </button>
    </form>
  );
}
