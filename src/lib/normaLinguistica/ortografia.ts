// Ortografia tradicional do português europeu (anterior ao Acordo
// Ortográfico de 1990) — norma da DoLado desde 19/10/2026. Regras palavra a
// palavra, sem I/O: usadas pelo teste que impede regressões
// (verificacao.test.mjs) e pelo script de correcção
// (scripts/dev/ortografia-tradicional.mjs). Guia: docs/identidade-linguistica-dolado.md.
//
// Cada regra recebe a palavra em minúsculas e devolve a grafia tradicional.
// São deliberadamente fechadas (radicais e terminações conhecidos): palavras
// com a mesma grafia antes e depois do Acordo nunca são tocadas ("relativo",
// "alternativa", "direito", "informação"). Acrescentar uma palavra = uma regra
// nova aqui, com teste em ortografia.test.mjs.

type Regra = [RegExp, (...m: string[]) => string];

const REGRAS: Regra[] = [
  [/^(in|des|re|inter|retro)?ativ(.*)$/, (m: string, p = '', s: string) => (p||'')+'activ'+s],
  [/^(des)?atu(al|ais|almente|aliz.*|ar|a|am|ou|ação|ações|amos|e|em|ando|ado|ada|ados|adas|ará|ante|antes|aram)$/, (m: string, p: string, s: string) =>(p||'')+'actu'+s],
  [/^(|re|trans|inter|red|extr|infr|fr|atr|abstr|contr|subtr|tr)aç(ão|ões)$/, (m: string, p: string, s: string) =>p+'acç'+s],
  [/^(in)?corret(o|a|os|as|amente)$/, (m: string, p: string, s: string) =>(p||'')+'correct'+s],
  [/^corre[çc](ão|ões)$/, (m: string, s: string) =>'correcç'+s],
  [/^(in)?diret(o|a|os|as|amente|iva|ivas|or|ora|ores|oras|ório|ivo|ivos)$/, (m: string, p: string, s: string) =>(p||'')+'direct'+s],
  [/^direç(ão|ões)$/, (m: string, s: string) =>'direcç'+s],
  [/^proteç(ão|ões)$/, (m: string, s: string) =>'protecç'+s],
  [/^protet(or|ora|ores|oras)$/, (m: string, s: string) =>'protect'+s],
  [/^fatur(a|as|ação|ações|ado|ada|ados|adas|ar|amos|ou)$/, (m: string, s: string) =>'factur'+s],
  [/^eletr(.+)$/, (m: string, s: string) =>'electr'+s],
  [/^elétr(.+)$/, (m: string, s: string) =>'eléctr'+s],
  [/^(sub)?setor(|es|ial|iais|ialmente)$/, (m: string, p: string, s: string) =>(p||'')+'sector'+s],
  [/^(ob|sub)jetiv(.*)$/, (m: string, p: string, s: string) =>p+'jectiv'+s],
  [/^objeto(s?)$/, (m: string, s: string) =>'objecto'+s],
  [/^projet(o|os|ar|ado|ada|ados|adas)$/, (m: string, s: string) =>'project'+s],
  [/^projeç(ão|ões)$/, (m: string, s: string) =>'projecç'+s],
  [/^selecion(.*)$/, (m: string, s: string) =>'seleccion'+s],
  [/^seleç(ão|ões)$/, (m: string, s: string) =>'selecç'+s],
  [/^seletor(es)?$/, (m: string, s: string) =>'selector'+(s||'')],
  [/^seletiv(.*)$/, (m: string, s: string) =>'selectiv'+s],
  [/^detet(.+)$/, (m: string, s: string) =>'detect'+s],
  [/^deteç(ão|ões)$/, (m: string, s: string) =>'detecç'+s],
  [/^respetiv(.*)$/, (m: string, s: string) =>'respectiv'+s],
  [/^(des)?afet(a|as|o|os|ar|ado|ada|ados|adas|am|em|e|ou|aram|ará|ando|ivo|iva)$/, (m: string, p: string, s: string) =>(p||'')+'afect'+s],
  [/^exceç(ão|ões)$/, (m: string, s: string) =>'excepç'+s],
  [/^exceto$/, () =>'excepto'],
  [/^excecion(al|ais|almente)$/, (m: string, s: string) =>'excepcion'+s],
  [/^(in)?exat(o|a|os|as|amente|idão)$/, (m: string, p: string, s: string) =>(p||'')+'exact'+s],
  [/^ótim(o|a|os|as)$/, (m: string, s: string) =>'óptim'+s],
  [/^otimiz(.*)$/, (m: string, s: string) =>'optimiz'+s],
  [/^perspetiv(.*)$/, (m: string, s: string) =>'perspectiv'+s],
  [/^receç(ão|ões)$/, (m: string, s: string) =>'recepç'+s],
  [/^recet(or|ora|ores|oras)$/, (m: string, s: string) =>'recept'+s],
  [/^rececion(.*)$/, (m: string, s: string) =>'recepcion'+s],
  [/^adot(ar|a|ou|ado|ada|ados|adas|am|ámos|amos|e|em|ando)$/, (m: string, s: string) =>'adopt'+s],
  [/^adoç(ão|ões)$/, (m: string, s: string) =>'adopç'+s],
  [/^efet(u|iv)(.*)$/, (m: string, a: string, s: string) =>'efect'+a+s],
  [/^aspeto(s?)$/, (m: string, s: string) =>'aspecto'+s],
  [/^fator(es)?$/, (m: string, s: string) =>'factor'+(s||'')],
  [/^teto(s?)$/, (m: string, s: string) =>'tecto'+s],
  [/^arquitet(.*)$/, (m: string, s: string) =>'arquitect'+s],
  [/^injeç(ão|ões)$/, (m: string, s: string) =>'injecç'+s],
  [/^retific(.*)$/, (m: string, s: string) =>'rectific'+s],
  [/^ato(s?)$/, (m: string, s: string) =>'acto'+s],
  [/^ator(es)?$/, (m: string, s: string) =>'actor'+(s||'')],
  [/^coletiv(.*)$/, (m: string, s: string) =>'colectiv'+s],
  [/^coleç(ão|ões)$/, (m: string, s: string) =>'colecç'+s],
  [/^inspeç(ão|ões)$/, (m: string, s: string) =>'inspecç'+s],
  [/^infeç(ão|ões)$/, (m: string, s: string) =>'infecç'+s],
  [/^notur(.*)$/, (m: string, s: string) =>'noctur'+s],
  [/^leem$/, () =>'lêem'], [/^veem$/, () =>'vêem'], [/^deem$/, () =>'dêem'], [/^creem$/, () =>'crêem'],
  [/^autoindicaç(ão|ões)$/, (m: string, s: string) =>'auto-indicaç'+s],
  [/^preaviso(s?)$/, (m: string, s: string) =>'pré-aviso'+s],
  [/^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)$/, (m: string) =>m[0].toUpperCase()+m.slice(1)],
];

