"use client";

import Link from "@/i18n/Link";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { useCallback, useState } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FeatureCard } from "@/components/marketing-v2/FeatureCard";
import { ferramentas } from "@/components/marketing-v2/ferramentas";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, TEXTO } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";

// Ferramentas Gratuitas no Design System V2 (secção 33 de
// docs/design/design-system-v2.md): só as ferramentas públicas e gratuitas,
// sem conta (src/components/marketing-v2/ferramentas.tsx). Cada uma vive na
// sua própria página; esta só as apresenta.

export function FerramentasV2() {
  const [origem] = useState(detectarOrigem);
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tPaginas[idioma].ferramentas;
  const FACTOS = t.factos;

  const tratarCaso = useCallback(() => {
    track("click_cta_ferramentas");
    window.location.assign(c(urlTratarCaso(origem)));
  }, [origem, c]);

  return (
    <>
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[720px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.texto}</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {FACTOS.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[14px] font-medium text-[var(--v2-muted)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--v2-green)]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {ferramentas(idioma).map((f) => (
            <FeatureCard
              key={f.id}
              icone={f.icone}
              titulo={f.titulo}
              texto={f.texto}
              visual={f.visual}
              acao={
                <Link prefetch={false} href={f.href} onClick={() => track(`click_ferramentas_${f.id}`)} className={`${BOTAO_CONTORNO} w-full`}>
                  {f.cta} <IconeSeta tamanho={16} />
                </Link>
              }
            />
          ))}
        </div>
      </SectionV2>

      <CTASection
        eyebrow={t.ctaFinal.eyebrow}
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
