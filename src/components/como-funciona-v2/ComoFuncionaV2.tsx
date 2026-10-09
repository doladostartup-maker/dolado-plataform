"use client";

import Link from "@/i18n/Link";
import { useCallback, useState } from "react";
import { categoriasPerguntas } from "@/components/landing/conteudoPerguntasFrequentes";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { PainelCaso } from "@/components/marketing-v2/Mockups";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, TEXTO } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";

// Como Funciona no Design System V2 (secção 32 de
// docs/design/design-system-v2.md). Os passos e a nota de transparência são
// os textos já publicados nesta página — mudar o processo descrito exige
// rever o fluxo real (pedido → conta → pagamento → caso → texto → envio).

// Quem age em cada passo (o texto dos passos está em */paginas.ts, "comoFunciona").
const DO_CLIENTE = [true, false, false, true, false, false, false];

// Perguntas já publicadas em /perguntas-frequentes (mesmas respostas).
const IDS_PERGUNTAS = ["prazo", "documentos", "nao-concordo", "depois-enviada", "empresa-nao-resolve", "copia"];

export function ComoFuncionaV2() {
  const [origem] = useState(detectarOrigem);
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tPaginas[idioma].comoFunciona;
  const PASSOS: Passo[] = t.passos.map((p, i) => ({
    ...p,
    rotulo: { texto: DO_CLIENTE[i] ? t.seuPasso : t.dolado, doCliente: DO_CLIENTE[i] },
    final: i === t.passos.length - 1,
  }));
  const TODAS = categoriasPerguntas(idioma).flatMap((cat) => cat.perguntas);
  const PERGUNTAS = IDS_PERGUNTAS.flatMap((id) => TODAS.filter((p) => p.id === id));

  const tratarCaso = useCallback(
    (evento: string) => {
      track(evento);
      window.location.assign(c(urlTratarCaso(origem)));
    },
    [origem, c],
  );

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:py-20">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,3.9vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[540px] text-[17.5px]`}>{t.texto}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => tratarCaso("click_hero_como_funciona")} className={BOTAO_PRIMARIO}>
              {t.tratarCaso} <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false}
              href="/simulador-elegibilidade"
              onClick={() => track("click_como_funciona_simulador")}
              className={BOTAO_CONTORNO}
            >
              {t.verSeAjuda}
            </Link>
          </div>
        </div>
        <PainelCaso />
      </SectionV2>

      {/* ===== Passo a passo ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            eyebrow={t.passoAPasso.eyebrow}
            titulo={t.passoAPasso.titulo}
            texto={t.passoAPasso.texto}
          />
        </div>
        <StepsTimeline passos={PASSOS} layout="vertical" />
      </SectionV2>

      {/* ===== Transparência ===== */}
      <SectionV2 tone="soft-green">
        <div className="max-w-[760px]">
          <SectionHeader sobreVerde eyebrow={t.autorizacao.eyebrow} titulo={t.autorizacao.titulo} />
          <p className={`${TEXTO} mt-5`}>{t.autorizacao.texto}</p>
        </div>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeader eyebrow={t.perguntas.eyebrow} titulo={t.perguntas.titulo} />
          <Link prefetch={false}
            href="/perguntas-frequentes"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.perguntas.verTodas} <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <button
            type="button"
            onClick={() => tratarCaso("click_cta_como_funciona")}
            className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
          >
            {t.ctaFinal.acao} <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
