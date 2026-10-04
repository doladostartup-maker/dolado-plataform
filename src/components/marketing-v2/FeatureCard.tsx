import type { ReactNode } from "react";
import { CARTAO } from "./estilos";

// Cartão de uma ferramenta, funcionalidade ou serviço: ícone, título,
// descrição, visual opcional e uma ação.
export function FeatureCard({
  icone,
  titulo,
  texto,
  visual,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  texto: ReactNode;
  visual?: ReactNode;
  acao: ReactNode;
}) {
  return (
    <article className={`${CARTAO} flex flex-col p-7 sm:p-9`}>
      <span className="text-[var(--v2-green)]">{icone}</span>
      <h3 className="mt-5 text-[21px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{titulo}</h3>
      <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[var(--v2-muted)]">{texto}</p>
      {visual && <div className="my-7">{visual}</div>}
      <div className={`mt-auto ${visual ? "" : "pt-7"}`}>{acao}</div>
    </article>
  );
}
