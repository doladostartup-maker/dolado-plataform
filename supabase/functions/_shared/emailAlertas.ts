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
import { P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";

export { escaparHtml, textoParaAssunto };

function dataPt(dataIso: string): string {
  return new Date(`${dataIso}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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

  return emailV2({
    // O assunto inclui o fornecedor (texto do cliente): escape também aqui.
    titulo: escaparHtml(assuntoAlertaMonitor(regra, fornecedor, dias)),
    corpo: `<p ${P_EMAIL}>Olá ${escaparHtml(nome)},</p>
              <p ${P_EMAIL}>${facto}</p>
              <p ${P_EMAIL}>${sugestao}</p>
              ${botaoEmail(link, "Ver o contrato")}
              <p ${P_NOTA}>Está a ter um problema com este contrato? No portal pode pedir à DoLado para tratar do seu caso.</p>`,
    assinatura: "equipa",
  });
}
