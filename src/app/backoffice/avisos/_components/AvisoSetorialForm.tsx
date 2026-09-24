"use client";

import { useState } from "react";

const SETORES = ["Telecomunicações", "Energia", "Água"];

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

export function AvisoSetorialForm({
  action,
  contagens,
}: {
  action: (formData: FormData) => void;
  contagens: Record<string, number>;
}) {
  const [setor, setSetor] = useState(SETORES[0]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const numDestinatarios = contagens[setor] ?? 0;

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]"
    >
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Setor
        <select
          name="setor"
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
          className={INPUT_CLASS}
        >
          {SETORES.map((s) => (
            <option key={s} value={s}>
              {s === "Água" ? "Água & Resíduos" : s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Título
        <input
          name="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Descrição
        <textarea
          name="descricao"
          rows={5}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </label>

      <button
        type="button"
        onClick={() => setMostrarPreview((v) => !v)}
        className="self-start text-sm font-medium text-[var(--color-brand)] underline"
      >
        {mostrarPreview ? "Esconder pré-visualização" : "Como vai parecer no email?"}
      </button>

      {mostrarPreview && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4 text-sm">
          <p className="mb-2 text-[13px] text-[var(--color-ink-faint)]">
            Assunto: [Aviso DoLado] Novidade no setor de {setor}
          </p>
          <div className="rounded-[8px] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-3">
            <p className="mb-1 font-semibold text-[var(--color-ink)]">{titulo || "(sem título)"}</p>
            <p className="whitespace-pre-line text-[var(--color-ink-muted)]">
              {descricao || "(sem descrição)"}
            </p>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
      >
        Enviar aviso a {numDestinatarios} cliente{numDestinatarios === 1 ? "" : "s"}
      </button>
    </form>
  );
}
