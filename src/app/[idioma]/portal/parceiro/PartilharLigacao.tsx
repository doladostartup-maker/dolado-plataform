"use client";

import { useState } from "react";
import { useTextos } from "@/i18n/cliente";
import { tAreaParceiro } from "@/i18n/mensagens/areaParceiro";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO } from "@/components/portal/ui";

/**
 * Ligação do parceiro com "Copiar" e "Partilhar" (folha de partilha do
 * telemóvel; sem ela, copia). Sem medição: o portal não tem consentimento.
 */
export function PartilharLigacao({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  const t = useTextos(tIndicacoes).partilhar;
  const ta = useTextos(tAreaParceiro).ligacao;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem acesso à área de transferência: a ligação continua visível para copiar à mão.
    }
  }

  async function partilhar() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "DoLado", text: ta.textoPartilha, url });
      } catch {
        // cancelado
      }
      return;
    }
    await copiar();
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        readOnly
        value={url}
        aria-label={ta.titulo}
        onFocus={(e) => e.currentTarget.select()}
        className={`${CAMPO} font-mono text-[15px]`}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={copiar} className={`${BOTAO_PRIMARIO} sm:flex-1`} aria-live="polite">
          {copiado ? t.copiado : t.copiar}
        </button>
        <button type="button" onClick={partilhar} className={`${BOTAO_SECUNDARIO} sm:flex-1`}>
          {t.partilhar}
        </button>
      </div>
    </div>
  );
}
