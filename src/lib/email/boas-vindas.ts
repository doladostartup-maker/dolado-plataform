// O nome vem do caso (preenchido pelo cliente): passa por escape.
import { P_EMAIL, caixaEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

const P = P_EMAIL;
const P_LISTA = 'style="margin:0 0 4px 0;"';
const P_ITEM = 'style="margin:0 0 4px 0; color:#55657A; font-size:15px;"';

export function assuntoBoasVindas(idioma: Idioma = IDIOMA_PADRAO) {
  return tEmails[idioma].boasVindas.assunto;
}

export function montarHtmlBoasVindas(nome: string, idioma: Idioma = IDIOMA_PADRAO) {
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].boasVindas;
  const passos = t.passos.map((p, i) => (i < t.passos.length - 1 ? `<p ${P_LISTA}>${p}</p>` : `<p style="margin:0;">${p}</p>`));
  const itens = t.itens.map((p, i) =>
    i < t.itens.length - 1 ? `<p ${P_ITEM}>${p}</p>` : `<p style="margin:0 0 20px 0; color:#55657A; font-size:15px;">${p}</p>`,
  );
  return emailV2({
    titulo: t.titulo,
    idioma,
    corpo: `<p ${P}>${tc.olaNome(escaparHtml(nome ?? ""))}</p>
              <p ${P}>${t.obrigado}</p>
              <p ${P}>${t.pessoal}</p>
              ${caixaEmail(`<p style="margin:0 0 8px 0; font-weight:700;">${t.agora}</p>
                    ${passos.join("\n                    ")}`)}
              <p style="margin:0 0 8px 0; font-weight:700;">${t.preciso}</p>
              <p ${P_ITEM}>${t.tenhaAMao}</p>
              ${itens.join("\n              ")}
              <p ${P}>${t.espere}</p>`,
  });
}
