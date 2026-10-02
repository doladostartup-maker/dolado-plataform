// Montagem dos e-mails dos alertas diários do Monitor de Proteção
// (fidelização e promoção). Usado pela Edge Function verificar-monitor-datas
// e testado com
// `node --test` (src/lib/emailAlertas.test.mjs) — sem APIs de Deno.
//
// Tudo o que vem do cliente (nome, operadora, descrição) é texto: no HTML
// passa por escape e no assunto perde quebras de linha e é encurtado. O
// destinatário NUNCA vem do alerta: as funções usam o e-mail atual da conta
// devolvido por monitor_alertas_pendentes().

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

// ---------------------------------------------------------------------------
// Monitor de Proteção (Edge Function verificar-monitor-datas)
// ---------------------------------------------------------------------------
// Texto factual: descreve a data registada e oferece uma ação útil, sem
// concluir sobre direitos ("tem direito a…") nem sobre a empresa.

export type RegraAlertaMonitor =
  | "fidelizacao_60d"
  | "fidelizacao_30d"
  | "fidelizacao_fim"
  | "promocao_60d"
  | "promocao_30d"
  | "promocao_fim";

const PORTAL_CONTRATOS = "https://portal.dolado.pt/portal/contratos";

function quando(dias: number, dataFim: string): string {
  if (dias > 1) return `termina dentro de ${dias} dias, a ${dataPt(dataFim)}`;
  if (dias === 1) return `termina amanhã, a ${dataPt(dataFim)}`;
  if (dias === 0) return `termina hoje, ${dataPt(dataFim)}`;
  return `terminou a ${dataPt(dataFim)}`;
}

export function assuntoAlertaMonitor(regra: RegraAlertaMonitor, fornecedor: string | null, dias: number): string {
  const com = fornecedor ? ` com ${textoParaAssunto(fornecedor, 60)}` : "";
  const oque = regra.startsWith("fidelizacao") ? `A fidelização${com}` : `A promoção${com}`;
  if (dias > 1) return `${oque} termina dentro de ${dias} dias`;
  if (dias === 1) return `${oque} termina amanhã`;
  if (dias === 0) return `${oque} termina hoje`;
  return `${oque} terminou`;
}

export function htmlAlertaMonitor({
  regra,
  nome,
  fornecedor,
  descricaoPromocao,
  dias,
  dataFim,
  contratoId,
}: {
  regra: RegraAlertaMonitor;
  nome: string;
  fornecedor: string | null;
  descricaoPromocao: string | null;
  dias: number;
  dataFim: string;
  contratoId: string;
}): string {
  const com = fornecedor ? ` com <strong>${escaparHtml(fornecedor)}</strong>` : "";
  const ehFidelizacao = regra.startsWith("fidelizacao");
  const facto = ehFidelizacao
    ? `A fidelização do seu contrato${com} que temos registada ${quando(dias, dataFim)}.`
    : `A promoção${com} que temos registada${descricaoPromocao ? ` (${escaparHtml(descricaoPromocao)})` : ""} ${quando(dias, dataFim)}.`;
  const sugestao = ehFidelizacao
    ? "Pode ser uma boa altura para rever as condições do contrato. No portal pode ver os dados registados e corrigi-los, se for preciso."
    : "Vale a pena confirmar com o fornecedor as condições que se aplicam depois dessa data. No portal pode ver os dados registados e corrigi-los, se for preciso.";
  const link = `${PORTAL_CONTRATOS}/${encodeURIComponent(contratoId)}`;

  return `${TOPO}
          <tr>
            <td style="padding: 24px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá ${escaparHtml(nome)},</p>
              <p style="margin:0 0 16px 0;">${facto}</p>
              <p style="margin:0 0 16px 0;">${sugestao}</p>
              <p style="margin:0 0 24px 0;"><a href="${link}" style="display:inline-block; background-color:#0E6B5C; color:#FFFFFF; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:600;">Ver o contrato</a></p>
              <p style="margin:0 0 16px 0; font-size:14px; color:#5B6270;">Está a ter um problema com este contrato? No portal pode pedir à DoLado para tratar do seu caso.</p>
              <p style="margin:0;">Com os melhores cumprimentos,<br><span style="font-weight:600;">A equipa DoLado</span></p>
            </td>
          </tr>
${RODAPE}`;
}
