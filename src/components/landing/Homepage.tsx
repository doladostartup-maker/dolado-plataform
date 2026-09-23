"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { AlertaFidelizacaoForm } from "./AlertaFidelizacaoForm";
import { FormularioGuiado } from "./FormularioGuiado";

const SETORES_CHIP = ["Telecomunicações", "Energia", "Água"];

const COMPARACAO = [
  {
    linha: "Saber que lei se aplica",
    sozinho: "Pesquisar e interpretar sozinho",
    dolado: "Citada no texto da reclamação",
  },
  {
    linha: "Escrever à empresa",
    sozinho: "Do zero, sem modelo",
    dolado: "Carta formal, revista consigo antes de enviar",
  },
  {
    linha: "Controlar prazos",
    sozinho: "De cabeça",
    dolado: "Acompanhados por nós, com aviso por e-mail",
  },
  {
    linha: "Quando a empresa não responde",
    sozinho: "Recomeçar noutro canal",
    dolado: "Escalamos com o histórico já organizado",
  },
];

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#porque-a-dolado", label: "Porquê a DoLado" },
  { href: "#quem-trata", label: "Quem trata" },
];

const CARTOES_VIGILANCIA = [
  {
    titulo: "Alerta de alteração de condições",
    texto:
      "Quando um prestador anuncia aumento de preços ou altera condições, a lei prevê, nos termos aplicáveis a cada setor, que o consumidor possa rescindir sem penalização dentro de um prazo. Avisamos-te quando isso acontece.",
  },
  {
    titulo: "Fim de fidelização",
    texto: "Registamos a data e avisamos-te antes de chegar, para decidires com tempo.",
  },
  {
    titulo: "Leitura de fatura",
    texto: "Envias a fatura, dizemos-te o que estás a pagar e que talvez não devesses.",
    emBreve: true,
  },
];

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

