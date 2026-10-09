"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { IconeEscudo, IconeSeta, IconeVisto } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tInstitucional } from "@/i18n/mensagens/institucional";

// Transparência no Design System V2: o que a DoLado faz e o que não faz. Todo
// o texto é o já publicado nesta página; só muda a apresentação (sem emojis).

type Item = {
  titulo: string;
  descricao: string;
};

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
  const c = useCaminho();
  const t = tInstitucional[useIdioma()].transparencia;

  const tratarCaso = useCallback(() => {
    track("click_cta_transparencia");
    window.location.assign(c(urlTratarCaso(origem)));
  }, [origem, c]);

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[760px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.texto}</p>
        </div>
      </SectionV2>

      {/* ===== O que fazemos / não fazemos ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-6 lg:grid-cols-2">
        <Lista
          titulo={t.fazemosTitulo}
          itens={t.fazemos}
          marcador={<IconeVisto tamanho={16} strokeWidth={2.6} />}
          tom="verde"
        />
        <Lista titulo={t.naoFazemosTitulo} itens={t.naoFazemos} marcador="–" tom="neutro" />
      </SectionV2>

      {/* ===== Reasseguramento ===== */}
      <SectionV2 tone="soft-green" size="compact">
        <div className="flex max-w-[760px] flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex-none text-[var(--v2-green)]">
            <IconeEscudo tamanho={36} strokeWidth={1.6} />
          </span>
          <p className="text-[18px] leading-relaxed text-[var(--v2-muted)]">
            {rico(t.garantia, { b: (conteudo) => <span className="font-bold text-[var(--v2-navy)]">{conteudo}</span> })}
          </p>
        </div>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeader eyebrow={t.perguntas.eyebrow} titulo={t.perguntas.titulo} />
        <dl className="border-t border-[var(--v2-line)]">
          {t.perguntas.lista.map((f) => (
            <div key={f.q} className="border-b border-[var(--v2-line)] py-6">
              <dt className="text-[17px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{f.q}</dt>
              <dd className="mt-2 text-[15.5px] leading-[1.65] text-[var(--v2-muted)]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            {t.ctaFinal.acao} <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
