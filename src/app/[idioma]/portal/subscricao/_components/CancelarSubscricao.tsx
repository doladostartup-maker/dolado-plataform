"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { MAX_MOTIVO_TEXTO, MOTIVOS_CANCELAMENTO } from "@/lib/gestaoSubscricao";
import { DIAS_CASOS_GUARDADOS, MESES_ALERTAS_GUARDADOS } from "@/lib/acesso";
import { cancelarSubscricao } from "../actions";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAIXA_SELECAO, CAMPO } from "@/components/portal/ui";
import type { Idioma } from "@/i18n/config";
import { tSubscricao } from "@/i18n/mensagens/subscricao";

function BotaoConfirmar({ idioma }: { idioma: Idioma }) {
  const { pending } = useFormStatus();
  const t = tSubscricao[idioma].cancelar;
  return (
    <button type="submit" disabled={pending} className={BOTAO_SECUNDARIO}>
      {pending ? t.aCancelar : t.confirmar}
    </button>
  );
}

/**
 * Dois passos: motivo (opcional — "Continuar" avança sempre, com ou sem
 * resposta) e confirmação. Os campos do 1.º passo ficam no formulário
 * (escondidos) para seguirem com a confirmação.
 */
export function CancelarSubscricao({
  fimTexto,
  mostrarCasosGuardados,
  idioma = "pt-PT",
}: {
  idioma?: Idioma;
  /** Data (já formatada) até à qual a Proteção continua ativa. */
  fimTexto: string | null;
  /** Caso + Proteção com casos disponíveis. */
  mostrarCasosGuardados: boolean;
}) {
  const [passo, setPasso] = useState<"fechado" | "motivo" | "confirmar">("fechado");
  const t = tSubscricao[idioma].cancelar;

  if (passo === "fechado") {
    return (
      <button type="button" onClick={() => setPasso("motivo")} className={BOTAO_SECUNDARIO}>
        {t.cancelar}
      </button>
    );
  }

  return (
    <form
      action={cancelarSubscricao}
      className="flex flex-col gap-4 rounded-[14px] bg-[var(--v2-surface)] p-5"
    >
      <fieldset className={passo === "motivo" ? "flex flex-col gap-3" : "hidden"}>
        <legend className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">
          {t.porque}
        </legend>
        <p className="text-[13px] text-[var(--color-ink-muted)]">{t.opcional}</p>
        {MOTIVOS_CANCELAMENTO.map((m) => (
          <label key={m.codigo} className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--v2-navy)]">
            <input type="radio" name="motivo" value={m.codigo} className={CAIXA_SELECAO} />
            {t.motivos[m.codigo as keyof typeof t.motivos] ?? m.texto}
          </label>
        ))}
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[var(--v2-navy)]">
          {t.comentario}
          <textarea
            name="comentario"
            maxLength={MAX_MOTIVO_TEXTO}
            rows={3}
            className={CAMPO}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPasso("confirmar")} className={BOTAO_SECUNDARIO}>
            {t.continuar}
          </button>
          <button type="button" onClick={() => setPasso("fechado")} className={BOTAO_PRIMARIO}>
            {t.manter}
          </button>
        </div>
      </fieldset>

      {passo === "confirmar" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{t.titulo}</h2>
          <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            {fimTexto ? t.ativaAte(fimTexto) : t.ativaAteFim}
            {t.naoRenovada}
          </p>
          <p className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            {t.alertas(MESES_ALERTAS_GUARDADOS)}
          </p>
          {mostrarCasosGuardados && (
            <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
              {t.casosGuardados(DIAS_CASOS_GUARDADOS)}
            </p>
          )}
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            {t.naoApagados}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPasso("fechado")} className={BOTAO_PRIMARIO}>
              {t.manter}
            </button>
            <BotaoConfirmar idioma={idioma} />
          </div>
        </div>
      )}
    </form>
  );
}
