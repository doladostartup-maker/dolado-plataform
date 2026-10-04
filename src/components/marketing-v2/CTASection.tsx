import type { ReactNode } from "react";
import { SectionHeader } from "./SectionV2";
import { TEXTO } from "./estilos";

// Bloco de fecho de página: uma pergunta, uma frase e uma só ação.
export function CTASection({
  eyebrow,
  titulo,
  texto,
  acao,
}: {
  eyebrow?: ReactNode;
  titulo: ReactNode;
  texto?: ReactNode;
  acao: ReactNode;
}) {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 rounded-[24px] bg-[linear-gradient(120deg,var(--v2-mint)_0%,var(--v2-blue-soft)_100%)] px-7 py-10 sm:px-12 sm:py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <SectionHeader sobreVerde eyebrow={eyebrow} titulo={titulo} />
          {texto && <p className={`${TEXTO} mt-3`}>{texto}</p>}
        </div>
        <div className="w-full flex-none md:w-auto">{acao}</div>
      </div>
    </section>
  );
}
