"use client";

import Link from "@/i18n/Link";
import type { ReactNode } from "react";
import type { Pergunta } from "@/components/landing/AccordionPerguntas";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, TEXTO as TEXTO_V2 } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tMudanca } from "@/i18n/mensagens/mudanca";

// Guia público de mudança de casa no Design System V2 (F3 —
// docs/especificacoes/F3_MUDANCA_CASA_PUBLICA.md). Página estática de
// aquisição e educação: sem login, sem formulários, sem IA, nada gravado. O
// conteúdo é o já publicado; os CTAs levam a "Tratar o meu caso" com a origem
// desta página e, quando faz sentido, o setor pré-preenchido (só valores das
// listas de src/lib/pedidoCaso.ts). Medição: mudanca_casa_clique_tratar_caso
// (local), como antes. Textos: src/i18n/mensagens/*/mudanca.ts.

const ORIGEM = "/mudanca-de-casa";

type SetorCaso = "Telecomunicações" | "Energia" | "Água";

const LINK = "font-semibold text-[var(--v2-green)] underline underline-offset-2 hover:text-[var(--v2-green-hover)]";
const TEXTO = "text-[15.5px] leading-relaxed text-[var(--v2-muted)]";
const LISTA = `flex list-disc flex-col gap-2 pl-5 ${TEXTO} marker:text-[var(--v2-green)]`;

function hrefTratarCaso(setor?: SetorCaso) {
  const base = urlTratarCaso(ORIGEM);
  return setor ? `${base}&setor=${encodeURIComponent(setor)}` : base;
}

