"use client";

import Link from "@/i18n/Link";
import { useCallback, useState } from "react";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { tWhatsApp } from "@/i18n/mensagens/whatsapp";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { CarregarDocumento } from "@/components/diagnostico/CarregarDocumento";
import { CartaoAnalise } from "@/components/diagnostico/CartaoAnalise";
import { IconeCalendario, IconeDocumentoVisto, IconeEscudo, IconeSeta } from "@/components/marketing-v2/Icones";
import { ApoioWhatsApp } from "@/components/marketing-v2/ApoioWhatsApp";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { OfertaProtecaoGratuita } from "@/components/marketing-v2/OfertaProtecaoGratuita";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, CONTENTOR, TEXTO } from "@/components/marketing-v2/estilos";
import { ComoFunciona } from "./ComoFunciona";
import { ExemploResultado } from "./ExemploResultado";
import { LIGACAO, SecaoFundador, SecaoSituacoes } from "./seccoes";

// Homepage com a análise gratuita como entrada principal (fase 2 da missão de
// 22/10/2026). Só substitui a HomepageV2 com DIAGNOSTICO_GRATUITO_ATIVO=1
// (lido no build): sem a análise ligada, a entrada principal não existiria.
//
// Ordem: abertura (promessa, cartão de análise só com PDF, exemplo do
// resultado, entrada para quem já tem um problema) → problemas (entrada
// secundária) → como funciona → o que lemos → Protecção contínua →
// reclamações → 30 dias grátis → confiança e fundador → perguntas → CTA final.
// Um CTA principal ("Escolher ficheiro PDF") e um secundário ("Tratar do meu
// caso"); botões altos e letra ≥ 16 px (público 55+).
// O diagnóstico só mostra o que está no documento e contas simples: o texto
// nunca promete erros, irregularidades nem poupanças.

const BOTAO_GRANDE = "min-h-14 text-[17px]";