export function Homepage() {
  const [formOpen, setFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [origem] = useState(detectarOrigem);
  const painelRef = useRef<HTMLDivElement>(null);
  const hamburguerRef = useRef<HTMLButtonElement>(null);

  const openForm = useCallback(() => {
    track("click_tratar_caso");
    setFormOpen(true);
    setMenuOpen(false);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, closeForm]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onClickFora = (e: MouseEvent) => {
      if (
        painelRef.current &&
        !painelRef.current.contains(e.target as Node) &&
        !hamburguerRef.current?.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickFora);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickFora);
    };
  }, [menuOpen, closeMenu]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* Menu */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-hairline)] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/brand/dolado-logo-icon.svg" alt="" width={36} height={36} priority />
            <span className="text-[19px] font-bold tracking-tight">
              <span className="text-[var(--color-ink)]">Do</span>
              <span className="text-[var(--color-brand)]">Lado</span>
            </span>
          </Link>

          {/* Navegação — desktop */}
          <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="whitespace-nowrap text-[15px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/entrar"
              className="whitespace-nowrap text-[15px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Área do Utilizador
            </Link>
            <button type="button" onClick={openForm} className={BOTAO_PRIMARIO}>
              Contar o que aconteceu
            </button>
          </div>

          {/* Hambúrguer — mobile/tablet */}
          <button
            ref={hamburguerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--radius-input)] text-[var(--color-ink)] md:hidden"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M4 4L18 18M18 4L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Painel do menu — mobile/tablet */}
        {menuOpen && (
          <div
            ref={painelRef}
            className="flex flex-col gap-1 border-t border-[var(--color-hairline)] bg-white px-4 py-4 md:hidden"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={closeMenu}
                className="flex min-h-11 items-center text-[16px] font-medium text-[var(--color-ink)]"
              >
                {l.label}
              </a>
            ))}
            <div className="my-2 border-t border-[var(--color-hairline)]" />
            <Link
              href="/entrar"
              onClick={closeMenu}
              className="flex min-h-11 items-center text-[16px] font-medium text-[var(--color-ink)]"
            >
              Área do Utilizador
            </Link>
            <button
              type="button"
              onClick={openForm}
              className={`${BOTAO_PRIMARIO} mt-2 w-full`}
            >
              Contar o que aconteceu
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[720px] px-4 pb-16 pt-16 text-center sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
          {SETORES_CHIP.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded-[var(--radius-input)] bg-[var(--color-brand-wash)] px-2.5 py-1 text-[12px] font-semibold tracking-wide text-[var(--color-brand)]"
            >
              {s}
            </span>
          ))}
        </div>
        <h1 className="mb-5 text-[clamp(28px,6vw,var(--text-display))] font-semibold leading-[1.15] tracking-tight text-[var(--color-ink)]">
          Problema com a operadora, a luz ou a água? A DoLado trata do processo. A escolha é
          sua.
        </h1>
        <p className="mx-auto mb-8 max-w-[560px] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
          Identificamos a norma legal aplicável ao seu caso, preparamos a reclamação e
          acompanhamos o prazo de resposta. Pode enviá-la você mesmo ou autorizar-nos a
          submetê-la ao Livro de Reclamações. Nada sai sem a sua aprovação.
        </p>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={openForm} className={BOTAO_PRIMARIO} style={{ paddingInline: 24 }}>
            Contar o que aconteceu
          </button>
          <a href="#como-funciona" className={BOTAO_SECUNDARIO}>
            Ver como funciona
          </a>
        </div>
        <p className="text-[13px] text-[var(--color-ink-faint)]">
          Sem custo durante a fase piloto · Resposta no prazo máximo de 24 horas úteis
        </p>
      </section>

      {/* Posicionamento: vigilância */}
      <section className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto mb-12 max-w-[720px] text-center">
            <h2 className="mb-4 text-[26px] font-semibold leading-tight tracking-tight text-[var(--color-ink)] sm:text-[32px]">
              A DoLado é muito mais do que fazer reclamações. Não somos reativos. Somos
              vigilantes. Alguém que está atento por ti.
            </h2>
            <p className="text-[16px] leading-relaxed text-[var(--color-ink-muted)]">
              A maioria das pessoas não sabe que tem direito a alguma coisa, e o problema passa
              despercebido — um aumento anunciado em rodapé de fatura, uma fidelização que
              acaba sem ninguém dar por ela. A DoLado repara por ti.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {CARTOES_VIGILANCIA.map((c) => (
              <div
                key={c.titulo}
                className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-subtle)]"
              >
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-[16px] font-semibold text-[var(--color-ink)]">{c.titulo}</h3>
                  {c.emBreve && (
                    <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-muted)]">
                      Em breve
                    </span>
                  )}
                </div>
                <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário de aviso de fim de fidelização */}
      <section className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <h2 className="mb-3 text-[26px] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[32px]">
              Não deixe a fidelização acabar sem dar por isso.
            </h2>
            <p className="max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-ink-muted)]">
              Quem não repara no fim da fidelização fica preso a um contrato que podia ter
              mudado sem custo. Deixe-nos o seu e-mail e a operadora, e avisamos-lhe antes da
              data.
            </p>
          </div>
          <AlertaFidelizacaoForm />
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-20">
          <h2 className="mb-2 text-[28px] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[var(--text-heading-lg)]">
            Como funciona
          </h2>
          <p className="mb-10 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
            Conta uma vez. Preparamos a reclamação e a decisão de como avançar é sempre sua.
          </p>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Coluna esquerda */}
            <div className="flex flex-col gap-8">
              <div>
                <p className="mb-3 text-[15px] font-semibold text-[var(--color-ink)]">
                  1 · Conta-nos o que aconteceu
                </p>
                <MockFormularioPasso />
              </div>
              <div>
                <p className="mb-3 text-[15px] font-semibold text-[var(--color-ink)]">
                  2 · Preparamos a reclamação
                </p>
                <MockReclamacaoPreparada />
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                  Um texto factual, com a norma legal aplicável citada.
                </p>
              </div>
            </div>

            {/* Coluna direita */}
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <p className="text-[15px] font-semibold text-[var(--color-ink)]">
                  3 · Escolhe como avançar
                </p>
              </div>
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
                  <p className="mb-1 text-[14px] font-semibold text-[var(--color-ink)]">
                    a) Envia tu mesmo
                  </p>
                  <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                    Recebes o modelo pronto e envias à operadora.
                  </p>
                </div>
                <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
                  <p className="mb-1 text-[14px] font-semibold text-[var(--color-ink)]">
                    b) Autorizas-nos a submeter
                  </p>
                  <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                    Com a tua autorização, submetemos ao Livro de Reclamações por ti.
                  </p>
                </div>
              </div>

              <ol className="flex flex-col gap-5 border-l border-[var(--color-hairline)] pl-5">
                <li className="relative">
                  <span
                    className="absolute -left-[25px] top-1 h-3 w-3 rounded-full"
                    style={{ backgroundColor: "var(--color-status-pending)" }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--color-ink-faint)]">4</span>
                    <span
                      className="rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: "var(--color-status-pending-wash)", color: "var(--color-status-pending)" }}
                    >
                      15 dias úteis
                    </span>
                  </div>
                  <p className="mt-0.5 text-[14px] font-medium text-[var(--color-ink)]">
                    Acompanhamos o prazo legal de resposta
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                    No caso do Livro de Reclamações.
                  </p>
                </li>
                <li className="relative">
                  <span
                    className="absolute -left-[25px] top-1 h-3 w-3 rounded-full"
                    style={{ backgroundColor: "var(--color-status-success)" }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--color-ink-faint)]">5</span>
                    <span
                      className="rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: "var(--color-status-success-wash)", color: "var(--color-status-success)" }}
                    >
                      Dossiê entregue
                    </span>
                  </div>
                  <p className="mt-0.5 text-[14px] font-medium text-[var(--color-ink)]">
                    Entregamos o dossiê completo do caso
                  </p>
                </li>
              </ol>
            </div>
          </div>

          <p className="mt-10 text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
            A DoLado organiza os factos e cita a lei pública aplicável — não garante resolver o
            caso, obter reembolso, nem indica qual via seguir depois da entrega do dossiê. Essa
            decisão é sempre sua.
          </p>
        </div>
      </section>

      {/* Sozinho ou com a DoLado */}
      <section id="porque-a-dolado" className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-20">
        <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[var(--text-heading-lg)]">
          Sozinho ou com a DoLado
        </h2>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] shadow-[var(--shadow-subtle)]">
          <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
            <thead>
              <tr>
                <th className="bg-white px-4 py-3 font-semibold text-[var(--color-ink-muted)]" />
                <th className="bg-white px-4 py-3 font-semibold text-[var(--color-ink-muted)]">Sozinho</th>
                <th className="rounded-t-[var(--radius-card)] bg-[var(--color-brand)] px-4 py-3 font-semibold text-white">
                  Com a DoLado
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARACAO.map((linha) => (
                <tr key={linha.linha} className="border-t border-[var(--color-hairline)]">
                  <th className="bg-white px-4 py-3.5 font-medium text-[var(--color-ink)]">{linha.linha}</th>
                  <td className="bg-white px-4 py-3.5 text-[var(--color-ink-muted)]">{linha.sozinho}</td>
                  <td className="bg-[var(--color-brand-wash)] px-4 py-3.5 font-semibold text-[var(--color-brand)]">
                    ✓ {linha.dolado}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Porque criei a DoLado */}
      <section id="quem-trata" className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-20">
          <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[var(--text-heading-lg)]">
            Porque criei a DoLado
          </h2>
          <div className="grid items-center gap-8 sm:grid-cols-[200px_1fr] sm:gap-10">
            <Image
              src="/landing/founder-thiago.webp"
              alt="Thiago Pereira, fundador da DoLado"
              width={200}
              height={200}
              className="aspect-square w-full max-w-[200px] rounded-[var(--radius-panel)] object-cover"
            />
            <div className="max-w-[60ch]">
              <p className="text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
                Criei a DoLado depois de anos a ajudar familiares e amigos a resolver problemas
                com operadoras. Vi pessoas pagarem centenas de euros de penalização por falta de
                uma informação, quando bastava a prova certa no momento certo. Ninguém quer
                enganar a operadora: só quer um serviço de qualidade e pagar o que foi combinado.
                É por isso que trato cada caso pessoalmente.
              </p>
              <p className="mt-4 text-[15px] font-semibold text-[var(--color-ink)]">
                Thiago Pereira, fundador{" "}
                <span className="font-normal text-[var(--color-ink-muted)]">
                  · thiago.pereira@dolado.pt
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[640px] px-4 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="mb-2 text-[26px] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[32px]">
          Deixe de perseguir a sua própria reclamação.
        </h2>
        <p className="mb-6 text-[15px] text-[var(--color-ink-muted)]">
          Cerca de 5 minutos. Sem custo durante a fase piloto.
        </p>
        <button type="button" onClick={openForm} className={BOTAO_PRIMARIO} style={{ paddingInline: 24 }}>
          Contar o que aconteceu
        </button>
        <p className="mx-auto mt-5 max-w-[48ch] text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
          A DoLado não é um escritório de advogados: não presta aconselhamento jurídico, não
          representa em tribunal e não garante o resultado. Organiza os factos, cita a lei
          pública aplicável e acompanha os prazos.
        </p>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-[var(--color-ink-muted)] sm:px-8">
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

function MockFormularioPasso() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4 shadow-[var(--shadow-subtle)]"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
        Passo 2 de 5
      </p>
      <p className="mb-3 text-[14px] font-semibold text-[var(--color-ink)]">O que aconteceu?</p>
      <div className="mb-2 rounded-[var(--radius-button)] border border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-3 py-2 text-[13px] font-medium text-[var(--color-brand)]">
        Aumento de mensalidade
      </div>
      <div className="mb-3 rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-[13px] text-[var(--color-ink-faint)]">
        Cobrança indevida
      </div>
      <div className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        A mensalidade subiu a meio da fidelização e ninguém me avisou.
      </div>
    </div>
  );
}

function MockReclamacaoPreparada() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white p-4 shadow-[var(--shadow-subtle)]"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
        Reclamação preparada
      </p>
      <p className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">
        Assunto: Aumento de mensalidade sem aviso prévio
      </p>
      <div className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-3 py-2.5 font-serif text-[13px] italic leading-relaxed text-[var(--color-ink-muted)]">
        &ldquo;Nos termos da lei aplicável às comunicações eletrónicas, o consumidor tem direito
        a ser informado com a antecedência devida de qualquer alteração das condições
        contratuais…&rdquo;
      </div>
    </div>
  );
}

