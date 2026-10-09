"use client";

import { useCallback, useState } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { OrigemFundador } from "@/components/marketing-v2/OrigemFundador";
import { Eyebrow, SectionV2, type TomSecao } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, TEXTO, TITULO_H2 } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { tInstitucional } from "@/i18n/mensagens/institucional";

// Sobre Nós no Design System V2 (secção 38 de docs/design/design-system-v2.md):
// página editorial com a história do fundador como eixo. Todo o texto
// institucional é o já publicado nesta página; só muda a apresentação.

// Fundo de cada secção institucional: a do meio (prevenção) em verde.
const TONS: TomSecao[] = ["white", "soft-green", "white"];

export function SobreNosV2() {
  const [origem] = useState(detectarOrigem);
  const c = useCaminho();
  const t = tInstitucional[useIdioma()].sobreNos;
  const SECOES = t.secoes;
  const PROXIMIDADE_LINHAS = t.proximidade.linhas;

  const tratarCaso = useCallback(() => {
    track("click_cta_sobre_nos");
    window.location.assign(c(urlTratarCaso(origem)));
  }, [origem, c]);

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[760px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <div className={`${TEXTO} mt-6 space-y-4 text-[17.5px]`}>
            {t.hero.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="font-semibold text-[var(--v2-navy)]">{t.heroDestaque}</p>
          </div>
        </div>
      </SectionV2>

      {/* ===== A nossa origem ===== */}
      <OrigemFundador />

      {/* ===== Texto institucional ===== */}
      {SECOES.map((s, i) => (
        <SectionV2 key={s.titulo} tone={TONS[i]} className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <h2 className={`${TITULO_H2} lg:sticky lg:top-28 lg:self-start`}>{s.titulo}</h2>
          <div className="max-w-[640px] space-y-4 text-[16.5px] leading-[1.7] text-[var(--v2-muted)]">
            {s.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </SectionV2>
      ))}

      {/* ===== Proximidade e confiança ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <h2 className={`${TITULO_H2} lg:sticky lg:top-28 lg:self-start`}>{t.proximidade.titulo}</h2>
        <div className="max-w-[640px] space-y-4 text-[16.5px] leading-[1.7] text-[var(--v2-muted)]">
          <p>{t.proximidade.intro}</p>
          <p className="my-8 border-l-[3px] border-[var(--v2-green)] pl-5 text-[21px] font-bold leading-[1.45] tracking-[-0.01em] text-[var(--v2-navy)]">
            {PROXIMIDADE_LINHAS.map((linha, i) => (
              <span key={linha}>
                {linha}
                {i < PROXIMIDADE_LINHAS.length - 1 && <br />}
              </span>
            ))}
          </p>
          {t.proximidade.fecho.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
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
