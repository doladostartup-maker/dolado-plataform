"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { criarLeadPublico, type EstadoLead } from "@/app/actions/leads";

const SETOR_LABELS: Record<string, string> = {
  telecom: "Telecomunicações",
  energia: "Energia",
  agua: "Água/Resíduos",
};

const TIPOS_POR_SETOR: Record<string, string[]> = {
  telecom: [
    "Cancelamento sem penalização",
    "Penalização de fidelização cobrada indevidamente",
    "Mudança de operador/portabilidade não executada",
    "Avaria ou indisponibilidade >24h",
    "Cobrança de serviços não autorizados",
  ],
  energia: ["Faturação indevida", "Erro de leitura ou consumo", "Cobrança retroativa injustificada"],
  agua: ["Faturação irregular", "Corte indevido de fornecimento", "Erro de leitura"],
};

function validNome(v: string) {
  return v.trim().length >= 3 && !/\d/.test(v);
}
function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validPhone(v: string) {
  if (v.trim() === "") return true;
  let n = v.replace(/[^\d+]/g, "");
  if (n.indexOf("+351") === 0) n = n.slice(4);
  else if (n.indexOf("351") === 0 && n.length > 9) n = n.slice(3);
  return /^9\d{8}$/.test(n);
}

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3.5 py-3 text-[var(--text-body)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-wash)]";
const LABEL_CLASS = "mb-2 block text-[var(--text-body-sm)] font-semibold text-[var(--color-ink-muted)]";
const NEXT_BTN =
  "flex-1 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-5 py-3 text-[var(--text-body)] font-semibold text-white transition hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40";
const BACK_BTN =
  "rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-white px-5 py-3 text-[var(--text-body)] font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-40";

const ESTADO_INICIAL: EstadoLead = { ok: false };

