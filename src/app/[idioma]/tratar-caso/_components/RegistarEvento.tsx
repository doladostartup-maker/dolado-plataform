"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/** Envia um evento de medição uma única vez quando a página é mostrada. */
export function RegistarEvento({ nome, parametros }: { nome: string; parametros?: Record<string, string> }) {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    track(nome, parametros);
  }, [nome, parametros]);
  return null;
}
