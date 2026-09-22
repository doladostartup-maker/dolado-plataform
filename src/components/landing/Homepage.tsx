"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { detectarOrigem, track, trackFormSuccess } from "@/lib/analytics";
import { FormularioGuiado } from "./FormularioGuiado";

const SETORES_CHIP = ["Telecomunicações", "Energia", "Água"];

const TIMELINE = [
  {
    dia: "Dia 1",
    titulo: "Caso recebido e texto aprovado por si",
    estado: "success" as const,
  },
  {
    dia: "Dia 2",
    titulo: "Reclamação enviada à operadora, com a lei citada",
    texto: "Pedido de reposição do preço contratado e devolução do valor cobrado a mais.",
    estado: "success" as const,
  },
  {
    dia: "Dia 12",
    titulo: "Prazo de resposta a terminar",
    tag: "Urgente",
    texto: "Avisamos: a operadora ainda não respondeu.",
    estado: "urgent" as const,
  },
  {
    dia: "Dia 16",
    titulo: "Escalado para o Livro de Reclamações, com autorização sua",
    texto: "Seguiu o histórico completo: contrato, faturas, reclamação e prova de envio.",
    estado: "success" as const,
  },
  {
    dia: "Dia 24",
    titulo: "A operadora respondeu com uma proposta",
    tag: "Em curso",
    texto: "Enviamos-lhe a proposta explicada. Aceitar ou recusar é decisão sua.",
    estado: "pending" as const,
  },
  {
    dia: "Dia 26",
    titulo: "Aceitou: mensalidade reposta",
    tag: "Resolvido",
    texto: "Caso encerrado. Recebe o dossiê com todo o histórico.",
    estado: "success" as const,
  },
];

const ESTADO_COR: Record<"success" | "urgent" | "pending", string> = {
  success: "var(--color-status-success)",
  urgent: "var(--color-status-urgent)",
  pending: "var(--color-status-pending)",
};

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

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

export function Homepage() {
  const [formOpen, setFormOpen] = useState(false);
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback(() => {
    track("click_tratar_caso");
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
      {/* Menu */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-hairline)] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2.5 px-4 py-3 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/brand/dolado-logo-icon.svg" alt="" width={36} height={36} priority />
            <span className="text-[19px] font-bold tracking-tight">
              <span className="text-[var(--color-ink)]">Do</span>
              <span className="text-[var(--color-brand)]">Lado</span>
            </span>
          </Link>
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
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
          <div className="flex items-center gap-3">
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
        </div>
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
          Problema com a operadora, a luz ou a água? A DoLado trata da reclamação por si.
        </h1>
        <p className="mx-auto mb-8 max-w-[560px] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
          Identificamos a lei que a empresa não cumpriu, enviamos uma reclamação formal em seu
          nome e acompanhamos os prazos até haver resposta. Nada é enviado sem a sua autorização.
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

      {/* Como funciona, num caso tipo */}
      <section id="como-funciona" className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-20">
          <h2 className="mb-2 text-[28px] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[var(--text-heading-lg)]">
            Como funciona, num caso tipo
          </h2>
          <p className="mb-10 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
            Conte uma vez. Confirmamos consigo, enviamos e dizemos-lhe sempre em que ponto está.
          </p>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Coluna esquerda */}
            <div className="flex flex-col gap-8">
              <div>
                <p className="mb-3 text-[15px] font-semibold text-[var(--color-ink)]">
                  1 · Preencha o formulário, em cerca de 5 minutos
                </p>
                <MockPassoFormulario />
              </div>
              <div>
                <p className="mb-3 text-[15px] font-semibold text-[var(--color-ink)]">
                  2 · Resposta pessoal por e-mail, no prazo máximo de 24 horas úteis
                </p>
                <MockEmailResposta />
                <p className="mt-3 text-[14px] font-medium text-[var(--color-brand)]">
                  Resposta do cliente: &ldquo;Sim, autorizo o envio.&rdquo;
                </p>
              </div>
            </div>

            {/* Coluna direita */}
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <p className="text-[15px] font-semibold text-[var(--color-ink)]">
                  3 · Receba um e-mail a cada passo
                </p>
                <span className="inline-flex items-center rounded-[var(--radius-input)] bg-[var(--color-brand-wash)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-brand)]">
                  Telecomunicações
                </span>
              </div>
              <p className="mb-5 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
                O mesmo caso, quando a operadora não responde à primeira: do &ldquo;Sim,
                autorizo&rdquo; até à mensalidade reposta.
              </p>
              <ol className="flex flex-col gap-5 border-l border-[var(--color-hairline)] pl-5">
                {TIMELINE.map((item) => (
                  <li key={item.dia} className="relative">
                    <span
                      className="absolute -left-[25px] top-1 h-3 w-3 rounded-full"
                      style={{ backgroundColor: ESTADO_COR[item.estado] }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-[var(--color-ink-faint)]">
                        {item.dia}
                      </span>
                      {item.tag && (
                        <span
                          className="rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${ESTADO_COR[item.estado]} 14%, white)`,
                            color: ESTADO_COR[item.estado],
                          }}
                        >
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[14px] font-medium text-[var(--color-ink)]">{item.titulo}</p>
                    {item.texto && (
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                        {item.texto}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="mt-10 text-[13px] text-[var(--color-ink-faint)]">
            Ilustração de um caso tipo, não um caso real. Os prazos variam por setor e por
            empresa.
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

function MockPassoFormulario() {
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

function MockEmailResposta() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white shadow-[var(--shadow-subtle)]"
    >
      <div className="border-b border-[var(--color-hairline)] px-4 py-3">
        <p className="text-[12px] text-[var(--color-ink-faint)]">
          De: Thiago Pereira · thiago.pereira@dolado.pt
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-ink)]">
          O seu pedido: aumento de mensalidade
        </p>
      </div>
      <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        Obrigado. Confirmei as datas do seu contrato. Segue em anexo o texto que proponho enviar
        à empresa — só avanço com a sua autorização.
      </div>
    </div>
  );
}
