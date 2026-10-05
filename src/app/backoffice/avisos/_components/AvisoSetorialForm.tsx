"use client";

import { useState } from "react";
import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { BOTAO_PRIMARIO, BOTAO_TERCIARIO, CAMPO, CAMPO_TEXTO_LONGO, ROTULO, AJUDA_CAMPO } from "@/components/backoffice/ui";

const SETORES = ["Telecomunicações", "Energia", "Água"];

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
  const clientes = `${numDestinatarios} cliente${numDestinatarios === 1 ? "" : "s"}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={`${ROTULO} max-w-xs`}>
        Setor
        <select name="setor" value={setor} onChange={(e) => setSetor(e.target.value)} className={CAMPO}>
          {SETORES.map((s) => (
            <option key={s} value={s}>
              {s} ({contagens[s] ?? 0})
            </option>
          ))}
        </select>
        <span className={AJUDA_CAMPO}>Entre parênteses: clientes com Proteção ativa que subscreveram o setor.</span>
      </label>

      <label className={ROTULO}>
        Título
        <input name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className={CAMPO} />
      </label>

      <label className={ROTULO}>
        Descrição
        <textarea name="descricao" rows={6} value={descricao} onChange={(e) => setDescricao(e.target.value)} required className={CAMPO_TEXTO_LONGO} />
      </label>

      <div>
        <button type="button" aria-expanded={mostrarPreview} onClick={() => setMostrarPreview((v) => !v)} className={BOTAO_TERCIARIO}>
          {mostrarPreview ? "Esconder pré-visualização" : "Como vai aparecer no e-mail?"}
        </button>
      </div>

      {mostrarPreview && (
        <div className="rounded-[12px] border border-[var(--v2-line)] bg-[var(--v2-surface)] p-4 text-[14px]">
          <p className="mb-2 text-[12.5px] text-[var(--v2-muted)]">Assunto: [Aviso DoLado] Novidade no setor de {setor}</p>
          <div className="rounded-[10px] border-l-[3px] border-[var(--v2-green)] bg-white p-3">
            <p className="mb-1 font-semibold">{titulo || "(sem título)"}</p>
            <p className="whitespace-pre-line text-[var(--v2-muted)]">{descricao || "(sem descrição)"}</p>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--v2-line)] pt-4">
        <ConfirmarAcao
          className={BOTAO_PRIMARIO}
          titulo={`Enviar o aviso a ${clientes}?`}
          descricao={`Todos os clientes com Proteção ativa que subscreveram o setor ${setor} recebem este e-mail. O envio não pode ser anulado.`}
          confirmar="Enviar aviso"
          aDecorrer="A enviar…"
        >
          Enviar aviso a {clientes}
        </ConfirmarAcao>
      </div>
    </form>
  );
}
