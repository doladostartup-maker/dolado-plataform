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
import { P_EMAIL, P_NOTA, botaoEmail, emailV2, type IdiomaEmail } from "./molduraEmail.ts";

export { escaparHtml, textoParaAssunto };

// Idioma: o guardado na conta (user_metadata.idioma; sem idioma → português).
// Português: o texto de sempre. Inglês britânico: ao lado, mesma estrutura.
const lingua = (idioma: IdiomaEmail | undefined): IdiomaEmail => (idioma === "en-GB" ? "en-GB" : "pt-PT");

function dataPt(dataIso: string, idioma: IdiomaEmail = "pt-PT"): string {
  return new Date(`${dataIso}T00:00:00Z`).toLocaleDateString(lingua(idioma), {
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
const PORTAL_CONTRATOS_EN = "https://portal.dolado.pt/en/portal/contratos";

const TEXTOS = {
  "pt-PT": {
    quando: (dias: number, data: string) =>
      dias > 1 ? `termina dentro de ${dias} dias, a ${data}` : dias === 1 ? `termina amanhã, a ${data}` : dias === 0 ? `termina hoje, ${data}` : `terminou a ${data}`,
    oque: (fidelizacao: boolean, com: string) => (fidelizacao ? `A fidelização${com}` : `A promoção${com}`),
    com: (fornecedor: string) => ` com ${fornecedor}`,
    assunto: (oque: string, dias: number) =>
      dias > 1 ? `${oque} termina dentro de ${dias} dias` : dias === 1 ? `${oque} termina amanhã` : dias === 0 ? `${oque} termina hoje` : `${oque} terminou`,
    factoFidelizacao: (com: string, quando: string) => `A fidelização do seu contrato${com} que temos registada ${quando}.`,
    factoPromocao: (com: string, descricao: string, quando: string) => `A promoção${com} que temos registada${descricao ? ` (${descricao})` : ""} ${quando}.`,
    sugestaoFidelizacao:
      "Pode ser uma boa altura para rever as condições do contrato. No portal pode ver os dados registados e corrigi-los, se for preciso.",
    sugestaoPromocao:
      "Vale a pena confirmar com o fornecedor as condições que se aplicam depois dessa data. No portal pode ver os dados registados e corrigi-los, se for preciso.",
    ola: "Olá",
    botao: "Ver o contrato",
    nota: "Está a ter um problema com este contrato? No portal pode pedir à DoLado para tratar do seu caso.",
  },
  "en-GB": {
    quando: (dias: number, data: string) =>
      dias > 1 ? `ends in ${dias} days, on ${data}` : dias === 1 ? `ends tomorrow, ${data}` : dias === 0 ? `ends today, ${data}` : `ended on ${data}`,
    oque: (fidelizacao: boolean, com: string) => (fidelizacao ? `The minimum term${com}` : `The promotion${com}`),
    com: (fornecedor: string) => ` with ${fornecedor}`,
    assunto: (oque: string, dias: number) =>
      dias > 1 ? `${oque} ends in ${dias} days` : dias === 1 ? `${oque} ends tomorrow` : dias === 0 ? `${oque} ends today` : `${oque} has ended`,
    factoFidelizacao: (com: string, quando: string) => `The minimum term of your contract${com} that we have on record ${quando}.`,
    factoPromocao: (com: string, descricao: string, quando: string) => `The promotion${com} that we have on record${descricao ? ` (${descricao})` : ""} ${quando}.`,
    sugestaoFidelizacao:
      "This may be a good time to review the terms of the contract. In the portal you can see the details on record and correct them if needed.",
    sugestaoPromocao:
      "It is worth confirming with the provider which conditions apply after that date. In the portal you can see the details on record and correct them if needed.",
    ola: "Hello",
    botao: "View the contract",
    nota: "Having a problem with this contract? In the portal you can ask DoLado to handle your case.",
  },
} as const;

export function assuntoAlertaMonitor(regra: RegraAlertaMonitor, fornecedor: string | null, dias: number, idioma: IdiomaEmail = "pt-PT"): string {
  const t = TEXTOS[lingua(idioma)];
  const com = fornecedor ? t.com(textoParaAssunto(fornecedor, 60)) : "";
  return t.assunto(t.oque(regra.startsWith("fidelizacao"), com), dias);
}

export function htmlAlertaMonitor({
  regra,
  nome,
  fornecedor,
  descricaoPromocao,
  dias,
  dataFim,
  contratoId,
  idioma = "pt-PT",
}: {
  regra: RegraAlertaMonitor;
  nome: string;
  fornecedor: string | null;
  descricaoPromocao: string | null;
  dias: number;
  dataFim: string;
  contratoId: string;
  idioma?: IdiomaEmail;
}): string {
  const l = lingua(idioma);
  const t = TEXTOS[l];
  const com = fornecedor ? t.com(`<strong>${escaparHtml(fornecedor)}</strong>`) : "";
  const ehFidelizacao = regra.startsWith("fidelizacao");
  const quando = t.quando(dias, dataPt(dataFim, l));
  const facto = ehFidelizacao
    ? t.factoFidelizacao(com, quando)
    : t.factoPromocao(com, descricaoPromocao ? escaparHtml(descricaoPromocao) : "", quando);
  const sugestao = ehFidelizacao ? t.sugestaoFidelizacao : t.sugestaoPromocao;
  const link = `${l === "en-GB" ? PORTAL_CONTRATOS_EN : PORTAL_CONTRATOS}/${encodeURIComponent(contratoId)}`;

  return emailV2({
    // O assunto inclui o fornecedor (texto do cliente): escape também aqui.
    titulo: escaparHtml(assuntoAlertaMonitor(regra, fornecedor, dias, l)),
    idioma: l,
    corpo: `<p ${P_EMAIL}>${t.ola} ${escaparHtml(nome)},</p>
              <p ${P_EMAIL}>${facto}</p>
              <p ${P_EMAIL}>${sugestao}</p>
              ${botaoEmail(link, t.botao)}
              <p ${P_NOTA}>${t.nota}</p>`,
    assinatura: "equipa",
  });
}
