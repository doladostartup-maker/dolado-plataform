// Montagem dos e-mails dos alertas diários (fidelização e promoção).
// Partilhado pelas Edge Functions verificar-alertas-* e testado com
// `node --test` (src/lib/emailAlertas.test.mjs) — sem APIs de Deno.
//
// Tudo o que vem do cliente (nome, operadora, descrição) é texto: no HTML
// passa por escape e no assunto perde quebras de linha e é encurtado. O
// destinatário NUNCA vem do alerta: as funções usam o e-mail atual da conta
// devolvido por alertas_*_pendentes().

import { escaparHtml, textoParaAssunto } from "./textoSeguro.ts";

export { escaparHtml, textoParaAssunto };

function dataPt(dataIso: string): string {
  return new Date(`${dataIso}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const TOPO = `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family: 'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <span style="font-family:'Inter', Arial, Helvetica, sans-serif; font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span>
            </td>
          </tr>`;

const RODAPE = `          <tr>
            <td style="padding: 20px 32px; background-color:#EFEDE7; font-family:'Inter', Arial, Helvetica, sans-serif; font-size:13px; color:#5B6270;">
              <a href="https://www.dolado.pt" style="color:#0E6B5C; text-decoration:none;">www.dolado.pt</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function assuntoFidelizacao(operadora: string, dias: number): string {
  return `A sua fidelização com ${textoParaAssunto(operadora, 60)} termina em ${dias} dias`;
}

export function htmlAvisoFidelizacao(nome: string, operadora: string, dias: number, dataFim: string): string {
  return `${TOPO}
          <tr>
            <td style="padding: 24px 32px 8px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá ${escaparHtml(nome)},</p>
              <p style="margin:0 0 16px 0;">A sua fidelização com <strong>${escaparHtml(operadora)}</strong> termina em ${dias} dias (em ${dataPt(dataFim)}).</p>
              <p style="margin:0 0 16px 0;">Isto significa que pode haver alterações no preço, velocidade ou serviço. Recomendamos que contacte a operadora para renegociar antes dessa data.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFEDE7; border-left:3px solid #0E6B5C; border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:14px; line-height:1.6;">
                    <p style="margin:0 0 8px 0; font-weight:600;">Pode:</p>
                    <p style="margin:0 0 4px 0;">— Renegociar as condições</p>
                    <p style="margin:0 0 4px 0;">— Mudar de operadora</p>
                    <p style="margin:0;">— Apresentar uma reclamação se houver mudanças não autorizadas</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Se precisar de ajuda a preparar uma reclamação, visite <a href="https://www.dolado.pt" style="color:#0E6B5C;">dolado.pt</a>.</p>
              <p style="margin:0;">Sem mais,<br><span style="font-weight:600;">DoLado</span></p>
            </td>
          </tr>
${RODAPE}`;
}

export function assuntoPromocao(operadora: string, dias: number): string {
  return `A promoção com ${textoParaAssunto(operadora, 60)} termina em ${dias} dia${dias === 1 ? "" : "s"}`;
}

export function htmlAvisoPromocao(nome: string, operadora: string, descricao: string, dias: number, dataFim: string): string {
  return `${TOPO}
          <tr>
            <td style="padding: 24px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá ${escaparHtml(nome)},</p>
              <p style="margin:0 0 16px 0;">A promoção com <strong>${escaparHtml(operadora)}</strong> (${escaparHtml(descricao)}) termina em ${dias} dia${dias === 1 ? "" : "s"} (em ${dataPt(dataFim)}).</p>
              <p style="margin:0 0 16px 0;">Vale a pena confirmar com a operadora se o preço ou as condições vão mudar depois dessa data.</p>
              <p style="margin:0;">Sem mais,<br><span style="font-weight:600;">DoLado</span></p>
            </td>
          </tr>
${RODAPE}`;
}
