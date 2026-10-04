import type { ReactNode } from "react";
import { IconeAlerta, IconeCirculoVisto, IconeInfo } from "./Icones";

// Mensagens de retorno e avisos do portal. Tons com significado:
// info (neutro/azul), sucesso (verde), atencao (âmbar: algo a verificar),
// erro (vermelho: não foi possível concluir).

export type TomAviso = "info" | "sucesso" | "atencao" | "erro";

const ESTILO: Record<TomAviso, { caixa: string; icone: string }> = {
  info: { caixa: "border-[#D6E4F5] bg-[var(--v2-blue-bg)]", icone: "text-[var(--v2-blue)]" },
  sucesso: { caixa: "border-[#CDE9D9] bg-[var(--v2-mint-bg)]", icone: "text-[var(--v2-green)]" },
  atencao: { caixa: "border-[#F2DDB8] bg-[var(--v2-aviso-bg)]", icone: "text-[var(--v2-aviso)]" },
  erro: { caixa: "border-[#F3C9C4] bg-[#FDEDEB]", icone: "text-[var(--v2-erro)]" },
};

export function Aviso({
  tom = "info",
  titulo,
  children,
  acao,
  className = "",
}: {
  tom?: TomAviso;
  titulo?: ReactNode;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  const e = ESTILO[tom];
  const Icone = tom === "sucesso" ? IconeCirculoVisto : tom === "info" ? IconeInfo : IconeAlerta;
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={`flex gap-3 rounded-[14px] border px-4 py-3.5 text-[14.5px] leading-relaxed text-[var(--v2-navy)] ${e.caixa} ${className}`}
    >
      <Icone tamanho={20} className={`mt-0.5 shrink-0 ${e.icone}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? "text-[var(--v2-muted)]" : undefined}>{children}</div>}
        {acao && <div className="mt-2 flex flex-wrap gap-3">{acao}</div>}
      </div>
    </div>
  );
}
