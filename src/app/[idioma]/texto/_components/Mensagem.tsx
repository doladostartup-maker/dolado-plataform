"use client";

import { useIdioma } from "@/i18n/cliente";
import { tTexto } from "@/i18n/mensagens/texto";
import type { ResultadoAcaoTexto } from "@/lib/textoCaso";

import { formatarDataHora } from "./data";

export function MensagemTexto({ resultado, autorizadoEm }: { resultado: ResultadoAcaoTexto; autorizadoEm?: string | null }) {
  const idioma = useIdioma();
  const t = tTexto[idioma];
  const m = t.mensagens[resultado];
  const sucesso = resultado === "autorizado" || resultado === "pedido_registado" || resultado === "ja_autorizado";
  return (
    <div
      role="status"
      className={`rounded-[14px] border px-4 py-3.5 ${
        sucesso ? "border-[#CDE9D9] bg-[var(--v2-mint-bg)]" : "border-[var(--v2-line)] bg-[var(--v2-surface)]"
      }`}
    >
      <p className="mb-1 text-[15px] font-semibold text-[var(--v2-navy)]">{m.titulo}</p>
      <p className="text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        {resultado === "ja_autorizado" && autorizadoEm ? t.jaAutorizadoEm(formatarDataHora(autorizadoEm, idioma)) : m.texto}
      </p>
    </div>
  );
}

/** Texto integral, como texto simples (nunca HTML). Nunca traduzido: é o texto da reclamação, em português. */
export function TextoIntegral({ conteudo }: { conteudo: string }) {
  const idioma = useIdioma();
  const aviso = tTexto[idioma].emPortugues;
  return (
    <div className="flex flex-col gap-2">
      {aviso && <p className="text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{aviso}</p>}
      <div
        lang="pt-PT"
        className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-[14px] border border-[var(--v2-line)] bg-white p-5 text-[15px] leading-relaxed text-[var(--v2-navy)]"
      >
        {conteudo}
      </div>
    </div>
  );
}
