// E-mails do fluxo de revisão do texto. Extensões .ts explícitas: testado
// diretamente com `node --test`. Sem termos técnicos para o cliente.
import { CONTACTO_EMAIL } from "../site.ts";

export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const ASSUNTO_TEXTO_PARA_REVISAO = "O texto da sua reclamação está pronto para revisão";

/**
 * Dois botões: rever e autorizar / pedir alterações. Os links só abrem
 * páginas da DoLado — nenhuma ação acontece sem um clique explícito na
 * página (um scanner que abra o link não autoriza nada).
 */
export function montarHtmlTextoParaRevisao({
  urlRever,
  urlAlterar,
  assunto,
  validadeDias,
  novoLink,
}: {
  urlRever: string;
  urlAlterar: string;
  /** Ex.: nome da empresa reclamada ou setor — para o cliente reconhecer o caso. */
  assunto: string | null;
  validadeDias: number;
  /** true quando é um novo link pedido pelo cliente (link anterior expirado). */
  novoLink: boolean;
}) {
  const sobre = assunto ? ` relativa a <strong>${escaparHtml(assunto)}</strong>` : "";
  const abertura = novoLink
    ? `Como pediu, enviamos-lhe um novo link para rever o texto da sua reclamação${sobre}.`
    : `O texto da sua reclamação${sobre} está pronto. Antes de o enviarmos em seu nome, pedimos-lhe que o reveja.`;
  const P = 'style="margin:0 0 16px 0;"';
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${ASSUNTO_TEXTO_PARA_REVISAO}</title></head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family:'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
        <tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span></td></tr>
        <tr><td style="padding:24px 32px 8px 32px; color:#171A21; font-size:16px; line-height:1.6;">
          <p ${P}>Olá,</p>
          <p ${P}>${abertura}</p>
          <p ${P}>Nada é enviado sem a sua autorização explícita. Se quiser mudar alguma coisa, pode pedir alterações.</p>
          <p style="margin:0 0 12px 0;"><a href="${escaparHtml(urlRever)}" style="display:inline-block; background-color:#0E6B5C; color:#FFFFFF; text-decoration:none; font-weight:600; padding:12px 20px; border-radius:8px;">Rever e autorizar o envio</a></p>
          <p ${P}><a href="${escaparHtml(urlAlterar)}" style="display:inline-block; color:#0E6B5C; text-decoration:underline; font-weight:600; padding:4px 0;">Pedir alterações</a></p>
          <p style="margin:0 0 16px 0; font-size:14px; color:#5B6270;">Por segurança, estes links são pessoais e válidos durante ${validadeDias} dias. Não os partilhe. Também pode rever o texto na sua área de cliente, se tiver conta.</p>
          <p style="margin:0 0 16px 0; font-size:14px; color:#5B6270;">Se não reconhece este pedido, ignore este e-mail ou escreva para <a href="mailto:${CONTACTO_EMAIL}" style="color:#0E6B5C;">${CONTACTO_EMAIL}</a>.</p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px 32px; color:#171A21; font-size:16px; line-height:1.6;">
          <p style="margin:0 0 4px 0;">Estamos juntos nisto.</p>
          <p style="margin:0; font-weight:600;">Thiago<br><span style="font-weight:400; color:#5B6270; font-size:14px;">DoLado</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Aviso interno à equipa: pedido de alterações (sem o conteúdo do pedido — está no backoffice). */
export function montarHtmlAvisoAlteracoes({ urlCaso, versao }: { urlCaso: string; versao: number | null }) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
<p>O cliente pediu alterações ao texto${versao ? ` (versão ${versao})` : ""}.</p>
<p><a href="${escaparHtml(urlCaso)}">Abrir o caso no backoffice</a></p>
</body></html>`;
}
