"use client";

import Image from "next/image";
import Link from "@/i18n/Link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { tWhatsApp } from "@/i18n/mensagens/whatsapp";
import { tMarketing } from "@/i18n/mensagens/marketing";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { caminhoProblema } from "@/lib/problemas/catalogo";
import {
  IconeCalendario,
  IconeCasa,
  IconeDocumentoVisto,
  IconeEscudo,
  IconePergunta,
  IconeSeta,
} from "@/components/marketing-v2/Icones";
import { VisualHero } from "@/components/marketing-v2/Mockups";
import { ApoioWhatsApp } from "@/components/marketing-v2/ApoioWhatsApp";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { ferramentas } from "@/components/marketing-v2/ferramentas";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";

// Homepage "/" no Design System V2 (docs/design/design-system-v2.md). Navbar,
// rodapé, tokens e secções vêm de src/components/marketing-v2/ (moldura em
// PaginaV2). Os eventos de medição mantêm os nomes anteriores quando a ação
// é a mesma (click_hero_reclamacao, click_hero_simulador, click_home_*).
//
// Simplificação de 17/10/2026: uma ideia por secção, pouco texto, um CTA
// principal por secção. Ordem: abertura → situações reais → as duas
// vertentes → como funciona (3 passos) → ferramentas → fundador → CTA final.
// O preçário, as perguntas frequentes e o processo em detalhe vivem nas
// páginas próprias (navbar e rodapé).
//
// Regras de conteúdo: gratuitas só as ferramentas de /ferramentas-gratuitas;
// a comparação de faturas só na Proteção; sem logótipos de terceiros; sem
// testemunhos inventados.

const LIGACAO = "inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline";

// Situações reais: cada uma leva à página já existente mais próxima
// (catálogo em src/lib/problemas/catalogo.ts), nunca a um destino genérico.
type IdSituacao = "faturaAlta" | "promocao" | "fidelizacao" | "reembolso" | "naoReconhece" | "semResposta";
const SITUACOES: { id: IdSituacao; href: string }[] = [
  { id: "faturaAlta", href: caminhoProblema("energia", "fatura-muito-alta") },
  { id: "promocao", href: caminhoProblema("telecomunicacoes", "aumento-preco") },
  { id: "fidelizacao", href: caminhoProblema("telecomunicacoes", "cancelar-fidelizacao") },
  { id: "reembolso", href: caminhoProblema("compras-reembolsos", "loja-nao-devolve-dinheiro") },
  { id: "naoReconhece", href: caminhoProblema("telecomunicacoes", "cobranca-indevida") },
  { id: "semResposta", href: ROTAS_V2.simulador },
];

// As três ferramentas gratuitas (destinos de src/components/marketing-v2/
// ferramentas.tsx; aqui só com texto curto).
const EVENTOS_FERRAMENTAS = {
  calculadora: "click_home_calculadora",
  simulador: "click_home_simulador",
  mudanca: "click_home_mudanca",
} as const;
const ICONES_FERRAMENTAS: Record<keyof typeof EVENTOS_FERRAMENTAS, ReactNode> = {
  calculadora: <IconeCalendario tamanho={26} strokeWidth={1.6} />,
  simulador: <IconePergunta tamanho={26} strokeWidth={1.6} />,
  mudanca: <IconeCasa tamanho={26} strokeWidth={1.6} />,
};

