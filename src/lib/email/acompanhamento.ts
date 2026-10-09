// E-mails do acompanhamento depois do envio da reclamação. Extensões .ts
// explícitas: testado com `node --test`.
//
// Ao cliente: e-mails simples, sem conteúdo da resposta da empresa (o portal
// é a fonte principal do acompanhamento). Só o nome da empresa reclamada,
// para o cliente reconhecer o caso.
// À equipa: avisos internos em HTML simples, sem conteúdo nem endereços.
import { escaparHtml } from "./textoRevisao.ts";
import { P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

type Momento = "respostaRecebida" | "pedidoInformacao" | "solucaoApresentada" | "casoEncerradoExterno";
type Dados = { empresa: string | null; urlCaso: string };

const pt = tEmails["pt-PT"].acompanhamento;
export const ASSUNTO_RESPOSTA_RECEBIDA = pt.respostaRecebida.assunto;
export const ASSUNTO_PEDIDO_INFORMACAO = pt.pedidoInformacao.assunto;
export const ASSUNTO_SOLUCAO_APRESENTADA = pt.solucaoApresentada.assunto;
export const ASSUNTO_CASO_ENCERRADO_EXTERNO = pt.casoEncerradoExterno.assunto;

export function assuntoAcompanhamento(momento: Momento, idioma: Idioma = IDIOMA_PADRAO) {
  return tEmails[idioma].acompanhamento[momento].assunto;
}

/** Corpo comum: saudação, dois parágrafos, botão para o caso no portal e nota opcional. */
function montar(momento: Momento, { empresa, urlCaso }: Dados, idioma: Idioma) {
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].acompanhamento[momento];
  const sobre = empresa ? tc.sobre(escaparHtml(empresa)) : "";
  const nota = "nota" in t ? `\n          <p ${P_NOTA}>${t.nota}</p>` : "";
  return emailV2({
    titulo: t.assunto,
    preheader: t.preheader,
    idioma,
    corpo: `<p ${P_EMAIL}>${tc.ola}</p>
          <p ${P_EMAIL}>${t.p1(sobre)}</p>
          <p ${P_EMAIL}>${t.p2}</p>
          ${botaoEmail(escaparHtml(localizarHref(idioma, urlCaso)), t.botao)}${nota}`,
  });
}

export function montarHtmlRespostaRecebida(dados: Dados, idioma: Idioma = IDIOMA_PADRAO) {
  return montar("respostaRecebida", dados, idioma);
}

export function montarHtmlPedidoInformacao(dados: Dados, idioma: Idioma = IDIOMA_PADRAO) {
  return montar("pedidoInformacao", dados, idioma);
}

export function montarHtmlSolucaoApresentada(dados: Dados, idioma: Idioma = IDIOMA_PADRAO) {
  return montar("solucaoApresentada", dados, idioma);
}

export function montarHtmlCasoEncerradoExterno(dados: Dados, idioma: Idioma = IDIOMA_PADRAO) {
  return montar("casoEncerradoExterno", dados, idioma);
}

/** Aviso interno à equipa (sem conteúdo da mensagem, sem endereços). */
export function montarHtmlAvisoEquipa({ texto, urlCaso }: { texto: string; urlCaso: string }) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
<p>${escaparHtml(texto)}</p>
<p><a href="${escaparHtml(urlCaso)}">Abrir o caso no backoffice</a></p>
</body></html>`;
}
