import Link from "next/link";
import type { ReactNode } from "react";
import { IconeVoltar } from "./Icones";
import { EYEBROW, TEXTO_SECUNDARIO, TITULO_PAGINA } from "./ui";

/** Cabeçalho de página do portal: voltar (opcional), contexto, título, texto curto e uma ação. */
export function CabecalhoPagina({
  titulo,
  contexto,
  descricao,
  acao,
  voltar,
  estado,
}: {
  titulo: ReactNode;
  /** Eyebrow (ex.: setor do caso). */
  contexto?: ReactNode;
  descricao?: ReactNode;
  /** Uma única ação principal da página. */
  acao?: ReactNode;
  voltar?: { href: string; texto: string };
  /** Badge de estado ao lado do título. */
  estado?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {voltar && (
        <Link
          href={voltar.href}
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[8px] px-1 text-[14px] font-semibold text-[var(--v2-muted)] hover:text-[var(--v2-navy)] sm:min-h-0 sm:py-1"
        >
          <IconeVoltar tamanho={16} />
          {voltar.texto}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {contexto && <p className={EYEBROW}>{contexto}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={`${TITULO_PAGINA} break-words`}>{titulo}</h1>
            {estado}
          </div>
          {descricao && <div className={`${TEXTO_SECUNDARIO} max-w-[64ch]`}>{descricao}</div>}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>
    </header>
  );
}

/** Título de uma secção dentro da página (fora de cartões). */
export function TituloSeccao({ titulo, descricao, acao, id }: { titulo: ReactNode; descricao?: ReactNode; acao?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">
          {titulo}
        </h2>
        {descricao && <p className="text-[14.5px] text-[var(--v2-muted)]">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
