"use client";

import { useState } from "react";

export function EnviarBoasVindas({
  casoId,
  enviadoEmInicial,
}: {
  casoId: string;
  enviadoEmInicial: string | null;
}) {
  const [enviadoEm, setEnviadoEm] = useState(enviadoEmInicial);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setAEnviar(true);
    setErro(null);

    try {
      const resposta = await fetch(`/api/casos/${casoId}/enviar-boas-vindas`, {
        method: "POST",
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível enviar o e-mail.");
        return;
      }

      setEnviadoEm(dados.enviado_em);
    } catch {
      setErro("Não foi possível contactar o servidor. Tente novamente.");
    } finally {
      setAEnviar(false);
    }
  }

  const dataFormatada = enviadoEm
    ? new Date(enviadoEm).toLocaleString("pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {enviadoEm ? (
          <>
            <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-status-success-wash)] px-[10px] py-[4px] text-[13px] font-medium text-[var(--color-status-success)]">
              Enviado em {dataFormatada}
            </span>
            <button
              type="button"
              onClick={enviar}
              disabled={aEnviar}
              className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aEnviar ? "A enviar…" : "Reenviar"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={enviar}
            disabled={aEnviar}
            className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aEnviar ? "A enviar…" : "Enviar e-mail de boas-vindas"}
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-[var(--color-status-danger)]">{erro}</p>}
    </div>
  );
}
