"use client";

import Image from "next/image";
import { useTextos } from "@/i18n/cliente";
import { tMarketing } from "@/i18n/mensagens/marketing";
import type { ReactNode } from "react";
import { SectionHeader, SectionV2, type TomSecao } from "./SectionV2";

// "A nossa origem": a história do fundador, na primeira pessoa. Texto e
// fotografia reais (a fotografia já foi publicada numa versão anterior da
// homepage) — mudar só com o Thiago. Usado na homepage V2 e em Sobre Nós.
// Ficheiro já redimensionado (600 px, 2× a largura máxima mostrada): as
// imagens não são otimizadas no servidor (images.unoptimized, next.config.ts).
export function OrigemFundador({ tone = "soft-blue", aside }: { tone?: TomSecao; aside?: ReactNode }) {
  const t = useTextos(tMarketing).origem;
  return (
    <SectionV2
      tone={tone}
      className={`grid gap-10 md:grid-cols-[260px_1fr] md:items-center lg:gap-12 ${
        aside ? "xl:grid-cols-[300px_1fr_300px]" : "xl:grid-cols-[300px_1fr]"
      }`}
    >
      <Image
        src="/landing/founder-thiago-600.webp"
        alt={t.fotografia}
        width={300}
        height={340}
        className="aspect-[4/5] w-full max-w-[260px] rounded-[18px] object-cover md:max-w-none"
      />
      <div className="max-w-[560px]">
        <SectionHeader eyebrow={t.eyebrow} titulo={t.titulo} />
        <div className="mt-6 space-y-4 text-[16px] leading-[1.7] text-[var(--v2-muted)]">
          {t.paragrafos.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <p className="mt-6 text-[15px] font-semibold text-[var(--v2-navy)]">{t.assinatura}</p>
      </div>
      {aside}
    </SectionV2>
  );
}
