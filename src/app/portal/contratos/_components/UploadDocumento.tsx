"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepararUploadDocumento, registarDocumento } from "../actions";
import { BOTAO_PRIMARIO } from "./estilos";

// Carregar uma fatura ou um contrato: o ficheiro vai diretamente para o
// Storage por URL assinada (caminho decidido no servidor) e depois o
// servidor regista-o e lê-o. A leitura pode demorar alguns segundos.

const TIPOS_ACEITES = "application/pdf,image/jpeg,image/png,image/webp";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

type Estado =
  | { fase: "inativo" }
  | { fase: "a-carregar" }
  | { fase: "carregado"; nome: string }
  | { fase: "falhou"; mensagem: string };

export function UploadDocumento({ contratoId, tipoInicial = "fatura" }: { contratoId?: string; tipoInicial?: "fatura" | "contrato" }) {
  const [tipo, setTipo] = useState<"fatura" | "contrato">(tipoInicial);
  const [caminho, setCaminho] = useState("");
  const [nome, setNome] = useState("");
  const [estado, setEstado] = useState<Estado>({ fase: "inativo" });
  const [aEnviar, setAEnviar] = useState(false);

  async function escolher(ficheiro: File) {
    if (!TIPOS_ACEITES.split(",").includes(ficheiro.type)) {
      setEstado({ fase: "falhou", mensagem: "Formato não suportado. Envie um PDF ou uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (ficheiro.size > TAMANHO_MAXIMO) {
      setEstado({ fase: "falhou", mensagem: "O ficheiro excede o limite de 10 MB." });
      return;
    }
    setEstado({ fase: "a-carregar" });
    try {
      const r = await prepararUploadDocumento(ficheiro.type, ficheiro.size);
      if (!r.ok) {
        setEstado({ fase: "falhou", mensagem: r.erro });
        return;
      }
      const { error } = await createClient().storage.from("documentos-monitor").uploadToSignedUrl(r.caminho, r.token, ficheiro);
      if (error) {
        setEstado({ fase: "falhou", mensagem: "Não foi possível carregar o ficheiro. Tente novamente." });
        return;
      }
      setCaminho(r.caminho);
      setNome(ficheiro.name);
      setEstado({ fase: "carregado", nome: ficheiro.name });
    } catch {
      setEstado({ fase: "falhou", mensagem: "Não foi possível carregar o ficheiro. Tente novamente." });
    }
  }

  return (
    <form action={registarDocumento} onSubmit={() => setAEnviar(true)} className="flex flex-col gap-4">
      <input type="hidden" name="caminho" value={caminho} />
      <input type="hidden" name="nome_ficheiro" value={nome} />
      <input type="hidden" name="tipo" value={tipo} />
      {contratoId && <input type="hidden" name="contrato_id" value={contratoId} />}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-[var(--color-ink-muted)]">Que documento vai carregar?</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["fatura", "Uma fatura"],
              ["contrato", "O contrato"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={tipo === valor}
              onClick={() => setTipo(valor)}
              className={`rounded-[var(--radius-button)] border px-3.5 py-2 text-sm font-medium ${
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

      <div className="flex flex-col gap-2">
        <label htmlFor="documento-monitor" className="text-sm text-[var(--color-ink-muted)]">
          Ficheiro (PDF ou imagem, até 10 MB)
        </label>
        <input
          id="documento-monitor"
          type="file"
          accept={TIPOS_ACEITES}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) escolher(f);
          }}
          className="text-sm text-[var(--color-ink-muted)]"
        />
        {estado.fase === "a-carregar" && <p className="text-sm text-[var(--color-ink-muted)]">A carregar o ficheiro…</p>}
        {estado.fase === "carregado" && <p className="text-sm text-[var(--color-status-success)]">✓ {estado.nome}</p>}
        {estado.fase === "falhou" && <p className="text-sm text-[var(--color-status-danger)]">{estado.mensagem}</p>}
      </div>

      <button type="submit" disabled={estado.fase !== "carregado" || aEnviar} className={`${BOTAO_PRIMARIO} self-start`}>
        {aEnviar ? "A ler o documento… pode demorar até um minuto" : tipo === "fatura" ? "Ler a fatura" : "Ler o contrato"}
      </button>
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
        Lemos as datas e os valores do documento e pedimos-lhe que os confirme antes de começarmos a acompanhar. Envie
        apenas o necessário e, se possível, oculte dados de outras pessoas.
      </p>
    </form>
  );
}
