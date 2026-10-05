import Link from "next/link";
import type { ReactNode } from "react";
import { IconeSeta } from "./Icones";
import { PAINEL, PAINEL_CORPO, TITULO_SECCAO } from "./ui";

/**
 * Secção de trabalho (DetailSection): painel com título, descrição curta,
 * ação opcional e corpo. `id` serve as âncoras da navegação interna.
 */
export function Seccao({
  id,
  titulo,
  descricao,
  acao,
  estado,
  children,
  destaque = false,
  className = "",
}: {
  id?: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  estado?: ReactNode;
  children: ReactNode;
  /** Precisa de ação agora: borda verde. */
  destaque?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-titulo` : undefined}
      className={`${PAINEL} scroll-mt-6 ${destaque ? "border-[var(--v2-green)] shadow-[0_0_0_3px_var(--v2-mint)]" : ""} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-[var(--v2-line)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={id ? `${id}-titulo` : undefined} className={TITULO_SECCAO}>
              {titulo}
            </h2>
            {estado}
          </div>
          {descricao && <p className="text-[13px] leading-relaxed text-[var(--v2-muted)]">{descricao}</p>}
        </div>
        {acao && <div className="flex shrink-0 flex-wrap items-center gap-2">{acao}</div>}
      </div>
      <div className={`${PAINEL_CORPO} flex flex-col gap-4`}>{children}</div>
    </section>
  );
}

/** Pares rótulo/valor em linhas compactas (dados de um caso, conversão, documento). */
export function ListaDados({ children, colunas = 1 }: { children: ReactNode; colunas?: 1 | 2 }) {
  return (
    <dl className={`grid gap-x-6 ${colunas === 2 ? "sm:grid-cols-2" : ""}`}>
      {children}
    </dl>
  );
}

export function Dado({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-[var(--v2-line)] py-2 last:border-b-0 sm:grid-cols-[minmax(120px,38%)_1fr] sm:gap-3">
      <dt className="text-[13px] text-[var(--v2-muted)]">{rotulo}</dt>
      <dd className="min-w-0 break-words text-[14px] text-[var(--v2-navy)]">{children}</dd>
    </div>
  );
}

export type EventoHistorico = { id: string; quando: string; titulo: ReactNode; detalhe?: ReactNode; ator?: string | null };

/** Histórico de eventos (CaseTimeline): só leitura, do mais antigo ao mais recente. */
export function Historico({ eventos, vazio = "Sem eventos registados." }: { eventos: EventoHistorico[]; vazio?: string }) {
  if (eventos.length === 0) return <p className="text-[14px] text-[var(--v2-muted)]">{vazio}</p>;
  return (
    <ol className="flex flex-col">
      {eventos.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < eventos.length - 1 && <span aria-hidden className="absolute bottom-0 left-[5px] top-4 w-px bg-[var(--v2-line-strong)]" />}
          <span aria-hidden className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-[var(--v2-green)] bg-white" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[14px] font-semibold leading-snug text-[var(--v2-navy)]">{e.titulo}</p>
            <p className="text-[12.5px] text-[var(--v2-muted)]">
              {e.quando}
              {e.ator ? ` · ${e.ator}` : ""}
            </p>
            {e.detalhe && <div className="text-[13px] leading-relaxed text-[var(--v2-muted)]">{e.detalhe}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Fila operacional (cartão-ligação com contagem). Sem pendentes, fica
 * discreta; com pendentes, a contagem ganha peso.
 */
export function CartaoFila({
  href,
  titulo,
  descricao,
  contagem,
  icone,
  critico = false,
}: {
  href: string;
  titulo: string;
  descricao: string;
  contagem: number | null;
  icone: ReactNode;
  /** Pendentes que bloqueiam algo (ex.: reembolso falhado). */
  critico?: boolean;
}) {
  const pendentes = (contagem ?? 0) > 0;
  return (
    <Link
      href={href}
      prefetch={false}
      className={`group flex items-start gap-3 rounded-[14px] border bg-white p-4 transition-colors hover:border-[var(--v2-green)] ${
        pendentes ? (critico ? "border-[#F3C9C4]" : "border-[var(--v2-line-strong)]") : "border-[var(--v2-line)]"
      }`}
    >
      <span
        aria-hidden
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
          pendentes ? (critico ? "bg-[#FDEDEB] text-[var(--v2-erro)]" : "bg-[var(--v2-mint-bg)] text-[var(--v2-green)]") : "bg-[var(--v2-surface)] text-[var(--v2-muted)]"
        }`}
      >
        {icone}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-[var(--v2-navy)]">{titulo}</span>
          <span
            className={`text-[18px] font-extrabold tabular-nums ${pendentes ? (critico ? "text-[var(--v2-erro)]" : "text-[var(--v2-navy)]") : "text-[#8593A5]"}`}
          >
            {contagem ?? "—"}
          </span>
        </span>
        <span className="text-[13px] leading-snug text-[var(--v2-muted)]">{pendentes ? descricao : "Nada pendente."}</span>
      </span>
      <IconeSeta tamanho={16} className="mt-1 shrink-0 text-[var(--v2-muted)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Métrica secundária (pequena, sem gráfico). */
export function Metrica({ rotulo, valor, detalhe, tom = "normal" }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: "normal" | "erro" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[12px] border border-[var(--v2-line)] bg-white px-4 py-3">
      <span className="text-[12.5px] text-[var(--v2-muted)]">{rotulo}</span>
      <span className={`text-[18px] font-extrabold tabular-nums ${tom === "erro" ? "text-[var(--v2-erro)]" : "text-[var(--v2-navy)]"}`}>{valor}</span>
      {detalhe && <span className="text-[12px] leading-snug text-[var(--v2-muted)]">{detalhe}</span>}
    </div>
  );
}
