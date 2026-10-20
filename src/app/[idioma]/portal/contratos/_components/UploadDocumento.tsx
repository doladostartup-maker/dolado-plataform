"use client";

import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepararUploadDocumento, registarDocumento } from "../actions";
import { BOTAO_PRIMARIO } from "./estilos";
import { ProgressoDocumento } from "./ProgressoDocumento";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";

// Carregar uma fatura ou um contrato: o ficheiro vai diretamente para o
// Storage por URL assinada (caminho decidido no servidor); o servidor regista
// o documento e responde logo. A leitura corre depois, com as etapas
// mostradas em ProgressoDocumento.

const TIPOS_ACEITES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

type Ficheiro = { nome: string; tamanho: number; caminho: string };

type Estado =
  | { fase: "vazio" }
  | { fase: "a-carregar"; nome: string }
  | { fase: "carregado"; ficheiro: Ficheiro }
  | { fase: "a-registar"; ficheiro: Ficheiro }
  | { fase: "em-analise"; documentoId: string };

function tamanhoLegivel(bytes: number, decimal: string) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", decimal)} MB`;
}

function IconeDocumento() {
  return (
    <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 17v-6" />
      <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
    </svg>
  );
}

export function UploadDocumento({ contratoId, tipoInicial = "fatura" }: { contratoId?: string; tipoInicial?: "fatura" | "contrato" }) {
  const [tipo, setTipo] = useState<"fatura" | "contrato">(tipoInicial);
  const [estado, setEstado] = useState<Estado>({ fase: "vazio" });
  const [erro, setErro] = useState<string | null>(null);
  const [aArrastar, setAArrastar] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const idInput = useId();
  const idioma = useIdioma();
  const t = useTextos(tProtecao).upload;

  async function escolher(f: File) {
    setErro(null);
    if (!TIPOS_ACEITES.includes(f.type)) {
      setErro(t.formato);
      return;
    }
    if (f.size > TAMANHO_MAXIMO) {
      setErro(t.tamanho);
      return;
    }
    setEstado({ fase: "a-carregar", nome: f.name });
    try {
      const r = await prepararUploadDocumento(f.type, f.size);
      if (!r.ok) {
        setErro(traduzirMensagemProtecao(idioma, r.erro));
        setEstado({ fase: "vazio" });
        return;
      }
      const { error } = await createClient().storage.from("documentos-monitor").uploadToSignedUrl(r.caminho, r.token, f);
      if (error) throw error;
      setEstado({ fase: "carregado", ficheiro: { nome: f.name, tamanho: f.size, caminho: r.caminho } });
    } catch {
      setErro(t.erroCarregar);
      setEstado({ fase: "vazio" });
    }
  }

  async function analisar() {
    if (estado.fase !== "carregado") return;
    const ficheiro = estado.ficheiro;
    setErro(null);
    setEstado({ fase: "a-registar", ficheiro });
    try {
      const r = await registarDocumento({ caminho: ficheiro.caminho, nomeFicheiro: ficheiro.nome, tipo, contratoId: contratoId ?? null });
      if (!r.ok) {
        setErro(traduzirMensagemProtecao(idioma, r.erro));
        setEstado({ fase: "carregado", ficheiro });
        return;
      }
      setEstado({ fase: "em-analise", documentoId: r.documentoId });
    } catch {
      setErro(t.erroEnviar);
      setEstado({ fase: "carregado", ficheiro });
    }
  }

  function remover() {
    setEstado({ fase: "vazio" });
    setErro(null);
    if (input.current) input.current.value = "";
  }

  if (estado.fase === "em-analise") {
    return (
      <div className="flex flex-col gap-3">
        <ProgressoDocumento documentoId={estado.documentoId} contratoAtual={contratoId} />
        <button type="button" onClick={remover} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
          {t.outro}
        </button>
      </div>
    );
  }

  const ficheiro = estado.fase === "carregado" || estado.fase === "a-registar" ? estado.ficheiro : null;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-semibold text-[var(--v2-navy)]">{t.qual}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["fatura", t.umaFatura],
              ["contrato", t.oContrato],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={tipo === valor}
              onClick={() => setTipo(valor)}
              className={`min-h-11 rounded-[var(--radius-button)] border px-4 text-[14.5px] font-semibold ${
                tipo === valor
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]"
                  : "border-[var(--color-hairline-strong)] text-[var(--color-ink)]"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </fieldset>

      <input
        ref={input}
        id={idInput}
        type="file"
        accept={TIPOS_ACEITES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) escolher(f);
        }}
      />

      {ficheiro ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] px-4 py-3">
          <span className="text-[var(--color-brand)]">
            <IconeDocumento />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-ink)]">{ficheiro.nome}</p>
            <p className="text-[12.5px] text-[var(--color-ink-faint)]">{tamanhoLegivel(ficheiro.tamanho, t.decimal)}
              {t.pronto}</p>
          </div>
          <div className="flex min-h-11 items-center gap-4 text-sm">
            <label htmlFor={idInput} className="cursor-pointer font-medium text-[var(--color-brand)] underline">
              {t.substituir}
            </label>
            <button type="button" onClick={remover} className="font-medium text-[var(--color-ink-muted)] underline">
              {t.remover}
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={idInput}
          onDragOver={(e) => {
            e.preventDefault();
            setAArrastar(true);
          }}
          onDragLeave={() => setAArrastar(false)}
          onDrop={(e) => {
            e.preventDefault();
            setAArrastar(false);
            const f = e.dataTransfer.files?.[0];
            if (f) escolher(f);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-8 text-center transition focus-within:border-[var(--color-brand)] ${
            aArrastar
              ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)]"
              : "border-[var(--color-hairline-strong)] bg-[var(--color-surface)] hover:border-[var(--color-brand)]"
          }`}
        >
          <span className="text-[var(--color-brand)]">
            <IconeDocumento />
          </span>
          <span className="text-[15px] font-semibold text-[var(--color-ink)]">
            {tipo === "fatura" ? t.adicionarFatura : t.adicionarContrato}
          </span>
          {estado.fase === "a-carregar" ? (
            <span className="text-sm text-[var(--color-ink-muted)]">{t.aCarregar(estado.nome)}</span>
          ) : (
            <span className="text-sm text-[var(--color-ink-muted)]">
              {rico(t.arraste, { escolher: (c) => <span className="font-medium text-[var(--color-brand)] underline">{c}</span> })}
            </span>
          )}
          <span className="text-[12.5px] text-[var(--color-ink-faint)]">{t.formatos}</span>
        </label>
      )}

      {erro && (
        <p role="alert" className="text-sm text-[var(--color-status-danger)]">
          {erro}
        </p>
      )}

      <button type="button" onClick={analisar} disabled={estado.fase !== "carregado"} className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
        {estado.fase === "a-registar" ? t.aEnviar : tipo === "fatura" ? t.verificarFatura : t.verificarContrato}
      </button>
      <p className="text-[13px] leading-relaxed text-[var(--v2-muted)]">
        {t.nota}
      </p>
    </div>
  );
}
