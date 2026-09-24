"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { FormularioGuiado } from "./FormularioGuiado";
import { SiteHeader } from "./SiteHeader";

type Funcionalidade = {
  icone: string;
  badge: "DISPONÍVEL" | "EM BREVE";
  titulo: string;
  descricao: string;
  tracejado?: boolean;
};

const FUNCIONALIDADES: Funcionalidade[] = [
  {
    icone: "📝",
    badge: "DISPONÍVEL",
    titulo: "Gestão de Casos",
    descricao: "Abertura guiada, identificação da lei aplicável e carta pronta a enviar.",
  },
  {
    icone: "⏰",
    badge: "DISPONÍVEL",
    titulo: "Alertas",
    descricao: "Fim de fidelização já disponível; fim de período promocional em breve.",
  },
  {
    icone: "📢",
    badge: "EM BREVE",
    titulo: "Aviso Sectorial",
    descricao: "Alertamos quando o seu operador anuncia subida de preços no setor.",
  },
  {
    icone: "📊",
    badge: "EM BREVE",
    titulo: "Comparador de Faturas",
    descricao: "Compare a fatura com o mês anterior e detete cobranças fora do padrão.",
  },
  {
    icone: "🧑‍🤝‍🧑",
    badge: "EM BREVE",
    titulo: "Simulador de Elegibilidade",
    descricao: "Convide um amigo a verificar se também tem direito a reclamar.",
  },
  {
    icone: "➕",
    badge: "EM BREVE",
    titulo: "Outros",
    descricao: "Mais setores e outras funcionalidades ainda em estudo.",
    tracejado: true,
  },
];

const FAQS = [
  {
    q: "Isto substitui um advogado?",
    a: "Não. Prestamos apoio administrativo — organização e citação da lei. Para estratégia jurídica ou representação formal, precisa de um advogado.",
  },
  {
    q: "E se a empresa não responder?",
    a: "Escalamos para o Livro de Reclamações em seu nome, com a sua autorização prévia.",
  },
  {
    q: "Vocês assinam ou representam-me legalmente?",
    a: "Não. Identificamo-nos sempre como a agir em seu nome numa reclamação administrativa — nunca como seus representantes legais.",
  },
];

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)]";

