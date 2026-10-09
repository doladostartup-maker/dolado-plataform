// E-mails do fluxo de revisão do texto. Extensões .ts explícitas: testado
// diretamente com `node --test`. Sem termos técnicos para o cliente.
import { CONTACTO_EMAIL } from "../site.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2, ligacaoSecundariaEmail } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const ASSUNTO_TEXTO_PARA_REVISAO = tEmails["pt-PT"].textoRevisao.assunto;
/** Nova comunicação à empresa depois de uma resposta (mesmo fluxo de revisão e autorização). */
export const ASSUNTO_NOVA_COMUNICACAO_PARA_REVISAO = tEmails["pt-PT"].textoRevisao.assuntoNovaComunicacao;

export function assuntoTextoParaRevisao(seguimento: boolean, idioma: Idioma = IDIOMA_PADRAO) {
  const t = tEmails[idioma].textoRevisao;
  return seguimento ? t.assuntoNovaComunicacao : t.assunto;
}

/**
 * Dois botões: rever e autorizar / pedir alterações. Os links só abrem
 * páginas da DoLado — nenhuma ação acontece sem um clique explícito na
 * página (um scanner que abra o link não autoriza nada). Em inglês, os
 * links abrem as mesmas páginas em /en (o token não muda).
 */
export function montarHtmlTextoParaRevisao(
  {
    urlRever,
    urlAlterar,
    assunto,
    validadeDias,
    novoLink,
    seguimento = false,
  }: {
    urlRever: string;
    urlAlterar: string;
    /** Ex.: nome da empresa reclamada ou setor — para o cliente reconhecer o caso. */
    assunto: string | null;
    validadeDias: number;
    /** true quando é um novo link pedido pelo cliente (link anterior expirado). */
    novoLink: boolean;
    /** true quando já houve um envio: é uma nova comunicação à empresa. */
    seguimento?: boolean;
  },
  idioma: Idioma = IDIOMA_PADRAO,
) {
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].textoRevisao;
  const sobre = assunto ? tc.sobre(escaparHtml(assunto)) : "";
  const abertura = novoLink ? t.novoLink(seguimento, sobre) : seguimento ? t.seguimento(sobre) : t.primeiro(sobre);
  const P = P_EMAIL;
  const contacto = `<a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>`;
  return emailV2({
    titulo: assuntoTextoParaRevisao(seguimento, idioma),
    idioma,
    corpo: `<p ${P}>${tc.ola}</p>
          <p ${P}>${abertura}</p>
          <p ${P}>${t.nadaSemAutorizacao}</p>
          ${botaoEmail(escaparHtml(localizarHref(idioma, urlRever)), t.botaoRever)}
          ${ligacaoSecundariaEmail(escaparHtml(localizarHref(idioma, urlAlterar)), t.pedirAlteracoes)}
          <p ${P_NOTA}>${t.seguranca(validadeDias)}</p>
          <p ${P_NOTA}>${t.naoReconhece(contacto)}</p>`,
  });
}

/** Aviso interno à equipa: pedido de alterações (sem o conteúdo do pedido — está no backoffice). */
export function montarHtmlAvisoAlteracoes({ urlCaso, versao }: { urlCaso: string; versao: number | null }) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
<p>O cliente pediu alterações ao texto${versao ? ` (versão ${versao})` : ""}.</p>
<p><a href="${escaparHtml(urlCaso)}">Abrir o caso no backoffice</a></p>
</body></html>`;
}
