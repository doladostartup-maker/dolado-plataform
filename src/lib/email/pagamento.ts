// Extensões .ts explícitas: o módulo é testado diretamente com `node --test`.
import { CASO_EXTRA, PLANOS } from "../planos.ts";
import { ROTAS_LEGAIS, rotaTermosVersao } from "../legal.ts";
import { CONTACTO_EMAIL, MARKETING_SITE_URL } from "../site.ts";
import { LIGACAO_EMAIL, P_EMAIL, botaoEmail, emailV2, tabelaEmail } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "../../i18n/config.ts";
import { formatarData } from "../../i18n/formatar.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { tJuridico } from "../../i18n/mensagens/juridico.ts";
import { precoNoIdioma, tPlanos } from "../../i18n/mensagens/planos.ts";

export type PlanoEmail = "avulso" | "protecao" | "caso_protecao" | "caso_extra";

/** Nome, preço e tipo do produto no idioma (o Caso Extra não é um plano de PLANOS). */
function produtoDoEmail(plano: PlanoEmail, idioma: Idioma) {
  const t = tPlanos[idioma];
  if (plano === "caso_extra") {
    return { nome: t.casoExtra.nome, precoCentimos: CASO_EXTRA.precoCentimos, subscricao: false };
  }
  return { ...PLANOS[plano], nome: t.nome[plano] };
}

export type DadosEmailPagamento = {
  /** /criar-conta?session_id=… quando a conta ainda não existe; /entrar quando já existe. */
  ligacao: string;
  contaExiste: boolean;
  /**
   * Compra sem conta ligada, mas o e-mail do Checkout já tem conta: o passo
   * é iniciar sessão e associar a compra (nunca criar outra conta).
   */
  associarCompra?: boolean;
  /** Valor efetivamente pago agora (com descontos/cupões), em cêntimos. */
  valorPagoCentimos: number | null;
  /** Próxima renovação (ISO) nas subscrições, se conhecida. */
  renovacao: string | null;
  /** Registo de consentimento ligado a esta compra (null em compras sem registo). */
  consentimento: { termos_versao: string; pediu_inicio_imediato: boolean } | null;
  /** https://portal.dolado.pt — para a Gestão de Subscrição. */
  portalUrl: string;
};

/** Assunto do e-mail de pagamento confirmado. */
export function assuntoPagamentoConfirmado(estado: { contaExiste: boolean; associarCompra: boolean }, idioma: Idioma = IDIOMA_PADRAO) {
  const t = tEmails[idioma].pagamento;
  return estado.contaExiste ? t.assuntoContaExiste : estado.associarCompra ? t.assuntoAssociar : t.assuntoCriarConta;
}

const P = P_EMAIL;
const LINK = LIGACAO_EMAIL;
/** Textos legais e documentos: um pouco mais pequenos do que o corpo. */
const P_LEGAL = 'style="margin:0 0 16px 0; font-size:14px; line-height:1.6;"';

/**
 * Confirmação da contratação em suporte duradouro: produto, valor, tipo,
 * renovação, como gerir/cancelar, início imediato pedido, livre resolução e
 * como a exercer, e ligações para os Termos aceites e a Política de
 * Privacidade. Textos legais vêm de src/lib/legal.ts (português) e, em
 * inglês, das traduções informativas de tJuridico (o português continua a
 * ser a versão vinculativa); preços de planos.ts.
 */
