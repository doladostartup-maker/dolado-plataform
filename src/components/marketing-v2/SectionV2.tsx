import type { ReactNode } from "react";
import { CONTENTOR, EYEBROW, TEXTO, TITULO_H2 } from "./estilos";

// Secção do Design System V2: fundo, espaçamento vertical e contentor num só
// sítio, para nenhuma página definir backgrounds e paddings à mão. A escolha
// do tom deve servir a narrativa — não alternar de forma mecânica.

const TONS = {
  white: "",
  "soft-blue": "bg-[var(--v2-blue-bg)]",
  "soft-green": "bg-[var(--v2-mint-bg)]",
} as const;

export type TomSecao = keyof typeof TONS;

// Telemóvel 48–80px; desktop até 96–128px.
const TAMANHOS = {
  compact: "py-12 sm:py-16",
  default: "py-16 sm:py-20 lg:py-24",
  large: "py-20 sm:py-24 lg:py-32",
} as const;

export function SectionV2({
  tone = "white",
  size = "default",
  id,
  recortar = false,
  className = "",
  children,
}: {
  tone?: TomSecao;
  size?: keyof typeof TAMANHOS;
  id?: string;
  /** Esconde o que sair da secção (ex.: visual do hero). */
  recortar?: boolean;
  /** Classes do contentor interior (ex.: grelhas). */
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`${id ? "scroll-mt-20" : ""} ${recortar ? "overflow-hidden" : ""} ${TONS[tone]}`}>
      <div className={`${CONTENTOR} ${TAMANHOS[size]} ${className}`}>{children}</div>
    </section>
  );
}

// Eyebrow: contexto curto antes do título. Opcional — não usar em todas as
// secções. Sobre fundo verde, o fundo do eyebrow passa a branco.
export function Eyebrow({ children, sobreVerde = false }: { children: ReactNode; sobreVerde?: boolean }) {
  return <span className={`${EYEBROW} ${sobreVerde ? "bg-white" : "bg-[var(--v2-mint)]"}`}>{children}</span>;
}

// Cabeçalho de secção: eyebrow opcional → H2 → texto curto.
export function SectionHeader({
  eyebrow,
  titulo,
  texto,
  sobreVerde = false,
}: {
  eyebrow?: ReactNode;
  titulo: ReactNode;
  texto?: ReactNode;
  sobreVerde?: boolean;
}) {
  return (
    <>
      {eyebrow && <Eyebrow sobreVerde={sobreVerde}>{eyebrow}</Eyebrow>}
      <h2 className={`${TITULO_H2} ${eyebrow ? "mt-4" : ""}`}>{titulo}</h2>
      {texto && <p className={`${TEXTO} mt-4 max-w-[620px]`}>{texto}</p>}
    </>
  );
}
