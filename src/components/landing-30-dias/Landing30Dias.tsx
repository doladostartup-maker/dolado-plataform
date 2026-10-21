"use client";

import Image from "next/image";
import Link from "@/i18n/Link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { useCaminho, useIdioma, useTextos } from "@/i18n/cliente";
import { tLanding30Dias } from "@/i18n/mensagens/landing30Dias";
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { ApoioWhatsApp } from "@/components/marketing-v2/ApoioWhatsApp";
import {
  IconeAntena,
  IconeCalendario,
  IconeDocumentoVisto,
  IconeFatura,
  IconeLupaDocumento,
  IconeMensagem,
  IconeSeta,
  IconeVisto,
} from "@/components/marketing-v2/Icones";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { formatarData, formatarEurosCents } from "@/i18n/formatar";
import { tWhatsApp } from "@/i18n/mensagens/whatsapp";
import { MESES_ALERTAS_GUARDADOS } from "@/lib/acesso";
import { track } from "@/lib/analytics";
import { CAMINHO_LANDING_30_DIAS, EXEMPLOS_LANDING, caminhoAtivacaoLanding, lerUtm, type Utm } from "@/lib/landing30Dias";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { PLANOS } from "@/lib/planos";
import { urlAtivacaoLanding, urlPortal } from "@/lib/site";

// Landing das campanhas Meta Ads (/30-dias-gratis). Uma só ação: o CTA leva
// à activação de sempre em portal.dolado.pt, que sem sessão passa logo ao
// registo (registo, confirmação do e-mail e aceitação dos Termos acontecem
// lá — nada é duplicado aqui). Os UTM do anúncio são lidos no browser (a
// página é estática) e seguem no URL.
//
// Ordem (revista a 21/10/2026, público sobretudo 55+): proposta + oferta +
// condições junto do botão → dois exemplos fictícios → três passos →
// fundador e WhatsApp → condições → perguntas → CTA final.
//
// Medição (só com consentimento — track() não faz nada sem gtag; o Pixel da
// Meta só existe com consentimento de marketing): landing_30d_view uma vez
// por carregamento (também se o consentimento chegar depois) e
// landing_30d_cta_click com o local do botão. Nunca dados pessoais. As etapas
// do portal (conta criada, e-mail confirmado, activação) contam-se na base de
// dados — /backoffice/protecao-gratuita.

type Local = "topo" | "final" | "barra";

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
 * Barra fixa: só depois de passar o CTA do topo e nunca a partir do CTA final
 * (que fica antes do rodapé). Calculado no scroll (não com
 * IntersectionObserver, que não avisa de saltos — ex.: tocar no topo do ecrã
 * no iOS — e deixava a barra no estado errado).
 */
function useBarraVisivel(topo: RefObject<Element | null>, fim: RefObject<Element | null>) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let pedido = 0;
    const calcular = () => {
      pedido = 0;
      const t = topo.current?.getBoundingClientRect();
      const f = fim.current?.getBoundingClientRect();
      if (!t || !f) return;
      setVisivel(t.bottom < 0 && f.top >= innerHeight);
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
  }, [topo, fim]);
  return visivel;
}

/** Etiqueta "Exemplo fictício" dos cartões de demonstração. */
function Ficticio({ children }: { children: ReactNode }) {
  return (
    <span className="flex-none rounded-full bg-[var(--v2-blue-soft)] px-3 py-1 text-[13px] font-semibold text-[var(--v2-navy)]">
      {children}
    </span>
  );
}

/** Cabeçalho de um exemplo: serviço fictício, como no portal. */
function Servico({ nome }: { nome: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] bg-[var(--v2-surface)] px-3.5 py-3">
      <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-[var(--v2-navy)] shadow-[0_1px_2px_rgba(11,37,69,0.1)]">
        <IconeAntena tamanho={18} />
      </span>
      <p className="text-[16px] font-bold text-[var(--v2-navy)]">{nome}</p>
    </div>
  );
}