export function montarHtmlBoasVindasPagamento(plano: PlanoEmail, dados: DadosEmailPagamento, idioma: Idioma = IDIOMA_PADRAO) {
  const { contaExiste, associarCompra = false, ligacao, valorPagoCentimos, renovacao, consentimento, portalUrl } = dados;
  const t = tEmails[idioma];
  const tp = t.pagamento;
  const tpl = tPlanos[idioma];
  const info = produtoDoEmail(plano, idioma);
  const casoExtra = plano === "caso_extra";
  const nomePlano = info.nome;
  const noIdioma = (url: string) => localizarHref(idioma, url);
  // O Caso Extra é sempre comprado com sessão iniciada (contaExiste).
  const passo = casoExtra
    ? tp.passoCasoExtra
    : contaExiste
      ? tp.passoContaExiste
      : associarCompra
        ? tp.passoAssociar
        : plano === "protecao"
          ? tp.passoCriarProtecao
          : tp.passoCriarCaso;
  const botao = casoExtra
    ? tp.botaoCasoExtra
    : contaExiste
      ? tp.botaoIniciarSessao
      : associarCompra
        ? tp.botaoAssociar
        : tp.botaoCriarConta;
  const destinoBotao = noIdioma(casoExtra ? `${portalUrl}/portal/casos` : ligacao);

  const linhas: [string, string][] = [[tp.rotuloProduto, casoExtra ? `${nomePlano} (${tpl.casoExtra.beneficio})` : nomePlano]];
  if (valorPagoCentimos !== null) linhas.push([tp.rotuloValorPago, `${precoNoIdioma(idioma, valorPagoCentimos)} (${tpl.ivaIncluido})`]);
  if (info.subscricao) {
    linhas.push([tp.rotuloTipo, tp.tipoSubscricao]);
    linhas.push([tp.rotuloPrecoPlano, `${tpl.comUnidade(precoNoIdioma(idioma, info.precoCentimos), true)} (${tpl.ivaIncluido})`]);
    if (renovacao) linhas.push([tp.rotuloRenovacao, formatarData(idioma, renovacao, { day: "2-digit", month: "long", year: "numeric" })]);
  } else {
    linhas.push([tp.rotuloTipo, tp.tipoUnico]);
  }
  if (casoExtra) linhas.push([tp.rotuloSubscricao, tp.subscricaoInalterada]);
  const tabela = tabelaEmail(linhas);

  // Documentos legais: só em português (as páginas /en mostram um aviso).
  const termosUrl = `${MARKETING_SITE_URL}${consentimento ? rotaTermosVersao(consentimento.termos_versao) : ROTAS_LEGAIS.termos}`;
  const privacidadeUrl = `${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`;
  const livreResolucaoUrl = noIdioma(`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`);
  const gestaoUrl = noIdioma(`${portalUrl}${ROTAS_LEGAIS.gestaoSubscricao}`);

  const blocoSubscricao = info.subscricao
    ? `<p ${P_LEGAL}>${tp.renovacao(
        valorPagoCentimos !== null && valorPagoCentimos !== info.precoCentimos,
        (texto) => `<a href="${gestaoUrl}" ${LINK}>${texto}</a>`,
      )}</p>`
    : "";

  const blocoInicio = consentimento?.pediu_inicio_imediato ? `<p ${P_LEGAL}>${tp.inicioImediato}</p>` : "";
  const notaPortugues = t.comum.notaDocumentosPortugues ? ` ${t.comum.notaDocumentosPortugues}` : "";

  return emailV2({
    titulo: tp.titulo,
    idioma,
    corpo: `<p ${P}>${t.comum.ola}</p>
              <p ${P}>${tp.introducao}</p>
              ${tabela}
              <p ${P}>${passo}</p>
              ${botaoEmail(destinoBotao, botao)}
              ${blocoSubscricao}
              ${blocoInicio}
              <p ${P_LEGAL}><strong>${tp.livreResolucao}</strong> ${tJuridico[idioma].resumoLivreResolucao} ${tJuridico[idioma].comoExercer} <a href="${livreResolucaoUrl}" ${LINK}>${tp.saibaMais}</a>.</p>
              <p ${P_LEGAL}>${tp.documentos} <a href="${termosUrl}" ${LINK}>${tp.termos}${consentimento ? tp.versao(consentimento.termos_versao) : ""}</a> · <a href="${privacidadeUrl}" ${LINK}>${tp.privacidade}</a>.${notaPortugues}</p>
              <p ${P_LEGAL}>${tp.questoes} <a href="mailto:${CONTACTO_EMAIL}" ${LINK}>${CONTACTO_EMAIL}</a>.</p>`,
  });
}

/** Aviso interno ao admin (sempre em português). */
export function montarHtmlNotificacaoNovoPagamento(email: string, plano: PlanoEmail) {
  const nomePlano = produtoDoEmail(plano, IDIOMA_PADRAO).nome;

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
  <p>Novo pagamento recebido.</p>
  <p><strong>E-mail:</strong> ${email}<br>
  <strong>Plano:</strong> ${nomePlano}</p>
</body>
</html>`;
}
