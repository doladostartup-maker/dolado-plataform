import type { ReactNode } from "react";
import { ListaVistos } from "./ListaVistos";
import { CARTAO } from "./estilos";

// Cartão de um plano, apresentado pela necessidade a que responde (ex.:
// "Tenho um problema agora.") e só depois pelo nome do plano. Preços e
// nomes chegam sempre de src/lib/planos.ts — este componente só apresenta.
// Em ecrãs largos, os cartões lado a lado alinham as linhas (preço, lista,
// botão) por subgrid: a grelha mãe usa GRELHA_PLANOS.

export const GRELHA_PLANOS = "grid gap-6 lg:grid-cols-3 lg:gap-y-0";
export function PricingCard({
  necessidade,
  nome,
  preco,
  unidade,
  condicoes,
  resumo,
  inclui,
  naoInclui,
  nota,
  cancelamento,
  destaque = false,
  selo,
  acao,
}: {
  necessidade: string;
  nome: string;
  preco: string;
  unidade: string;
  condicoes: string;
  resumo: string;
  inclui: string[];
  naoInclui?: string;
  /** Nota discreta por baixo do que inclui (ex.: Caso Extra no Caso + Proteção). */
  nota?: string;
  /** O que acontece se cancelar, junto do plano (informação material, não nota de rodapé). */
  cancelamento?: { rotulo: string; texto: string };
  destaque?: boolean;
  /** Selo discreto junto ao nome (ex.: "30 dias grátis"). */
  selo?: string;
  acao: ReactNode;
}) {
  return (
    <article
      className={`${CARTAO} flex flex-col p-7 sm:p-8 lg:row-span-6 lg:grid lg:grid-rows-subgrid ${destaque ? "border-2 border-[var(--v2-green)]" : ""}`}
    >
      <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">
        {nome}
        {selo && (
          <span className="rounded-full bg-[var(--v2-mint)] px-2.5 py-0.5 text-[11.5px] normal-case tracking-normal text-[var(--v2-green-dark)]">
            {selo}
          </span>
        )}
      </p>
      <h2 className="mt-3 text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{necessidade}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-muted)]">{resumo}</p>
      <div className="mt-6 self-end">
        <p>
          <span className="text-[38px] font-extrabold tracking-[-0.03em] text-[var(--v2-navy)]">{preco}</span>
          <span className="text-[15px] font-medium text-[var(--v2-muted)]"> {unidade}</span>
        </p>
        <p className="mt-1 text-[13.5px] text-[var(--v2-muted)]">{condicoes}</p>
      </div>
      <div className="mt-6 border-t border-[var(--v2-line)] pt-6">
        <ListaVistos compacta itens={inclui} />
        {naoInclui && <p className="mt-4 text-[14px] text-[var(--v2-muted)]">{naoInclui}</p>}
        {nota && <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{nota}</p>}
        {cancelamento && (
          <p className="mt-4 rounded-[10px] bg-[var(--v2-blue-bg)] px-3.5 py-3 text-[14px] leading-relaxed text-[var(--v2-navy)]">
            <strong className="font-semibold">{cancelamento.rotulo}: </strong>
            {cancelamento.texto}
          </p>
        )}
      </div>
      <div className="mt-auto pt-8 lg:mt-0 lg:self-end">{acao}</div>
    </article>
  );
}
