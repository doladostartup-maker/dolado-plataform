"use client";

import { useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { IconeAlerta } from "./Icones";
import { BOTAO_DESTRUTIVO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./ui";

/**
 * Botão de submissão com confirmação (ConfirmationDialog), para ações com
 * impacto no cliente ou irreversíveis. Fica dentro do <form> da ação: valida
 * primeiro os campos do formulário, abre o diálogo e só ao confirmar submete
 * o mesmo formulário (a mesma Server Action, sem mudar nada no servidor).
 */
export function ConfirmarAcao({
  children,
  className,
  titulo,
  descricao,
  confirmar,
  destrutiva = false,
  formAction,
  disabled,
  aDecorrer = "A guardar…",
}: {
  children: ReactNode;
  className: string;
  titulo: string;
  descricao: ReactNode;
  /** Texto do botão de confirmação. */
  confirmar: string;
  destrutiva?: boolean;
  /** Server Action alternativa (equivalente a formAction num botão). */
  formAction?: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
  aDecorrer?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const submeter = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();
  const { pending } = useFormStatus();

  function abrir() {
    const form = submeter.current?.form;
    if (!form || !form.reportValidity()) return;
    dialogo.current?.showModal();
  }

  function confirmarEnvio() {
    dialogo.current?.close();
    submeter.current?.form?.requestSubmit(submeter.current);
  }

  return (
    <>
      <button type="button" onClick={abrir} disabled={disabled || pending} aria-busy={pending} className={className}>
        {pending ? aDecorrer : children}
      </button>
      <button ref={submeter} type="submit" formAction={formAction} hidden tabIndex={-1} aria-hidden />
      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        aria-describedby={idDescricao}
        className="m-auto w-[min(480px,calc(100vw-32px))] rounded-[16px] border border-[var(--v2-line)] bg-white p-0 text-[var(--v2-navy)] shadow-[0_24px_48px_-16px_rgba(11,37,69,0.35)] backdrop:bg-[rgba(11,37,69,0.4)]"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex gap-3">
            {destrutiva && (
              <span aria-hidden className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDEDEB] text-[var(--v2-erro)]">
                <IconeAlerta tamanho={18} />
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              <h2 id={idTitulo} className="text-[17px] font-bold leading-snug">
                {titulo}
              </h2>
              <div id={idDescricao} className="text-[14px] leading-relaxed text-[var(--v2-muted)]">
                {descricao}
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus onClick={() => dialogo.current?.close()} className={BOTAO_SECUNDARIO}>
              Cancelar
            </button>
            <button type="button" onClick={confirmarEnvio} className={destrutiva ? BOTAO_DESTRUTIVO : BOTAO_PRIMARIO}>
              {confirmar}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
