"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { detectarOrigem, track } from "@/lib/analytics";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, NIPC, urlTratarCaso } from "@/lib/site";
import { SiteHeader } from "./SiteHeader";

// Página de teste /landing-v2: nova hierarquia da homepage
// (problema → perceber se há algo a tratar → a DoLado trata → a DoLado pode
// continuar atenta). Componente próprio — não altera Homepage.tsx nem os
// componentes partilhados; só reutiliza o SiteHeader tal como está.
//
// Gratuito só o que é gratuito: Calculadora de Cancelamento (fidelização) e
// Simulador de Elegibilidade. A comparação de faturas pertence à Proteção.

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-[18px] py-2.5 text-center text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)]";
const EYEBROW = "mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]";
const TITULO_SECCAO =
  "mb-3 text-[clamp(24px,3.2vw,32px)] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-ink)]";
const TEXTO_SECCAO = "text-base leading-relaxed text-[var(--color-ink-muted)]";

const PROPS_ICONE = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Visto() {
  return (
    <svg {...PROPS_ICONE} width={16} height={16}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const GARANTIAS_HERO = ["Simples e seguro", "Com a sua aprovação", "Acompanhamos o processo"];

type Ferramenta = { icone: ReactNode; titulo: string; texto: string; cta: string; href: string; evento: string };

const FERRAMENTAS: Ferramenta[] = [
  {
    icone: (
      <svg {...PROPS_ICONE}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    ),
    titulo: "Não sei quando termina a fidelização",
    texto:
      "Consulte as informações necessárias para perceber quando termina a sua fidelização e quais as condições relevantes.",
    cta: "Verificar a fidelização grátis",
    href: "/calculadora-cancelamento",
    evento: "click_landing_v2_fidelizacao",
  },
  {
    icone: (
      <svg {...PROPS_ICONE}>
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    titulo: "Não sei se a DoLado pode tratar do meu caso",
    texto: "Conte-nos o que aconteceu e veja gratuitamente se a situação pode ser tratada pela DoLado.",
    cta: "Verificar o meu caso grátis",
    href: "/simulador-elegibilidade",
    evento: "click_landing_v2_simulador",
  },
];

const PASSOS = [
  { titulo: "Conte-nos o que aconteceu", texto: "Explique o problema e envie os documentos relevantes." },
  {
    titulo: "Nós analisamos e preparamos",
    texto: "Organizamos a informação e preparamos o texto adequado ao seu caso.",
  },
  {
    titulo: "Confirma antes do envio",
    texto: "Revê exatamente o que será enviado e autoriza quando estiver satisfeito.",
  },
  {
    titulo: "Acompanhamos o processo",
    texto: "Pode consultar no portal o histórico, o texto enviado e os comprovativos associados ao caso.",
  },
];

const ETAPAS_CASO = [
  "Caso recebido",
  "Análise",
  "Texto preparado",
  "Aprovação do cliente",
  "Reclamação enviada",
  "Acompanhamento",
];

const PROTECAO = [
  { titulo: "Perceba quando algo muda na sua fatura.", texto: "Comparamos cada fatura com as anteriores, todos os meses." },
  { titulo: "Fim de uma promoção", texto: "Avisamo-lo por e-mail antes de a promoção terminar." },
  { titulo: "Datas importantes da fidelização", texto: "Avisamo-lo antes do fim, para que possa decidir a tempo." },
  {
    titulo: "Situações que merecem uma análise mais atenta",
    texto: "Cada situação identificada é revista por uma pessoa antes de lhe ser comunicada.",
  },
];

export function LandingV2() {
  const [origem] = useState(detectarOrigem);

  const tratarCaso = useCallback(
    (evento: string) => {
      track(evento);
      window.location.assign(urlTratarCaso(origem));
    },
    [origem],
  );

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <SiteHeader ctaLabel="Tratar do meu caso" onCtaClick={() => tratarCaso("click_landing_v2_nav")} />

      {/* ===== 1. Hero ===== */}
      <section>
        <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-10 sm:py-20">
          <div className="max-w-[680px]">
            <p className={EYEBROW}>Do seu lado com as empresas</p>
            <h1 className="mb-5 text-[clamp(30px,5vw,48px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--color-ink)]">
              Tem um problema com uma empresa?{" "}
              <span className="text-[var(--color-brand)]">A DoLado trata dele por si.</span>
            </h1>
            <p className="mb-8 max-w-[600px] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
              Explique-nos o que aconteceu. Analisamos a sua situação, preparamos a reclamação,
              mostramos-lhe o texto antes de enviar e acompanhamos o processo consigo.
            </p>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={() => tratarCaso("click_landing_v2_hero")} className={BOTAO_PRIMARIO}>
                Tratar do meu caso
              </button>
              <Link
                href="/simulador-elegibilidade"
                onClick={() => track("click_landing_v2_hero_simulador")}
                className={BOTAO_SECUNDARIO}
              >
                Ver se a DoLado pode ajudar
              </Link>
            </div>
            <ul className="flex flex-col gap-2 text-[14px] text-[var(--color-ink-muted)] sm:flex-row sm:flex-wrap sm:gap-x-6">
              {GARANTIAS_HERO.map((g) => (
                <li key={g} className="flex items-center gap-2">
                  <span className="text-[var(--color-brand)]">
                    <Visto />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== 2. Ferramentas gratuitas ===== */}
      <section className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-10 sm:py-20">
          <div className="mb-8 max-w-[620px]">
            <h2 className={TITULO_SECCAO}>Ainda não sabe se existe um problema?</h2>
            <p className={TEXTO_SECCAO}>
              Antes de contratar qualquer serviço, pode usar gratuitamente estas ferramentas da DoLado
              para perceber melhor a sua situação.
            </p>
          </div>
          <ul className="grid gap-5 md:grid-cols-2">
            {FERRAMENTAS.map((f) => (
              <li
                key={f.titulo}
                className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)]"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-wash)] text-[var(--color-brand)]">
                    {f.icone}
                  </span>
                  <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--color-ink-muted)]">
                    Gratuito
                  </span>
                </div>
                <h3 className="mb-2 text-[17px] font-semibold text-[var(--color-ink)]">{f.titulo}</h3>
                <p className="mb-5 text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">{f.texto}</p>
                <Link
                  href={f.href}
                  onClick={() => track(f.evento)}
                  className="mt-auto text-[14.5px] font-semibold text-[var(--color-brand)] underline-offset-4 hover:text-[var(--color-brand-hover)] hover:underline"
                >
                  {f.cta} →
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13px] text-[var(--color-ink-faint)]">
            Sem conta e sem e-mail. O resultado aparece logo no ecrã.
          </p>
        </div>
      </section>

      {/* ===== 3. Como funciona ===== */}
      <section className="mx-auto max-w-[1120px] px-4 py-14 sm:px-10 sm:py-20">
        <div className="mb-10 max-w-[620px]">
          <p className={EYEBROW}>Como funciona</p>
          <h2 className={TITULO_SECCAO}>Simples, do princípio ao fim.</h2>
        </div>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="border-t border-[var(--color-hairline-strong)] pt-5">
              <span className="mb-3 block text-[13px] font-semibold text-[var(--color-brand)]">{i + 1}</span>
              <h3 className="mb-2 text-[16px] font-semibold text-[var(--color-ink)]">{p.titulo}</h3>
              <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== 4. Origem da DoLado ===== */}
      <section className="border-y border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-14 sm:px-10 sm:py-20 md:grid-cols-[220px_1fr] md:items-start md:gap-12">
          {/* Fotografia já publicada numa versão anterior da homepage (public/landing). */}
          <Image
            src="/landing/founder-thiago.webp"
            alt="Thiago Pereira, fundador da DoLado"
            width={220}
            height={220}
            className="aspect-square w-full max-w-[160px] rounded-[var(--radius-panel)] object-cover md:max-w-[220px]"
          />
          <div className="max-w-[62ch]">
            <p className={EYEBROW}>A nossa origem</p>
            <h2 className={`${TITULO_SECCAO} mb-5`}>Eu próprio já passei por isto.</h2>
            <div className="space-y-4 text-[16.5px] leading-relaxed text-[var(--color-ink-muted)]">
              <p>
                Tive uma penalização de fidelização de uma operadora depois de aumentos e só mais tarde
                descobri que poderia ter tido outras opções.
              </p>
              <p>
                Percebi que muitas pessoas passam pelo mesmo, não porque não tenham direitos, mas porque
                nem sempre sabem quais são ou o que devem fazer.
              </p>
              <p>
                Foi por isso que criei a DoLado: para que ninguém seja prejudicado simplesmente por
                desconhecer as leis, os caminhos ou as responsabilidades.
              </p>
            </div>
            <p className="mt-6 text-[14px] font-semibold text-[var(--color-ink)]">
              Thiago Pereira, fundador da DoLado
            </p>
          </div>
        </div>
      </section>

      {/* ===== 5. Tratamento do caso ===== */}
      <section className="mx-auto max-w-[1120px] px-4 py-14 sm:px-10 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16">
          <div className="max-w-[560px]">
            <p className={EYEBROW}>Tratamento do seu caso</p>
            <h2 className={TITULO_SECCAO}>
              Encontrou um problema? <br className="hidden sm:inline" />A DoLado trata dele consigo.
            </h2>
            <p className={`${TEXTO_SECCAO} mb-8`}>
              Preparamos a reclamação, mostramos-lhe o texto antes do envio e acompanhamos o processo
              consigo.
            </p>
            <Link href="/#precario" onClick={() => track("click_landing_v2_precos")} className={BOTAO_PRIMARIO}>
              Ver preços e tratar do meu caso
            </Link>
          </div>
          <ol
            aria-label="Etapas do tratamento de um caso"
            className="rounded-[var(--radius-panel)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)]"
          >
            {ETAPAS_CASO.map((etapa, i) => {
              const aprovacao = etapa === "Aprovação do cliente";
              const ultima = i === ETAPAS_CASO.length - 1;
              return (
                <li key={etapa} className="relative flex gap-4 pb-5 last:pb-0">
                  {!ultima && (
                    <span aria-hidden="true" className="absolute left-[11px] top-6 h-[calc(100%-24px)] w-px bg-[var(--color-hairline-strong)]" />
                  )}
                  <span
                    className={`relative flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                      aprovacao
                        ? "bg-[var(--color-brand)] text-white"
                        : "border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-[14.5px] font-semibold text-[var(--color-ink)]">{etapa}</p>
                    {aprovacao && (
                      <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
                        Nada é enviado sem a sua autorização.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ===== 6. Proteção ===== */}
      <section className="border-y border-[var(--color-hairline)] bg-white">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-16">
          <div>
            <p className={EYEBROW}>Depois de resolver o problema</p>
            <h2 className={TITULO_SECCAO}>Podemos continuar atentos por si.</h2>
            <p className={`${TEXTO_SECCAO} mb-7 max-w-[560px]`}>
              Com a Proteção DoLado, acompanhamos as informações relevantes que nos disponibiliza e
              avisamos quando identificamos algo que merece a sua atenção.
            </p>
            <ul className="mb-8 space-y-4">
              {PROTECAO.map((p) => (
                <li key={p.titulo} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-brand-wash)] text-[var(--color-brand)]">
                    <Visto />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--color-ink)]">{p.titulo}</p>
                    <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/#precario" onClick={() => track("click_landing_v2_protecao")} className={BOTAO_SECUNDARIO}>
              Conhecer a Proteção
            </Link>
          </div>

          {/* Mockup ilustrativo — dados fictícios, só para a interface. */}
          <figure aria-label="Exemplo ilustrativo do estado de proteção" className="rounded-[var(--radius-panel)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-5 shadow-[var(--shadow-md)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold text-[var(--color-ink)]">O seu estado de proteção</p>
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-faint)]">
                Exemplo
              </span>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4">
              <p className="mb-3 text-[15px] font-semibold text-[var(--color-ink)]">Operadora</p>
              <dl className="divide-y divide-[var(--color-hairline)] text-[13.5px]">
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[var(--color-ink-muted)]">Fidelização termina em</dt>
                  <dd className="font-medium text-[var(--color-ink)]">14/03/2027</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[var(--color-ink-muted)]">Fatura atual</dt>
                  <dd className="font-medium text-[var(--color-ink)]">54,90 €</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[var(--color-ink-muted)]">Promoção</dt>
                  <dd className="font-medium text-[var(--color-ink)]">Identificada</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[var(--color-ink-muted)]">Condições importantes</dt>
                  <dd className="font-medium text-[var(--color-ink)]">Identificadas</dd>
                </div>
              </dl>
            </div>
            <figcaption className="mt-4 flex gap-2.5 rounded-[var(--radius-card)] bg-[var(--color-status-success-wash)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
              <span className="mt-0.5 text-[var(--color-status-success)]">
                <Visto />
              </span>
              Neste momento não detetámos nenhuma situação que exija intervenção.
            </figcaption>
          </figure>
        </div>
      </section>

      {/*
        ===== 7. Setores =====
        Omitida: o tratamento de casos aceita hoje só Telecomunicações, Energia e
        Água (SETORES em src/lib/pedidoCaso.ts). Listar compras, transportes ou
        entregas prometeria um âmbito que o produto não tem.

        ===== 8. Prova social =====
        Sem testemunhos reais aprovados no projeto. Quando existirem, entram aqui
        (nunca nomes, fotografias, classificações ou casos inventados).
      */}

      {/* ===== 9. CTA final ===== */}
      <section className="px-4 py-16 text-center sm:px-10 sm:py-20">
        <p className={EYEBROW}>Não sabe por onde começar?</p>
        <h2 className={TITULO_SECCAO}>Conte-nos o que aconteceu.</h2>
        <p className={`${TEXTO_SECCAO} mx-auto mb-8 max-w-[480px]`}>
          Se houver alguma coisa que possamos tratar, mostramos-lhe o próximo passo.
        </p>
        <Link
          href="/simulador-elegibilidade"
          onClick={() => track("click_landing_v2_cta_final")}
          className={BOTAO_PRIMARIO}
        >
          Ver se a DoLado pode ajudar
        </Link>
      </section>

      {/* Rodapé — mesmo conteúdo do rodapé da homepage, sem ligação para esta página. */}
      <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-[var(--color-ink-muted)] sm:px-10">
          <p className="w-full max-w-[640px] leading-relaxed">
            A DoLado está do lado do consumidor. Ajudamos a apresentar e acompanhar reclamações e a
            evitar prejuízos causados pela falta de informação, com transparência, proximidade e
            simplicidade.
          </p>
          <span>
            © 2026 DoLado · {ENTIDADE_LEGAL} · NIPC {NIPC} · Lisboa
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href={ROTAS_LEGAIS.termos} className="hover:text-[var(--color-brand)]">
              Termos
            </Link>
            <Link href={ROTAS_LEGAIS.privacidade} className="hover:text-[var(--color-brand)]">
              Privacidade
            </Link>
            <Link href={ROTAS_LEGAIS.livreResolucao} className="hover:text-[var(--color-brand)]">
              Livre resolução
            </Link>
            <Link href={ROTAS_LEGAIS.resolucaoLitigios} className="hover:text-[var(--color-brand)]">
              Resolução de litígios
            </Link>
            <a
              href={LIVRO_RECLAMACOES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-[var(--color-brand)]"
            >
              Livro de Reclamações
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