export function HomepageDiagnostico({ protecaoGratuita = false }: { protecaoGratuita?: boolean }) {
  const [origem] = useState(detectarOrigem);
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tInicio[idioma].diagnostico;
  const tw = tWhatsApp[idioma].contextos.homepage;

  const tratarCaso = useCallback(
    (evento: string) => {
      track(evento);
      window.location.assign(c(urlTratarCaso(origem)));
    },
    [origem, c],
  );

  const botaoProblema = (evento: string) => (
    <button type="button" onClick={() => tratarCaso(evento)} className={`${BOTAO_CONTORNO} ${BOTAO_GRANDE} w-full sm:w-auto`}>
      {t.hero.problema} <IconeSeta tamanho={17} />
    </button>
  );

  return (
    <>
      {/* ===== Abertura (22/10/2026): promessa ao centro; por baixo, o cartão de
          análise (acção principal) ao lado de um exemplo do resultado, e a
          entrada para quem já tem um problema. No telemóvel: promessa →
          cartão → problema → exemplo. Sem fotografias de banco de imagens. ===== */}
      <section className="overflow-hidden border-b border-[var(--v2-line)] bg-[linear-gradient(180deg,var(--v2-blue-bg)_0%,#fff_70%)]">
        <div className={`${CONTENTOR} py-6 sm:py-14 lg:py-16`}>
          <div className="mx-auto max-w-[820px] sm:text-center">
            <h1 className="text-[clamp(29px,4.6vw,54px)] font-extrabold leading-[1.1] tracking-[-0.035em] text-[var(--v2-navy)]">
              {t.hero.titulo} <span className="block font-bold text-[var(--v2-navy)]/70">{t.hero.tituloSegundo}</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[660px] text-[17px] leading-[1.55] text-[var(--v2-muted)] sm:mt-5 sm:text-[19px]">{t.hero.texto}</p>
          </div>

          <div className="mx-auto mt-6 grid max-w-[1080px] gap-5 sm:mt-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
            <CartaoAnalise local="homepage_hero" texto={t.hero.cartaoTexto} />
            <div className="order-3 lg:order-none lg:row-span-2">
              <ExemploResultado />
            </div>
            <div className="order-2 flex flex-col gap-4 rounded-[18px] border border-[var(--v2-line-strong)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:order-none">
              <div>
                <h2 className="text-[19px] font-bold text-[var(--v2-navy)]">{t.hero.problemaTitulo}</h2>
                <p className="mt-1 text-[16px] leading-relaxed text-[var(--v2-muted)]">{t.hero.problemaTexto}</p>
              </div>
              <div className="flex-none">{botaoProblema("click_hero_reclamacao")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Entrada secundária: quem já tem um problema ===== */}
      <SecaoSituacoes titulo={t.situacoesTitulo} acao={botaoProblema("click_home_situacoes_tratar")} />

      {/* ===== Como funciona: o percurso demonstrado (ComoFunciona.tsx) ===== */}
      <ComoFunciona />

      {/* ===== O que lemos (só o que o diagnóstico mostra de facto) ===== */}
      <SectionV2 id="o-que-lemos" tone="soft-green" className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <h2 className="text-[clamp(28px,3.2vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em] text-[var(--v2-navy)]">{t.analisa.titulo}</h2>
          <p className={`${TEXTO} mt-4 text-[18px]`}>{t.analisa.setores}</p>
        </div>
        <ListaVistos grande itens={t.analisa.itens} />
      </SectionV2>

      {/* ===== Protecção contínua ===== */}
      <SectionV2 id="protecao">
        <SectionHeader titulo={t.protecao.titulo} />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {t.protecao.itens.map((item, i) => (
            <li key={item.titulo} className={`${CARTAO} flex flex-col gap-3 p-7`}>
              <span className="text-[var(--v2-green)]">
                {i === 0 ? <IconeCalendario tamanho={28} strokeWidth={1.6} /> : i === 1 ? <IconeDocumentoVisto tamanho={28} strokeWidth={1.6} /> : <IconeEscudo tamanho={28} strokeWidth={1.6} />}
              </span>
              <h3 className="text-[20px] font-bold text-[var(--v2-navy)]">{item.titulo}</h3>
              <p className="text-[16.5px] leading-relaxed text-[var(--v2-muted)]">{item.texto}</p>
            </li>
          ))}
        </ul>
        <Link prefetch={false} href={ROTAS_V2.protecao} onClick={() => track("click_home_protecao")} className={`${LIGACAO} mt-8 text-[16px]`}>
          {t.protecao.cta} <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>

      {/* ===== Reclamações e conflitos ===== */}
      <SectionV2 id="reclamacoes" tone="soft-blue" size="compact">
        <div className={`${CARTAO} flex flex-col gap-6 p-7 sm:p-10 md:flex-row md:items-center md:justify-between md:gap-10`}>
          <div className="max-w-[640px]">
            <h2 className="text-[26px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{t.reclamacoes.titulo}</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-[var(--v2-navy)]">{t.reclamacoes.texto}</p>
            <p className="mt-3 text-[16px] leading-relaxed text-[var(--v2-muted)]">{t.reclamacoes.nota}</p>
          </div>
          <button type="button" onClick={() => tratarCaso("click_home_servico_tratar")} className={`${BOTAO_PRIMARIO} ${BOTAO_GRANDE} w-full flex-none md:w-auto`}>
            {t.reclamacoes.cta} <IconeSeta tamanho={17} />
          </button>
        </div>
      </SectionV2>

      {/* ===== 30 dias grátis (regras de sempre; só com PROTECAO_GRATUITA_ATIVA) ===== */}
      {protecaoGratuita && (
        <SectionV2 id="30-dias" size="compact">
          <h2 className="text-[clamp(26px,3vw,34px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)]">{t.oferta.titulo}</h2>
          <OfertaProtecaoGratuita origem="homepage" comTexto grande className="mt-6" />
        </SectionV2>
      )}

      {/* ===== Confiança e transparência (factos verificáveis, sem testemunhos inventados) ===== */}
      <SectionV2 id="confianca" size="compact">
        <h2 className="text-[clamp(26px,3vw,34px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)]">{t.confianca.titulo}</h2>
        <div className="mt-6 max-w-[720px]">
          <ListaVistos grande itens={t.confianca.itens} />
        </div>
        <Link prefetch={false} href={ROTAS_V2.transparencia} className={`${LIGACAO} mt-6 text-[16px]`}>
          {t.confianca.ligacao} <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>
      <SecaoFundador />

      {/* ===== Perguntas frequentes ===== */}
      <SectionV2 id="perguntas">
        <SectionHeader titulo={t.perguntas.titulo} />
        <div className="mt-8 max-w-[860px]">
          <FAQAccordionV2 perguntas={t.perguntas.itens} />
        </div>
        <Link prefetch={false} href={ROTAS_V2.ajuda} className={`${LIGACAO} mt-6 text-[16px]`}>
          {t.perguntas.todas} <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>

      {/* ===== CTA final: a mesma acção principal ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        acao={<CarregarDocumento local="homepage_cta_final" classeBotao={`${BOTAO_PRIMARIO} ${BOTAO_GRANDE} w-full md:w-auto`} />}
        apoio={<ApoioWhatsApp className="mx-auto mt-6 max-w-[1200px]" pergunta={tw.pergunta} mensagem={tw.mensagem} pagina="/" local="homepage" contexto="cta_final" />}
      />
    </>
  );
}
