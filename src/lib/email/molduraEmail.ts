// Moldura dos e-mails transacionais — Design System V2 (cores --v2-*,
// logótipo V2, botão verde). HTML de e-mail: tabelas e estilos em linha,
// sem fontes externas (Plus Jakarta Sans só se estiver instalada; Arial
// como alternativa) e logótipo em PNG (o Gmail e o Outlook não mostram SVG).
//
// ESTE FICHEIRO EXISTE EM DOIS SÍTIOS, IGUAIS BYTE A BYTE:
//   src/lib/email/molduraEmail.ts
//   supabase/functions/_shared/molduraEmail.ts
// (as Edge Functions não importam de src/). Alterar sempre os dois; o teste
// src/lib/email/molduraEmail.test.mjs falha se forem diferentes.
// Sem imports e sem APIs de Deno/Node: testado com `node --test`.

export const COR_EMAIL = {
  navy: "#0B2545",
  muted: "#55657A",
  verde: "#0A7A4F",
  verdeEscuro: "#08583A",
  menta: "#F1F9F4",
  azulFundo: "#F4F8FC",
  superficie: "#F7F9FC",
  linha: "#E4EAF1",
} as const;

/** Repetido de src/lib/site.ts (CONTACTO_EMAIL / MARKETING_SITE_URL); o teste confirma que coincidem. */
export const CONTACTO_EMAIL_MOLDURA = "contacto@dolado.pt";
export const SITE_EMAIL = "https://dolado.pt";
export const LOGO_EMAIL = `${SITE_EMAIL}/brand/dolado-logo-icone.png`;

const FONTE = "'Plus Jakarta Sans', 'Segoe UI', Arial, Helvetica, sans-serif";

/** Parágrafo normal e nota (texto secundário). */
export const P_EMAIL = `style="margin:0 0 16px 0;"`;
export const P_NOTA = `style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:${COR_EMAIL.muted};"`;
export const LIGACAO_EMAIL = `style="color:${COR_EMAIL.verde}; font-weight:600; text-decoration:underline;"`;

/** Botão principal (uma só ação principal por e-mail). `href` já seguro. */
export function botaoEmail(href: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;"><tr><td style="border-radius:10px; background-color:${COR_EMAIL.verde};"><a href="${href}" style="display:inline-block; padding:13px 22px; font-family:${FONTE}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:10px;">${texto}</a></td></tr></table>`;
}

/** Ação secundária em texto. `href` já seguro. */
export function ligacaoSecundariaEmail(href: string, texto: string): string {
  return `<p style="margin:-8px 0 24px 0;"><a href="${href}" ${LIGACAO_EMAIL}>${texto}</a></p>`;
}

/** Caixa de destaque (resumo, passos, aviso publicado). `conteudo` já seguro. */
export function caixaEmail(conteudo: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0; background-color:${COR_EMAIL.azulFundo}; border:1px solid #D6E4F5; border-radius:14px;"><tr><td style="padding:16px 20px; font-family:${FONTE}; font-size:14px; line-height:1.6; color:${COR_EMAIL.navy};">${conteudo}</td></tr></table>`;
}

/** Tabela rótulo/valor (ex.: resumo da compra). Valores já seguros. */
export function tabelaEmail(linhas: [string, string][]): string {
  const tr = linhas
    .map(
      ([r, v]) =>
        `<tr><td style="padding:6px 16px 6px 0; font-size:14px; color:${COR_EMAIL.muted}; vertical-align:top;">${r}</td><td style="padding:6px 0; font-size:14px; font-weight:700; color:${COR_EMAIL.navy};">${v}</td></tr>`,
    )
    .join("");
  return caixaEmail(`<table role="presentation" cellpadding="0" cellspacing="0">${tr}</table>`);
}

const ASSINATURAS = {
  thiago: `<p style="margin:0 0 4px 0;">Estamos juntos nisto.</p><p style="margin:0; font-weight:700;">Thiago<br><span style="font-weight:400; color:${COR_EMAIL.muted}; font-size:14px;">DoLado</span></p>`,
  equipa: `<p style="margin:0;">Com os melhores cumprimentos,<br><span style="font-weight:700;">A equipa DoLado</span></p>`,
  /** Só o nome (quando o texto já fecha com um agradecimento). */
  nome: `<p style="margin:0; font-weight:700;">Thiago<br><span style="font-weight:400; color:${COR_EMAIL.muted}; font-size:14px;">DoLado</span></p>`,
} as const;

export type AssinaturaEmail = keyof typeof ASSINATURAS;

/**
 * E-mail completo: logótipo, conteúdo, assinatura e rodapé. `titulo` e
 * `corpo` já seguros (escape feito por quem chama). `assinatura`: uma das
 * assinaturas comuns, ou null quando o texto já fecha com a assinatura.
 * Opcionais, também já seguros: `preheader` (texto de pré-visualização na
 * caixa de entrada, escondido no e-mail) e `rodape` (porque recebe o e-mail
 * e onde alterar as preferências, por cima da identificação da DoLado).
 */
export function emailV2({
  titulo,
  corpo,
  assinatura = "thiago",
  preheader,
  rodape,
}: {
  titulo: string;
  corpo: string;
  assinatura?: AssinaturaEmail | null;
  preheader?: string;
  rodape?: string;
}): string {
  const previa = preheader
    ? `<div style="display:none; max-height:0; max-width:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${COR_EMAIL.azulFundo}; opacity:0;">${preheader}</div>\n  `
    : "";
  const motivo = rodape ? `${rodape}<br><br>` : "";
  const fecho = assinatura ? `<tr><td style="padding:0 32px 32px 32px; font-family:${FONTE}; color:${COR_EMAIL.navy}; font-size:16px; line-height:1.6;">${ASSINATURAS[assinatura]}</td></tr>` : "";
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${titulo}</title>
</head>
<body style="margin:0; padding:0; background-color:${COR_EMAIL.azulFundo}; font-family:${FONTE};">
  ${previa}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COR_EMAIL.azulFundo}; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 8px 20px 8px;">
              <a href="${SITE_EMAIL}" style="text-decoration:none;"><img src="${LOGO_EMAIL}" width="30" height="30" alt="" style="display:inline-block; vertical-align:middle; border:0;"><span style="display:inline-block; vertical-align:middle; margin-left:8px; font-family:${FONTE}; font-size:19px; font-weight:800; letter-spacing:-0.02em; color:${COR_EMAIL.navy};">DoLado</span></a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF; border:1px solid ${COR_EMAIL.linha}; border-radius:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:32px 32px 8px 32px; font-family:${FONTE}; color:${COR_EMAIL.navy}; font-size:16px; line-height:1.6;">${corpo}</td></tr>
                ${fecho}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px; font-family:${FONTE}; font-size:13px; line-height:1.6; color:${COR_EMAIL.muted};">
              ${motivo}<span style="font-weight:700; color:${COR_EMAIL.navy};">DoLado</span> · Do lado dos consumidores.<br>
              <a href="${SITE_EMAIL}" style="color:${COR_EMAIL.verde}; text-decoration:none;">dolado.pt</a> · <a href="mailto:${CONTACTO_EMAIL_MOLDURA}" style="color:${COR_EMAIL.verde}; text-decoration:none;">${CONTACTO_EMAIL_MOLDURA}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
