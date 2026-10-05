// E-mail do Aviso Sectorial (backoffice → clientes com Proteção que
// subscreveram o setor). Nome do cliente, título e descrição são texto:
// passam sempre por escape. Extensões .ts explícitas: testado com `node --test`.
//
// Só mostra o que o aviso tem (setor, título, descrição e a data de envio):
// sem empresa, sem "o que recomendamos" e sem botão — o aviso não tem esses
// dados nem um destino próprio.
import { COR_EMAIL, P_EMAIL, P_NOTA, caixaEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";

/** Onde o cliente escolhe os setores (Perfil e avisos no portal). */
const PREFERENCIAS_AVISOS = "https://portal.dolado.pt/portal/perfil#avisos";

const QUEBRA = `word-break:break-word; overflow-wrap:break-word;`;
const ROTULO = `style="margin:0 0 10px 0; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${COR_EMAIL.verde};"`;
const TITULO = `style="margin:0 0 6px 0; font-size:22px; line-height:1.3; font-weight:800; letter-spacing:-0.01em; color:${COR_EMAIL.navy}; ${QUEBRA}"`;
const DATA = `style="margin:0 0 24px 0; font-size:14px; line-height:1.5; color:${COR_EMAIL.muted};"`;
const PARAGRAFO_CAIXA = `margin:0; font-size:15px; line-height:1.65; color:${COR_EMAIL.navy}; ${QUEBRA}`;

/** "5 de outubro de 2026", na hora de Lisboa. */
export function dataAvisoSetorial(data: Date): string {
  return data.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
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

export function montarHtmlAvisoSetorial(
  nome: string,
  setor: string,
  titulo: string,
  descricao: string,
  enviadoEm: Date = new Date(),
) {
  const nomeLimpo = nome.trim();
  const setorHtml = escaparHtml(setor);
  const tituloHtml = escaparHtml(titulo.trim());
  const corpoDescricao = paragrafosDescricao(descricao);

  return emailV2({
    titulo: `Aviso setorial: ${setorHtml} — DoLado`,
    preheader: tituloHtml,
    corpo: `<p ${ROTULO}>Aviso setorial · ${setorHtml}</p>
              <h1 ${TITULO}>${tituloHtml}</h1>
              <p ${DATA}>Enviado a ${dataAvisoSetorial(enviadoEm)}</p>
              <p ${P_EMAIL}>Olá${nomeLimpo ? ` ${escaparHtml(nomeLimpo)}` : ""},</p>
              <p ${P_EMAIL}>Publicámos um aviso sobre o setor de ${setorHtml}, um dos setores que escolheu acompanhar na DoLado.</p>
              ${corpoDescricao ? caixaEmail(corpoDescricao) : ""}
              <p ${P_NOTA}>A DoLado acompanha novidades que possam afetar os seus serviços e avisa quando há algo relevante no setor que escolheu.</p>`,
    assinatura: "equipa",
    rodape: `Recebe este e-mail porque escolheu receber avisos sobre o setor de ${setorHtml}. Pode alterar os setores em <a href="${PREFERENCIAS_AVISOS}" style="color:${COR_EMAIL.verde}; text-decoration:underline;">Perfil e avisos</a>, no portal.`,
  });
}