function Exemplo({
  titulo,
  ficticio,
  icone,
  explicacao,
  children,
}: {
  titulo: string;
  ficticio: string;
  icone: ReactNode;
  explicacao: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-5">
      <figure className={`${CARTAO} flex flex-col gap-4 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <figcaption className="flex items-center gap-2.5 text-[18px] font-bold text-[var(--v2-navy)]">
            <span aria-hidden className="text-[var(--v2-green)]">
              {icone}
            </span>
            {titulo}
          </figcaption>
          <Ficticio>{ficticio}</Ficticio>
        </div>
        {children}
      </figure>
      <p className={TEXTO}>{explicacao}</p>
    </li>
  );
}

/** Lista com vistos, em letra de leitura confortável (16px; a ListaVistos é mais pequena). */
function Vistos({ itens, className = "" }: { itens: string[]; className?: string }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {itens.map((b) => (
        <li key={b} className="flex items-start gap-3 text-[16px] leading-[1.5] text-[var(--v2-navy)]">
          <span aria-hidden className="mt-[2px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
            <IconeVisto tamanho={13} strokeWidth={2.8} />
          </span>
          {b}
        </li>
      ))}
    </ul>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <dt className="text-[16px] text-[var(--v2-muted)]">{rotulo}</dt>
      <dd className="text-[17px] font-bold text-[var(--v2-navy)]">{valor}</dd>
    </div>
  );
}

export function Landing30Dias() {
  const idioma = useIdioma();
  const c = useCaminho();
  const t = useTextos(tLanding30Dias);
  const tw = useTextos(tWhatsApp);
  // Espaço inseparável: "4,99 €/mês" nunca se parte em duas linhas no telemóvel.
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos).replace(/ /g, "\u00a0");
  const euros = (cents: number) => formatarEurosCents(idioma, cents);
  const { promocao, factura } = EXEMPLOS_LANDING;
  const diferenca = `+${euros(factura.actualCents - factura.anteriorCents)}`;

  const utm = useUtm();
  const destino = c(urlAtivacaoLanding(utm));

  useEventoVista();

  const ctaTopo = useRef<HTMLAnchorElement>(null);
  const fim = useRef<HTMLElement>(null);
  const barraVisivel = useBarraVisivel(ctaTopo, fim);

  return (
    <>
      {/* ===== 1. Proposta, oferta, condições essenciais e CTA ===== */}
      <section className="bg-[linear-gradient(180deg,var(--v2-mint-bg)_0%,#fff_100%)]">
        <div className="mx-auto max-w-[820px] px-5 pb-12 pt-7 sm:px-8 sm:pt-12 lg:pb-16 lg:pt-16">
          <Eyebrow>{t.topo.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-[clamp(32px,8.2vw,54px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[var(--v2-navy)] sm:mt-5">
            {t.topo.titulo}
          </h1>
          <p className="mt-4 max-w-[640px] text-[18px] leading-[1.55] text-[var(--v2-navy)] sm:mt-5 sm:text-[19px]">{t.topo.texto}</p>
          <p className="mt-6 rounded-[14px] border border-[var(--v2-green)]/30 bg-[var(--v2-mint)] px-4 py-3.5 text-[18px] font-bold leading-snug text-[var(--v2-navy)] sm:px-5">
            {t.topo.oferta}
          </p>
          <a
            ref={ctaTopo}
            href={destino}
            onClick={() => cliqueCta("topo")}
            className={`${BOTAO_PRIMARIO} mt-5 min-h-14 w-full text-[17px] sm:w-auto sm:px-8`}
          >
            {t.topo.cta} <IconeSeta tamanho={18} />
          </a>
          <Vistos itens={t.topo.condicoes(preco)} className="mt-5" />
        </div>
      </section>

      {/* ===== 2. Dois exemplos concretos (fictícios) ===== */}
      <SectionV2 size="compact">
        <SectionHeader titulo={t.exemplos.titulo} texto={t.exemplos.texto} />
        <ul className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-8">
          <Exemplo
            titulo={t.exemplos.promocao.titulo}
            ficticio={t.exemplos.ficticio}
            icone={<IconeCalendario tamanho={22} />}
            explicacao={t.exemplos.promocao.explicacao}
          >
            <Servico nome={t.exemplos.promocao.servico} />
            <dl className="divide-y divide-[var(--v2-line)]">
              <Linha rotulo={t.exemplos.promocao.mensalidade} valor={euros(promocao.mensalidadeCents)} />
              <Linha rotulo={t.exemplos.promocao.fim} valor={formatarData(idioma, promocao.fim)} />
            </dl>
            <div className="rounded-[12px] border border-[var(--v2-line)] bg-[var(--v2-blue-bg)] px-4 py-3.5">
              <p className="flex items-center gap-2 text-[14px] font-bold uppercase tracking-[0.04em] text-[var(--v2-muted)]">
                <IconeMensagem tamanho={17} /> {t.exemplos.promocao.avisoRotulo}
              </p>
              <p className="mt-1.5 text-[16px] leading-[1.5] text-[var(--v2-navy)]">{t.exemplos.promocao.aviso}</p>
            </div>
          </Exemplo>
          <Exemplo
            titulo={t.exemplos.factura.titulo}
            ficticio={t.exemplos.ficticio}
            icone={<IconeFatura tamanho={22} />}
            explicacao={t.exemplos.factura.explicacao}
          >
            <Servico nome={t.exemplos.factura.servico} />
            <dl className="divide-y divide-[var(--v2-line)]">
              <Linha rotulo={t.exemplos.factura.anterior} valor={euros(factura.anteriorCents)} />
              <Linha rotulo={t.exemplos.factura.actual} valor={euros(factura.actualCents)} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <dt className="text-[16px] font-semibold text-[var(--v2-navy)]">{t.exemplos.factura.diferenca}</dt>
                <dd className="rounded-full bg-[var(--v2-aviso-bg)] px-3 py-0.5 text-[18px] font-extrabold text-[var(--v2-aviso)]">{diferenca}</dd>
              </div>
            </dl>
            <p className="flex items-start gap-2 text-[15px] leading-snug text-[var(--v2-muted)]">
              <IconeLupaDocumento tamanho={18} className="mt-[1px] flex-none text-[var(--v2-green)]" />
              {t.exemplos.factura.nota}
            </p>
          </Exemplo>
        </ul>
      </SectionV2>

      {/* ===== 3. Começar é simples ===== */}
      <SectionV2 tone="soft-blue" size="compact">
        <SectionHeader titulo={t.passos.titulo} />
        <ol className="mt-8 grid gap-4 lg:grid-cols-3">
          {t.passos.itens.map((p, i) => (
            <li key={p.titulo} className={`${CARTAO} p-5 sm:p-6`}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-[17px] font-bold text-white">
                  {i + 1}
                </span>
                <span aria-hidden className="text-[var(--v2-green)]">
                  {[<IconeVisto key="v" tamanho={22} />, <IconeDocumentoVisto key="d" tamanho={22} />, <IconeLupaDocumento key="l" tamanho={22} />][i]}
                </span>
              </div>
              <h3 className="mt-4 text-[19px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]">{p.titulo}</h3>
              <p className="mt-2 text-[16px] leading-[1.6] text-[var(--v2-muted)]">{p.texto}</p>
            </li>
          ))}
        </ol>
      </SectionV2>

      {/* ===== 4. Quem está por detrás ===== */}
      <SectionV2 size="compact" className="grid gap-8 md:grid-cols-[240px_1fr] md:items-center lg:gap-12">
        <Image
          src="/landing/founder-thiago-600.webp"
          alt={t.fundador.fotografia}
          width={300}
          height={340}
          loading="lazy"
          className="aspect-[4/5] w-full max-w-[200px] rounded-[18px] object-cover md:max-w-none"
        />
        <div className="max-w-[640px]">
          <Eyebrow>{t.fundador.eyebrow}</Eyebrow>
          <blockquote className="mt-4">
            <p className="text-[19px] font-medium leading-[1.55] text-[var(--v2-navy)] sm:text-[21px]">«{t.fundador.citacao}»</p>
            <footer className="mt-4 text-[16px]">
              <strong className="font-bold text-[var(--v2-navy)]">{t.fundador.nome}</strong>
              <span className="text-[var(--v2-muted)]"> · {t.fundador.cargo}</span>
            </footer>
          </blockquote>
          <div className="mt-5 flex flex-col gap-1">
            <ApoioWhatsApp
              pergunta={tw.contextos.protecaoGratuita.pergunta}
              acao={tw.contextos.protecaoGratuita.acao}
              mensagem={tw.contextos.protecaoGratuita.mensagem}
              pagina={CAMINHO_LANDING_30_DIAS}
              local="landing_30d"
              className="text-[16px]"
            />
            <Link
              prefetch={false}
              href={ROTAS_V2.sobreNos}
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-[16px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline"
            >
              {t.fundador.conhecer} <IconeSeta tamanho={15} />
            </Link>
          </div>
        </div>
      </SectionV2>

      {/* ===== 5. Condições da oferta ===== */}
      <SectionV2 tone="soft-green" size="compact">
        <div className={`${CARTAO} mx-auto max-w-[760px] p-6 sm:p-10`}>
          <h2 className="text-[clamp(26px,3.2vw,34px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)]">
            {t.condicoes.titulo}
          </h2>
          <Vistos itens={t.condicoes.itens(preco)} className="mt-6" />
          <Link
            prefetch={false}
            href={`${ROTAS_LEGAIS.termos}#planos`}
            className="mt-6 inline-flex min-h-11 items-center text-[16px] font-semibold text-[var(--v2-navy)] underline underline-offset-4 hover:text-[var(--v2-green)]"
          >
            {t.condicoes.completas}
          </Link>
        </div>
      </SectionV2>

      {/* ===== 6. Perguntas frequentes ===== */}
      <SectionV2 size="compact" className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeader titulo={t.perguntas.titulo} />
        <FAQAccordionV2 perguntas={t.perguntas.itens(preco, MESES_ALERTAS_GUARDADOS)} />
      </SectionV2>

      {/* ===== 7. CTA final (a barra fixa esconde-se a partir daqui) ===== */}
      <section ref={fim} className="bg-[var(--v2-navy)]">
        <div className="mx-auto max-w-[820px] px-5 py-12 text-center sm:px-8 sm:py-16">
          <h2 className="text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-white">{t.final.titulo}</h2>
          <p className="mt-3 text-[17px] leading-[1.55] text-white/85">{t.final.texto}</p>
          <a href={destino} onClick={() => cliqueCta("final")} className={`${BOTAO_PRIMARIO} mt-6 min-h-14 w-full text-[17px] sm:w-auto sm:px-8`}>
            {t.topo.cta} <IconeSeta tamanho={18} />
          </a>
        </div>
      </section>

      {/* ===== CTA fixo no telemóvel, só quando nenhum outro CTA está à vista ===== */}
      <div
        aria-hidden={!barraVisivel}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--v2-line)] bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_-12px_rgba(11,37,69,0.18)] backdrop-blur transition-opacity duration-200 md:hidden ${
          barraVisivel ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <a href={destino} tabIndex={barraVisivel ? 0 : -1} onClick={() => cliqueCta("barra")} className={`${BOTAO_PRIMARIO} w-full text-[16px]`}>
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
