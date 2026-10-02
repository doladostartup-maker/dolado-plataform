"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { MAX_MOTIVO_TEXTO, MOTIVOS_CANCELAMENTO } from "@/lib/gestaoSubscricao";
import { DIAS_CASOS_GUARDADOS, MESES_ALERTAS_GUARDADOS } from "@/lib/acesso";
import { cancelarSubscricao } from "../actions";

const BOTAO_PRIMARIO =
  "min-h-11 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";
const BOTAO_SECUNDARIO =
  "min-h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] disabled:opacity-60";

function BotaoConfirmar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BOTAO_SECUNDARIO}>
      {pending ? "A cancelar…" : "Confirmar cancelamento"}
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
}: {
  /** Data (já formatada) até à qual a Proteção continua ativa. */
  fimTexto: string | null;
  /** Caso + Proteção com casos disponíveis. */
  mostrarCasosGuardados: boolean;
}) {
  const [passo, setPasso] = useState<"fechado" | "motivo" | "confirmar">("fechado");

  if (passo === "fechado") {
    return (
      <button type="button" onClick={() => setPasso("motivo")} className={BOTAO_SECUNDARIO}>
        Cancelar subscrição
      </button>
    );
  }

  return (
    <form
      action={cancelarSubscricao}
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5"
    >
      <fieldset className={passo === "motivo" ? "flex flex-col gap-3" : "hidden"}>
        <legend className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">
          Pode dizer-nos porque pretende cancelar?
        </legend>
        <p className="text-[13px] text-[var(--color-ink-muted)]">
          A resposta é opcional e não afeta o cancelamento.
        </p>
        {MOTIVOS_CANCELAMENTO.map((m) => (
          <label key={m.codigo} className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
            <input type="radio" name="motivo" value={m.codigo} />
            {m.texto}
          </label>
        ))}
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Comentário (opcional)
          <textarea
            name="comentario"
            maxLength={MAX_MOTIVO_TEXTO}
            rows={3}
            className="w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPasso("confirmar")} className={BOTAO_SECUNDARIO}>
            Continuar
          </button>
          <button type="button" onClick={() => setPasso("fechado")} className={BOTAO_PRIMARIO}>
            Manter subscrição
          </button>
        </div>
      </fieldset>

      {passo === "confirmar" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Cancelar a subscrição?</h2>
          <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            {fimTexto
              ? `A sua Proteção continuará ativa até ${fimTexto}. `
              : "A sua Proteção continuará ativa até ao fim do período já pago. "}
            Depois dessa data, a subscrição não será renovada e não haverá novas cobranças.
          </p>
          <p className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            Ao cancelar a subscrição, os seus alertas serão desativados quando a Proteção terminar e deixará de os
            receber. Conservaremos os dados associados durante {MESES_ALERTAS_GUARDADOS} meses, caso decida voltar à
            DoLado. Após esse período, serão eliminados ou anonimizados.
          </p>
          {mostrarCasosGuardados && (
            <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
              Os seus casos disponíveis ficam guardados durante {DIAS_CASOS_GUARDADOS} dias depois dessa data. Se
              voltar a subscrever o Caso + Proteção nesse período, recupera-os.
            </p>
          )}
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            Os casos que já abriu, os documentos e o histórico não são apagados.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPasso("fechado")} className={BOTAO_PRIMARIO}>
              Manter subscrição
            </button>
            <BotaoConfirmar />
          </div>
        </div>
      )}
    </form>
  );
}
