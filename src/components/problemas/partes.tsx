import Link from "@/i18n/Link";
import type { ReactNode } from "react";
import { IconeAntena, IconeChama, IconeEtiqueta, IconeGota, IconePessoas, IconeRaio, IconeSeta } from "@/components/marketing-v2/Icones";
import { CARTAO } from "@/components/marketing-v2/estilos";

// Peças partilhadas das páginas "Problemas que tratamos".

const TAMANHO_ICONE = 26;

/** Ícone genérico de cada categoria (sem marcas — Design System V2, secção 42). */
export const ICONES_CATEGORIA: Record<string, ReactNode> = {
  telecomunicacoes: <IconeAntena tamanho={TAMANHO_ICONE} strokeWidth={1.6} />,
  energia: <IconeRaio tamanho={TAMANHO_ICONE} strokeWidth={1.6} />,
  "compras-reembolsos": <IconeEtiqueta tamanho={TAMANHO_ICONE} strokeWidth={1.6} />,
  gas: <IconeChama tamanho={TAMANHO_ICONE} strokeWidth={1.6} />,
  agua: <IconeGota tamanho={TAMANHO_ICONE} strokeWidth={1.6} />,
  ginasios: <IconePessoas tamanho={TAMANHO_ICONE} strokeWidth={1.6} />,
};

export const TEXTO_PROBLEMAS = "text-[15.5px] leading-relaxed text-[var(--v2-muted)]";
export const LINK_TEXTO = "font-semibold text-[var(--v2-green)] underline underline-offset-2 hover:text-[var(--v2-green-hover)]";
export const LINK_SETA =
  "inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";

/** Cartão de um problema: o cartão inteiro é a ligação (alvo grande no telemóvel). */
export function CartaoProblema({
  href,
  titulo,
  resumo,
  saberMais,
  nivel = "h3",
}: {
  href: string;
  titulo: string;
  resumo: string;
  saberMais: string;
  nivel?: "h3" | "h4";
}) {
  const Titulo = nivel;
  return (
    <Link
      prefetch={false}
      href={href}
      className={`${CARTAO} group flex h-full flex-col p-6 transition-colors hover:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)] sm:p-7`}
    >
      <Titulo className="text-[18px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)] group-hover:text-[var(--v2-green)]">{titulo}</Titulo>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{resumo}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14.5px] font-semibold text-[var(--v2-green)]">
        {saberMais} <IconeSeta tamanho={15} />
      </span>
    </Link>
  );
}

/** H1 das páginas de problemas, com o mesmo tamanho das outras páginas públicas V2. */
export function TituloPagina({ children }: { children: ReactNode }) {
  return (
    <h1 className="mt-5 text-[clamp(30px,3.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.035em] text-[var(--v2-navy)]">
      {children}
    </h1>
  );
}
