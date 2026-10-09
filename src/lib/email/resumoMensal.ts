// E-mail mensal "A sua Proteção em <mês>" (resumo mensal da Proteção).
// Extensões .ts explícitas: testado com `node --test`.
//
// Comunicação do serviço contratado (não é uma campanha): vai a todas as
// contas com a Proteção ativa, sem consentimento de marketing. Todo o texto
// vem de montarResumoMensal (src/lib/resumoMensal/resumo.ts) e é tratado
// como texto (escape) — os nomes dos serviços vêm de documentos lidos.
import { CONTACTO_EMAIL } from "../site.ts";
import type { ResumoMensal } from "../resumoMensal/resumo.ts";
import { COR_EMAIL, LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, caixaEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { localizarHref } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

const TITULO_SECAO = `style="margin:24px 0 8px 0; font-size:16px; font-weight:700; color:${COR_EMAIL.navy};"`;
const LISTA = `style="margin:0 0 16px 0; padding-left:20px;"`;
const ITEM = `style="margin:0 0 6px 0;"`;

/** Textos da moldura no idioma do resumo (resumos antigos, sem idioma → português). */
const textos = (r: ResumoMensal) => tEmails[r.idioma ?? "pt-PT"];

export function assuntoResumoMensal(r: ResumoMensal): string {
  return textos(r).resumoMensal.assunto(r.mesNome);
}

function lista(itens: string[]): string {
  return `<ul ${LISTA}>${itens.map((i) => `<li ${ITEM}>${escaparHtml(i)}</li>`).join("")}</ul>`;
}

function caixaEstado(r: ResumoMensal): string {
  const conteudo = `<p style="margin:0 0 4px 0; font-size:16px; font-weight:700;">${escaparHtml(r.estadoTitulo)}</p><p style="margin:0;">${escaparHtml(r.estadoTexto)}</p>`;
  if (r.estado !== "tudo_acompanhado") return caixaEmail(conteudo);
  // Tudo acompanhado: caixa em verde-menta (mesma estrutura da caixaEmail).
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0; background-color:${COR_EMAIL.menta}; border:1px solid #CDE8D8; border-radius:14px;"><tr><td style="padding:16px 20px; font-size:14px; line-height:1.6; color:${COR_EMAIL.navy};">${conteudo}</td></tr></table>`;
}

/** `urlPortal`: página da Proteção no portal (ex.: https://portal.dolado.pt/portal/contratos). */
export function montarHtmlResumoMensal(r: ResumoMensal, urlPortal: string): string {
  const P = P_EMAIL;
  const tc = textos(r).comum;
  const t = textos(r).resumoMensal;
  const idioma = r.idioma ?? "pt-PT";
  const secoes = [
    `<p ${P}>${tc.ola}</p>`,
    `<p ${P}>${escaparHtml(r.introducao)}</p>`,
    caixaEstado(r),
  ];
  if (r.atividade.length > 0) {
    secoes.push(`<p ${TITULO_SECAO}>${escaparHtml(t.acompanhamosEm(r.mesNome))}</p>`, lista(r.atividade));
  }
  if (r.estado !== "sem_servicos") {
    secoes.push(`<p ${TITULO_SECAO}>${t.alteracoes}</p>`);
    secoes.push(r.alteracoes.length > 0 ? lista(r.alteracoes) : `<p ${P}>${escaparHtml(r.semAlteracoes ?? "")}</p>`);
  }
  if (r.acompanhamento.length > 0) {
    secoes.push(`<p ${TITULO_SECAO}>${t.continuaAtiva}</p>`, lista(r.acompanhamento));
  }
  secoes.push(`<p ${TITULO_SECAO}>${t.proximaData}</p>`, `<p ${P}>${escaparHtml(r.proximaData)}</p>`);
  secoes.push(botaoEmail(escaparHtml(localizarHref(idioma, urlPortal)), r.estado === "sem_servicos" ? t.botaoAdicionar : t.botaoVer));
  secoes.push(`<p ${P_NOTA}>${t.baseiaSe} ${t.duvidas(`<a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>`)}</p>`);

  return emailV2({
    titulo: escaparHtml(assuntoResumoMensal(r)),
    corpo: secoes.join("\n          "),
    preheader: escaparHtml(r.introducao),
    rodape: t.rodape,
    idioma,
  });
}

/** Versão em texto simples (clientes de e-mail sem HTML). */
export function montarTextoResumoMensal(r: ResumoMensal, urlPortal: string): string {
  const tc = textos(r).comum;
  const t = textos(r).resumoMensal;
  const url = localizarHref(r.idioma ?? "pt-PT", urlPortal);
  const linhas = [tc.ola, "", r.introducao, "", `${r.estadoTitulo}. ${r.estadoTexto}`];
  if (r.atividade.length > 0) linhas.push("", t.acompanhamosEm(r.mesNome), ...r.atividade.map((i) => `- ${i}`));
  if (r.estado !== "sem_servicos") {
    linhas.push("", t.alteracoes, ...(r.alteracoes.length > 0 ? r.alteracoes.map((i) => `- ${i}`) : [r.semAlteracoes ?? ""]));
  }
  if (r.acompanhamento.length > 0) linhas.push("", t.continuaAtiva, ...r.acompanhamento.map((i) => `- ${i}`));
  linhas.push("", t.proximaData, r.proximaData, "", t.verTexto(url));
  linhas.push("", t.baseiaSe, t.duvidas(CONTACTO_EMAIL), "", "Thiago", "DoLado", "", t.rodape);
  return linhas.join("\n");
}
