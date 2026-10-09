// E-mail do Aviso Sectorial (backoffice → clientes com Proteção que
// subscreveram o setor). Nome do cliente, título e descrição são texto:
// passam sempre por escape. Extensões .ts explícitas: testado com `node --test`.
//
// Só mostra o que o aviso tem (setor, título, descrição e a data de envio):
// sem empresa, sem "o que recomendamos" e sem botão — o aviso não tem esses
// dados nem um destino próprio.
import { COR_EMAIL, P_EMAIL, P_NOTA, caixaEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "../../i18n/config.ts";
import { formatarData } from "../../i18n/formatar.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { rotulo } from "../../i18n/mensagens/rotulos.ts";

/** Onde o cliente escolhe os setores (Perfil e avisos no portal). */
const PREFERENCIAS_AVISOS = "https://portal.dolado.pt/portal/perfil#avisos";

const QUEBRA = `word-break:break-word; overflow-wrap:break-word;`;
const ROTULO = `style="margin:0 0 10px 0; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${COR_EMAIL.verde};"`;
const TITULO = `style="margin:0 0 6px 0; font-size:22px; line-height:1.3; font-weight:800; letter-spacing:-0.01em; color:${COR_EMAIL.navy}; ${QUEBRA}"`;
const DATA = `style="margin:0 0 24px 0; font-size:14px; line-height:1.5; color:${COR_EMAIL.muted};"`;
const PARAGRAFO_CAIXA = `margin:0; font-size:15px; line-height:1.65; color:${COR_EMAIL.navy}; ${QUEBRA}`;

/** "5 de outubro de 2026" / "5 October 2026", na hora de Lisboa. */
export function dataAvisoSetorial(data: Date, idioma: Idioma = IDIOMA_PADRAO): string {
  if (idioma === "pt-PT") return data.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
  return formatarData(idioma, data);
}

/** Assunto (o setor vem da lista fechada SETORES; em inglês, traduzido). */
export function assuntoAvisoSetorial(setor: string, idioma: Idioma = IDIOMA_PADRAO): string {
  return tEmails[idioma].avisoSetorial.assunto(idioma === "pt-PT" ? setor : rotulo(idioma, "setores", setor) || setor);
}

/** Descrição em parágrafos (linha em branco) com quebras de linha simples mantidas. */
function paragrafosDescricao(descricao: string): string {
  const blocos = descricao
    .replace(/\r\n|\r/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocos
    .map((b, i) => {
      const margem = i < blocos.length - 1 ? "margin-bottom:12px; " : "";
      return `<p style="${PARAGRAFO_CAIXA} ${margem}">${escaparHtml(b).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

/**
 * Título e descrição: escritos no backoffice (sempre em português — o
 * backoffice não é traduzido). Em inglês muda a moldura e o nome do setor, e
 * o e-mail diz que o aviso está escrito em português.
 */
export function montarHtmlAvisoSetorial(
  nome: string,
  setor: string,
  titulo: string,
  descricao: string,
  enviadoEm: Date = new Date(),
  idioma: Idioma = IDIOMA_PADRAO,
) {
  const tc = tEmails[idioma].comum;
  const t = tEmails[idioma].avisoSetorial;
  const nomeLimpo = nome.trim();
  const setorHtml = escaparHtml(rotulo(idioma, "setores", setor) || setor);
  const tituloHtml = escaparHtml(titulo.trim());
  const corpoDescricao = paragrafosDescricao(descricao);
  const preferencias = localizarHref(idioma, PREFERENCIAS_AVISOS);

  return emailV2({
    titulo: t.titulo(setorHtml),
    preheader: tituloHtml,
    idioma,
    corpo: `<p ${ROTULO}>${t.rotulo(setorHtml)}</p>
              <h1 ${TITULO}>${tituloHtml}</h1>
              <p ${DATA}>${t.enviadoA(dataAvisoSetorial(enviadoEm, idioma))}</p>
              <p ${P_EMAIL}>${nomeLimpo ? tc.olaNome(escaparHtml(nomeLimpo)) : tc.ola}</p>
              <p ${P_EMAIL}>${t.publicamos(setorHtml)}</p>
              ${corpoDescricao ? caixaEmail(corpoDescricao) : ""}
              <p ${P_NOTA}>${t.nota}</p>`,
    assinatura: "equipa",
    rodape: t.rodape(setorHtml, (texto) => `<a href="${preferencias}" style="color:${COR_EMAIL.verde}; text-decoration:underline;">${texto}</a>`),
  });
}
