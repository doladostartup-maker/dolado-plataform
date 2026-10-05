"use client";

import { useState } from "react";
import { Etiqueta } from "@/components/backoffice/Estado";
import { BOTAO_SECUNDARIO, BOTAO_PEQUENO } from "@/components/backoffice/ui";

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
        timeZone: "Europe/Lisbon",
      })
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {enviadoEm ? <Etiqueta tom="sucesso">Enviado em {dataFormatada}</Etiqueta> : <Etiqueta tom="neutro">Ainda não enviado</Etiqueta>}
        <button type="button" onClick={enviar} disabled={aEnviar} aria-busy={aEnviar} className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>
          {aEnviar ? "A enviar…" : enviadoEm ? "Reenviar" : "Enviar e-mail de boas-vindas"}
        </button>
      </div>
      {erro && (
        <p role="alert" className="text-[13px] text-[var(--v2-erro)]">
          {erro}
        </p>
      )}
    </div>
  );
}
