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
  destaque = false,
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
  destaque?: boolean;
  acao: ReactNode;
}) {
  return (
    <article
      className={`${CARTAO} flex flex-col p-7 sm:p-8 lg:row-span-6 lg:grid lg:grid-rows-subgrid ${destaque ? "border-2 border-[var(--v2-green)]" : ""}`}
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{nome}</p>
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
      </div>
      <div className="mt-auto pt-8 lg:mt-0 lg:self-end">{acao}</div>
    </article>
  );
}
