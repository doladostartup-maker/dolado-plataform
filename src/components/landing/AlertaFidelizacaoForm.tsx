"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  criarAlertaFidelizacao,
  type EstadoAlertaFidelizacao,
} from "@/app/actions/alertas-fidelizacao";

const OPERADORAS = ["MEO", "NOS", "Vodafone", "EDP", "Galp", "EPAL", "Outra"];

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-white px-3.5 py-3 text-[var(--text-body)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-wash)]";
const LABEL_CLASS = "mb-1.5 block text-[var(--text-body-sm)] font-medium text-[var(--color-ink-muted)]";
const BOTAO_PRIMARIO =
  "min-h-11 w-full rounded-[var(--radius-button)] bg-[var(--color-brand)] px-5 py-3 text-[var(--text-body)] font-semibold text-white transition hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto";

const ESTADO_INICIAL: EstadoAlertaFidelizacao = { ok: false };

export function AlertaFidelizacaoForm() {
  const [state, formAction, pending] = useActionState(criarAlertaFidelizacao, ESTADO_INICIAL);
  const [operadora, setOperadora] = useState("");
  const [outraOperadora, setOutraOperadora] = useState("");

  if (state.ok) {
    return (
      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white p-6 text-center shadow-[var(--shadow-subtle)] sm:p-8"
      >
        <span
          className="mb-3 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-semibold"
          style={{ backgroundColor: "var(--color-status-success-wash)", color: "var(--color-status-success)" }}
        >
          ✓ Registo guardado
        </span>
        <h3 className="mb-2 text-[var(--text-heading-sm)] font-bold text-[var(--color-ink)]">
          Ficámos com o seu registo.
        </h3>
        <p className="text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          Vamos avisá-lo antes da data de fim da fidelização, por e-mail.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-subtle)] sm:p-8"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      <div className="mb-4">
        <label className={LABEL_CLASS} htmlFor="alerta-email">
          E-mail
        </label>
        <input id="alerta-email" name="email" type="email" required className={INPUT_CLASS} />
      </div>

      <div className="mb-4">
        <label className={LABEL_CLASS} htmlFor="alerta-operadora">
          Operadora / prestador
        </label>
        <select
          id="alerta-operadora"
          value={operadora}
          onChange={(e) => setOperadora(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Selecione…</option>
          {OPERADORAS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {operadora === "Outra" && (
          <input
            type="text"
            value={outraOperadora}
            onChange={(e) => setOutraOperadora(e.target.value)}
            placeholder="Qual?"
            className={`${INPUT_CLASS} mt-2`}
          />
        )}
        <input type="hidden" name="operadora" value={operadora === "Outra" ? outraOperadora : operadora} />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="alerta-data-fim">
            Data de fim de fidelização{" "}
            <span className="font-normal normal-case text-[var(--color-ink-faint)]">(opcional)</span>
          </label>
          <input id="alerta-data-fim" name="data_fim_fidelizacao" type="date" className={INPUT_CLASS} />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="alerta-data-inicio">
            Data de início do contrato{" "}
            <span className="font-normal normal-case text-[var(--color-ink-faint)]">(opcional)</span>
          </label>
          <input id="alerta-data-inicio" name="data_inicio_contrato" type="date" className={INPUT_CLASS} />
        </div>
      </div>
      <p className="mb-4 text-[13px] text-[var(--color-ink-faint)]">
        Se não souber a data de fim, indique a data de início — estimamos os 24 meses habituais
        de fidelização.
      </p>

      <div className="mb-5">
        <label className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
          <input
            type="checkbox"
            name="consentimento"
            required
            className="mt-0.5 h-4.5 w-4.5 flex-none accent-[var(--color-brand)]"
          />
          <span>
            Autorizo a DoLado a guardar estes dados para me avisar antes do fim da fidelização.
            Posso cancelar a qualquer momento. Ver{" "}
            <Link href="/privacidade" target="_blank" rel="noopener" className="text-[var(--color-brand)] underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
      </div>

      {state.erro && (
        <p className="mb-3 text-[13px]" style={{ color: "var(--color-status-danger)" }}>
          {state.erro}
        </p>
      )}

      <button type="submit" disabled={pending} className={BOTAO_PRIMARIO}>
        {pending ? "A enviar…" : "Avisem-me"}
      </button>
    </form>
  );
}
