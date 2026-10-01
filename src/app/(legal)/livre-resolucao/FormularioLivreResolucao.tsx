"use client";

import { useActionState, useState } from "react";
import { pedirLivreResolucao, type EstadoPedidoLivreResolucao } from "./actions";
import { PLANOS_LIVRE_RESOLUCAO, ROTULO_CONFIRMAR, ROTULO_RESOLVER } from "@/lib/livreResolucao";
import { CONTACTO_EMAIL } from "@/lib/site";

const ROTULO = "text-[14px] font-medium text-[var(--color-ink)]";
const CAMPO =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-white px-3 py-2.5 text-[15px] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none";
const BOTAO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";

function formatarDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(
    new Date(iso),
  );
}

/**
 * Função online de livre resolução: um botão "Resolver o contrato aqui"
 * abre o formulário e o pedido só é registado com "Confirmar a livre
 * resolução".
 */
export function FormularioLivreResolucao() {
  const [aberto, setAberto] = useState(false);
  const [estado, submeter, pending] = useActionState<EstadoPedidoLivreResolucao, FormData>(pedirLivreResolucao, null);

  if (estado?.ok) {
    return (
      <div role="status" className="rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-[15px] leading-relaxed text-[var(--color-ink)]">
        <p className="mb-1 font-semibold">Pedido de livre resolução registado</p>
        <p>
          Recebemos o seu pedido em {formatarDataHora(estado.recebidoEm)}. Referência: <span className="font-mono text-[13px]">{estado.referencia}</span>.
        </p>
        <p className="mt-2">
          {estado.confirmacaoEnviada
            ? "Enviámos uma confirmação para o e-mail indicado. A DoLado vai analisar o pedido e responder-lhe por e-mail."
            : `A DoLado vai confirmar os dados e responder-lhe por e-mail. Guarde a referência acima; se não receber resposta, escreva para ${CONTACTO_EMAIL}.`}
        </p>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={BOTAO}>
        {ROTULO_RESOLVER}
      </button>
    );
  }

  return (
    <form action={submeter} className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-5">
      <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        Preencha os dados que nos permitem identificar o contrato. Os campos assinalados com * são obrigatórios.
      </p>

      {/* Armadilha para bots — invisível para pessoas. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Nome *</span>
        <input name="nome" required minLength={2} maxLength={120} autoComplete="name" className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>E-mail usado na compra *</span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Plano *</span>
        <select name="plano" required defaultValue="" className={CAMPO}>
          <option value="" disabled>
            Selecione
          </option>
          {Object.entries(PLANOS_LIVRE_RESOLUCAO).map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Data da compra (se souber)</span>
        <input name="data_compra" type="date" className={CAMPO} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Outra identificação (opcional)</span>
        <input
          name="identificacao"
          maxLength={200}
          placeholder="Ex.: n.º do recibo ou referência do caso"
          className={CAMPO}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Mensagem (opcional)</span>
        <textarea name="mensagem" rows={3} maxLength={2000} className={CAMPO} />
      </label>

      <label className="flex items-start gap-2 text-[14px] leading-relaxed text-[var(--color-ink)]">
        <input type="checkbox" name="confirmo" value="sim" required className="mt-1" />
        Declaro que pretendo exercer o direito de livre resolução do contrato indicado.
      </label>

      {estado && !estado.ok && (
        <p role="alert" className="text-[14px] text-[var(--color-status-danger)]">
          {estado.erro}
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className={BOTAO}>
          {pending ? "A registar…" : ROTULO_CONFIRMAR}
        </button>
      </div>
    </form>
  );
}
