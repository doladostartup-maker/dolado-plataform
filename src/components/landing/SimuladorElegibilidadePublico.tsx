"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import { criarVerificacaoElegibilidadePublica, type EstadoElegibilidadePublica } from "@/app/actions/elegibilidade-publico";
import { DURACAO_LABEL, type DuracaoContrato, type Setor } from "@/lib/elegibilidade/regras";
import { FormularioGuiado } from "./FormularioGuiado";
import { SiteHeader } from "./SiteHeader";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";

const SETORES: Setor[] = ["Telecomunicações", "Energia", "Água"];
const DURACOES: DuracaoContrato[] = ["menos_6m", "6_12m", "1_2anos", "mais_2anos"];

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";
const OPCAO_CLASS = "flex-1 rounded-[var(--radius-input)] border px-3 py-2 text-center text-sm font-medium";
const BOTAO_PRIMARIO =
  "rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40";

const ESTADO_INICIAL: EstadoElegibilidadePublica = { fase: "formulario" };

function ResultadoCard({ estado }: { estado: EstadoElegibilidadePublica }) {
  if (estado.fase !== "resultado") return null;

  if (estado.emAnalise) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-subtle)]">
        <p className="mb-2 text-[15px] font-semibold text-[var(--color-ink)]">
          🟠 Recebemos o seu caso — está em análise.
        </p>
        <p className="text-[13.5px] text-[var(--color-ink-muted)]">
          Vamos responder por e-mail no prazo máximo de 24 horas úteis.
        </p>
      </div>
    );
  }

  if (estado.elegivel) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-subtle)]">
        <p className="mb-2 text-[17px] font-semibold text-[var(--color-status-success)]">
          🟢 O seu caso parece elegível
        </p>
        <p className="mb-5 text-[13.5px] text-[var(--color-ink-muted)]">
          Enviámos os detalhes para o seu e-mail. Pode avançar já com a reclamação.
        </p>
        <div className="rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] p-4 text-[13.5px] text-[var(--color-ink)]">
          <p className="mb-2 font-semibold">Quer acompanhar isto?</p>
          <p className="mb-3 text-[var(--color-ink-muted)]">
            Crie a sua conta gratuita para abrir a reclamação e seguir o caso no Portal.
          </p>
          <Link href="/registo" className={BOTAO_PRIMARIO}>
            Criar a minha conta gratuita
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-subtle)]">
      <p className="mb-2 text-[15px] font-semibold text-[var(--color-ink)]">
        Não é elegível para reclamação neste momento
      </p>
      <p className="text-[13.5px] text-[var(--color-ink-muted)]">Enviámos os detalhes para o seu e-mail.</p>
    </div>
  );
}

function FormularioPassos({ erro }: { erro?: string }) {
  const [passo, setPasso] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [email, setEmail] = useState("");
  const [setor, setSetor] = useState<Setor | "">("");
  const [duracao, setDuracao] = useState<DuracaoContrato | "">("");
  const [empresaRespondeuBem, setEmpresaRespondeuBem] = useState<"sim" | "nao" | "">("");
  const [descricao, setDescricao] = useState("");

  return (
    <>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="setor" value={setor} />
      <input type="hidden" name="duracao_contrato" value={duracao} />
      <input type="hidden" name="empresa_respondeu_bem" value={empresaRespondeuBem} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
        Passo {passo + 1} de 5
      </p>

      {erro && <p className="text-sm text-[var(--color-status-danger)]">{erro}</p>}

      {passo === 0 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
            O seu e-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@exemplo.pt"
              className={INPUT_CLASS}
            />
          </label>
          <button
            type="button"
            disabled={!email}
            onClick={() => setPasso(1)}
            className={`self-start ${BOTAO_PRIMARIO}`}
          >
            Continuar
          </button>
        </div>
      )}

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
          <div className="flex gap-2">
            <button type="button" onClick={() => setPasso(0)} className="text-sm text-[var(--color-ink-muted)] underline">
              Voltar
            </button>
            <button
              type="button"
              disabled={!setor}
              onClick={() => setPasso(2)}
              className={`ml-auto ${BOTAO_PRIMARIO}`}
            >
              Continuar
            </button>
          </div>
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
              disabled={!duracao}
              onClick={() => setPasso(3)}
              className={`ml-auto ${BOTAO_PRIMARIO}`}
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
              disabled={!empresaRespondeuBem}
              onClick={() => setPasso(4)}
              className={`ml-auto ${BOTAO_PRIMARIO}`}
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
            Autorizo a DoLado a guardar estes dados para me contactar com o resultado.
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPasso(3)} className="text-sm text-[var(--color-ink-muted)] underline">
              Voltar
            </button>
            <button type="submit" className={`ml-auto ${BOTAO_PRIMARIO}`}>
              Verificar elegibilidade
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function SimuladorElegibilidadePublico() {
  const [state, formAction] = useActionState(criarVerificacaoElegibilidadePublica, ESTADO_INICIAL);
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback(() => {
    track("click_nav_elegibilidade");
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, closeForm]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <SiteHeader ctaLabel="Escrever a minha reclamação" onCtaClick={openForm} />

      <section className="mx-auto max-w-[600px] px-4 pt-14 pb-2 text-center sm:px-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-brand)]">
          Grátis · sem conta
        </p>
        <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Verifique se o seu caso é elegível
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          Responda a 5 perguntas rápidas. Alguns casos têm resposta imediata; outros passam por
          uma revisão nossa, com resposta no prazo máximo de 24 horas úteis.
        </p>
      </section>

      <section className="mx-auto max-w-[560px] px-4 pt-7 pb-[72px] sm:px-10">
        {state.fase === "resultado" ? (
          <ResultadoCard estado={state} />
        ) : (
          <form
            action={formAction}
            className="flex flex-col gap-4 rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-subtle)]"
          >
            <FormularioPassos erro={state.erro} />
          </form>
        )}
      </section>

      {formOpen && (
        <div
          onClick={closeForm}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(23,26,33,0.42)] px-4 py-8 sm:px-8"
        >
          <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-[640px] flex-none">
            <FormularioGuiado onClose={closeForm} onSuccess={trackFormSuccess} origem={origem} />
          </div>
        </div>
      )}
    </div>
  );
}
