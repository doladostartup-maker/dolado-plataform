// Dicionários de tradução por domínio (comum, portal, conta, …).
//
// Cada domínio tem um ficheiro pt-PT (fonte, texto de referência) e um en-GB
// com o MESMO formato: o tipo do inglês é `typeof` do português, por isso uma
// chave em falta ou com outro formato é erro de compilação (tsc / next build).
// Em execução, qualquer falha que escape ao tipo (texto vazio, lista com outro
// tamanho) cai no português — nunca numa chave técnica — e fica registada.
// Testes: src/i18n/i18n.test.mjs.

import { IDIOMA_PADRAO, type Idioma } from "./config.ts";

export type Dicionario<T> = Readonly<Record<Idioma, T>>;

/**
 * Formato de uma tradução: o do português, com os textos como `string`
 * (o português pode ter literais `as const` vindos de src/lib).
 */
export type Traducao<T> = T extends string
  ? string
  : T extends number | boolean | null | undefined
    ? T
    : T extends (...args: infer A) => infer R
      ? (...args: A) => Traducao<R>
      : T extends readonly (infer U)[]
        ? Traducao<U>[]
        : { [K in keyof T]: Traducao<T[K]> };

type Valor = unknown;

function ehObjeto(v: Valor): v is Record<string, Valor> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Caminhos (a.b.c) presentes no português e em falta, vazios ou com outro formato no inglês. */
export function chavesEmFalta(pt: Valor, en: Valor, prefixo = ""): string[] {
  const aqui = prefixo || "(raiz)";
  // Texto vazio no português (ex.: resultado sem CTA): o inglês também pode ser vazio.
  if (typeof pt === "string") return typeof en === "string" && (en.trim() !== "" || pt === "") ? [] : [aqui];
  if (typeof pt === "function") return typeof en === "function" ? [] : [aqui];
  if (Array.isArray(pt)) {
    if (!Array.isArray(en) || en.length !== pt.length) return [aqui];
    return pt.flatMap((item, i) => chavesEmFalta(item, en[i], `${prefixo}[${i}]`));
  }
  if (ehObjeto(pt)) {
    if (!ehObjeto(en)) return [aqui];
    return Object.keys(pt).flatMap((k) => chavesEmFalta(pt[k], en[k], prefixo ? `${prefixo}.${k}` : k));
  }
  // Números, booleanos, null: iguais nos dois idiomas, não são tradução.
  return [];
}

/** Inglês completado com o português onde faltar (fallback controlado). */
export function completar<T>(pt: T, en: T): T {
  const p = pt as Valor;
  const e = en as Valor;
  if (typeof p === "string") return (typeof e === "string" && (e.trim() !== "" || p === "") ? e : p) as T;
  if (typeof p === "function") return (typeof e === "function" ? e : p) as T;
  if (Array.isArray(p)) {
    if (!Array.isArray(e) || e.length !== p.length) return pt;
    return p.map((item, i) => completar(item, e[i])) as T;
  }
  if (ehObjeto(p)) {
    if (!ehObjeto(e)) return pt;
    return Object.fromEntries(Object.keys(p).map((k) => [k, completar(p[k], e[k])])) as T;
  }
  return pt;
}

/** Registo das traduções em falta (servidor sempre; browser só em desenvolvimento). */
function registarFaltas(nome: string, faltas: string[]) {
  const emServidor = typeof window === "undefined";
  const emDesenvolvimento = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
  if (!emServidor && !emDesenvolvimento) return;
  console.warn(`[i18n] ${nome}: ${faltas.length} tradução(ões) en-GB em falta, usado pt-PT: ${faltas.slice(0, 20).join(", ")}`);
}

/** Dicionário de um domínio, com o inglês verificado e completado. */
export function dicionario<T>(nome: string, pt: T, en: Traducao<T>): Dicionario<Traducao<T>> {
  const base = pt as unknown as Traducao<T>;
  const faltas = chavesEmFalta(base, en);
  if (faltas.length) registarFaltas(nome, faltas);
  return { [IDIOMA_PADRAO]: base, "en-GB": faltas.length ? completar(base, en) : en } as Dicionario<Traducao<T>>;
}
