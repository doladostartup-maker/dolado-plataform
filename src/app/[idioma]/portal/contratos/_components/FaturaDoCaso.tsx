"use client";

import { useState } from "react";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";
import { usarFaturaDoCaso } from "../actions";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./estilos";
import { ProgressoDocumento } from "./ProgressoDocumento";
import { UploadDocumento } from "./UploadDocumento";

// Primeiro documento da Proteção quando o cliente já enviou uma fatura num
// caso: a fatura é proposta sem novo upload ("Verificar esta fatura") e o
// cliente pode escolher outra ("Usar outra fatura" → upload de sempre).
// Nada é lido nem copiado só por abrir a página: só com o clique.

type Estado = { fase: "proposta" } | { fase: "a-enviar" } | { fase: "em-analise"; documentoId: string } | { fase: "outra" };

export function FaturaDoCaso({ anexoId, nome, empresa }: { anexoId: string; nome: string; empresa: string | null }) {
  const [estado, setEstado] = useState<Estado>({ fase: "proposta" });
  const [erro, setErro] = useState<string | null>(null);
  const idioma = useIdioma();
  const t = useTextos(tProtecao).faturaDoCaso;

  async function usar() {
    setErro(null);
    setEstado({ fase: "a-enviar" });
    try {
      const r = await usarFaturaDoCaso(anexoId);
      if (!r.ok) {
        setErro(traduzirMensagemProtecao(idioma, r.erro));
        setEstado({ fase: "outra" });
        return;
      }
      setEstado({ fase: "em-analise", documentoId: r.documentoId });
    } catch {
      setErro(t.erro);
      setEstado({ fase: "proposta" });
    }
  }

  if (estado.fase === "em-analise") return <ProgressoDocumento documentoId={estado.documentoId} />;

  if (estado.fase === "outra") {
    return (
      <div className="flex flex-col gap-4">
        {erro && (
          <p role="alert" className="text-sm text-[var(--color-status-danger)]">
            {erro}
          </p>
        )}
        <UploadDocumento />
        {!erro && (
          <button
            type="button"
            onClick={() => setEstado({ fase: "proposta" })}
            className="min-h-11 self-start text-sm font-medium text-[var(--v2-muted)] underline"
          >
            {t.voltar}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[15.5px] font-semibold text-[var(--v2-navy)]">
          {t.encontramos}
        </p>
        <p className="text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
          {t.naoPrecisa}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] px-4 py-3">
        <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-brand)]">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-ink)]">{nome}</p>
          <p className="text-[12.5px] text-[var(--color-ink-faint)]">{empresa ? t.enviadaEmpresa(empresa) : t.enviada}</p>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-[var(--color-status-danger)]">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={usar} disabled={estado.fase === "a-enviar"} className={BOTAO_PRIMARIO}>
          {estado.fase === "a-enviar" ? t.aEnviar : t.verificar}
        </button>
        <button type="button" onClick={() => setEstado({ fase: "outra" })} disabled={estado.fase === "a-enviar"} className={BOTAO_SECUNDARIO}>
          {t.outra}
        </button>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--v2-muted)]">
        {t.nota}
      </p>
    </div>
  );
}
