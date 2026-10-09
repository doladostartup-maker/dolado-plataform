import { Fragment, type ReactNode } from "react";

// Texto traduzido com marcação simples: "Leia os <termos>Termos</termos>."
// Etiquetas sem conteúdo (<email/>) recebem um conteúdo vazio.
// Cada etiqueta é trocada pelo elemento que o componente indicar (ligação,
// negrito…), para as traduções não terem JSX nem HTML. Etiquetas sem
// correspondência mostram só o conteúdo (nunca a etiqueta).

export type EtiquetasRico = Record<string, (conteudo: ReactNode) => ReactNode>;

const PADRAO = /<([a-zA-Z][\w-]*)\/>|<([a-zA-Z][\w-]*)>([\s\S]*?)<\/\2>/g;

export function rico(texto: string, etiquetas: EtiquetasRico = {}): ReactNode {
  const partes: ReactNode[] = [];
  let ultimo = 0;
  let n = 0;
  for (const m of texto.matchAll(PADRAO)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio));
    const nome = m[1] ?? m[2];
    const conteudo = m[1] ? null : rico(m[3], etiquetas);
    const render = etiquetas[nome] ?? ETIQUETAS_BASE[nome];
    partes.push(<Fragment key={n++}>{render ? render(conteudo) : conteudo}</Fragment>);
    ultimo = inicio + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes.length === 1 ? partes[0] : partes;
}

const ETIQUETAS_BASE: EtiquetasRico = {
  b: (c) => <strong>{c}</strong>,
  strong: (c) => <strong>{c}</strong>,
  em: (c) => <em>{c}</em>,
};

export function Rico({ texto, etiquetas }: { texto: string; etiquetas?: EtiquetasRico }) {
  return <>{rico(texto, etiquetas)}</>;
}
