"use client";

import { useRef, useState } from "react";
import { criarUploadAssinadoFatura } from "../actions";
import { createClient } from "@/lib/supabase/client";

const TIPOS_ACEITOS = "application/pdf,image/jpeg,image/png,image/heic,image/heif";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

type EstadoUpload =
  | { fase: "inativo" }
  | { fase: "a-carregar" }
  | { fase: "carregado"; nome: string }
  | { fase: "falhou"; mensagem: string };

export function ComparadorFaturaForm({ action }: { action: (formData: FormData) => void }) {
  const [operadora, setOperadora] = useState("");
  const [ficheiroCaminho, setFicheiroCaminho] = useState("");
  const [ficheiroNome, setFicheiroNome] = useState("");
  const [upload, setUpload] = useState<EstadoUpload>({ fase: "inativo" });
  const [aSubmeter, setASubmeter] = useState(false);
  const inputFicheiroRef = useRef<HTMLInputElement>(null);

  async function escolherFicheiro(ficheiro: File) {
    if (!TIPOS_ACEITOS.split(",").includes(ficheiro.type)) {
      setUpload({ fase: "falhou", mensagem: "Formato não suportado. Envie um PDF, JPG, PNG ou HEIC." });
      return;
    }
    if (ficheiro.size > TAMANHO_MAXIMO) {
      setUpload({ fase: "falhou", mensagem: "O ficheiro excede o limite de 10 MB." });
      return;
    }

    setUpload({ fase: "a-carregar" });
    try {
      const resultado = await criarUploadAssinadoFatura(ficheiro.name, ficheiro.type, ficheiro.size);
      if (!resultado.ok) {
        setUpload({ fase: "falhou", mensagem: resultado.erro });
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("faturas-comparador")
        .uploadToSignedUrl(resultado.caminho, resultado.token, ficheiro);

      if (error) {
        setUpload({ fase: "falhou", mensagem: "Não foi possível carregar o ficheiro. Tente novamente." });
        return;
      }

      setFicheiroCaminho(resultado.caminho);
      setFicheiroNome(ficheiro.name);
      setUpload({ fase: "carregado", nome: ficheiro.name });
    } catch {
      setUpload({ fase: "falhou", mensagem: "Não foi possível carregar o ficheiro. Tente novamente." });
    }
  }

  const podeSubmeter = upload.fase === "carregado" && !aSubmeter;

  return (
    <form
      action={action}
      onSubmit={() => setASubmeter(true)}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="ficheiro_caminho" value={ficheiroCaminho} />
      <input type="hidden" name="ficheiro_nome" value={ficheiroNome} />

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Operadora / prestador{" "}
        <span className="font-normal normal-case text-[var(--color-ink-faint)]">(opcional)</span>
        <input
          name="operadora"
          value={operadora}
          onChange={(e) => setOperadora(e.target.value)}
          placeholder="ex.: MEO, NOS, Vodafone, EDP, Galp, EPAL…"
          className={INPUT_CLASS}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-[var(--color-ink-muted)]">Envie a sua fatura (PDF ou JPEG)</label>
        <input
          ref={inputFicheiroRef}
          type="file"
          accept={TIPOS_ACEITOS}
          onChange={(e) => {
            const ficheiro = e.target.files?.[0];
            if (ficheiro) escolherFicheiro(ficheiro);
          }}
          className="text-sm text-[var(--color-ink-muted)]"
        />
        {upload.fase === "a-carregar" && (
          <p className="text-sm text-[var(--color-ink-muted)]">A carregar o ficheiro…</p>
        )}
        {upload.fase === "carregado" && (
          <p className="text-sm text-[var(--color-status-success)]">✓ {upload.nome}</p>
        )}
        {upload.fase === "falhou" && (
          <p className="text-sm text-[var(--color-status-danger)]">{upload.mensagem}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!podeSubmeter}
        className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {aSubmeter ? "A analisar a sua fatura…" : "Comparar fatura"}
      </button>
    </form>
  );
}
