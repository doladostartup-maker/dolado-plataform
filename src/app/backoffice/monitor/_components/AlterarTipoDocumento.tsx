"use client";

import { useState } from "react";
import { ROTULO_TIPO_DOCUMENTO, TIPOS_DOCUMENTO, textoConfirmacaoTipo, type TipoDocumento } from "@/lib/monitor/tipoDocumento";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { AJUDA_CAMPO, BOTAO_TERCIARIO, ROTULO } from "@/components/backoffice/ui";
import { alterarTipoDocumento } from "../actions";

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
    <form action={alterarTipoDocumento} className="flex w-full flex-col gap-3 rounded-[12px] border border-[#F2DDB8] bg-[var(--v2-aviso-bg)] p-4 text-[14px]">
      <input type="hidden" name="documento_id" value={documentoId} />
      <label className={`${ROTULO} max-w-xs`}>
        Novo tipo
        <select name="tipo" value={novo} onChange={(e) => setNovo(e.target.value as TipoDocumento)} className={inputClassName}>
          {opcoes.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </select>
      </label>
      <p className="font-semibold text-[var(--v2-navy)]">{textoConfirmacaoTipo(novo)}</p>
      <p className={AJUDA_CAMPO}>O ficheiro do cliente mantém-se. As leituras anteriores e o que delas foi registado neste documento deixam de ser usados.</p>
      <div className="flex flex-wrap gap-2">
        <BotaoSubmeter className={className} aDecorrer="A ler… pode demorar até um minuto">
          Continuar
        </BotaoSubmeter>
        <button type="button" className={BOTAO_TERCIARIO} onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
