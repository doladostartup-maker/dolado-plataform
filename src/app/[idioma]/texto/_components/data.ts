import type { Idioma } from "@/i18n/config";
import { formatarDataHora as formatarDataHoraIdioma } from "@/i18n/formatar";

/** "9 de outubro de 2026, 14:05" (Lisboa), no idioma pedido. Servidor e browser. */
export function formatarDataHora(iso: string, idioma: Idioma = "pt-PT") {
  return formatarDataHoraIdioma(idioma, iso);
}
