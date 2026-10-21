// E-mails das comunicações comerciais. Extensões .ts explícitas: testado com
// `node --test`.
//
//   * Confirmação do endereço (dupla confirmação, autorizações sem conta):
//     transaccional — só pede a confirmação, sem promoção de serviços.
//   * montarEmailComercial: moldura obrigatória de qualquer e-mail comercial
//     futuro — motivo do envio e ligação "Deixar de receber" no rodapé, e
//     cabeçalhos List-Unsubscribe (um clique). Sem ligação válida (sem
//     COMUNICACOES_CHAVE), devolve null e o e-mail não sai.
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { cabecalhosDeixarDeReceber, ligacaoConfirmar, ligacaoDeixarDeReceber, type TipoAutorizacao } from "../comunicacoesComerciais/ligacoes.ts";

export type EmailMontado = { assunto: string; html: string; texto: string; cabecalhos?: Record<string, string> };

/** E-mail de confirmação do endereço; null sem COMUNICACOES_CHAVE. */
export function montarEmailConfirmacao(consentimentoId: string, idioma: Idioma = IDIOMA_PADRAO): EmailMontado | null {
  const url = ligacaoConfirmar(consentimentoId, idioma);
  if (!url) return null;
  const t = tEmails[idioma].confirmacaoComunicacoes;
  const html = emailV2({
    titulo: t.titulo,
    idioma,
    assinatura: "equipa",
    preheader: t.preheader,
    rodape: t.rodape,
    corpo: `<p ${P_EMAIL}>${t.ola}</p>
              <p ${P_EMAIL}>${t.texto}</p>
              ${botaoEmail(escaparHtml(url), t.botao)}
              <p ${P_EMAIL}>${t.validade}</p>
              <p ${P_NOTA}>${t.naoFoi}</p>`,
  });
  const texto = [t.ola, "", t.texto, url, "", t.validade, "", t.naoFoi, "", t.rodape].join("\n");
  return { assunto: t.assunto, html, texto };
}

/**
 * Moldura de um e-mail comercial. `corpoHtml` já com o texto escapado;
 * `corpoTexto` é a versão em texto simples. null sem ligação para deixar de
 * receber (nunca enviar um e-mail comercial sem ela).
 */
export function montarEmailComercial(opcoes: {
  destinatario: { tipo: TipoAutorizacao; consentimentoId: string; idioma: Idioma };
  assunto: string;
  titulo: string;
  corpoHtml: string;
  corpoTexto: string;
  preheader?: string;
}): EmailMontado | null {
  const { tipo, consentimentoId, idioma } = opcoes.destinatario;
  const url = ligacaoDeixarDeReceber(tipo, consentimentoId, idioma);
  const cabecalhos = cabecalhosDeixarDeReceber(tipo, consentimentoId);
  if (!url || !cabecalhos) return null;
  const t = tEmails[idioma].comercial;
  const html = emailV2({
    titulo: opcoes.titulo,
    idioma,
    preheader: opcoes.preheader,
    rodape: `${t.rodape} <a href="${escaparHtml(url)}" ${LIGACAO_EMAIL}>${t.deixarDeReceber}</a>`,
    corpo: opcoes.corpoHtml,
  });
  const texto = [opcoes.corpoTexto, "", t.rodape, `${t.deixarDeReceber}: ${url}`].join("\n");
  return { assunto: opcoes.assunto, html, texto, cabecalhos };
}
