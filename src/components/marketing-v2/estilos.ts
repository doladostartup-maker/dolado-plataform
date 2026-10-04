// Classes do Design System V2 (docs/design/design-system-v2.md). As cores vêm
// das variáveis --v2-* de .tema-v2 (globals.css), ativas dentro de PaginaV2.
// Um só CTA primário por secção; o contorno é a ação alternativa.

export const BOTAO_PRIMARIO =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-[var(--v2-green)] px-6 text-center text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(11,37,69,0.12)] transition-colors hover:bg-[var(--v2-green-hover)]";

export const BOTAO_CONTORNO =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-[var(--v2-line-strong)] bg-white px-6 text-center text-[15px] font-semibold text-[var(--v2-navy)] transition-colors hover:border-[var(--v2-green)] hover:text-[var(--v2-green)]";

export const EYEBROW =
  "inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]";

export const TITULO_H2 =
  "text-[clamp(28px,3.6vw,40px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-[var(--v2-navy)]";

export const TEXTO = "text-[16.5px] leading-[1.65] text-[var(--v2-muted)]";

export const CARTAO =
  "rounded-[18px] border border-[var(--v2-line)] bg-white shadow-[0_1px_2px_rgba(11,37,69,0.04),0_8px_24px_-12px_rgba(11,37,69,0.10)]";

export const CONTENTOR = "mx-auto max-w-[1200px] px-5 sm:px-8";

export const CAMPO =
  "w-full rounded-[12px] border border-[var(--v2-line-strong)] bg-white px-4 py-3 text-[16px] text-[var(--v2-navy)] placeholder:text-[var(--v2-muted)] focus-visible:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]";

export const ROTULO_CAMPO = "mb-2 block text-[14px] font-semibold text-[var(--v2-navy)]";
