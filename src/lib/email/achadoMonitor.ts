// E-mail ao cliente quando a DoLado comunica uma situação detetada nas
// faturas (Monitor de Proteção), depois de revista por uma pessoa.
// Extensões .ts explícitas: testado com `node --test`.
//
// Linguagem: "merece ser verificada" — nunca uma conclusão sobre a lei ou o
// contrato. O texto vem do backoffice e é tratado como texto (escape).
import { CONTACTO_EMAIL } from "../site.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

export const ASSUNTO_ACHADO_MONITOR = tEmails["pt-PT"].achadoMonitor.assunto;

export function assuntoAchadoMonitor(idioma: Idioma = IDIOMA_PADRAO) {
  return tEmails[idioma].achadoMonitor.assunto;
}

/**
 * `texto`: escrito pela DoLado no backoffice (sempre em português — o
 * backoffice não é traduzido); em inglês, só a moldura do e-mail muda.
 */
export function montarHtmlAchadoMonitor(
  { fornecedor, texto, url }: { fornecedor: string | null; texto: string; url: string },
  idioma: Idioma = IDIOMA_PADRAO,
) {
  const P = P_EMAIL;
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].achadoMonitor;
  const sobre = fornecedor ? t.sobre(escaparHtml(fornecedor)) : "";
  const paragrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p ${P}>${escaparHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return emailV2({
    titulo: t.assunto,
    idioma,
    corpo: `<p ${P}>${tc.ola}</p>
          <p ${P}>${t.introducao(sobre)}</p>
          ${paragrafos}
          ${botaoEmail(escaparHtml(localizarHref(idioma, url)), t.botao)}
          <p ${P_NOTA}>${t.nota(`<a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>`)}</p>`,
  });
}
