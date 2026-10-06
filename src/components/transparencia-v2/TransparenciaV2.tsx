"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { IconeEscudo, IconeSeta, IconeVisto } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";

// Transparência no Design System V2: o que a DoLado faz e o que não faz. Todo
// o texto é o já publicado nesta página; só muda a apresentação (sem emojis).

type Item = {
  titulo: string;
  descricao: string;
};

const O_QUE_FAZEMOS: Item[] = [
  {
    titulo: "Identificamos a lei aplicável",
    descricao: "Lemos o seu caso e identificamos a legislação aplicável ao seu setor.",
  },
  {
    titulo: "Preparamos a reclamação formal",
    descricao: "Com a lei citada e o pedido claro. Mostramos-lhe o texto antes do envio — só avançamos com a sua confirmação.",
  },
  {
    titulo: "Acompanhamos o prazo",
    descricao: "Sabemos exatamente quando o prazo de resposta termina e mantemo-lo informado em cada passo.",
  },
  {
    titulo: "Enviamos só com a sua autorização",
    descricao: "Depois de rever e confirmar o texto, submetemos a reclamação ao Livro de Reclamações em seu nome.",
  },
];

const O_QUE_NAO_FAZEMOS: Item[] = [
  {
    titulo: "Não damos aconselhamento jurídico individualizado",
    descricao: "Organizamos factos e citamos a lei — não decidimos a sua estratégia legal.",
  },
  {
    titulo: "Não representamos em tribunal ou arbitragem",
    descricao: "Se o caso chegar a esse ponto, precisa de um advogado — dizemos-lhe isso com antecedência.",
  },
  {
    titulo: "Nunca cobramos uma percentagem do que recuperar",
    descricao: "Sem comissão de sucesso, por decisão nossa — evita qualquer conflito de interesse no seu caso.",
  },
];

const FAQS = [
  {
    q: "Isto substitui um advogado?",
    a: "Não. Prestamos apoio administrativo — organização e citação da lei. Para estratégia jurídica ou representação formal, precisa de um advogado.",
  },
  {
    q: "E se a empresa não responder?",
    a: "Acompanhamos o prazo de resposta e, sem resposta útil, indicamos-lhe as vias seguintes possíveis — como a entidade reguladora ou um centro de arbitragem — com o dossiê completo do caso.",
  },
  {
    q: "A DoLado assina ou representa-me legalmente?",
    a: "Não. Identificamo-nos sempre como a agir em seu nome numa reclamação administrativa — nunca como seus representantes legais.",
  },
];

function Lista({ titulo, itens, marcador, tom }: { titulo: string; itens: Item[]; marcador: ReactNode; tom: "verde" | "neutro" }) {
  return (
    <div className={`${CARTAO} p-7 sm:p-8`}>
      <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{titulo}</h2>
      <ul className="mt-6 space-y-6">
        {itens.map((item) => (
          <li key={item.titulo} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[16px] font-bold ${
                tom === "verde" ? "bg-[var(--v2-green)] text-white" : "bg-[var(--v2-blue-soft)] text-[var(--v2-muted)]"
              }`}
            >
              {marcador}
            </span>
            <div>
              <h3 className="text-[16.5px] font-bold text-[var(--v2-navy)]">{item.titulo}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-[var(--v2-muted)]">{item.descricao}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TransparenciaV2() {
  const [origem] = useState(detectarOrigem);

  const tratarCaso = useCallback(() => {
    track("click_cta_transparencia");
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[760px]">
          <Eyebrow>Transparência</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            O que fazemos por si — e o que não fazemos. Sem letras miúdas.
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>
            Sabemos que confiar o seu caso a alguém é difícil quando não sabe exatamente o que está a contratar. Por
            isso explicamos aqui, em linguagem simples, os limites do que a DoLado pode fazer.
          </p>
        </div>
      </SectionV2>

      {/* ===== O que fazemos / não fazemos ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-6 lg:grid-cols-2">
        <Lista
          titulo="O que fazemos por si"
          itens={O_QUE_FAZEMOS}
          marcador={<IconeVisto tamanho={16} strokeWidth={2.6} />}
          tom="verde"
        />
        <Lista titulo="O que não fazemos" itens={O_QUE_NAO_FAZEMOS} marcador="–" tom="neutro" />
      </SectionV2>

      {/* ===== Reasseguramento ===== */}
      <SectionV2 tone="soft-green" size="compact">
        <div className="flex max-w-[760px] flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex-none text-[var(--v2-green)]">
            <IconeEscudo tamanho={36} strokeWidth={1.6} />
          </span>
          <p className="text-[18px] leading-relaxed text-[var(--v2-muted)]">
            <span className="font-bold text-[var(--v2-navy)]">Nada sai sem a sua autorização explícita.</span> Cada
            caso é confirmado consigo antes de qualquer contacto com a empresa.
          </p>
        </div>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeader eyebrow="Perguntas frequentes" titulo="O que a DoLado é — e não é." />
        <dl className="border-t border-[var(--v2-line)]">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-[var(--v2-line)] py-6">
              <dt className="text-[17px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{f.q}</dt>
              <dd className="mt-2 text-[15.5px] leading-[1.65] text-[var(--v2-muted)]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo="Tem um problema com uma empresa?"
        texto="Conte-nos o que aconteceu. Recebe o texto da reclamação antes de qualquer envio."
        acao={
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            Tratar do meu caso <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
