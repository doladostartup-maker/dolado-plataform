import type { ReactNode } from "react";

/** Estado vazio útil: o que significa e, quando faz sentido, o que fazer a seguir. */
export function EstadoVazio({
  icone,
  titulo,
  children,
  acao,
}: {
  icone?: ReactNode;
  titulo: ReactNode;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[16px] border border-dashed border-[var(--v2-line-strong)] bg-white px-5 py-6 sm:px-6">
      {icone && (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--v2-mint-bg)] text-[var(--v2-green)]">
          {icone}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-bold text-[var(--v2-navy)]">{titulo}</p>
        {children && <div className="max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--v2-muted)]">{children}</div>}
      </div>
      {acao}
    </div>
  );
}
