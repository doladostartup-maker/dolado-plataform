"use client";

import { useRef, useState } from "react";
import { criarUploadAssinadoContrato } from "../actions";
import { createClient } from "@/lib/supabase/client";

const TIPOS_ACEITOS = "application/pdf,image/jpeg,image/png,image/heic,image/heif";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

const BADGE_CONFIANCA: Record<string, { texto: string; cor: string; bg: string }> = {
  high: { texto: "Alta confiança", cor: "var(--color-status-success)", bg: "var(--color-status-success-wash)" },
  medium: { texto: "Confirme esta data — não temos a certeza", cor: "var(--color-status-urgent)", bg: "var(--color-status-urgent-wash)" },
  low: { texto: "Confirme esta data — não temos a certeza", cor: "var(--color-status-urgent)", bg: "var(--color-status-urgent-wash)" },
};

type EstadoExtracao =
  | { fase: "inativo" }
  | { fase: "a-carregar" }
  | { fase: "a-ler" }
  | { fase: "sucesso"; confianca: "high" | "medium" | "low"; bruta: unknown }
  | { fase: "falhou"; mensagem: string };

export function AlertaPromocaoPortalForm({
  action,
  valoresIniciais = {},
}: {
  action: (formData: FormData) => void;
  valoresIniciais?: {
    operadora?: string;
    descricao_promocao?: string;
    data_fim_promocao?: string;
  };
}) {
  const [via, setVia] = useState<"manual" | "upload">("manual");
  const [operadora, setOperadora] = useState(valoresIniciais.operadora ?? "");
  const [descricao, setDescricao] = useState(valoresIniciais.descricao_promocao ?? "");
  const [dataFim, setDataFim] = useState(valoresIniciais.data_fim_promocao ?? "");
  const [origemData, setOrigemData] = useState<"manual" | "api_extraida" | "api_extraida_editada">("manual");
  const [ficheiroCaminho, setFicheiroCaminho] = useState("");
  const [ficheiroNome, setFicheiroNome] = useState("");
  const [extracaoBruta, setExtracaoBruta] = useState<unknown>(null);
  const [extracao, setExtracao] = useState<EstadoExtracao>({ fase: "inativo" });
  const inputFicheiroRef = useRef<HTMLInputElement>(null);

  async function escolherFicheiro(ficheiro: File) {
    if (!TIPOS_ACEITOS.split(",").includes(ficheiro.type)) {
      setExtracao({ fase: "falhou", mensagem: "Formato não suportado. Envie um PDF, JPG, PNG ou HEIC." });
      return;
    }
    if (ficheiro.size > TAMANHO_MAXIMO) {
      setExtracao({ fase: "falhou", mensagem: "O ficheiro excede o limite de 10 MB." });
      return;
    }

    setExtracao({ fase: "a-carregar" });
    try {
      const resultado = await criarUploadAssinadoContrato(ficheiro.name, ficheiro.type, ficheiro.size);
      if (!resultado.ok) {
        setExtracao({ fase: "falhou", mensagem: resultado.erro });
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("contratos-promocao")
        .uploadToSignedUrl(resultado.caminho, resultado.token, ficheiro);

      if (error) {
        setExtracao({ fase: "falhou", mensagem: "Não foi possível carregar o ficheiro. Tente novamente." });
        return;
      }

      setFicheiroCaminho(resultado.caminho);
      setFicheiroNome(ficheiro.name);
      setExtracao({ fase: "a-ler" });

      const respostaExtracao = await fetch("/api/internal/extract-promotion-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho_storage: resultado.caminho }),
      });
      const dados = await respostaExtracao.json();

      if (!dados.ok) {
        // Fallback silencioso — o produto continua a funcionar, só perde a
        // pré-preenchida. Não é um erro para o cliente, é o caminho manual.
        setOrigemData("manual");
        setExtracao({
          fase: "falhou",
          mensagem: "Não foi possível ler o contrato automaticamente. Por favor, confirme a data da promoção manualmente.",
        });
        return;
      }

      const ex = dados.extracao;
      if (ex.promotion_date_found && ex.promotion_date) {
        setDataFim(ex.promotion_date);
      }
      if (ex.promotion_description) {
        setDescricao(ex.promotion_description);
      }
      setOrigemData("api_extraida");
      setExtracaoBruta(dados.bruta ?? null);
      setExtracao({ fase: "sucesso", confianca: ex.confidence, bruta: dados.bruta });
    } catch {
      setOrigemData("manual");
      setExtracao({
        fase: "falhou",
        mensagem: "Não foi possível ler o contrato automaticamente. Por favor, confirme a data da promoção manualmente.",
      });
    }
  }

  const badge = extracao.fase === "sucesso" ? BADGE_CONFIANCA[extracao.confianca] : null;
  const aCarregarOuLer = extracao.fase === "a-carregar" || extracao.fase === "a-ler";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="origem_data" value={origemData} />
      <input type="hidden" name="ficheiro_contrato_caminho" value={ficheiroCaminho} />
      <input type="hidden" name="ficheiro_contrato_nome" value={ficheiroNome} />
      <input
        type="hidden"
        name="extracao_api_bruta"
        value={extracaoBruta ? JSON.stringify(extracaoBruta) : ""}
      />
      <input
        type="hidden"
        name="extracao_api_confianca"
        value={extracao.fase === "sucesso" ? extracao.confianca : ""}
      />

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Operadora / prestador
        <input
          name="operadora"
          value={operadora}
          onChange={(e) => setOperadora(e.target.value)}
          placeholder="ex.: MEO, NOS, Vodafone, EDP, Galp, EPAL…"
          required
          className={INPUT_CLASS}
        />
      </label>

      <div className="flex gap-2 rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)] p-1 text-sm">
        <button
          type="button"
          onClick={() => setVia("manual")}
          className={`flex-1 rounded-[6px] py-1.5 font-medium ${
            via === "manual" ? "bg-white text-[var(--color-brand)] shadow-[var(--shadow-subtle)]" : "text-[var(--color-ink-muted)]"
          }`}
        >
          Indicar manualmente
        </button>
        <button
          type="button"
          onClick={() => setVia("upload")}
          className={`flex-1 rounded-[6px] py-1.5 font-medium ${
            via === "upload" ? "bg-white text-[var(--color-brand)] shadow-[var(--shadow-subtle)]" : "text-[var(--color-ink-muted)]"
          }`}
        >
          Anexar contrato
        </button>
      </div>

      {via === "upload" && (
        <div className="flex flex-col gap-2">
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
          {extracao.fase === "a-carregar" && (
            <p className="text-sm text-[var(--color-ink-muted)]">A carregar o ficheiro…</p>
          )}
          {extracao.fase === "a-ler" && (
            <p className="text-sm text-[var(--color-ink-muted)]">A ler o contrato…</p>
          )}
          {extracao.fase === "falhou" && (
            <p className="text-sm text-[var(--color-status-danger)]">{extracao.mensagem}</p>
          )}
          {badge && (
            <span
              className="inline-flex w-fit items-center rounded-[var(--radius-pill)] px-2.5 py-1 text-[12.5px] font-medium"
              style={{ backgroundColor: badge.bg, color: badge.cor }}
            >
              {badge.texto}
            </span>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Descrição da promoção
        <input
          name="descricao_promocao"
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            if (origemData === "api_extraida") setOrigemData("api_extraida_editada");
          }}
          placeholder="ex.: 50% de desconto nos primeiros 12 meses"
          required
          disabled={aCarregarOuLer}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
        Data de fim da promoção
        <input
          type="date"
          name="data_fim_promocao"
          value={dataFim}
          onChange={(e) => {
            setDataFim(e.target.value);
            if (origemData === "api_extraida") setOrigemData("api_extraida_editada");
          }}
          required
          disabled={aCarregarOuLer}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex items-start gap-2 rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
        <input type="checkbox" name="consentimento" required className="mt-1" />
        Autorizo a DoLado a guardar estes dados para me avisar antes do fim da promoção.
      </label>

      <button
        type="submit"
        disabled={aCarregarOuLer}
        className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Criar alerta
      </button>
    </form>
  );
}
