// Datas, números e moeda no idioma da interface (Intl, nunca texto montado à
// mão). A moeda é sempre EUR; o fuso horário é sempre o de Lisboa.

import { LANG_HTML, type Idioma } from "./config.ts";

const FUSO = "Europe/Lisbon";

type Data = string | number | Date;

function comoData(valor: Data): Date {
  // "AAAA-MM-DD" sem hora: meio-dia UTC, para nunca mudar de dia com o fuso.
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T12:00:00Z`);
  return valor instanceof Date ? valor : new Date(valor);
}

/** "9 de outubro de 2026" / "9 October 2026". */
export function formatarData(idioma: Idioma, valor: Data, opcoes: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(LANG_HTML[idioma], { timeZone: FUSO, ...opcoes }).format(comoData(valor));
}

/** "09/10/2026" / "09/10/2026". */
export function formatarDataCurta(idioma: Idioma, valor: Data) {
  return formatarData(idioma, valor, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** "9 de outubro de 2026, 14:05" / "9 October 2026 at 14:05". */
export function formatarDataHora(idioma: Idioma, valor: Data) {
  return formatarData(idioma, valor, { dateStyle: "long", timeStyle: "short" });
}

/** "outubro de 2026" / "October 2026". */
export function formatarMesAno(idioma: Idioma, valor: Data) {
  return formatarData(idioma, valor, { month: "long", year: "numeric" });
}

/** "7,99 €" / "€7.99" — recebe cêntimos. */
export function formatarEurosCents(idioma: Idioma, cents: number) {
  return new Intl.NumberFormat(LANG_HTML[idioma], { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatarNumero(idioma: Idioma, valor: number, opcoes?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(LANG_HTML[idioma], opcoes).format(valor);
}