export function IntakeForm({
  onSubmitted,
  onSuccess,
}: {
  onSubmitted?: () => void;
  onSuccess?: (dados: { email: string; setor: string }) => void;
}) {
  const [state, formAction, pending] = useActionState(criarLeadPublico, ESTADO_INICIAL);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [setor, setSetor] = useState("");
  const [tipoProblema, setTipoProblema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const notificado = useRef(false);

  const tipos = useMemo(() => TIPOS_POR_SETOR[setor] ?? [], [setor]);

  useEffect(() => {
    if (state.ok && !notificado.current) {
      notificado.current = true;
      onSuccess?.({ email, setor });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve disparar quando state.ok muda para true
  }, [state.ok]);

  if (state.ok) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-full bg-[var(--color-brand-wash)] text-[22px] font-bold text-[var(--color-brand)]">
          ✓
        </div>
        <h3 className="mb-2 text-[var(--text-heading-sm)] font-bold text-[var(--color-ink)]">
          Reclamação registada!
        </h3>
        <p className="mb-6 text-[var(--text-body)] text-[var(--color-ink-muted)]">
          Vamos acompanhar o seu caso. Em breve entraremos em contacto por e-mail ou telefone.
        </p>
        {onSubmitted && (
          <button type="button" onClick={onSubmitted} className={NEXT_BTN} style={{ flex: "none" }}>
            Fechar
          </button>
        )}
      </div>
    );
  }

  const passo1Ok = !!setor && !!tipoProblema;
  const passo2Ok = validNome(nome) && validEmail(email) && validPhone(telefone);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-[var(--color-hairline)]">
        <div
          className="h-full bg-[var(--color-brand)] transition-all duration-300"
          style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "99%" }}
        />
      </div>

      {/* Campos ocultos — o form é submetido de uma vez só, no passo 3 */}
      <input type="hidden" name="setor" value={setor} />
      <input type="hidden" name="tipo_problema" value={tipoProblema} />

      {step === 1 && (
        <section>
          <div className="mb-4 text-[var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            Passo 1 de 3 — Triagem do problema
          </div>

          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="setor-select">
              Setor
            </label>
            <select
              id="setor-select"
              className={INPUT_CLASS}
              value={setor}
              onChange={(e) => {
                setSetor(e.target.value);
                setTipoProblema("");
              }}
            >
              <option value="">Selecione o setor...</option>
              {Object.entries(SETOR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="tipo-select">
              Tipo de Problema
            </label>
            <select
              id="tipo-select"
              className={INPUT_CLASS}
              value={tipoProblema}
              onChange={(e) => setTipoProblema(e.target.value)}
              disabled={!setor}
            >
              <option value="">
                {setor ? "Selecione o tipo..." : "Selecione primeiro o setor..."}
              </option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="descricao-field">
              Descrição (opcional)
            </label>
            <textarea
              id="descricao-field"
              name="descricao"
              maxLength={500}
              rows={3}
              placeholder="Descreva brevemente (máx. 500 caracteres)"
              className={INPUT_CLASS}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
            <div className="mt-1 text-right text-[var(--text-caption)] text-[var(--color-ink-faint)]">
              {descricao.length} / 500
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              className={NEXT_BTN}
              style={{ flex: "none" }}
              disabled={!passo1Ok}
              onClick={() => setStep(2)}
            >
              Próximo →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <div className="mb-4 text-[var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            Passo 2 de 3 — Dados de contacto
          </div>

          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="nome-field">
              Nome Completo
            </label>
            <input
              id="nome-field"
              name="nome"
              type="text"
              placeholder="Ex: João Silva"
              className={INPUT_CLASS}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() => setTocado((t) => ({ ...t, nome: true }))}
            />
            {tocado.nome && !validNome(nome) && (
              <p className="mt-1.5 text-[var(--text-caption)] text-[var(--color-status-danger)]">
                Insira um nome válido.
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="email-field">
              E-mail
            </label>
            <input
              id="email-field"
              name="email"
              type="email"
              placeholder="Ex: joao@email.com"
              className={INPUT_CLASS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTocado((t) => ({ ...t, email: true }))}
            />
            {tocado.email && !validEmail(email) && (
              <p className="mt-1.5 text-[var(--text-caption)] text-[var(--color-status-danger)]">
                E-mail inválido.
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className={LABEL_CLASS} htmlFor="telefone-field">
              Telefone <span className="font-normal normal-case text-[var(--color-ink-faint)]">(opcional)</span>
            </label>
            <input
              id="telefone-field"
              name="telefone"
              type="tel"
              placeholder="Ex: 919 999 999"
              className={INPUT_CLASS}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              onBlur={() => setTocado((t) => ({ ...t, telefone: true }))}
            />
            {tocado.telefone && !validPhone(telefone) && (
              <p className="mt-1.5 text-[var(--text-caption)] text-[var(--color-status-danger)]">
                Telefone inválido (formato: 9xx xxx xxx).
              </p>
            )}
          </div>

          <div className="mt-2 flex justify-between gap-3">
            <button type="button" className={BACK_BTN} onClick={() => setStep(1)}>
              ← Voltar
            </button>
            <button
              type="button"
              className={NEXT_BTN}
              disabled={!passo2Ok}
              onClick={() => setStep(3)}
            >
              Próximo →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <div className="mb-4 text-[var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            Passo 3 de 3 — Consentimento &amp; submissão
          </div>

          <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-brand-wash)] px-4.5 py-4 text-[var(--text-body-sm)] leading-relaxed text-[var(--color-ink)]">
            <div>
              <strong>Setor:</strong> {SETOR_LABELS[setor] ?? "-"}
            </div>
            <div>
              <strong>Problema:</strong> {tipoProblema}
            </div>
            <div>
              <strong>Contacto:</strong> {nome} ({email}
              {telefone.trim() ? `, ${telefone}` : ""})
            </div>
          </div>

          <input type="hidden" name="nome" value={nome} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="telefone" value={telefone} />
          <input type="hidden" name="descricao" value={descricao} />

          <div className="mb-2">
            <label className="flex items-start gap-2.5 text-[var(--text-body-sm)] leading-relaxed text-[var(--color-ink-muted)]">
              <input
                type="checkbox"
                name="autorizacao"
                checked={rgpd}
                onChange={(e) => setRgpd(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 flex-none accent-[var(--color-brand)]"
              />
              <span>
                Li e aceito a{" "}
                <Link href="/privacidade" target="_blank" rel="noopener" className="text-[var(--color-brand)] underline">
                  Política de Privacidade
                </Link>
              </span>
            </label>
          </div>

          {state.erro && (
            <p className="mb-2 text-center text-[var(--text-caption)] text-[var(--color-status-danger)]">
              {state.erro}
            </p>
          )}

          <div className="mt-4 flex justify-between gap-3">
            <button type="button" className={BACK_BTN} onClick={() => setStep(2)} disabled={pending}>
              ← Voltar
            </button>
            <button
              type="submit"
              className={NEXT_BTN}
              disabled={!rgpd || pending}
              onClick={() => {
                if (typeof window !== "undefined" && typeof window.gtag === "function") {
                  window.gtag("event", "form_submit", {
                    event_category: "engagement",
                    event_label: "landing_form",
                    setor,
                  });
                }
              }}
            >
              {pending ? "A enviar..." : "Quero que a DoLado trate do meu problema"}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
