"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaqAccordion } from "./FaqAccordion";
import { IntakeForm } from "./IntakeForm";

function track(nome: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", nome);
  }
}

async function sha256(str: string) {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PROBLEMAS = [
  {
    titulo: "Meses sem facturas e agora uma conta enorme.",
    texto: "Organizamos os factos e enviamos a sua reclamação por escrito.",
  },
  {
    titulo: "Quer cancelar e só lhe dão voltas.",
    texto: "Formalizamos o pedido para ficar tudo registado.",
  },
  {
    titulo: "Está a pagar por algo que não pediu.",
    texto: "Reunimos os documentos e reclamamos por si.",
  },
];

const OFERTA = [
  {
    numero: 1,
    titulo: "Identificamos o direito aplicável",
    texto: "Cancelamento sem penalização, acerto de facturação, reembolso por avaria — o que a lei já lhe dá.",
  },
  {
    numero: 2,
    titulo: "Reclamamos em seu nome",
    texto: "Reclamação escrita com base legal, factos e datas, enviada pelo canal formal correcto.",
  },
  {
    numero: 3,
    titulo: "Acompanhamos até à resposta",
    texto: "Vigiamos o prazo legal, avisamos em cada passo e preparamos o passo seguinte se não houver resposta.",
  },
];

const PASSOS = [
  {
    label: "Passo 1",
    titulo: "Conte-nos o que aconteceu",
    texto: "Cinco minutos. Diga-nos o sector, o que aconteceu e como o contactar. Não precisa de anexar nada já.",
  },
  {
    label: "Passo 2",
    titulo: "Entramos em contacto",
    texto: "Escrevemos-lhe por email ou telefone a pedir a factura ou o contrato, se for preciso, e explicamos onde está o seu direito.",
  },
  {
    label: "Passo 3",
    titulo: "Preparamos a reclamação",
    texto: "Escrevemos o texto, com a lei citada, e mostramos-lhe antes de enviar.",
  },
  {
    label: "Passo 4",
    titulo: "Acompanhamos até à resposta",
    texto: "Vigiamos o prazo legal e avisamos a cada passo.",
  },
];

const SETORES = [
  {
    chip: "Telecomunicações",
    titulo: "A MEO não a deixa cancelar sem multa?",
    itens: [
      "Penalização de fidelização cobrada fora do prazo ou com valor errado",
      "Portabilidade não executada ou atrasada pelo novo operador",
      "Avaria superior a 24h sem crédito automático na factura",
    ],
  },
  {
    chip: "Energia",
    titulo: "A factura da Galp disparou sem explicação?",
    itens: [
      "Acerto retroactivo que junta vários meses numa factura só",
      "Subida de preço sem aviso prévio",
      "Corte de fornecimento sem os 20 dias de pré-aviso obrigatórios",
    ],
  },
  {
    chip: "Água / Resíduos",
    titulo: "A EPAL cortou-lhe a água sem aviso?",
    itens: [
      "Facturação irregular por alteração de periodicidade sem o seu consentimento",
      "Interrupção superior a 24h sem fornecimento alternativo",
      "Herança de dívida de um contrato anterior que não é sua",
    ],
  },
];

export function Landing() {
  const [formOpen, setFormOpen] = useState(false);

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

  const handleLeadSuccess = useCallback(async ({ email, setor }: { email: string; setor: string }) => {
    const vals = { form_name: "complaint_form", setor: setor || "not_provided" };
    try {
      const hash = email ? await sha256(email.trim().toLowerCase()) : null;
      if (hash && typeof window.gtag === "function") {
        window.gtag("set", "user_data", { sha256_email_address: hash });
      }
    } catch {
      /* nunca bloquear a conversão */
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", "submit_complaint", { event_category: "conversion", event_label: "landing_form", ...vals });
    }
    (window.dataLayer = window.dataLayer || []).push({ event: "dolado_form_submit", ...vals });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2.5 px-4 py-3 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/brand/dolado-logo-icon.svg" alt="" width={40} height={40} priority />
            <span className="text-[21px] font-bold tracking-tight">
              <span className="text-[var(--color-ink)]">Do</span>
              <span className="text-[var(--color-brand)]">Lado</span>
            </span>
          </Link>
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
            <a
              href="#como-funciona"
              onClick={() => track("click_como_funciona")}
              className="whitespace-nowrap text-[15px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Como funciona
            </a>
            <a href="#sectores" className="whitespace-nowrap text-[15px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              Sectores
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/entrar"
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] border border-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand-wash)]"
            >
              Área do Utilizador
            </Link>
            <button
              type="button"
              onClick={openForm}
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
            >
              Conte-nos o que aconteceu
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto mb-8 text-center sm:mb-9">
          <h1 className="text-[clamp(26px,6.4vw,50px)] font-bold leading-[1.14] tracking-tight text-[var(--color-ink)]">
            Farto de ligar, esperar e
            <br />
            ninguém resolver?
          </h1>
        </div>
        <div className="mx-auto mb-10 max-w-[52ch] text-center sm:mb-14">
          <p className="mb-2 text-[18px] font-semibold text-[var(--color-ink)] sm:text-[20px]">
            Sem filas nem chamadas. Acompanhamos o caso por si.
          </p>
          <p className="text-[17px] leading-relaxed text-[var(--color-ink-muted)] sm:text-[20px]">
            A DoLado escreve e envia a sua reclamação formal a qualquer empresa de
            telecomunicações ou energia — como MEO, NOS, Vodafone, Galp ou EDP.
          </p>
        </div>
        <div className="mx-auto mb-14 flex max-w-[520px] flex-col items-center gap-3.5 sm:mb-16">
          <button
            type="button"
            onClick={openForm}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-7 text-[17px] font-semibold text-white shadow-[var(--shadow-md)] hover:bg-[var(--color-brand-hover)] sm:w-auto"
          >
            Conte-nos o que aconteceu
          </button>
          <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-brand-wash)] px-3 py-1 text-[13px] font-semibold text-[var(--color-brand)]">
            Gratuito durante o Beta
          </span>
        </div>

        <div className="mx-auto mb-16 grid max-w-[1000px] gap-5 sm:mb-20 sm:grid-cols-3">
          {PROBLEMAS.map((p) => (
            <div key={p.titulo} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6">
              <div className="mb-2 text-[16px] font-semibold leading-snug">{p.titulo}</div>
              <div className="text-[15px] leading-relaxed text-[var(--color-ink-muted)]">{p.texto}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-5 text-center text-[13px] font-bold uppercase tracking-wider text-[var(--color-brand)]">
            O que fazemos por si
          </div>
          <div className="mx-auto grid max-w-[1000px] gap-5 sm:grid-cols-3">
            {OFERTA.map((o) => (
              <div key={o.numero} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6">
                <div className="mb-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-wash)] text-[14px] font-bold text-[var(--color-brand)]">
                  {o.numero}
                </div>
                <div className="mb-1.5 text-[16px] font-semibold">{o.titulo}</div>
                <div className="text-[15px] leading-relaxed text-[var(--color-ink-muted)]">{o.texto}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="border-y border-[var(--color-hairline)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-22">
          <p className="mb-5 max-w-[62ch] text-[15px] font-semibold leading-relaxed text-[var(--color-brand)]">
            O seu direito está escrito na lei — nós citamo-la, palavra por palavra, na sua
            reclamação. Não é opinião, é o artigo certo da Lei das Comunicações Electrónicas,
            do regime da ERSE, ou do Regulamento da ERSAR, conforme o seu caso.
          </p>
          <h2 className="mb-3.5 max-w-[26ch] text-[26px] font-bold tracking-tight text-[var(--color-ink)] sm:text-[34px]">
            Você conta uma vez. O resto é nosso.
          </h2>
          <p className="mb-10 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-ink-muted)] sm:mb-12">
            Não tem de estudar a lei, escrever cartas nem perseguir a empresa ao telefone.
            Depois de nos contar o caso, tratamos do processo do princípio ao fim.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
            {PASSOS.map((p) => (
              <div key={p.label}>
                <div className="mb-3.5 text-[13px] font-bold tracking-wider text-[var(--color-brand)]">{p.label}</div>
                <div className="mb-2 text-[18px] font-semibold leading-snug">{p.titulo}</div>
                <div className="text-[15px] leading-relaxed text-[var(--color-ink-muted)]">{p.texto}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quem trata do caso */}
      <section className="mx-auto max-w-[1120px] px-4 py-16 sm:px-8 sm:py-22">
        <h2 className="mb-8 text-[26px] font-bold tracking-tight text-[var(--color-ink)] sm:mb-9 sm:text-[34px]">
          Quem trata do seu caso
        </h2>
        <div className="grid items-center gap-8 sm:grid-cols-[200px_1fr] sm:gap-10">
          <Image
            src="/landing/founder-thiago.png"
            alt="Thiago, fundador da DoLado"
            width={200}
            height={200}
            className="aspect-square w-full max-w-[200px] rounded-[var(--radius-panel)] object-cover object-[50%_12%]"
          />
          <p className="max-w-[56ch] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
            Sou eu, o Thiago — fundador da DoLado. Nesta fase, sou eu que leio cada caso, falo
            consigo por email ou telefone, e escrevo a reclamação à mão, com a lei citada. Não é
            um robô a responder-lhe.
          </p>
        </div>
      </section>

      {/* Sectores */}
      <section id="sectores" className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-8 sm:pb-22">
        <h2 className="mb-3.5 text-[26px] font-bold tracking-tight text-[var(--color-ink)] sm:text-[34px]">
          Sectores que tratamos
        </h2>
        <p className="mb-8 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-ink-muted)] sm:mb-10">
          Trabalhamos onde as reclamações são mais frequentes e as regras mais claras. Estes
          são exemplos reais de casos que tratamos.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          {SETORES.map((s) => (
            <div key={s.chip} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6.5">
              <div className="mb-4.5 inline-flex items-center rounded-[var(--radius-input)] bg-[var(--color-brand-wash)] px-2.5 py-1 text-[12px] font-semibold tracking-wide text-[var(--color-brand)]">
                {s.chip}
              </div>
              <div className="mb-3 text-[17px] font-semibold leading-snug">{s.titulo}</div>
              <ul className="list-disc space-y-1.5 pl-[18px] text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
                {s.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Garantimos / Não garantimos */}
      <section className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-8 sm:pb-22">
        <div className="rounded-[var(--radius-panel)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-6 sm:p-9">
          <div className="mb-5 text-[13px] font-bold uppercase tracking-wider text-[var(--color-brand)]">
            O que garantimos e o que não garantimos
          </div>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
            <div>
              <div className="mb-2.5 text-[17px] font-semibold">Garantimos</div>
              <ul className="list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-[var(--color-ink-muted)]">
                <li>Que a sua reclamação é redigida com base legal e enviada pelo canal formal correcto.</li>
                <li>Que o prazo legal de resposta é vigiado e que é avisado em cada passo.</li>
                <li>Que, no fim, recebe um dossiê completo e organizado do caso.</li>
              </ul>
            </div>
            <div>
              <div className="mb-2.5 text-[17px] font-semibold">Não garantimos</div>
              <ul className="list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-[var(--color-ink-muted)]">
                <li>Que a empresa aceite a reclamação ou devolva algum valor.</li>
                <li>Consulta jurídica individualizada nem representação em tribunal.</li>
                <li>Prazos de resolução — esses dependem sempre da empresa reclamada.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[820px] px-4 py-16 sm:px-8 sm:py-22">
          <h2 className="mb-8 text-[26px] font-bold tracking-tight text-[var(--color-ink)] sm:text-[34px]">
            Perguntas frequentes
          </h2>
          <FaqAccordion />
          <div className="mt-12 flex flex-col items-start gap-3.5">
            <button
              type="button"
              onClick={openForm}
              className="inline-flex min-h-14 items-center justify-center rounded-[10px] bg-[var(--color-brand)] px-7 text-[17px] font-semibold text-white hover:bg-[var(--color-brand-hover)]"
            >
              Conte-nos o que aconteceu
            </button>
            <p className="max-w-[46ch] text-[14px] italic text-[var(--color-ink-faint)]">
              Grátis durante a fase de Beta
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-start justify-between gap-8 px-4 py-11 sm:px-8">
          <div>
            <div className="mb-3.5 flex items-center gap-2.5">
              <Image src="/brand/dolado-logo-icon.svg" alt="" width={36} height={36} />
              <span className="text-[19px] font-bold tracking-tight">
                <span className="text-[var(--color-ink)]">Do</span>
                <span className="text-[var(--color-brand)]">Lado</span>
              </span>
            </div>
            <div className="max-w-[44ch] text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
              A DoLado não é uma sociedade de advogados nem presta consulta jurídica
              individualizada.
            </div>
          </div>
          <div className="flex flex-wrap gap-10 sm:gap-14">
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">Legal</div>
              <Link href="/termos" className="text-[15px] text-[var(--color-ink-muted)] hover:text-[var(--color-brand)]">
                Termos e Condições
              </Link>
              <Link href="/privacidade" className="text-[15px] text-[var(--color-ink-muted)] hover:text-[var(--color-brand)]">
                Política de Privacidade
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">Contacto</div>
              <a href="mailto:thiago.pereira@dolado.pt" className="text-[15px] text-[var(--color-ink-muted)] hover:text-[var(--color-brand)]">
                thiago.pereira@dolado.pt
              </a>
              <span className="text-[15px] text-[var(--color-ink-faint)]">Lisboa, Portugal</span>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1120px] px-4 pb-9 text-[13px] text-[var(--color-ink-faint)] sm:px-8">
          © 2026 DoLado
        </div>
      </footer>

      {/* Modal do formulário */}
      {formOpen && (
        <div
          onClick={closeForm}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(23,26,33,0.42)] px-4 py-8 sm:px-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-[560px] flex-none rounded-[var(--radius-panel)] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-md)] sm:p-8"
          >
            <div className="mb-2.5 flex items-start justify-between gap-4">
              <h2 className="max-w-[22ch] text-[22px] font-bold leading-snug tracking-tight text-[var(--color-ink)] sm:text-[26px]">
                Conte-nos o que aconteceu
              </h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Fechar"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-input)] border border-[var(--color-hairline)] text-lg text-[var(--color-ink-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
              Preencha o essencial e anexe o que tiver. Lemos o caso, voltamos a falar consigo e
              explicamos o que é exigível à empresa.
            </p>
            <div className="mb-6 flex items-start gap-2.5 rounded-[var(--radius-input)] bg-[var(--color-brand-wash)] p-3.5">
              <span className="flex-none text-[15px] font-bold leading-relaxed text-[var(--color-brand)]">✓</span>
              <p className="text-[14px] leading-relaxed text-[var(--color-ink)]">
                Estamos em fase de validação. O serviço é completamente grátis enquanto testamos
                com os primeiros casos. Preencha os dados pedidos e entraremos em contacto
                consigo por email ou telefone, a solicitar a factura e/ou o contrato que reforce
                o seu pedido.
              </p>
            </div>
            <IntakeForm onSubmitted={closeForm} onSuccess={handleLeadSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
