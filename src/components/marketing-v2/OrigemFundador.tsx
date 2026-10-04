import Image from "next/image";
import type { ReactNode } from "react";
import { SectionHeader, SectionV2, type TomSecao } from "./SectionV2";

// "A nossa origem": a história do fundador, na primeira pessoa. Texto e
// fotografia reais (a fotografia já foi publicada numa versão anterior da
// homepage) — mudar só com o Thiago. Usado na homepage V2 e em Sobre Nós.
export function OrigemFundador({ tone = "soft-blue", aside }: { tone?: TomSecao; aside?: ReactNode }) {
  return (
    <SectionV2
      tone={tone}
      className={`grid gap-10 md:grid-cols-[260px_1fr] md:items-center lg:gap-12 ${
        aside ? "xl:grid-cols-[300px_1fr_300px]" : "xl:grid-cols-[300px_1fr]"
      }`}
    >
      <Image
        src="/landing/founder-thiago.webp"
        alt="Thiago Pereira, fundador da DoLado"
        width={300}
        height={340}
        className="aspect-[4/5] w-full max-w-[260px] rounded-[18px] object-cover md:max-w-none"
      />
      <div className="max-w-[560px]">
        <SectionHeader eyebrow="A nossa origem" titulo="“Eu próprio já passei por isto.”" />
        <div className="mt-6 space-y-4 text-[16px] leading-[1.7] text-[var(--v2-muted)]">
          <p>
            Tive uma penalização de fidelização de uma operadora depois de aumentos e só mais tarde
            descobri que poderia ter tido outras opções.
          </p>
          <p>
            Percebi que muitas pessoas passam pelo mesmo, não porque não tenham direitos, mas porque nem
            sempre sabem quais são ou o que devem fazer.
          </p>
          <p>
            Foi por isso que criei a DoLado: para que ninguém seja prejudicado simplesmente por
            desconhecer as leis, os caminhos ou as responsabilidades.
          </p>
        </div>
        <p className="mt-6 text-[15px] font-semibold text-[var(--v2-navy)]">— Thiago Pereira, fundador da DoLado</p>
      </div>
      {aside}
    </SectionV2>
  );
}
