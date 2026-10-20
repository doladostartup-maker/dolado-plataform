"use client";

import Image from "next/image";
import Link from "@/i18n/Link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { useCaminho, useIdioma, useTextos } from "@/i18n/cliente";
import { tLanding30Dias } from "@/i18n/mensagens/landing30Dias";
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import {
  IconeCalendario,
  IconeDocumentoVisto,
  IconeEtiqueta,
  IconeFatura,
  IconeLupaDocumento,
  IconeMensagem,
  IconeSeta,
  IconeVisto,
} from "@/components/marketing-v2/Icones";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { PainelProtecao } from "@/components/marketing-v2/Mockups";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import { caminhoAtivacaoLanding, lerUtm, type Utm } from "@/lib/landing30Dias";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { PLANOS } from "@/lib/planos";
import { urlAtivacaoLanding, urlPortal } from "@/lib/site";

// Landing das campanhas Meta Ads (/30-dias-gratis). Uma só ação: o CTA leva
// à activação de sempre em portal.dolado.pt (registo, confirmação do e-mail e
// aceitação dos Termos acontecem lá — nada é duplicado aqui). Os UTM do
// anúncio são lidos no browser (a página é estática) e seguem no URL.
//
// Medição (só com consentimento — track() não faz nada sem gtag; o Pixel da
// Meta só existe com consentimento de marketing): landing_30d_view uma vez
// por carregamento (também se o consentimento chegar depois) e
// landing_30d_cta_click com o local do botão. Nunca dados pessoais. As etapas
// do portal (conta criada, e-mail confirmado, activação) contam-se na base de
// dados — /backoffice/protecao-gratuita.

type Local = "topo" | "condicoes" | "barra";

const semSubscricao = () => () => {};

/** UTM do anúncio, lidos do URL no browser (a página é estática: no servidor não há UTM). */
function useUtm(): Utm {
  const search = useSyncExternalStore(semSubscricao, () => window.location.search, () => "");
  return useMemo(() => lerUtm(new URLSearchParams(search)), [search]);
}

const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept"] as const;

/** landing_30d_view uma só vez: já, se houver gtag; senão, quando o consentimento chegar. */
function useEventoVista() {
  const enviado = useRef(false);
  useEffect(() => {
    const enviar = () => {
      if (enviado.current || typeof window.gtag !== "function") return false;
      enviado.current = true;
      track("landing_30d_view");
      return true;
    };
    if (enviar()) return;
    // O gtag só é inserido depois do consentimento (MedicaoComConsentimento):
    // tenta de novo pouco depois de o Cookiebot responder.
    const temporizadores: number[] = [];
    const aoConsentir = () => {
      for (const ms of [500, 2000]) temporizadores.push(window.setTimeout(enviar, ms));
    };
    for (const e of EVENTOS_COOKIEBOT) window.addEventListener(e, aoConsentir);
    return () => {
      for (const e of EVENTOS_COOKIEBOT) window.removeEventListener(e, aoConsentir);
      temporizadores.forEach((t) => window.clearTimeout(t));
    };
  }, []);
}

function cliqueCta(local: Local) {
  track("landing_30d_cta_click", { local });
  if (typeof window.fbq === "function") window.fbq("trackCustom", "Landing30dCtaClick", { local });
}

/**
 * Barra fixa: só depois de passar o CTA do topo, nunca com o CTA das condições
 * à vista e nunca a partir do fim das perguntas (rodapé). Calculado no scroll
 * (não com IntersectionObserver, que não avisa de saltos — ex.: tocar no topo
 * do ecrã no iOS — e deixava a barra no estado errado).
 */
