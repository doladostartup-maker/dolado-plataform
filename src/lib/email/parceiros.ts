// E-mails do Programa de Parceiros (candidato e parceiro). Extensões .ts
// explícitas: testado com `node --test`.
//
// Nunca levam dados de clientes: só o código e a ligação do parceiro, ou
// contagens e valores das comissões. O aviso interno ao admin é só em
// português (backoffice) e sem o texto livre da candidatura.
import { CONTACTO_EMAIL } from "../site.ts";
import { textoAvisoPrimeiroContacto } from "../legal.ts";
import { formatarPreco } from "../planos.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import type { Idioma } from "../../i18n/config.ts";
import { tParceiros } from "../../i18n/mensagens/parceiros.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

export type EmailMontado = { assunto: string; html: string; texto: string };

function montar(idioma: Idioma, assunto: string, titulo: string, paragrafos: string[], extraHtml = "", extraTexto: string[] = []) {
  const tc = tEmails[idioma].comum;
  const corpo = [
    `<p ${P_EMAIL}>${tc.ola}</p>`,
    ...paragrafos.map((p) => `<p ${P_EMAIL}>${escaparHtml(p)}</p>`),
    extraHtml,
    `<p ${P_NOTA}><a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a></p>`,
  ].join("\n          ");
  const texto = [tc.ola, "", ...paragrafos.flatMap((p) => [p, ""]), ...extraTexto, CONTACTO_EMAIL].join("\n");
  return {
    assunto,
    html: emailV2({ titulo: escaparHtml(titulo), corpo, preheader: escaparHtml(paragrafos[0] ?? titulo), idioma }),
    texto,
  };
}

export function montarEmailCandidaturaRecebida(idioma: Idioma): EmailMontado {
  const t = tParceiros[idioma].emails.recebida;
  return montar(idioma, t.assunto, t.titulo, [t.texto, t.prazo]);
}

export function montarEmailCandidaturaAprovada(d: {
  idioma: Idioma;
  /** null = só distribuição (sem código). */
  codigo: string | null;
  url: string | null;
  distribuicao: boolean;
}): EmailMontado {
  const t = tParceiros[d.idioma].emails.aprovada;
  const paragrafos = [t.texto];
  let extraHtml = "";
  const extraTexto: string[] = [];
  if (d.codigo && d.url) {
    paragrafos.push(t.codigo(d.codigo), t.ligacao);
    extraHtml = `<p ${P_EMAIL}><a href="${escaparHtml(d.url)}" ${LIGACAO_EMAIL}>${escaparHtml(d.url)}</a></p>\n          <p ${P_EMAIL}>${escaparHtml(t.comoFunciona)}</p>`;
    extraTexto.push(d.url, "", t.comoFunciona, "");
  }
  if (d.distribuicao) {
    extraHtml += `\n          <p ${P_EMAIL}>${escaparHtml(t.distribuicao)}</p>`;
    extraTexto.push(t.distribuicao, "");
  }
  extraHtml += `\n          <p ${P_EMAIL}>${escaparHtml(t.condicoes)}</p>`;
  extraTexto.push(t.condicoes, "");
  return montar(d.idioma, t.assunto, t.titulo, paragrafos, extraHtml, extraTexto);
}

export function montarEmailPagamentoComissoes(d: {
  idioma: Idioma;
  comissoes: number;
  totalCents: number;
  ivaCents: number | null;
  referencia: string;
  /** AAAA-MM-DD */
  data: string;
}): EmailMontado {
  const t = tParceiros[d.idioma].emails.pagamento;
  const linhas: Array<[string, string]> = [
    [t.valor, formatarPreco(d.totalCents)],
    ...(d.ivaCents ? ([[t.iva, formatarPreco(d.ivaCents)]] as Array<[string, string]>) : []),
    [t.transferido, formatarPreco(d.totalCents + (d.ivaCents ?? 0))],
    [t.referencia, d.referencia],
    [t.data, d.data],
  ];
  const extraHtml = `<p ${P_EMAIL}>${linhas.map(([r, v]) => `${escaparHtml(r)}: <strong>${escaparHtml(v)}</strong>`).join("<br>")}</p>`;
  return montar(d.idioma, t.assunto, t.titulo, [t.texto(d.comissoes)], extraHtml, [...linhas.map(([r, v]) => `${r}: ${v}`), ""]);
}

/**
 * Primeiro contacto a uma pessoa indicada por um parceiro (oportunidade B2B):
 * a mensagem opcional escrita no backoffice e, sempre, o aviso do art. 14.º
 * (texto versionado em legal.ts). Só em português. O `texto` devolvido é o
 * que fica gravado como prova.
 */
export function montarEmailPrimeiroContacto(d: { parceiro: string; entidade: string; mensagem?: string | null }): EmailMontado {
  const aviso = textoAvisoPrimeiroContacto({ parceiro: d.parceiro, entidade: d.entidade });
  const mensagem = (d.mensagem ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return montar("pt-PT", aviso.assunto, "O seu contacto na DoLado", [...mensagem, ...aviso.paragrafos]);
}

/** Aviso interno (português, sem o texto livre da candidatura). */
export function avisoAdminCandidatura(d: { tipo: string; temEmpresa: boolean }) {
  return {
    assunto: "Nova candidatura ao Programa de Parceiros — DoLado",
    texto: `Chegou uma candidatura (${d.tipo}${d.temEmpresa ? ", com empresa" : ""}). Rever em /backoffice/parceiros/candidaturas.`,
  };
}
