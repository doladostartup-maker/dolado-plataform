"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PERGUNTAS_HOMEPAGE } from "@/components/landing/conteudoPerguntasFrequentes";
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
import { PainelCaso, PainelProtecao, VisualHero } from "@/components/marketing-v2/Mockups";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { FeatureCard } from "@/components/marketing-v2/FeatureCard";
import { FERRAMENTAS } from "@/components/marketing-v2/ferramentas";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { OrigemFundador } from "@/components/marketing-v2/OrigemFundador";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, TEXTO } from "@/components/marketing-v2/estilos";

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

const GARANTIAS: { icone: ReactNode; texto: string }[] = [
  { icone: <IconeEscudo tamanho={20} />, texto: "Simples e seguro" },
  { icone: <IconeDocumentoVisto tamanho={20} />, texto: "Com a sua aprovação" },
  { icone: <IconePessoas tamanho={20} />, texto: "Acompanhamos o processo" },
];

const PASSOS: Passo[] = [
  {
    icone: <IconeFormulario tamanho={34} strokeWidth={1.5} />,
    titulo: "Conte-nos o que aconteceu",
    texto: "Explique o problema e envie os documentos relevantes.",
  },
  {
    icone: <IconeLupaDocumento tamanho={34} strokeWidth={1.5} />,
    titulo: "Nós analisamos e preparamos",
    texto: "Organizamos a informação e preparamos o texto adequado ao seu caso.",
  },
  {
    icone: <IconeCirculoVisto tamanho={34} strokeWidth={1.5} />,
    titulo: "Confirma antes do envio",
    texto: "Revê exatamente o que será enviado e autoriza quando estiver satisfeito.",
  },
  {
    icone: <IconeMensagem tamanho={34} strokeWidth={1.5} />,
    titulo: "Acompanhamos o processo",
    texto: "Pode consultar no portal o histórico, o texto enviado e os comprovativos associados ao caso.",
  },
];

const TRATAMENTO = [
  "Reclamações a empresas de vários setores",
  "Texto claro e fundamentado",
  "Envio ao canal adequado",
  "Acompanhamento do processo",
];

const PROTECAO = [
  "Alterações relevantes nas suas faturas, comparadas mês a mês",
  "Aproximação do fim de uma promoção",
  "Datas importantes de fidelização",
  "Situações que possam justificar uma análise mais atenta",
];