export function HomepageV2() {
  const [origem] = useState(detectarOrigem);
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tInicio[idioma];
  const tw = tWhatsApp[idioma].contextos.homepage;

  // O preçário saiu da homepage para /precario. Os links antigos para
  // "/#precario" (portal, regresso do Stripe, /criar-conta, e-mails já
  // enviados) continuam a funcionar: o fragmento só existe no browser.
  useEffect(() => {
    const irParaPrecario = () => {
      if (window.location.hash === "#precario") window.location.replace(c(ROTAS_V2.precario));
    };
    irParaPrecario();
    window.addEventListener("hashchange", irParaPrecario);
    return () => window.removeEventListener("hashchange", irParaPrecario);
  }, [c]);

  const tratarCaso = useCallback(
    (evento: string) => {
      track(evento);
      window.location.assign(c(urlTratarCaso(origem)));
    },
    [origem, c],
  );

  return (
    <>
      {/* ===== Abertura ===== */}
      <SectionV2 size="compact" recortar className="grid items-center gap-12 lg:grid-cols-[1.3fr_1fr] lg:py-24">
        <div>
          <h1 className="text-[clamp(36px,4.2vw,56px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.hero.titulo}
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[520px] text-[18px]`}>{t.hero.texto}</p>
          <p className="mt-3 max-w-[520px] text-[18px] font-semibold leading-[1.5] text-[var(--v2-navy)]">{t.hero.destaque}</p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
            <button type="button" onClick={() => tratarCaso("click_hero_reclamacao")} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
              {t.hero.tratarCaso} <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false} href={ROTAS_V2.simulador} onClick={() => track("click_hero_simulador")} className={LIGACAO}>
              {t.hero.verSeAjuda} <IconeSeta tamanho={15} />
            </Link>
          </div>
        </div>
        {/* Decorativo: no telemóvel fica escondido para as situações reais
            aparecerem logo a seguir à abertura. */}
        <div className="hidden lg:block">
          <VisualHero />
        </div>
      </SectionV2>

      {/* ===== Situações reais ===== */}
      <SectionV2 id="situacoes" tone="soft-blue">
        <SectionHeader titulo={t.problemas.titulo} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITUACOES.map((s) => (
            <li key={s.id}>
              <Link
                prefetch={false}
                href={s.href}
                onClick={() => track("click_home_situacao", { situacao: s.id })}
                className={`${CARTAO} group flex h-full items-center justify-between gap-4 p-6 transition-colors hover:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]`}
              >
                <span className="text-[17px] font-semibold leading-snug text-[var(--v2-navy)]">{t.problemas.itens[s.id]}</span>
                <span aria-hidden="true" className="flex-none text-[var(--v2-green)] transition-transform group-hover:translate-x-0.5">
                  <IconeSeta tamanho={18} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <p className="text-[18px] font-bold text-[var(--v2-navy)]">{t.problemas.fecho}</p>
          <Link prefetch={false} href={ROTAS_V2.problemas} onClick={() => track("click_home_problemas")} className={LIGACAO}>
            {t.problemas.verTodos} <IconeSeta tamanho={15} />
          </Link>
        </div>
      </SectionV2>

      {/* ===== As duas vertentes: tratar um problema / Proteção ===== */}
      {/* A Proteção é um serviço autónomo: não depende de ter aberto um caso. */}
      <SectionV2>
        <SectionHeader
          titulo={
            <>
              {t.vertentes.titulo1}
              <br />
              <span className="text-[var(--v2-green-dark)]">{t.vertentes.titulo2}</span>
            </>
          }
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <article className={`${CARTAO} flex flex-col p-8 sm:p-10`}>
            <span className="text-[var(--v2-green)]">
              <IconeDocumentoVisto tamanho={32} strokeWidth={1.6} />
            </span>
            <h3 className="mt-5 text-[24px] font-bold tracking-[-0.015em] text-[var(--v2-navy)]">{t.vertentes.tratar.titulo}</h3>
            <p className="mt-2 text-[17px] leading-relaxed text-[var(--v2-muted)]">{t.vertentes.tratar.texto}</p>
            <div className="mt-auto pt-8">
              <button type="button" onClick={() => tratarCaso("click_home_servico_tratar")} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                {t.vertentes.tratar.cta} <IconeSeta tamanho={17} />
              </button>
            </div>
          </article>
          <article className={`${CARTAO} flex flex-col p-8 sm:p-10`}>
            <span className="text-[var(--v2-green)]">
              <IconeEscudo tamanho={32} strokeWidth={1.6} />
            </span>
            <h3 className="mt-5 text-[24px] font-bold tracking-[-0.015em] text-[var(--v2-navy)]">{t.vertentes.protecao.titulo}</h3>
            <p className="mt-2 text-[17px] leading-relaxed text-[var(--v2-muted)]">{t.vertentes.protecao.texto}</p>
            <div className="mt-auto pt-8">
              <Link prefetch={false} href={ROTAS_V2.protecao} onClick={() => track("click_home_protecao")} className={`${BOTAO_CONTORNO} w-full sm:w-auto`}>
                {t.vertentes.protecao.cta} <IconeSeta tamanho={17} />
              </Link>
            </div>
          </article>
        </div>
      </SectionV2>

      {/* ===== Como funciona: a única explicação do processo na homepage ===== */}
      <SectionV2 id="como-funciona" tone="soft-blue">
        <SectionHeader titulo={t.comoFunciona.titulo} />
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {t.comoFunciona.passos.map((passo, i) => (
            <li key={passo} className="flex gap-4 md:flex-col md:gap-5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-[16px] font-bold text-white">
                {i + 1}
              </span>
              <p className="pt-1.5 text-[18px] font-semibold leading-snug text-[var(--v2-navy)] md:pt-0">{passo}</p>
            </li>
          ))}
        </ol>
        <Link prefetch={false} href={ROTAS_V2.comoFunciona} onClick={() => track("click_home_como_funciona")} className={`${LIGACAO} mt-10`}>
          {t.comoFunciona.verMais} <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>

      {/* ===== Ferramentas gratuitas ===== */}
      <SectionV2 id="ferramentas">
        <SectionHeader titulo={t.ferramentas.titulo} />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {ferramentas(idioma).map((f) => {
            const id = f.id;
            const item = t.ferramentas.itens[id];
            return (
              <li key={id}>
                <Link
                  prefetch={false}
                  href={f.href}
                  onClick={() => track(EVENTOS_FERRAMENTAS[id])}
                  className={`${CARTAO} group flex h-full flex-col p-6 transition-colors hover:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]`}
                >
                  <span className="text-[var(--v2-green)]">{ICONES_FERRAMENTAS[id]}</span>
                  <span className="mt-4 text-[18px] font-bold text-[var(--v2-navy)]">{item.titulo}</span>
                  <span className="mt-1.5 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{item.texto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link prefetch={false} href={ROTAS_V2.ferramentas} className={`${LIGACAO} mt-8`}>
          {t.ferramentas.verTodas} <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>

      {/* ===== Fundador (história completa em /sobre-nos) ===== */}
      {/* Fotografia real (já publicada; 600 px, imagens não otimizadas no
          servidor — images.unoptimized, next.config.ts). */}
      <SectionV2 tone="soft-blue" className="grid items-center gap-8 sm:grid-cols-[180px_1fr] sm:gap-10 lg:grid-cols-[220px_1fr]">
        <Image
          src="/landing/founder-thiago-600.webp"
          alt={tMarketing[idioma].origem.fotografia}
          width={220}
          height={260}
          className="aspect-[4/5] w-full max-w-[180px] rounded-[18px] object-cover lg:max-w-[220px]"
        />
        <div className="max-w-[620px]">
          <h2 className="text-[clamp(26px,3vw,34px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)]">{t.fundador.titulo}</h2>
          <p className={`${TEXTO} mt-4`}>{t.fundador.texto}</p>
          <p className="mt-5 text-[15.5px] font-bold text-[var(--v2-navy)]">{t.fundador.nome}</p>
          <p className="text-[14.5px] text-[var(--v2-muted)]">{t.fundador.cargo}</p>
          <Link prefetch={false} href={ROTAS_V2.sobreNos} className={`${LIGACAO} mt-5`}>
            {t.fundador.cta} <IconeSeta tamanho={15} />
          </Link>
        </div>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        acao={
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <button type="button" onClick={() => tratarCaso("click_home_cta_final")} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
              {t.ctaFinal.acao} <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false} href={ROTAS_V2.simulador} onClick={() => track("click_home_cta_final_simulador")} className={LIGACAO}>
              {t.ctaFinal.secundaria}
            </Link>
          </div>
        }
        apoio={
          <ApoioWhatsApp className="mx-auto mt-6 max-w-[1200px]" pergunta={tw.pergunta} mensagem={tw.mensagem} pagina="/" local="homepage" contexto="cta_final" />
        }
      />
    </>
  );
}
