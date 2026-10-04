// Classes do portal do cliente — Design System V2 aplicado a uma área de
// utilização recorrente: mais compacto do que as páginas públicas (botões de
// 44px, títulos menores, cartões com menos padding), mesmos tokens (--v2-*,
// ativos em .tema-portal no layout do portal).
//
// Regra: uma ação principal por bloco (BOTAO_PRIMARIO); as restantes são
// secundárias, fantasma ou ligações.

const BOTAO_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-center text-[14.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO_PRIMARIO = `${BOTAO_BASE} bg-[var(--v2-green)] text-white shadow-[0_1px_2px_rgba(11,37,69,0.12)] hover:bg-[var(--v2-green-hover)]`;

export const BOTAO_SECUNDARIO = `${BOTAO_BASE} border border-[var(--v2-line-strong)] bg-white text-[var(--v2-navy)] hover:border-[var(--v2-green)] hover:text-[var(--v2-green)]`;

export const BOTAO_FANTASMA = `${BOTAO_BASE} px-3 text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]`;

export const BOTAO_DESTRUTIVO = `${BOTAO_BASE} border border-[#F3C9C4] bg-white text-[var(--v2-erro)] hover:bg-[#FDEDEB]`;

/** Ação em texto (ex.: "Ver o caso", "Voltar"). Não compete com botões. */
export const LIGACAO =
  "inline-flex items-center gap-1 font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";

export const LIGACAO_DISCRETA = "text-[var(--v2-muted)] underline underline-offset-4 hover:text-[var(--v2-navy)]";

// ---- Cartões ----------------------------------------------------------------

const CARTAO_BASE = "rounded-[16px] border p-5 sm:p-6";

/** Cartão normal. */
export const CARTAO = `${CARTAO_BASE} border-[var(--v2-line)] bg-white`;

/** Cartão de destaque (informação principal da página). */
export const CARTAO_DESTAQUE = `${CARTAO_BASE} border-[var(--v2-line)] bg-[var(--v2-blue-bg)]`;

/** Algo que precisa do cliente. */
export const CARTAO_ACAO = `${CARTAO_BASE} border-[var(--v2-green)] bg-white shadow-[0_0_0_3px_var(--v2-mint)]`;

/** Informação complementar, mais discreta. */
export const CARTAO_INFO = `${CARTAO_BASE} border-transparent bg-[var(--v2-surface)]`;

/** Conclusão / sucesso. */
export const CARTAO_SUCESSO = `${CARTAO_BASE} border-[#CDE9D9] bg-[var(--v2-mint-bg)]`;

/** Cartão que é uma ligação (lista de casos, serviços). */
export const CARTAO_LIGACAO = `${CARTAO} block transition-colors hover:border-[var(--v2-green)] focus-visible:border-[var(--v2-green)]`;

// ---- Tipografia ---------------------------------------------------------------

export const TITULO_PAGINA =
  "text-[26px] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)] sm:text-[30px]";

export const TITULO_SECCAO = "text-[18px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]";

export const TITULO_CARTAO = "text-[16px] font-bold leading-snug text-[var(--v2-navy)]";

export const EYEBROW = "text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]";

export const TEXTO = "text-[15px] leading-relaxed text-[var(--v2-navy)]";

export const TEXTO_SECUNDARIO = "text-[14.5px] leading-relaxed text-[var(--v2-muted)]";

export const METADADOS = "text-[13px] text-[var(--v2-muted)]";

// ---- Formulários --------------------------------------------------------------

export const CAMPO =
  "w-full rounded-[12px] border border-[var(--v2-line-strong)] bg-white px-4 py-2.5 text-[16px] text-[var(--v2-navy)] placeholder:text-[#8593A5] focus-visible:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-green)] disabled:bg-[var(--v2-surface)]";

export const ROTULO = "flex flex-col gap-1.5 text-[14px] font-semibold text-[var(--v2-navy)]";

export const AJUDA_CAMPO = "text-[13px] font-normal text-[var(--v2-muted)]";

export const CAIXA_SELECAO = "mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--v2-green)]";
