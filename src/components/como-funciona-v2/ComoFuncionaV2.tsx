"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CATEGORIAS_PERGUNTAS } from "@/components/landing/conteudoPerguntasFrequentes";
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

const SEU_PASSO = { texto: "O seu passo", doCliente: true };
const DOLADO = { texto: "A DoLado", doCliente: false };

const PASSOS: Passo[] = [
  {
    rotulo: SEU_PASSO,
    titulo: "Conte o que aconteceu",
    texto:
      "Descreva o problema e anexe a fatura ou o contrato. Sem formulários intermináveis — perguntas guiadas, uma de cada vez.",
  },
  {
    rotulo: DOLADO,
    titulo: "Analisamos o mérito do caso",
    texto:
      "Verificamos se há fundamento legal e identificamos a legislação aplicável ao seu setor.",
  },
  {
    rotulo: DOLADO,
    titulo: "Preparamos a reclamação",
    texto:
      "Reclamação formal, com a legislação aplicável e o pedido claro. Mostramos-lhe o texto que pretendemos enviar para o Livro de Reclamações antes de qualquer envio.",
  },
  {
    rotulo: SEU_PASSO,
    titulo: "Reveja e autorize o envio",
    texto:
      "Leia o texto com calma e confirme explicitamente se autoriza o envio. Sem a sua confirmação, nada é enviado.",
  },
  {
    rotulo: DOLADO,
    titulo: "Enviamos para o Livro de Reclamações",
    texto:
      "Só depois da sua autorização submetemos a reclamação ao Livro de Reclamações em seu nome — esta é a única etapa em que agimos diretamente por si.",
  },
  {
    rotulo: DOLADO,
    titulo: "Acompanhamos o prazo de resposta",
    texto:
      "Telecom: 10 dias úteis sem resposta substantiva. Energia e água seguem os prazos regulatórios próprios de cada setor.",
  },
  {
    rotulo: DOLADO,
    titulo: "Acompanhamos até ao fim",
    texto:
      "Seguimos os passos seguintes e uma eventual escalada, até haver desfecho — correção, reembolso ou resposta formal da empresa.",
    final: true,
  },
];

// Perguntas já publicadas em /perguntas-frequentes (mesmas respostas).
const IDS_PERGUNTAS = ["prazo", "documentos", "nao-concordo", "depois-enviada", "empresa-nao-resolve", "copia"];
const TODAS = CATEGORIAS_PERGUNTAS.flatMap((c) => c.perguntas);
const PERGUNTAS = IDS_PERGUNTAS.flatMap((id) => TODAS.filter((p) => p.id === id));

export function ComoFuncionaV2() {
  const [origem] = useState(detectarOrigem);

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
      <SectionV2 size="compact" className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:py-20">
        <div>
          <Eyebrow>Como funciona</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,3.9vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            Do problema à reclamação enviada, passo a passo.
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[540px] text-[17.5px]`}>
            A DoLado prepara a reclamação com a lei do seu lado. Recebe o texto primeiro e só com a sua autorização
            explícita fazemos o envio para o Livro de Reclamações.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => tratarCaso("click_hero_como_funciona")} className={BOTAO_PRIMARIO}>
              Tratar do meu caso <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false}
              href="/simulador-elegibilidade"
              onClick={() => track("click_como_funciona_simulador")}
              className={BOTAO_CONTORNO}
            >
              Ver se a DoLado pode ajudar
            </Link>
          </div>
        </div>
        <PainelCaso />
      </SectionV2>

      {/* ===== Passo a passo ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            eyebrow="Passo a passo"
            titulo="O que acontece em cada passo."
            texto="Em cada passo, indicamos quem age: o cliente ou a DoLado."
          />
        </div>
        <StepsTimeline passos={PASSOS} layout="vertical" />
      </SectionV2>

      {/* ===== Transparência ===== */}
      <SectionV2 tone="soft-green">
        <div className="max-w-[760px]">
          <SectionHeader sobreVerde eyebrow="Com a sua autorização" titulo="Só agimos em seu nome quando autoriza." />
          <p className={`${TEXTO} mt-5`}>
            Nos passos 1 a 4, apenas organizamos factos e citamos a lei — nunca decidimos a sua estratégia legal. A
            submissão ao Livro de Reclamações (passo 5) é a única ação que fazemos diretamente em seu nome, e só com
            autorização explícita.
          </p>
        </div>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeader eyebrow="Perguntas frequentes" titulo="Antes e depois do envio." />
          <Link prefetch={false}
            href="/perguntas-frequentes"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            Ver todas as perguntas <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo="Pronto para começar?"
        texto="Conte-nos o que aconteceu. Recebe o texto da reclamação antes de qualquer envio."
        acao={
          <button
            type="button"
            onClick={() => tratarCaso("click_cta_como_funciona")}
            className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
          >
            Tratar do meu caso <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
