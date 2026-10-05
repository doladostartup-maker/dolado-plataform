import Link from "next/link";
import type { ReactNode } from "react";
import { IconeVoltar } from "./Icones";
import { EYEBROW, TEXTO_SECUNDARIO, TITULO_PAGINA, TITULO_SECCAO } from "./ui";

/**
 * Cabeçalho de página do backoffice (PageHeader): voltar, contexto, título,
 * estado, descrição curta e ações (a principal à direita).
 */
export function CabecalhoPagina({
  titulo,
  contexto,
  descricao,
  acoes,
  voltar,
  estado,
  meta,
}: {
  titulo: ReactNode;
  contexto?: ReactNode;
  descricao?: ReactNode;
  /** Ações da página; a principal em último lugar (fica à direita). */
  acoes?: ReactNode;
  voltar?: { href: string; texto: string };
  estado?: ReactNode;
  /** Linha de metadados (datas, origem, identificadores). */
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2.5">
      {voltar && (
        <Link
          href={voltar.href}
          prefetch={false}
          className="-ml-1 inline-flex min-h-9 items-center gap-1.5 self-start rounded-[8px] px-1 text-[13px] font-semibold text-[var(--v2-muted)] hover:text-[var(--v2-navy)]"
        >
          <IconeVoltar tamanho={15} />
          {voltar.texto}
        </Link>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {contexto && <p className={EYEBROW}>{contexto}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className={`${TITULO_PAGINA} break-words`}>{titulo}</h1>
            {estado}
          </div>
          {meta && <div className="text-[13px] text-[var(--v2-muted)]">{meta}</div>}
          {descricao && <div className={`${TEXTO_SECUNDARIO} max-w-[72ch]`}>{descricao}</div>}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
  );
}

/** Título de secção (fora ou no topo de um painel). */
export function TituloSeccao({
  titulo,
  descricao,
  acao,
  id,
  contagem,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  id?: string;
  contagem?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={id} className={`${TITULO_SECCAO} flex items-center gap-2`}>
          {titulo}
          {contagem !== undefined && (
            <span className="rounded-full bg-[#EEF2F6] px-2 py-px text-[12px] font-bold text-[var(--v2-muted)]">{contagem}</span>
          )}
        </h2>
        {descricao && <p className="text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
