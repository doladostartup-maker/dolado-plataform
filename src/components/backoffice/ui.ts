// Classes do Backoffice V2 — o Design System V2 (tokens --v2-*, ativos em
// .tema-backoffice no layout do backoffice) aplicado a uma ferramenta de
// trabalho interna: mais denso do que o portal (botões de 40px, texto de 14px,
// tabelas compactas), a mesma marca.
//
// Hierarquia das ações: uma ação principal por bloco (BOTAO_PRIMARIO);
// alternativas em BOTAO_SECUNDARIO; ações menores em BOTAO_TERCIARIO ou
// LIGACAO; ações irreversíveis ou com impacto no cliente em BOTAO_DESTRUTIVO
// (e com ConfirmarAcao).

const BOTAO_BASE =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-center text-[14px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO_PRIMARIO = `${BOTAO_BASE} bg-[var(--v2-green)] text-white shadow-[0_1px_2px_rgba(11,37,69,0.12)] hover:bg-[var(--v2-green-hover)]`;

export const BOTAO_SECUNDARIO = `${BOTAO_BASE} border border-[var(--v2-line-strong)] bg-white text-[var(--v2-navy)] hover:border-[var(--v2-green)] hover:text-[var(--v2-green-dark)]`;

export const BOTAO_TERCIARIO = `${BOTAO_BASE} px-3 text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]`;

export const BOTAO_DESTRUTIVO = `${BOTAO_BASE} border border-[#F3C9C4] bg-white text-[var(--v2-erro)] hover:bg-[#FDEDEB]`;

/** Versão compacta (linhas de tabela, barras de ferramentas). */
export const BOTAO_PEQUENO = "min-h-8! px-3! text-[13px]!";

export const LIGACAO =
  "inline-flex items-center gap-1 font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";

export const LIGACAO_DISCRETA = "text-[var(--v2-muted)] underline underline-offset-4 hover:text-[var(--v2-navy)]";

// ---- Superfícies ----------------------------------------------------------

/** Painel normal (secção de trabalho). */
export const PAINEL = "rounded-[14px] border border-[var(--v2-line)] bg-white";

/** Padding interno de um painel. */
export const PAINEL_CORPO = "p-4 sm:p-5";

/** Bloco de leitura dentro de um painel (texto, JSON, evidência). */
export const BLOCO_LEITURA =
  "rounded-[10px] border border-[var(--v2-line)] bg-[var(--v2-surface)] p-3.5 text-[14px] leading-relaxed text-[var(--v2-navy)]";

/** Texto de documento (reclamação): leitura confortável, quebras preservadas. */
export const TEXTO_DOCUMENTO =
  "max-h-[28rem] overflow-y-auto whitespace-pre-wrap break-words rounded-[10px] border border-[var(--v2-line)] bg-white p-4 text-[14.5px] leading-[1.7] text-[var(--v2-navy)]";

// ---- Tipografia -------------------------------------------------------------

export const TITULO_PAGINA = "text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--v2-navy)] sm:text-[24px]";

export const TITULO_SECCAO = "text-[16px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]";

export const TITULO_BLOCO = "text-[14px] font-bold text-[var(--v2-navy)]";

export const EYEBROW = "text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]";

export const TEXTO = "text-[14px] leading-relaxed text-[var(--v2-navy)]";

export const TEXTO_SECUNDARIO = "text-[14px] leading-relaxed text-[var(--v2-muted)]";

export const METADADOS = "text-[12.5px] text-[var(--v2-muted)]";

/** Identificadores técnicos (hashes, ids Stripe). */
export const CODIGO = "font-mono text-[12px] text-[var(--v2-muted)] break-all";

// ---- Formulários ------------------------------------------------------------

export const CAMPO =
  "w-full rounded-[10px] border border-[var(--v2-line-strong)] bg-white px-3 py-2 text-[16px] text-[var(--v2-navy)] placeholder:text-[#8593A5] focus-visible:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-green)] disabled:bg-[var(--v2-surface)] sm:text-[14px]";

export const CAMPO_TEXTO_LONGO = `${CAMPO} leading-relaxed`;

export const CAMPO_FICHEIRO =
  "w-full text-[14px] text-[var(--v2-muted)] file:mr-3 file:min-h-9 file:rounded-[10px] file:border file:border-[var(--v2-line-strong)] file:bg-white file:px-3 file:text-[13px] file:font-semibold file:text-[var(--v2-navy)] hover:file:border-[var(--v2-green)]";

export const ROTULO = "flex flex-col gap-1.5 text-[13px] font-semibold text-[var(--v2-navy)]";

export const AJUDA_CAMPO = "text-[12.5px] font-normal leading-snug text-[var(--v2-muted)]";

export const CAIXA_SELECAO = "mt-0.5 h-4 w-4 shrink-0 accent-[var(--v2-green)]";

export const LINHA_SELECAO = "flex items-start gap-2.5 text-[14px] text-[var(--v2-navy)]";

// ---- Tabelas ------------------------------------------------------------------

export const TABELA_MOLDURA = "overflow-x-auto rounded-[14px] border border-[var(--v2-line)] bg-white";
export const TABELA = "w-full border-collapse text-left text-[14px]";
export const TABELA_TH =
  "whitespace-nowrap border-b border-[var(--v2-line)] bg-[var(--v2-surface)] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-[var(--v2-muted)]";
export const TABELA_TR = "border-t border-[var(--v2-line)] first:border-t-0 transition-colors hover:bg-[#FAFBFD]";
export const TABELA_TD = "px-4 py-3 align-top text-[var(--v2-navy)]";
