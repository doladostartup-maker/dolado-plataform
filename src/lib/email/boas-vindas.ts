// O nome vem do caso (preenchido pelo cliente): passa por escape.
import { P_EMAIL, caixaEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

const P = P_EMAIL;
const P_LISTA = 'style="margin:0 0 4px 0;"';

export function assuntoBoasVindas(idioma: Idioma = IDIOMA_PADRAO) {
  return tEmails[idioma].boasVindas.assunto;
}

export function montarHtmlBoasVindas(nome: string, idioma: Idioma = IDIOMA_PADRAO) {
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].boasVindas;
  const passos = t.passos.map((p, i) => (i < t.passos.length - 1 ? `<p ${P_LISTA}>${p}</p>` : `<p style="margin:0;">${p}</p>`));
  // Assinada pela equipa (nunca em nome de uma pessoa): fecho próprio no corpo.
  return emailV2({
    titulo: t.titulo,
    idioma,
    assinatura: null,
    corpo: `<p ${P}>${tc.olaNome(escaparHtml(nome ?? ""))}</p>
              <p ${P}>${t.obrigado}</p>
              <p ${P}>${t.recebemos}</p>
              ${caixaEmail(`<p style="margin:0 0 8px 0; font-weight:700;">${t.aSeguir}</p>
                    ${passos.join("\n                    ")}`)}
              <p ${P}>${t.autorizacao}</p>
              <p ${P}>${t.depoisEnvio}</p>
              <p ${P}>${t.porAgora}</p>
              <p ${P}>${t.duvidas}</p>
              <p style="margin:0 0 4px 0;">${t.lema}</p>
              <p style="margin:0 0 24px 0; font-weight:700;">${t.equipa}</p>`,
  });
}
