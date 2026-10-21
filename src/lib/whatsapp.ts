// WhatsApp como canal SECUNDÁRIO de apoio nas páginas públicas: só mensagem
// escrita (nunca chamadas de voz ou vídeo) e nunca alternativa ao portal,
// ao pagamento, à autorização do texto nem ao envio de documentos.
//
// Número oficial em NEXT_PUBLIC_WHATSAPP_NUMBER (formato internacional, só
// dígitos, ex.: 351912345678). É lido no build: as páginas estáticas só
// mudam com um novo build. Sem número válido, nenhum CTA aparece.
//
// As mensagens pré-preenchidas são fixas (src/i18n/mensagens/*/whatsapp.ts):
// nunca levam nome, e-mail, NIF, morada, n.º de caso/cliente/contrato,
// respostas de formulários nem resultados de ferramentas. Sem I/O.

/** Número em formato internacional (só dígitos, 8–15, sem 0 inicial) ou null. */
export function normalizarNumeroWhatsApp(valor: string | undefined | null): string | null {
  if (!valor) return null;
  const digitos = valor.trim().replace(/^\+|^00/, "").replace(/[\s.()-]/g, "");
  return /^[1-9]\d{7,14}$/.test(digitos) ? digitos : null;
}

export const NUMERO_WHATSAPP = normalizarNumeroWhatsApp(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

/** https://wa.me/<número>?text=<mensagem> (mensagem codificada, com acentos). */
export function linkWhatsApp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Locais onde o WhatsApp pode aparecer (valor de "placement" na medição). */
export const LOCAIS_WHATSAPP = [
  "homepage",
  "pricing",
  "fidelity_calculator_result",
  "eligibility_result",
  "sector_page",
  "faq",
  "contact",
  "landing_30d",
] as const;

export type LocalWhatsApp = (typeof LOCAIS_WHATSAPP)[number];

/** Parâmetros do evento whatsapp_click: só valores fixos, nunca dados do utilizador. */
export function parametrosEventoWhatsApp(pagina: string, local: LocalWhatsApp, contexto: string) {
  return { page: pagina, placement: local, context: contexto };
}
