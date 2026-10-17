"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { perguntasHomepage } from "@/components/landing/conteudoPerguntasFrequentes";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { tWhatsApp } from "@/i18n/mensagens/whatsapp";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import {
  IconeCirculoVisto,
  IconeDocumentoVisto,
  IconeEscudo,
  IconeFormulario,
  IconeLupaDocumento,
  IconeMensagem,
  IconePessoas,
  IconeSeta,
} from "@/components/marketing-v2/Icones";
import { ExemploReclamacao } from "@/components/marketing-v2/Exemplos";
import { VisualHero } from "@/components/marketing-v2/Mockups";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { PLANOS, type PlanoId } from "@/lib/planos";
import { caminhoProblema } from "@/lib/problemas/catalogo";
import { ApoioWhatsApp } from "@/components/marketing-v2/ApoioWhatsApp";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { FeatureCard } from "@/components/marketing-v2/FeatureCard";
import { ferramentas } from "@/components/marketing-v2/ferramentas";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { OrigemFundador } from "@/components/marketing-v2/OrigemFundador";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";

// Homepage "/" no Design System V2 (docs/design/design-system-v2.md). Navbar,
// rodapé, tokens e secções vêm de src/components/marketing-v2/ (moldura em
// PaginaV2). Os eventos de medição mantêm os nomes da homepage anterior
// quando a ação é a mesma (click_nav_reclamacao, click_hero_reclamacao,
// click_hero_simulador).
//
// Regras de conteúdo: gratuito só a Calculadora de Cancelamento (fidelização)
// e o Simulador de Elegibilidade; a comparação de faturas só na Proteção; sem
// logótipos de terceiros; sem testemunhos inventados.

// Na homepage, as duas ferramentas de "existe um problema?"; o Guia de
// Mudança fica na página de ferramentas gratuitas.
const EVENTOS_FERRAMENTAS = {
  calculadora: "click_home_calculadora",
  simulador: "click_home_simulador",
} as const;

// Situações concretas logo a seguir à abertura: cada uma leva à página já
// existente mais próxima (catálogo em src/lib/problemas/catalogo.ts).
type IdSituacao = "cobrancaCancelamento" | "faturaLuz" | "reembolso" | "fidelizacao" | "servicoNaoPedido" | "semResposta";
const SITUACOES: { id: IdSituacao; href: string }[] = [
  { id: "cobrancaCancelamento", href: caminhoProblema("telecomunicacoes", "cobranca-apos-cancelamento") },
  { id: "faturaLuz", href: caminhoProblema("energia", "fatura-muito-alta") },
  { id: "reembolso", href: caminhoProblema("compras-reembolsos", "loja-nao-devolve-dinheiro") },
  { id: "fidelizacao", href: ROTAS_V2.calculadora },
  { id: "servicoNaoPedido", href: caminhoProblema("telecomunicacoes", "cobranca-indevida") },
  { id: "semResposta", href: ROTAS_V2.simulador },
];

// Resumo dos três serviços pela ordem do preçário por necessidade. Preços
// sempre de src/lib/planos.ts.
const ORDEM_RESUMO: PlanoId[] = ["avulso", "caso_protecao", "protecao"];

// Textos: src/i18n/mensagens/*/inicio.ts (pt-PT e en-GB).
const ICONES_GARANTIAS: ReactNode[] = [
  <IconeEscudo key="e" tamanho={20} />,
  <IconeDocumentoVisto key="d" tamanho={20} />,
  <IconePessoas key="p" tamanho={20} />,
];

const ICONES_PASSOS: ReactNode[] = [
  <IconeFormulario key="f" tamanho={34} strokeWidth={1.5} />,
  <IconeLupaDocumento key="l" tamanho={34} strokeWidth={1.5} />,
  <IconeCirculoVisto key="c" tamanho={34} strokeWidth={1.5} />,
  <IconeMensagem key="m" tamanho={34} strokeWidth={1.5} />,
];