function useBarraVisivel(topo: RefObject<Element | null>, condicoes: RefObject<Element | null>, fim: RefObject<Element | null>) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let pedido = 0;
    const calcular = () => {
      pedido = 0;
      const a = innerHeight;
      const t = topo.current?.getBoundingClientRect();
      const c = condicoes.current?.getBoundingClientRect();
      const f = fim.current?.getBoundingClientRect();
      if (!t || !c || !f) return;
      setVisivel(t.bottom < 0 && !(c.top < a && c.bottom > 0) && f.top >= a);
    };
    const agendar = () => {
      if (!pedido) pedido = requestAnimationFrame(calcular);
    };
    calcular();
    addEventListener("scroll", agendar, { passive: true });
    addEventListener("resize", agendar);
    return () => {
      removeEventListener("scroll", agendar);
      removeEventListener("resize", agendar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [topo, condicoes, fim]);
  return visivel;
}

export function Landing30Dias() {
  const idioma = useIdioma();
  const c = useCaminho();
  const t = useTextos(tLanding30Dias);
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos);

  const utm = useUtm();
  const destino = c(urlAtivacaoLanding(utm));

  useEventoVista();

  const ctaTopo = useRef<HTMLAnchorElement>(null);
  const ctaCondicoes = useRef<HTMLAnchorElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const barraVisivel = useBarraVisivel(ctaTopo, ctaCondicoes, fim);

  // Função (não componente): o elemento observado pela barra fixa não pode ser recriado a cada render.
  const cta = (local: Local, refCta: RefObject<HTMLAnchorElement | null>) => (
    <a ref={refCta} href={destino} onClick={() => cliqueCta(local)} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
      {t.topo.cta} <IconeSeta tamanho={17} />
    </a>
  );

  return (
    <>
      {/* ===== Primeiro ecrã: a proposta e o CTA sem scroll ===== */}
      <section className="bg-[linear-gradient(180deg,var(--v2-mint-bg)_0%,#fff_100%)]">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-10 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <Eyebrow>{t.topo.eyebrow}</Eyebrow>
            <h1 className="mt-3 text-[clamp(28px,7.4vw,50px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)] sm:mt-5">
              {t.topo.titulo}
            </h1>
            <p className="mt-3 max-w-[560px] text-[16px] leading-[1.55] text-[var(--v2-muted)] sm:mt-5 sm:text-[17.5px]">{t.topo.texto}</p>
            <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
              {t.topo.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[15px] font-medium leading-snug text-[var(--v2-navy)] sm:text-[16px]">
                  <span aria-hidden className="mt-[1px] flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                    <IconeVisto tamanho={12} strokeWidth={2.8} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-5 sm:mt-7">
              {cta("topo", ctaTopo)}
              <p className="mt-2.5 text-[13.5px] font-medium leading-snug text-[var(--v2-muted)] sm:text-[14px]">{t.topo.confianca}</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <PainelProtecao />
          </div>
        </div>
      </section>

      {/* ===== Problemas reais ===== */}
      <SectionV2 size="compact">
        <SectionHeader titulo={t.problemas.titulo} />
        <ul className="mt-8 grid gap-4 lg:grid-cols-3">
          {t.problemas.itens.map((item, i) => (
            <li key={item} className={`${CARTAO} flex items-start gap-4 p-5 sm:p-6`}>
              <span aria-hidden className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
                {[<IconeEtiqueta key="e" tamanho={22} />, <IconeFatura key="f" tamanho={22} />, <IconeCalendario key="c" tamanho={22} />][i]}
              </span>
              <p className="text-[16.5px] font-bold leading-snug text-[var(--v2-navy)]">{item}</p>
            </li>
          ))}
        </ul>
        <p className={`${TEXTO} mt-6`}>{t.problemas.fecho}</p>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 tone="soft-blue" size="compact">
        <SectionHeader titulo={t.comoFunciona.titulo} />
        <ol className="mt-8 grid gap-4 lg:grid-cols-3">
          {t.comoFunciona.passos.map((p, i) => (
            <li key={p.titulo} className={`${CARTAO} p-5 sm:p-6`}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-[15px] font-bold text-white">
                  {i + 1}
                </span>
                <span aria-hidden className="text-[var(--v2-green)]">
                  {[<IconeDocumentoVisto key="d" tamanho={22} />, <IconeLupaDocumento key="l" tamanho={22} />, <IconeMensagem key="m" tamanho={22} />][i]}
                </span>
              </div>
              <h3 className="mt-4 text-[18px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]">{p.titulo}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-[var(--v2-muted)]">{p.texto}</p>
            </li>
          ))}
        </ol>
      </SectionV2>

      {/* ===== Quem está por detrás ===== */}
      <SectionV2 size="compact" className="grid gap-8 md:grid-cols-[220px_1fr] md:items-center lg:gap-12">
        <Image
          src="/landing/founder-thiago-600.webp"
          alt={t.fundador.fotografia}
          width={300}
          height={340}
          loading="lazy"
          className="aspect-[4/5] w-full max-w-[180px] rounded-[18px] object-cover md:max-w-none"
        />
        <div className="max-w-[620px]">
          <SectionHeader eyebrow={t.fundador.eyebrow} titulo={t.fundador.titulo} />
          <div className="mt-5 space-y-3 text-[16px] leading-[1.65] text-[var(--v2-muted)]">
            {t.fundador.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Link
            prefetch={false}
            href={ROTAS_V2.sobreNos}
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline"
          >
            {t.fundador.conhecer} <IconeSeta tamanho={15} />
          </Link>
        </div>
      </SectionV2>

      {/* ===== Condições da oferta ===== */}
      <SectionV2 tone="soft-green" size="compact">
        <div className={`${CARTAO} mx-auto max-w-[760px] p-6 sm:p-10`}>
          <h2 className="text-[clamp(24px,3.2vw,34px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)]">
            {t.condicoes.titulo}
          </h2>
          <div className="mt-6">
            <ListaVistos itens={t.condicoes.itens(preco)} />
          </div>
          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {cta("condicoes", ctaCondicoes)}
            <Link
              prefetch={false}
              href={`${ROTAS_LEGAIS.termos}#planos`}
              className="inline-flex min-h-11 items-center text-[14.5px] font-semibold text-[var(--v2-navy)] underline underline-offset-4 hover:text-[var(--v2-green)]"
            >
              {t.condicoes.completas}
            </Link>
          </div>
        </div>
      </SectionV2>

      {/* ===== Perguntas frequentes ===== */}
      <SectionV2 size="compact" className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeader titulo={t.perguntas.titulo} />
        <FAQAccordionV2 perguntas={t.perguntas.itens(preco)} />
      </SectionV2>
      <div ref={fim} aria-hidden className="h-px" />

      {/* ===== CTA fixo no telemóvel, só quando nenhum outro CTA está à vista ===== */}
      <div
        aria-hidden={!barraVisivel}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--v2-line)] bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_-12px_rgba(11,37,69,0.18)] backdrop-blur transition-opacity duration-200 md:hidden ${
          barraVisivel ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <a href={destino} tabIndex={barraVisivel ? 0 : -1} onClick={() => cliqueCta("barra")} className={`${BOTAO_PRIMARIO} w-full`}>
          {t.barra.cta}
        </a>
      </div>
    </>
  );
}

/** Cabeçalho simplificado: logótipo (página inicial) e "Iniciar sessão" que volta à activação. */
export function CabecalhoLanding30Dias() {
  const c = useCaminho();
  const t = useTextos(tLanding30Dias);
  const utm = useUtm();
  // Quem já tem conta inicia sessão e volta à activação, sem procurar a oferta.
  const login = urlPortal(`/login?next=${encodeURIComponent(c(caminhoAtivacaoLanding(utm)))}`);
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--v2-line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-5 sm:h-16 sm:px-8">
        <Logotipo />
        <div className="flex items-center gap-4">
          {/* No telemóvel não cabe ao lado do logótipo: fica "Iniciar sessão", mais útil aqui. */}
          <SeletorIdioma compacto className="hidden sm:flex" />
          <a href={c(login)} className="whitespace-nowrap text-[14px] font-medium text-[var(--v2-muted)] hover:text-[var(--v2-navy)]">
            {t.cabecalho.iniciarSessao}
          </a>
        </div>
      </div>
    </header>
  );
}
