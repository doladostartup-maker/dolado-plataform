"use client";

import { useActionState } from "react";
import { autorizarPorLink, pedirAlteracoesPorLink, pedirNovoLink, type EstadoAcaoTexto } from "../actions";
import { MAX_PEDIDO_ALTERACOES } from "@/lib/textoCaso";
import { MensagemTexto } from "./Mensagem";

const BOTAO =
  "min-h-11 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[20px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";
const INICIAL: EstadoAcaoTexto = { resultado: null };

export function AutorizarEnvio({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(autorizarPorLink, INICIAL);
  if (estado.resultado) return <MensagemTexto resultado={estado.resultado} autorizadoEm={estado.autorizadoEm} />;
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-[14px] leading-relaxed text-[var(--color-ink)]">
        Ao autorizar, confirma que reviu este texto e autoriza a DoLado a enviá-lo em seu nome.
      </p>
      <div>
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? "A registar…" : "Autorizo o envio"}
        </button>
      </div>
    </form>
  );
}

export function PedirAlteracoes({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(pedirAlteracoesPorLink, INICIAL);
  if (estado.resultado && estado.resultado !== "mensagem_invalida") return <MensagemTexto resultado={estado.resultado} />;
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-[14px] font-medium text-[var(--color-ink)]">
        O que gostaria de alterar?
        <textarea
          name="mensagem"
          required
          rows={6}
          maxLength={MAX_PEDIDO_ALTERACOES}
          className="w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 font-normal text-[var(--color-ink)] focus:border-[var(--color-hairline-strong)] focus:outline-none"
        />
      </label>
      {estado.resultado === "mensagem_invalida" && (
        <p role="alert" className="text-[13px] text-[var(--color-status-danger)]">
          Descreva o que gostaria de alterar no texto.
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? "A enviar…" : "Enviar pedido de alterações"}
        </button>
      </div>
    </form>
  );
}

export function PedirNovoLink({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(pedirNovoLink, INICIAL);
  if (estado.novoLinkPedido) {
    return (
      <p role="status" className="text-[14px] leading-relaxed text-[var(--color-ink)]">
        Se o pedido for válido, vai receber um novo link no e-mail associado ao caso dentro de alguns minutos.
      </p>
    );
  }
  return (
    <form action={acao}>
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pendente} className={BOTAO}>
        {pendente ? "A pedir…" : "Pedir um novo link"}
      </button>
    </form>
  );
}
