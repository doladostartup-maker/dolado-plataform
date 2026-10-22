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
import { ExemploResultado } from "@/components/homepage-v2/ExemploResultado";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { AcoesAnalisarOuTratar, LigacaoAnalisar } from "@/components/marketing-v2/LigacaoAnalisar";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { rico } from "@/i18n/Rico";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";

// Como Funciona no Design System V2 (secção 32 de
// docs/design/design-system-v2.md). Os passos e a nota de transparência são
// alinhados com o fluxo real (pedido → conta → pagamento → caso → contacto →
// texto → autorização → envio → acompanhamento); mudar o processo descrito
// exige rever esse fluxo. Revisão de 17/10/2026: canais de envio além do
// Livro de Reclamações e sem prazos legais concretos.
//
// Reposicionamento de 22/10/2026: com a análise gratuita ligada (`analise`,
// DIAGNOSTICO_GRATUITO_ATIVO), a página mostra dois percursos — analisar e
// proteger (principal) e resolver um problema (os passos de sempre). Sem a
// análise, fica como antes.

// Quem age em cada passo (o texto dos passos está em */paginas.ts, "comoFunciona").
const DO_CLIENTE = [true, true, false, false, true, false, false];

// Quem paga cada passo do percurso principal: análise gratuita (1, 2) e Protecção (3).
const GRATUITO = [true, true, false];

// Perguntas já publicadas em /perguntas-frequentes (mesmas respostas).
const IDS_PERGUNTAS_ANALISE = ["analise-gratuita", "novas-facturas", "ajuda-reclamacoes"];
const IDS_PERGUNTAS = ["prazo", "documentos-inicio", "nao-concordo", "atualizacoes", "depois-enviada", "empresa-nao-resolve", "copia"];

export function ComoFuncionaV2({ analise = false }: { analise?: boolean }) {
  const [origem] = useState(detectarOrigem);
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tPaginas[idioma].comoFunciona;
  const a = t.analise;
  const PASSOS: Passo[] = t.passos.map((p, i) => ({
    ...p,
    rotulo: { texto: DO_CLIENTE[i] ? t.seuPasso : t.dolado, doCliente: DO_CLIENTE[i] },
    final: i === t.passos.length - 1,
  }));
  const PASSOS_ANALISE: Passo[] = a.principal.passos.map((p, i) => ({
    ...p,
    rotulo: { texto: GRATUITO[i] ? a.principal.gratuito : a.principal.comProtecao, doCliente: GRATUITO[i] },
  }));
  const TODAS = categoriasPerguntas(idioma, { analise }).flatMap((cat) => cat.perguntas);
  const ids = analise ? [...IDS_PERGUNTAS_ANALISE, ...IDS_PERGUNTAS] : IDS_PERGUNTAS;
  const PERGUNTAS = ids.flatMap((id) => TODAS.filter((p) => p.id === id).slice(0, 1));
  const negrito = (texto: string) => rico(texto, { b: (conteudo) => <strong className="font-semibold text-[var(--v2-navy)]">{conteudo}</strong> });

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
            {analise ? a.titulo : t.titulo}
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[540px] text-[17.5px]`}>{analise ? a.texto : t.texto}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {analise ? (
              <>
                <LigacaoAnalisar evento="click_hero_como_funciona_analisar" className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]`}>
                  {a.analisar} <IconeSeta tamanho={17} />
                </LigacaoAnalisar>
                <button type="button" onClick={() => tratarCaso("click_hero_como_funciona")} className={`${BOTAO_CONTORNO} min-h-14 text-[17px]`}>
                  {t.tratarCaso}
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
        {/* Com a análise: o mesmo exemplo demonstrativo da homepage (análise gratuita + Protecção). */}
        {analise ? <ExemploResultado /> : <PainelCaso />}
      </SectionV2>

      {/* ===== Percurso principal: analisar e proteger (só com a análise gratuita) ===== */}
      {analise && (
        <SectionV2 id="analisar-e-proteger">
          <SectionHeader eyebrow={a.principal.eyebrow} titulo={a.principal.titulo} texto={a.principal.texto} />
          <div className="mt-10">
            <StepsTimeline passos={PASSOS_ANALISE} />
          </div>
          <div className={`${CARTAO} mt-10 p-6 sm:p-8`}>
            <h3 className="text-[20px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{a.principal.quemFazTitulo}</h3>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-[16.5px] leading-relaxed text-[var(--v2-muted)] marker:text-[var(--v2-green)]">
              {a.principal.quemFaz.map((item) => (
                <li key={item}>{negrito(item)}</li>
              ))}
            </ul>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LigacaoAnalisar evento="click_como_funciona_analisar" parametros={{ local: "percurso" }} className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]`}>
              {a.analisar} <IconeSeta tamanho={17} />
            </LigacaoAnalisar>
            <Link
              prefetch={false}
              href={ROTAS_V2.protecao}
              onClick={() => track("click_como_funciona_protecao")}
              className="inline-flex min-h-12 items-center gap-1.5 px-2 text-[16px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline"
            >
              {a.principal.conhecerProtecao} <IconeSeta tamanho={15} />
            </Link>
          </div>
        </SectionV2>
      )}

      {/* ===== Passo a passo (com a análise: o percurso complementar, resolver um problema) ===== */}
      <SectionV2 id="resolver-um-problema" tone="soft-blue" className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            eyebrow={analise ? a.complementar.eyebrow : t.passoAPasso.eyebrow}
            titulo={analise ? a.complementar.titulo : t.passoAPasso.titulo}
            texto={analise ? a.complementar.texto : t.passoAPasso.texto}
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
        titulo={analise ? a.ctaFinal.titulo : t.ctaFinal.titulo}
        texto={analise ? a.ctaFinal.texto : t.ctaFinal.texto}
        acao={
          analise ? (
            <AcoesAnalisarOuTratar
              analisar={a.analisar}
              tratar={t.ctaFinal.acao}
              aoTratar={() => tratarCaso("click_cta_como_funciona")}
              evento="click_cta_como_funciona_analisar"
            />
          ) : (
            <button
              type="button"
              onClick={() => tratarCaso("click_cta_como_funciona")}
              className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
            >
              {t.ctaFinal.acao} <IconeSeta tamanho={17} />
            </button>
          )
        }
      />
    </>
  );
}