export function HomepageV2() {
  const [origem] = useState(detectarOrigem);

  // O preçário saiu da homepage para /precario. Os links antigos para
  // "/#precario" (portal, regresso do Stripe, /criar-conta, e-mails já
  // enviados) continuam a funcionar: o fragmento só existe no browser.
  useEffect(() => {
    const irParaPrecario = () => {
      if (window.location.hash === "#precario") window.location.replace(ROTAS_V2.precario);
    };
    irParaPrecario();
    window.addEventListener("hashchange", irParaPrecario);
    return () => window.removeEventListener("hashchange", irParaPrecario);
  }, []);

  const tratarCaso = useCallback(
    (evento: string) => {
      track(evento);
      window.location.assign(urlTratarCaso(origem));
    },
    [origem],
  );

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" recortar className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:py-20">
        <div>
          <Eyebrow>Do seu lado com as empresas</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,3.7vw,50px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            Tem um problema <br className="hidden sm:inline" />
            com uma empresa?
            <br />
            <span className="font-semibold">A DoLado trata dele por si.</span>
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[540px] text-[17.5px]`}>
            Explique-nos o que aconteceu. Analisamos a sua situação, preparamos a reclamação,
            mostramos-lhe o texto antes de enviar e acompanhamos o processo consigo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => tratarCaso("click_hero_reclamacao")} className={BOTAO_PRIMARIO}>
              Tratar do meu caso <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false}
              href="/simulador-elegibilidade"
              onClick={() => track("click_hero_simulador")}
              className={BOTAO_CONTORNO}
            >
              Ver se a DoLado pode ajudar
            </Link>
          </div>
          <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-7">
            {GARANTIAS.map((g) => (
              <li key={g.texto} className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--v2-muted)]">
                <span className="text-[var(--v2-navy)]">{g.icone}</span>
                {g.texto}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-[var(--v2-muted)]">
            Resposta ao primeiro contacto no prazo máximo de 48 horas úteis.
          </p>
        </div>
        <VisualHero />
      </SectionV2>

      {/* ===== Ferramentas gratuitas ===== */}
      <SectionV2 id="ferramentas" tone="soft-blue">
        <SectionHeader
          eyebrow="Ferramentas gratuitas"
          titulo="Ainda não sabe se existe um problema?"
          texto="Antes de contratar qualquer serviço, pode usar gratuitamente estas ferramentas da DoLado para perceber melhor a sua situação."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {FERRAMENTAS.filter((f) => f.id in EVENTOS_FERRAMENTAS).map((f) => (
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
          <p className="text-[13.5px] text-[var(--v2-muted)]">Sem conta e sem e-mail. O resultado aparece logo no ecrã.</p>
          <Link prefetch={false}
            href={ROTAS_V2.ferramentas}
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            Ver todas as ferramentas gratuitas <IconeSeta tamanho={15} />
          </Link>
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 id="como-funciona">
        <SectionHeader eyebrow="Como funciona" titulo="Simples, do princípio ao fim." />
        <div className="mt-12">
          <StepsTimeline passos={PASSOS} />
        </div>
        <Link prefetch={false}
          href={ROTAS_V2.comoFunciona}
          className="mt-10 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
        >
          Ver todos os passos <IconeSeta tamanho={15} />
        </Link>
      </SectionV2>

      {/* ===== A nossa origem ===== */}
      <OrigemFundador
        aside={
          <aside className="rounded-[18px] bg-[var(--v2-mint)] p-7 md:col-span-2 xl:col-span-1">
            <span className="text-[var(--v2-green)]">
              <IconePessoas tamanho={32} strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
              Do lado de quem consome.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-muted)]">
              A DoLado existe para ajudar os consumidores a resolver problemas com empresas e a evitar que
              voltem a acontecer.
            </p>
            <Link prefetch={false} href={ROTAS_V2.sobreNos} className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline">
              Saber mais sobre nós <IconeSeta tamanho={15} />
            </Link>
          </aside>
        }
      />

      {/* ===== Tratamento do caso ===== */}
      <SectionV2 className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <SectionHeader
            eyebrow="Tratamento do seu caso"
            titulo={
              <>
                Encontrou um problema?
                <br />
                A DoLado trata dele consigo.
              </>
            }
          />
          <p className={`${TEXTO} mt-5 max-w-[520px]`}>
            Preparamos a reclamação, mostramos-lhe o texto antes do envio e acompanhamos o processo consigo.
          </p>
          <div className="mt-7">
            <ListaVistos itens={TRATAMENTO} />
          </div>
          <Link prefetch={false} href={ROTAS_V2.precario} onClick={() => track("click_home_precos")} className={`${BOTAO_PRIMARIO} mt-9`}>
            Ver preços e tratar do meu caso <IconeSeta tamanho={17} />
          </Link>
          <p className="mt-8 max-w-[520px] border-l-[3px] border-[var(--v2-green)] pl-4 text-[14px] leading-relaxed text-[var(--v2-muted)]">
            Não garantimos resolver — garantimos que a reclamação chega bem feita, com a lei certa citada. A DoLado
            presta apoio administrativo, nunca aconselhamento jurídico individualizado.
          </p>
        </div>
        <PainelCaso />
      </SectionV2>

      {/* ===== Proteção ===== */}
      <SectionV2 tone="soft-green" className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <SectionHeader sobreVerde eyebrow="Depois de resolver o problema" titulo="Podemos continuar atentos por si." />
          <p className={`${TEXTO} mt-5 max-w-[540px]`}>
            Com a Proteção DoLado, acompanhamos as informações relevantes que nos disponibiliza e avisamos
            quando identificamos algo que merece a sua atenção.
          </p>
          <div className="mt-7">
            <ListaVistos itens={PROTECAO} />
          </div>
          <Link prefetch={false} href={ROTAS_V2.precario} onClick={() => track("click_home_protecao")} className={`${BOTAO_PRIMARIO} mt-9`}>
            Conhecer a Proteção <IconeSeta tamanho={17} />
          </Link>
        </div>
        <PainelProtecao />
      </SectionV2>

      {/*
        Prova social: sem testemunhos reais aprovados no projeto, a secção não
        é mostrada. Quando existirem, entram aqui (três cartões com texto curto
        e nome; sem fotografias, estrelas nem resultados inventados).

        Setores: omitida. O tratamento de casos aceita hoje só Telecomunicações,
        Energia e Água (SETORES em src/lib/pedidoCaso.ts) e o mockup usava
        logótipos de empresas, que não podem ser usados.
      */}

      {/* ===== Perguntas frequentes ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeader eyebrow="Perguntas frequentes" titulo="Tudo o que precisa de saber antes de começar." />
          <Link prefetch={false}
            href={ROTAS_V2.ajuda}
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            Ver todas as perguntas <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={PERGUNTAS_HOMEPAGE} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        eyebrow="Não sabe por onde começar?"
        titulo="Conte-nos o que aconteceu."
        texto="Se houver alguma coisa que possamos tratar, mostramos-lhe o próximo passo."
        acao={
          <Link prefetch={false}
            href="/simulador-elegibilidade"
            onClick={() => track("click_home_cta_final")}
            className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
          >
            Ver se a DoLado pode ajudar <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
