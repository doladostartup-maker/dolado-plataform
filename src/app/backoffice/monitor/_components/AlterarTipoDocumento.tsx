"use client";

import { useState } from "react";
import { ROTULO_TIPO_DOCUMENTO, TIPOS_DOCUMENTO, textoConfirmacaoTipo, type TipoDocumento } from "@/lib/monitor/tipoDocumento";
import { alterarTipoDocumento } from "../actions";
import { BotaoAcao } from "./BotaoAcao";

// "Alterar tipo de documento": escolher o tipo novo e confirmar antes de o
// documento ser lido de novo (a leitura pode demorar até um minuto).
export function AlterarTipoDocumento({
  documentoId,
  tipoAtual,
  sugerido,
  className,
  inputClassName,
}: {
  documentoId: string;
  tipoAtual: string;
  sugerido: TipoDocumento | null;
  className: string;
  inputClassName: string;
}) {
  const opcoes = TIPOS_DOCUMENTO.filter((t) => t !== tipoAtual);
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState<TipoDocumento>(sugerido && opcoes.includes(sugerido) ? sugerido : opcoes[0]);

  if (!aberto) {
    return (
      <button type="button" className={className} onClick={() => setAberto(true)}>
        Alterar tipo de documento
      </button>
    );
  }

  return (
    <form action={alterarTipoDocumento} className="flex w-full flex-col gap-3 rounded-[10px] border border-[var(--color-hairline)] p-3 text-sm">
      <input type="hidden" name="documento_id" value={documentoId} />
      <label className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--color-ink-muted)]">Novo tipo</span>
        <select name="tipo" value={novo} onChange={(e) => setNovo(e.target.value as TipoDocumento)} className={inputClassName}>
          {opcoes.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </select>
      </label>
      <p className="font-medium text-[var(--color-ink)]">{textoConfirmacaoTipo(novo)}</p>
      <p className="text-[12.5px] text-[var(--color-ink-faint)]">
        O ficheiro do cliente mantém-se. As leituras anteriores e o que delas foi registado neste documento deixam de ser usados.
      </p>
      <div className="flex flex-wrap gap-2">
        <BotaoAcao className={className} aDecorrer="A ler… pode demorar até um minuto">
          Continuar
        </BotaoAcao>
        <button type="button" className={className} onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