export function HomepageV2() {
  const [origem] = useState(detectarOrigem);
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tInicio[idioma];
  const tw = tWhatsApp[idioma].contextos.homepage;
  const tp = tPlanos[idioma];
  const GARANTIAS = t.hero.garantias.map((texto, i) => ({ icone: ICONES_GARANTIAS[i], texto }));
  const PASSOS: Passo[] = t.comoFunciona.passos.map((p, i) => ({ ...p, icone: ICONES_PASSOS[i] }));

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
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" recortar className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:py-20">
        <div>
          <Eyebrow>{t.hero.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,3.7vw,50px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.hero.titulo1} <br className="hidden sm:inline" />
            {t.hero.titulo2}
            <br />
            <span className="font-semibold">{t.hero.titulo3}</span>
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[540px] text-[17.5px]`}>{t.hero.texto}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => tratarCaso("click_hero_reclamacao")} className={BOTAO_PRIMARIO}>
              {t.hero.tratarCaso} <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false}
              href={ROTAS_V2.simulador}
              onClick={() => track("click_hero_simulador")}
              className={BOTAO_CONTORNO}
            >
              {t.hero.verSeAjuda}
            </Link>
          </div>
          <p className="mt-4 max-w-[540px] text-[14px] leading-relaxed text-[var(--v2-muted)]">{t.hero.explicacaoBotoes}</p>
          <ul className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-7">
            {GARANTIAS.map((g) => (
              <li key={g.texto} className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--v2-muted)]">
                <span className="text-[var(--v2-navy)]">{g.icone}</span>
                {g.texto}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-[var(--v2-muted)]">{t.hero.resposta}</p>
          <ApoioWhatsApp className="mt-5" pergunta={tw.pergunta} mensagem={tw.mensagem} pagina="/" local="homepage" contexto="hero" />
        </div>
        {/* Decorativo: no telemóvel fica escondido para as situações concretas
            aparecerem logo a seguir à abertura. */}
        <div className="hidden lg:block">
          <VisualHero />
        </div>
      </SectionV2>

      {/* ===== Situações concretas ===== */}
      {/* Cada situação leva à página mais próxima que já existe (problema,
          calculadora ou simulador), nunca a um destino genérico. */}
      <SectionV2 id="situacoes" tone="soft-blue">
        <SectionHeader eyebrow={t.problemas.eyebrow} titulo={t.problemas.titulo} texto={t.problemas.texto} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITUACOES.map((s) => {
            const item = t.problemas.itens[s.id];
            return (
              <li key={s.id}>
                <Link
                  prefetch={false}
                  href={s.href}
                  onClick={() => track("click_home_situacao", { situacao: s.id })}
                  className={`${CARTAO} group flex h-full flex-col p-6 transition-colors hover:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]`}
                >
                  <span className="text-[18px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]">{item.pergunta}</span>
                  <span className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{item.texto}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14.5px] font-semibold text-[var(--v2-green)] group-hover:underline group-hover:underline-offset-4">
                    {t.problemas.saberMais} <IconeSeta tamanho={15} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link prefetch={false}
          href={ROTAS_V2.problemas}
          onClick={() => track("click_home_problemas")}
          className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
        >
          {t.problemas.verTodos} <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>

      {/* ===== Duas formas de ajudar: tratar um problema / Proteção ===== */}
      {/* A Proteção é um serviço autónomo: não depende de ter aberto um caso. */}
      <SectionV2>
        <SectionHeader eyebrow={t.servicos.eyebrow} titulo={t.servicos.titulo} />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className={`${CARTAO} flex flex-col p-7 sm:p-8`}>
            <span className="text-[var(--v2-green)]">
              <IconeDocumentoVisto tamanho={30} strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{t.servicos.tratar.titulo}</h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{t.servicos.tratar.texto}</p>
            <div className="mt-6">
              <ListaVistos itens={t.servicos.tratar.itens} />
            </div>
            <div className="mt-auto pt-8">
              <button type="button" onClick={() => tratarCaso("click_home_servico_tratar")} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                {t.servicos.tratar.cta} <IconeSeta tamanho={17} />
              </button>
            </div>
          </article>
          <article className={`${CARTAO} flex flex-col p-7 sm:p-8`}>
            <span className="text-[var(--v2-green)]">
              <IconeEscudo tamanho={30} strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{t.servicos.protecao.titulo}</h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{t.servicos.protecao.texto}</p>
            <div className="mt-6">
              <ListaVistos itens={t.servicos.protecao.itens} />
            </div>
            <div className="mt-auto pt-8">
              <Link prefetch={false} href={ROTAS_V2.protecao} onClick={() => track("click_home_protecao")} className={`${BOTAO_CONTORNO} w-full sm:w-auto`}>
                {t.servicos.protecao.cta} <IconeSeta tamanho={17} />
              </Link>
            </div>
          </article>
        </div>
        <p className="mt-8 max-w-[760px] border-l-[3px] border-[var(--v2-green)] pl-4 text-[14px] leading-relaxed text-[var(--v2-muted)]">
          {t.servicos.nota}
        </p>
      </SectionV2>

      {/* ===== Como funciona (explicação principal do processo) ===== */}
      <SectionV2 id="como-funciona" tone="soft-blue">
        <SectionHeader eyebrow={t.comoFunciona.eyebrow} titulo={t.comoFunciona.titulo} />
        <div className="mt-12">
          <StepsTimeline passos={PASSOS} />
        </div>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
          <ExemploReclamacao />
          <Link prefetch={false}
            href={ROTAS_V2.comoFunciona}
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline lg:mt-6"
          >
            {t.comoFunciona.verTodos} <IconeSeta tamanho={15} />
          </Link>
        </div>
      </SectionV2>

      {/* ===== Preços (resumo; condições completas em /precario) ===== */}
      <SectionV2 id="precos">
        <SectionHeader eyebrow={t.precos.eyebrow} titulo={t.precos.titulo} texto={t.precos.texto} />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {ORDEM_RESUMO.map((id) => {
            const plano = PLANOS[id];
            const r = t.precos.planos[id];
            return (
              <li key={id} className={`${CARTAO} flex flex-col p-6`}>
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{tp.nome[id]}</p>
                <p className="mt-2 text-[16.5px] font-bold leading-snug text-[var(--v2-navy)]">{r.necessidade}</p>
                <p className="mt-4">
                  <span className="text-[30px] font-extrabold tracking-[-0.03em] text-[var(--v2-navy)]">
                    {precoNoIdioma(idioma, plano.precoCentimos)}
                  </span>
                  <span className="text-[15px] font-medium text-[var(--v2-muted)]"> {plano.subscricao ? tp.unidadeMes : tp.unidadeCaso}</span>
                </p>
                <p className="mt-1 text-[13.5px] text-[var(--v2-muted)]">{plano.subscricao ? tp.subscricaoMensal : tp.pagamentoUnico}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-navy)]">{r.detalhe}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <Link prefetch={false} href={ROTAS_V2.precario} onClick={() => track("click_home_precos")} className={BOTAO_CONTORNO}>
            {t.precos.verPrecario} <IconeSeta tamanho={16} />
          </Link>
          <Link prefetch={false}
            href={ROTAS_V2.protecao}
            onClick={() => track("click_home_precos_protecao")}
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.precos.conhecerProtecao} <IconeSeta tamanho={15} />
          </Link>
        </div>
        <ApoioWhatsApp className="mt-6" pergunta={tWhatsApp[idioma].contextos.precario.pergunta} mensagem={tWhatsApp[idioma].contextos.precario.mensagem} pagina="/" local="homepage" contexto="precos" />
      </SectionV2>

      {/* ===== Ferramentas gratuitas ===== */}
      <SectionV2 id="ferramentas" tone="soft-blue">
        <SectionHeader
          eyebrow={t.ferramentas.eyebrow}
          titulo={t.ferramentas.titulo}
          texto={t.ferramentas.texto}
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {ferramentas(idioma).filter((f) => f.id in EVENTOS_FERRAMENTAS).map((f) => (
            <FeatureCard
              key={f.id}
              icone={f.icone}
              titulo={f.titulo}
              texto={f.texto}
              visual={f.visual}
              acao={
                <Link prefetch={false}
                  href={f.href}
                  onClick={() => track(EVENTOS_FERRAMENTAS[f.id as keyof typeof EVENTOS_FERRAMENTAS])}
                  className={BOTAO_CONTORNO}
                >
                  {f.cta} <IconeSeta tamanho={16} />
                </Link>
              }
            />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px] text-[var(--v2-muted)]">{t.ferramentas.semConta}</p>
          <Link prefetch={false}
            href={ROTAS_V2.ferramentas}
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.ferramentas.verTodas} <IconeSeta tamanho={15} />
          </Link>
        </div>
      </SectionV2>

      {/* ===== A nossa origem ===== */}
      <OrigemFundador
        tone="white"
        aside={
          <aside className="rounded-[18px] bg-[var(--v2-mint)] p-7 md:col-span-2 xl:col-span-1">
            <span className="text-[var(--v2-green)]">
              <IconePessoas tamanho={32} strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
              {t.origem.titulo}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-muted)]">{t.origem.texto}</p>
            <Link prefetch={false} href={ROTAS_V2.sobreNos} className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline">
              {t.origem.saberMais} <IconeSeta tamanho={15} />
            </Link>
          </aside>
        }
      />

      {/*
        Prova social: sem testemunhos reais aprovados no projeto, a secção não
        é mostrada. Quando existirem, entram aqui (três cartões com texto curto
        e nome; sem fotografias, estrelas nem resultados inventados).
      */}

      {/* ===== Perguntas frequentes ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeader eyebrow={t.perguntas.eyebrow} titulo={t.perguntas.titulo} />
          <Link prefetch={false}
            href={ROTAS_V2.ajuda}
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.perguntas.verTodas} <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={perguntasHomepage(idioma)} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        eyebrow={t.ctaFinal.eyebrow}
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <Link prefetch={false}
            href={ROTAS_V2.simulador}
            onClick={() => track("click_home_cta_final")}
            className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
          >
            {t.ctaFinal.acao} <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
