// E-mail ao cliente quando a DoLado comunica uma situação detetada nas
// faturas (Monitor de Proteção), depois de revista por uma pessoa.
// Extensões .ts explícitas: testado com `node --test`.
//
// Linguagem: "merece ser verificada" — nunca uma conclusão sobre a lei ou o
// contrato. O texto vem do backoffice e é tratado como texto (escape).
import { CONTACTO_EMAIL } from "../site.ts";
import { escaparHtml } from "./textoRevisao.ts";

export const ASSUNTO_ACHADO_MONITOR = "Detetámos uma alteração na sua fatura que merece ser verificada";

export function montarHtmlAchadoMonitor({ fornecedor, texto, url }: { fornecedor: string | null; texto: string; url: string }) {
  const P = 'style="margin:0 0 16px 0;"';
  const sobre = fornecedor ? ` do seu contrato com <strong>${escaparHtml(fornecedor)}</strong>` : "";
  const paragrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p ${P}>${escaparHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${ASSUNTO_ACHADO_MONITOR}</title></head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family:'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
        <tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span></td></tr>
        <tr><td style="padding:24px 32px 8px 32px; color:#171A21; font-size:16px; line-height:1.6;">
          <p ${P}>Olá,</p>
          <p ${P}>Ao comparar as faturas${sobre}, detetámos uma alteração que merece ser verificada:</p>
          ${paragrafos}
          <p style="margin:0 0 12px 0;"><a href="${escaparHtml(url)}" style="display:inline-block; background-color:#0E6B5C; color:#FFFFFF; text-decoration:none; font-weight:600; padding:12px 20px; border-radius:8px;">Ver no portal</a></p>
          <p style="margin:0 0 16px 0; font-size:14px; color:#5B6270;">Se quiser que a DoLado trate do assunto junto do fornecedor, pode pedir no portal em "Tratar o meu caso". Para qualquer dúvida, escreva para <a href="mailto:${CONTACTO_EMAIL}" style="color:#0E6B5C;">${CONTACTO_EMAIL}</a>.</p>
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
