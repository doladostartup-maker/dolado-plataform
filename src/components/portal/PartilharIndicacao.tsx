"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { useTextos } from "@/i18n/cliente";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO } from "./ui";

/**
 * Link pessoal de indicação com "Copiar link" e "Partilhar". Sem dados de
 * ninguém: só o link opaco da própria conta. "Partilhar" usa a folha de
 * partilha do sistema (telemóvel); sem ela, copia o link.
 */
export function PartilharIndicacao({ url, local }: { url: string; local: string }) {
  const [copiado, setCopiado] = useState(false);
  const ti = useTextos(tIndicacoes);
  const t = ti.partilhar;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem acesso à área de transferência: o link continua visível para copiar à mão.
    }
    track("indicacao_link_copiado", { local });
  }

  async function partilhar() {
    track("indicacao_partilhar", { local });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "DoLado", text: ti.textos.textoPartilha, url });
        return;
      } catch {
        return; // cancelado pelo cliente
      }
    }
    await copiar();
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[var(--v2-muted)]">
        {t.oSeuLink}
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className={`${CAMPO} font-mono text-[14px]`}
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={copiar} className={`${BOTAO_PRIMARIO} sm:flex-1`}>
          {copiado ? t.copiado : t.copiar}
        </button>
        <button type="button" onClick={partilhar} className={`${BOTAO_SECUNDARIO} sm:flex-1`}>
          {t.partilhar}
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copiado ? t.copiadoAnuncio : ""}
      </p>
    </div>
  );
}