/** "proteção" → "protecção", "Fatura" → "Factura", "outubro" → "Outubro". Palavra sem regra: igual. */
export function grafiaTradicional(palavra: string): string {
  const low = palavra.toLowerCase();
  for (const [re, f] of REGRAS) {
    const m = low.match(re);
    if (!m) continue;
    const out = f(...(m as unknown as string[]));
    if (out === low) return palavra;
    if (palavra === palavra.toUpperCase() && palavra.length > 1 && palavra !== low) return out.toUpperCase();
    if (palavra[0] !== low[0] || /^[A-ZÀ-Ý]/.test(out)) return out[0].toUpperCase() + out.slice(1);
    return out;
  }
  return palavra;
}

const PALAVRA = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

type Opcoes = { regex?: boolean };

function percorrer(texto: string, opcoes: Opcoes, aoMudar?: (palavra: string) => void): string {
  return texto.replace(PALAVRA, (w: string, i: number) => {
    const antes = texto[i - 1] || "";
    const depois = texto[i + w.length] || "";
    if (opcoes.regex ? /[?&=_#@0-9$]/.test(antes) : /[?&=_/.#@:\\0-9$]/.test(antes)) return w;
    if (opcoes.regex ? /[=_(0-9]/.test(depois) : /[=_/\\(0-9]/.test(depois)) return w;
    if (depois === "." && /[a-z]/.test(texto[i + w.length + 1] || "")) return w;
    let a = i;
    while (a > 0 && !/\s/.test(texto[a - 1])) a--;
    let b = i + w.length;
    while (b < texto.length && !/\s/.test(texto[b])) b++;
    const nucleo = texto.slice(a, b).replace(/^["'(«“[]+/, "").replace(/[.,;:!?)"'»”\]]+$/, "");
    if (nucleo !== w && /^[a-z0-9_\-/.?=&:#%]+$/.test(nucleo)) return w;
    const nova = grafiaTradicional(w);
    if (nova !== w) aoMudar?.(w);
    return nova;
  });
}

/**
 * Converte um texto, palavra a palavra. Salta o que é técnico: palavras
 * coladas a caminhos, parâmetros, "_", números ("?setor=", "setor_id",
 * "/protecao", "fatura-2026") e slugs em minúsculas.
 * `regex: true` para o corpo de uma expressão regular (aceita "\\." e "/").
 */
export function converterTexto(texto: string, opcoes: Opcoes = {}): string {
  return percorrer(texto, opcoes);
}

/** Palavras do texto que não seguem a norma (para mensagens de erro). */
export function palavrasForaDaNorma(texto: string, opcoes: Opcoes = {}): string[] {
  const fora = new Set<string>();
  percorrer(texto, opcoes, (w) => fora.add(w));
  return [...fora];
}
