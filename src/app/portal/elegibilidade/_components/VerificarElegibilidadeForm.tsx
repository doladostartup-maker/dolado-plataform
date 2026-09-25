"use client";

import { useState } from "react";
import { DURACAO_LABEL, type DuracaoContrato, type Setor } from "@/lib/elegibilidade/regras";

const SETORES: Setor[] = ["Telecomunicações", "Energia", "Água"];
const DURACOES: DuracaoContrato[] = ["menos_6m", "6_12m", "1_2anos", "mais_2anos"];

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";
const OPCAO_CLASS =
  "flex-1 rounded-[var(--radius-input)] border px-3 py-2 text-center text-sm font-medium";

export function VerificarElegibilidadeForm({ action }: { action: (formData: FormData) => void }) {
  const [passo, setPasso] = useState<1 | 2 | 3 | 4>(1);
  const [setor, setSetor] = useState<Setor | "">("");
  const [duracao, setDuracao] = useState<DuracaoContrato | "">("");
  const [empresaRespondeuBem, setEmpresaRespondeuBem] = useState<"sim" | "nao" | "">("");
  const [descricao, setDescricao] = useState("");

  const podeAvancarPasso1 = setor !== "";
  const podeAvancarPasso2 = duracao !== "";
  const podeAvancarPasso3 = empresaRespondeuBem !== "";

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="setor" value={setor} />
      <input type="hidden" name="duracao_contrato" value={duracao} />
      <input type="hidden" name="empresa_respondeu_bem" value={empresaRespondeuBem} />

      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
        Passo {passo} de 4
      </p>

      {passo === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Qual o setor?</p>
          <div className="flex flex-wrap gap-2">
            {SETORES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSetor(s)}
                className={`${OPCAO_CLASS} ${setor === s ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]" : "border-[var(--color-hairline)] text-[var(--color-ink-muted)]"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!podeAvancarPasso1}
            onClick={() => setPasso(2)}
            className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">Há quanto tempo tem o contrato?</p>
          <div className="flex flex-col gap-2">
            {DURACOES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuracao(d)}
                className={`rounded-[var(--radius-input)] border px-3 py-2 text-left text-sm font-medium ${duracao === d ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]" : "border-[var(--color-hairline)] text-[var(--color-ink-muted)]"}`}
              >
                {DURACAO_LABEL[d]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPasso(1)} className="text-sm text-[var(--color-ink-muted)] underline">
              Voltar
            </button>
            <button
              type="button"
              disabled={!podeAvancarPasso2}
              onClick={() => setPasso(3)}
              className="ml-auto rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            A empresa respondeu adequadamente à sua reclamação?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEmpresaRespondeuBem("sim")}
              className={`${OPCAO_CLASS} ${empresaRespondeuBem === "sim" ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]" : "border-[var(--color-hairline)] text-[var(--color-ink-muted)]"}`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setEmpresaRespondeuBem("nao")}
              className={`${OPCAO_CLASS} ${empresaRespondeuBem === "nao" ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]" : "border-[var(--color-hairline)] text-[var(--color-ink-muted)]"}`}
            >
              Não / não respondeu
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPasso(2)} className="text-sm text-[var(--color-ink-muted)] underline">
              Voltar
            </button>
            <button
              type="button"
              disabled={!podeAvancarPasso3}
              onClick={() => setPasso(4)}
              className="ml-auto rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 4 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
            Descreva o que aconteceu
            <textarea
              name="descricao_problema"
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex items-start gap-2 rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
            <input type="checkbox" name="consentimento" required className="mt-1" />
            Autorizo a DoLado a tratar estes dados para efeitos desta verificação.
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPasso(3)} className="text-sm text-[var(--color-ink-muted)] underline">
              Voltar
            </button>
            <button
              type="submit"
              className="ml-auto rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
            >
              Verificar elegibilidade
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