export function Homepage() {
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback((origemClique: string) => {
    track(origemClique);
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
      {/* ===== Secção 1: Nav + Hero ===== */}
      <SiteHeader
        ctaLabel="Escrever a minha reclamação"
        onCtaClick={() => openForm("click_nav_reclamacao")}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-30"
          style={{
            background: "radial-gradient(600px 300px at 50% 0%, var(--color-brand-wash), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-[1120px] gap-10 px-4 py-16 sm:px-10 sm:py-20 lg:grid-cols-[460px_1fr] lg:items-center lg:gap-16">
          {/* Coluna esquerda */}
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
              Telecom · Energia · Água &amp; Resíduos
            </p>
            <h1 className="mb-5 text-[clamp(30px,4.6vw,46px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--color-ink)]">
              A sua reclamação, escrita com a lei do seu lado.
            </h1>
            <p className="mb-8 text-base leading-relaxed text-[var(--color-ink-muted)]">
              O DoLado identifica a lei aplicável ao seu caso e escreve a carta, citando o
              artigo certo. Você envia a partir do seu e-mail — nós ficamos em cópia e tratamos
              da escalada, se for preciso.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => openForm("click_hero_reclamacao")} className={BOTAO_PRIMARIO}>
                Escrever a minha reclamação
              </button>
              <Link href="/como-funciona" className={BOTAO_SECUNDARIO}>
                Ver como funciona
              </Link>
            </div>
            <p className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-faint)]">
              <span className="text-[var(--color-brand)]">✓</span>
              Resposta ao primeiro contacto em até 24 horas úteis
            </p>
          </div>

          {/* Coluna direita — vídeo */}
          <div>
            <p className="mb-3 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)] lg:text-left">
              Veja o DoLado a escrever a sua reclamação
            </p>
            <div className="relative flex h-[320px] items-center justify-center rounded-[var(--radius-panel)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
              <button
                type="button"
                aria-label="Reproduzir vídeo de demonstração"
                onClick={() => track("click_play_demo")}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand)] text-white transition hover:bg-[var(--color-brand-hover)]"
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M7 5.5L17 11L7 16.5V5.5Z" fill="currentColor" />
                </svg>
              </button>
              <span className="absolute bottom-3 right-3 rounded-[var(--radius-input)] bg-black/60 px-2 py-0.5 text-[11.5px] font-medium text-white">
                2:14
              </span>
            </div>
            <p className="mt-3 text-center text-[12.5px] text-[var(--color-ink-faint)] lg:text-left">
              Do relato do problema à carta pronta a enviar, sem cortes.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Secção 2: Funcionalidades ===== */}
      <section className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-10">
          <p className="mb-8 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">
            Funcionalidades
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONALIDADES.map((f) => (
              <div
                key={f.titulo}
                className={`rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-[22px] ${
                  f.badge === "DISPONÍVEL"
                    ? "border-[var(--color-hairline)] shadow-[var(--shadow-subtle)]"
                    : f.tracejado
                      ? "border-dashed border-[var(--color-hairline-strong)] opacity-70"
                      : "border-[var(--color-hairline-strong)] opacity-85"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-wash)] text-base">
                    {f.icone}
                  </span>
                  <span
                    className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-semibold ${
                      f.badge === "DISPONÍVEL"
                        ? "bg-[var(--color-brand-wash)] text-[var(--color-brand)]"
                        : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-faint)]"
                    }`}
                  >
                    {f.badge}
                  </span>
                </div>
                <p className="mb-1.5 text-[14.5px] font-semibold text-[var(--color-ink)]">{f.titulo}</p>
                <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{f.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Secção 3: Preçário ===== */}
      <section id="precario" className="mx-auto max-w-[1120px] px-4 py-16 sm:px-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">
          Preçário
        </p>
        <p className="mb-6 text-[13.5px] text-[var(--color-ink-faint)]">
          Preços de lançamento — sujeitos a alteração.
        </p>
        <div className="mb-8 rounded-[10px] bg-[var(--color-brand-wash)] p-3 text-[13.5px] font-medium text-[var(--color-brand)]">
          🎁 Quem paga o Avulso leva 1 mês grátis das funcionalidades da Assinatura.
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Avulso */}
          <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-subtle)]">
            <p className="text-[15px] font-semibold text-[var(--color-ink)]">Avulso</p>
            <p className="mb-4 text-[12.5px] text-[var(--color-ink-muted)]">
              Pague uma vez, resolva um caso.
            </p>
            <p className="mb-5">
              <span className="font-serif text-[32px] font-medium text-[var(--color-ink)]">14,99 €</span>
              <span className="text-[12.5px] text-[var(--color-ink-muted)]"> / reclamação</span>
            </p>
            <ul className="mb-6 flex flex-col gap-2.5 text-[12.5px] text-[var(--color-ink)]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--color-brand)]">✓</span>
                Abertura de caso guiada
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--color-brand)]">✓</span>
                Carta com lei aplicável
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--color-brand)]">✓</span>
                Escalada ao Livro de Reclamações
              </li>
              <li className="flex items-start gap-2">
                <span>🎁</span>
                1 mês grátis de Assinatura incluído
              </li>
            </ul>
            <button
              type="button"
              onClick={() => openForm("click_precario_avulso")}
              className={`${BOTAO_SECUNDARIO} w-full text-[13.5px]`}
            >
              Escrever a minha reclamação
            </button>
          </div>

          {/* Assinatura Mensal */}
          <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-brand)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-md)]">
            <p className="text-[15px] font-semibold text-[var(--color-ink)]">Assinatura Mensal</p>
            <p className="mb-4 text-[12.5px] text-[var(--color-ink-muted)]">
              Proteção contínua, mesmo sem reclamação ativa.
            </p>
            <p className="mb-5">
              <span className="font-serif text-[32px] font-medium text-[var(--color-ink)]">7,99 €</span>
              <span className="text-[12.5px] text-[var(--color-ink-muted)]"> / mês</span>
            </p>
            <ul className="mb-6 flex flex-col gap-2.5 text-[12.5px] text-[var(--color-ink)]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--color-brand)]">✓</span>
                Tudo do avulso, mais
              </li>
              {[
                "Alerta de fim de fidelização",
                "Alerta de fim de promoção",
                "Aviso sectorial de aumento anual",
                "Comparador de faturas mês a mês",
                "Simulador de elegibilidade",
                "Mais setores a partir do 2.º mês",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-brand)]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => openForm("click_precario_assinatura")}
              className={`${BOTAO_PRIMARIO} w-full text-[13.5px] font-semibold`}
            >
              Subscrever
            </button>
          </div>
        </div>
      </section>

      {/* ===== Secção 4: FAQ ===== */}
      <section className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-10">
          <p className="mb-8 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">
            Perguntas frequentes
          </p>
          <div className="flex flex-col border-t border-[var(--color-hairline)]">
            {FAQS.map((f, i) => (
              <div
                key={f.q}
                className={`py-6 ${i < FAQS.length - 1 ? "border-b border-[var(--color-hairline)]" : ""}`}
              >
                <p className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">{f.q}</p>
                <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Secção 6: Faixa de transparência legal ===== */}
      <section id="transparencia" className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-10">
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] px-5 py-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
            Não garantimos resolver — garantimos que a reclamação chega bem feita, com a lei
            certa citada. A DoLado presta apoio administrativo, nunca aconselhamento jurídico
            individualizado.
          </p>
        </div>
      </section>

      {/* ===== Secção 7: CTA final ===== */}
      <section id="quem-trata" className="border-t border-[var(--color-hairline)] px-4 py-16 text-center sm:px-10">
        <h2 className="mb-5 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Tem um problema com uma empresa?
        </h2>
        <button
          type="button"
          onClick={() => openForm("click_cta_final")}
          className={`${BOTAO_PRIMARIO} text-[14px] font-semibold`}
        >
          Escrever a minha reclamação
        </button>
      </section>

      {/* Rodapé */}
      <footer id="contacto" className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-[var(--color-ink-muted)] sm:px-10">
          <span>
            © 2026 DoLado · Competent Domain – Consultoria em Informática Unipessoal Lda · NIPC
            515609773 · Lisboa
          </span>
          <span className="flex gap-4">
            <Link href="/termos" className="hover:text-[var(--color-brand)]">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-[var(--color-brand)]">
              Privacidade
            </Link>
          </span>
        </div>
      </footer>

      {/* Modal do formulário */}
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
