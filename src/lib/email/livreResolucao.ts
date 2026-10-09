// E-mails da função online de livre resolução. Todo o texto vindo do
// formulário passa por escaparHtml.
// Extensões .ts explícitas: o módulo é importado diretamente por `node --test`.
import { PLANOS_LIVRE_RESOLUCAO, type PedidoLivreResolucao } from "../livreResolucao.ts";
import { CONTACTO_EMAIL } from "../site.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { emailV2, tabelaEmail } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";
import { formatarDataHora } from "../../i18n/formatar.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { tPlanos } from "../../i18n/mensagens/planos.ts";

export const ASSUNTO_CONFIRMACAO_LIVRE_RESOLUCAO = tEmails["pt-PT"].livreResolucao.assunto;

export function assuntoConfirmacaoLivreResolucao(idioma: Idioma = IDIOMA_PADRAO) {
  return tEmails[idioma].livreResolucao.assunto;
}

const P = 'style="margin:0 0 16px 0;"';

function dataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(iso));
}

/** Moldura simples dos avisos internos à DoLado. */
function moldura(conteudo: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif; color:#171A21; font-size:15px; line-height:1.6; max-width:560px;">${conteudo}</div>`;
}

/**
 * Confirmação de receção ao consumidor (suporte duradouro). Só leva dados
 * fixos ou validados (referência, data, e-mail, plano, data da compra) —
 * nunca o texto livre do formulário (nome, identificação, mensagem), para o
 * formulário público não servir para fazer chegar texto arbitrário à
 * caixa de correio de um cliente.
 */
export function montarHtmlConfirmacaoLivreResolucao(
  pedido: PedidoLivreResolucao,
  id: string,
  pedidoEm: string,
  idioma: Idioma = IDIOMA_PADRAO,
) {
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].livreResolucao;
  const plano =
    idioma === "pt-PT"
      ? PLANOS_LIVRE_RESOLUCAO[pedido.plano]
      : pedido.plano === "nao_sei"
        ? t.planoNaoSei
        : tPlanos[idioma].nome[pedido.plano];
  const linhas = [
    [t.rotuloReferencia, id],
    [t.rotuloRecebido, idioma === "pt-PT" ? dataHora(pedidoEm) : formatarDataHora(idioma, pedidoEm)],
    [t.rotuloEmail, pedido.email],
    [t.rotuloPlano, plano],
    ...(pedido.data_compra ? [[t.rotuloDataCompra, pedido.data_compra]] : []),
  ].map(([k, v]) => [escaparHtml(k), escaparHtml(v)] as [string, string]);
  return emailV2({
    titulo: t.assunto,
    idioma,
    corpo: `
    <p ${P}>${tc.ola}</p>
    <p ${P}>${t.p1}</p>
    ${tabelaEmail(linhas)}
    <p ${P}>${t.p2}</p>
    <p ${P}>${t.naoFez(escaparHtml(CONTACTO_EMAIL))}</p>`,
    assinatura: "equipa",
  });
}

/** Aviso interno à DoLado. */
export function montarHtmlAvisoLivreResolucao(
  pedido: PedidoLivreResolucao,
  id: string,
  pedidoEm: string,
  contexto: { contaConhecida: boolean; confirmacaoEnviada: boolean },
) {
  return moldura(`
    <p ${P}><strong>Novo pedido de livre resolução</strong> (${escaparHtml(id)}), recebido em ${escaparHtml(dataHora(pedidoEm))}.</p>
    <ul style="margin:0 0 16px 0; padding-left:20px;">
      <li>Nome: ${escaparHtml(pedido.nome)}</li>
      <li>E-mail: ${escaparHtml(pedido.email)}</li>
      <li>Plano: ${escaparHtml(PLANOS_LIVRE_RESOLUCAO[pedido.plano])}</li>
      <li>Data da compra: ${escaparHtml(pedido.data_compra ?? "—")}</li>
      <li>Identificação: ${escaparHtml(pedido.identificacao ?? "—")}</li>
      <li>E-mail de cliente conhecido: ${contexto.contaConhecida ? "sim" : "não — confirmar a identidade antes de responder"}</li>
      <li>Confirmação de receção enviada: ${contexto.confirmacaoEnviada ? "sim" : "não"}</li>
    </ul>
    ${pedido.mensagem ? `<p ${P}>${escaparHtml(pedido.mensagem).replace(/\n/g, "<br>")}</p>` : ""}
    <p style="margin:0;">Sem efeitos automáticos: apreciar o pedido e tratar no Stripe Dashboard, se aplicável.</p>`);
}