function abrirTratarCaso(local: string) {
  track("mudanca_casa_clique_tratar_caso", { local });
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

function Seccao({ id, numero, titulo, intro, children }: { id: string; numero: string; titulo: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-28">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{numero}</p>
      <h2 id={`${id}-titulo`} className="mb-3 text-[clamp(26px,3vw,32px)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--v2-navy)]">
        {titulo}
      </h2>
      {intro && <p className={`${TEXTO} mb-6 max-w-[620px]`}>{intro}</p>}
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={`${CARTAO} p-6 sm:p-7`}>
      <h3 className="mb-3 text-[19px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{titulo}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function CtaContextual({ pergunta, setor, local }: { pergunta: string; setor?: SetorCaso; local: string }) {
  const c = useCaminho();
  const t = tMudanca[useIdioma()];
  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--v2-mint)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[15px] font-semibold leading-snug text-[var(--v2-navy)]">{pergunta}</p>
      <a href={c(hrefTratarCaso(setor))} onClick={() => abrirTratarCaso(local)} className={`${BOTAO_PRIMARIO} flex-none`}>
        {t.tratarCaso}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listas com marcação (<b>, <calc>, <sim>)
// ---------------------------------------------------------------------------

const ETIQUETAS = {
  b: (c: ReactNode) => <strong className="text-[var(--v2-navy)]">{c}</strong>,
  calc: (c: ReactNode) => (
    <Link prefetch={false} href="/calculadora-cancelamento" className={LINK}>
      {c}
    </Link>
  ),
  sim: (c: ReactNode) => (
    <Link prefetch={false} href="/simulador-elegibilidade" className={LINK}>
      {c}
    </Link>
  ),
};

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className={LISTA}>
      {itens.map((i) => (
        <li key={i}>{rico(i, ETIQUETAS)}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const IDS_PERGUNTAS = ["cpe-muda", "cui-muda", "transferir-telecom", "leitura-contador", "devolver-equipamento", "ultima-fatura"];

export function MudancaDeCasaV2() {
  const c = useCaminho();
  const t = tMudanca[useIdioma()];
  const PERGUNTAS: Pergunta[] = t.perguntas.lista.map((p, i) => ({
    id: IDS_PERGUNTAS[i],
    pergunta: p.pergunta,
    resposta: <p>{p.resposta}</p>,
  }));
  const INDICE = [
    { id: "antes", titulo: t.indice.antes },
    { id: "dia-da-saida", titulo: t.indice.diaDaSaida },
    { id: "casa-nova", titulo: t.indice.casaNova },
    { id: "depois", titulo: t.indice.depois },
    { id: "dolado", titulo: t.indice.dolado },
    { id: "perguntas", titulo: t.indice.perguntas },
  ];

  return (
    <>
      {/* ===== Introdução ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[760px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO_V2} mt-5 text-[17.5px]`}>{t.texto}</p>
        </div>
      </SectionV2>

      {/* ===== Guia ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label={t.nestaPagina} className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{t.nestaPagina}</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {INDICE.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-[var(--v2-line)] bg-white px-4 text-[14px] font-medium text-[var(--v2-navy)] hover:border-[var(--v2-green)] hover:text-[var(--v2-green)] lg:w-full lg:rounded-[10px] lg:border-transparent lg:bg-transparent lg:px-3"
                >
                  {s.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 max-w-[760px] flex-col gap-16">
        {/* ===== 1. Antes ===== */}
        <Seccao id="antes" numero="1" titulo={t.indice.antes} intro={t.antes.intro}>
          <Cartao titulo={t.antes.telecom.titulo}>
            <Lista itens={t.antes.telecom.itens} />
            <CtaContextual pergunta={t.antes.telecom.cta} setor="Telecomunicações" local="antes_telecomunicacoes" />
          </Cartao>

          <Cartao titulo={t.antes.eletricidade.titulo}>
            <Lista itens={t.antes.eletricidade.itens} />
          </Cartao>

          <Cartao titulo={t.antes.gas.titulo}>
            <Lista itens={t.antes.gas.itens} />
          </Cartao>

          <Cartao titulo={t.antes.agua.titulo}>
            <Lista itens={t.antes.agua.itens} />
          </Cartao>
        </Seccao>

        {/* ===== 2. Dia da saída ===== */}
        <Seccao id="dia-da-saida" numero="2" titulo={t.indice.diaDaSaida} intro={t.diaDaSaida.intro}>
          <Cartao titulo={t.diaDaSaida.titulo}>
            <Lista itens={t.diaDaSaida.itens} />
          </Cartao>
        </Seccao>

        {/* ===== 3. Casa nova ===== */}
        <Seccao id="casa-nova" numero="3" titulo={t.indice.casaNova} intro={t.casaNova.intro}>
          <Cartao titulo={t.casaNova.cpe.titulo}>
            <p className={TEXTO}>{t.casaNova.cpe.texto}</p>
          </Cartao>

          <Cartao titulo={t.casaNova.cui.titulo}>
            <p className={TEXTO}>{t.casaNova.cui.texto}</p>
          </Cartao>

          <Cartao titulo={t.casaNova.tratar.titulo}>
            <Lista itens={t.casaNova.tratar.itens} />
          </Cartao>
        </Seccao>

        {/* ===== 4. Depois ===== */}
        <Seccao id="depois" numero="4" titulo={t.indice.depois} intro={t.depois.intro}>
          <Cartao titulo={t.depois.titulo}>
            <Lista itens={t.depois.itens} />
            <CtaContextual pergunta={t.depois.cta} local="depois" />
          </Cartao>
        </Seccao>

        {/* ===== Quando a DoLado entra ===== */}
        <Seccao id="dolado" numero={t.indice.dolado} titulo={t.dolado.titulo}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Cartao titulo={t.dolado.naoConnosco.titulo}>
              <p className={TEXTO}>{t.dolado.naoConnosco.intro}</p>
              <Lista itens={t.dolado.naoConnosco.itens} />
            </Cartao>
            <Cartao titulo={t.dolado.ajuda.titulo}>
              <Lista itens={t.dolado.ajuda.itens} />
            </Cartao>
          </div>
          <p className={TEXTO}>{rico(t.dolado.fecho, ETIQUETAS)}</p>
        </Seccao>

        </div>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 id="perguntas" className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeader eyebrow={t.perguntas.eyebrow} titulo={t.perguntas.titulo} />
        <div>
          <FAQAccordionV2 perguntas={PERGUNTAS} />
          <p className="mt-8 text-[14px] leading-relaxed text-[var(--v2-muted)]">{t.perguntas.aviso}</p>
        </div>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <a href={c(hrefTratarCaso())} onClick={() => abrirTratarCaso("final")} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            {t.tratarCaso} <IconeSeta tamanho={17} />
          </a>
        }
      />
    </>
  );
}
