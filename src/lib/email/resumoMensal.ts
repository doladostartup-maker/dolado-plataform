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

const TITULO_SECAO = `style="margin:24px 0 8px 0; font-size:16px; font-weight:700; color:${COR_EMAIL.navy};"`;
const LISTA = `style="margin:0 0 16px 0; padding-left:20px;"`;
const ITEM = `style="margin:0 0 6px 0;"`;

export function assuntoResumoMensal(r: ResumoMensal): string {
  return `A sua Proteção em ${r.mesNome}`;
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
  const secoes = [
    `<p ${P}>Olá,</p>`,
    `<p ${P}>${escaparHtml(r.introducao)}</p>`,
    caixaEstado(r),
  ];
  if (r.atividade.length > 0) {
    secoes.push(`<p ${TITULO_SECAO}>O que acompanhámos em ${escaparHtml(r.mesNome)}</p>`, lista(r.atividade));
  }
  if (r.estado !== "sem_servicos") {
    secoes.push(`<p ${TITULO_SECAO}>Alterações detetadas</p>`);
    secoes.push(r.alteracoes.length > 0 ? lista(r.alteracoes) : `<p ${P}>${escaparHtml(r.semAlteracoes ?? "")}</p>`);
  }
  if (r.acompanhamento.length > 0) {
    secoes.push(`<p ${TITULO_SECAO}>A sua Proteção continua ativa</p>`, lista(r.acompanhamento));
  }
  secoes.push(`<p ${TITULO_SECAO}>Próxima data relevante</p>`, `<p ${P}>${escaparHtml(r.proximaData)}</p>`);
  secoes.push(botaoEmail(escaparHtml(urlPortal), r.estado === "sem_servicos" ? "Adicionar um documento" : "Ver a minha Proteção"));
  secoes.push(
    `<p ${P_NOTA}>Este resumo baseia-se nos documentos e nas datas que nos indicou. Se algum serviço mudou, adicione a fatura mais recente no portal. Para qualquer dúvida, escreva para <a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>.</p>`,
  );

  return emailV2({
    titulo: escaparHtml(assuntoResumoMensal(r)),
    corpo: secoes.join("\n          "),
    preheader: escaparHtml(r.introducao),
    rodape: "Recebe este resumo uma vez por mês porque tem a Proteção ativa na DoLado.",
  });
}

/** Versão em texto simples (clientes de e-mail sem HTML). */
export function montarTextoResumoMensal(r: ResumoMensal, urlPortal: string): string {
  const linhas = ["Olá,", "", r.introducao, "", `${r.estadoTitulo}. ${r.estadoTexto}`];
  if (r.atividade.length > 0) linhas.push("", `O que acompanhámos em ${r.mesNome}`, ...r.atividade.map((i) => `- ${i}`));
  if (r.estado !== "sem_servicos") {
    linhas.push("", "Alterações detetadas", ...(r.alteracoes.length > 0 ? r.alteracoes.map((i) => `- ${i}`) : [r.semAlteracoes ?? ""]));
  }
  if (r.acompanhamento.length > 0) linhas.push("", "A sua Proteção continua ativa", ...r.acompanhamento.map((i) => `- ${i}`));
  linhas.push("", "Próxima data relevante", r.proximaData, "", `Ver a sua Proteção: ${urlPortal}`);
  linhas.push(
    "",
    "Este resumo baseia-se nos documentos e nas datas que nos indicou. Se algum serviço mudou, adicione a fatura mais recente no portal.",
    `Para qualquer dúvida, escreva para ${CONTACTO_EMAIL}.`,
    "",
    "Thiago",
    "DoLado",
    "",
    "Recebe este resumo uma vez por mês porque tem a Proteção ativa na DoLado.",
  );
  return linhas.join("\n");
}
