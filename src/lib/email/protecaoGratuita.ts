// E-mails da Proteção gratuita (dias 0, 7, 25, 29 e 30). Extensões .ts
// explícitas: testado com `node --test`.
//
// Comunicações do serviço experimentado: confirmam o início, lembram o fim
// e dizem sempre que não há cobrança automática. Os dias 7 e 25 são
// lembretes opcionais e levam a ligação para deixar de os receber (decisão
// de Thiago, 18/10/2026). Nada de dados pessoais nem de conteúdo de
// documentos: só datas, o número de documentos e o preço (planos.ts).
import { CONTACTO_EMAIL } from "../site.ts";
import { PLANOS } from "../planos.ts";
import { MESES_ALERTAS_GUARDADOS } from "../acesso.ts";
import { marcoOpcional, type MarcoAviso } from "../protecaoGratuita.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { localizarHref, type Idioma } from "../../i18n/config.ts";
import { formatarData } from "../../i18n/formatar.ts";
import { precoNoIdioma } from "../../i18n/mensagens/planos.ts";
import { tProtecaoGratuita } from "../../i18n/mensagens/protecaoGratuita.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

export type DadosEmailProtecaoGratuita = {
  marco: MarcoAviso;
  idioma: Idioma;
  inicio: string;
  fim: string;
  /** Documentos já adicionados à Proteção (só a contagem). */
  documentos: number;
  /** https://portal.dolado.pt */
  portalUrl: string;
  /** Ligação para deixar de receber os lembretes (dias 7 e 25). */
  urlLembretes: string | null;
};

export type EmailMontado = { assunto: string; html: string; texto: string };

const data = (idioma: Idioma, iso: string) =>
  formatarData(idioma, iso, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

/** Parágrafos (texto simples) e botão de cada marco. */
function conteudo(d: DadosEmailProtecaoGratuita) {
  const t = tProtecaoGratuita[d.idioma].emails;
  const preco = precoNoIdioma(d.idioma, PLANOS.protecao.precoCentimos);
  const inicio = data(d.idioma, d.inicio);
  const fim = data(d.idioma, d.fim);
  const contratos = `${d.portalUrl}/portal/contratos`;
  const aderir = `${d.portalUrl}/portal/subscricao`;
  switch (d.marco) {
    case "d0":
      return {
        assunto: t.d0.assunto,
        titulo: t.d0.titulo,
        paragrafos: [t.d0.texto(inicio, fim), t.d0.passo, t.d0.condicoes(preco)],
        botao: { href: `${contratos}/novo`, texto: t.botaoDocumento },
      };
    case "d7":
      return {
        assunto: t.d7.assunto,
        titulo: t.d7.titulo,
        paragrafos: [d.documentos > 0 ? t.d7.comDocumentos(d.documentos) : t.d7.semDocumentos, t.d7.fim(fim), t.semCobranca],
        botao: d.documentos > 0 ? { href: contratos, texto: t.botaoPortal } : { href: `${contratos}/novo`, texto: t.botaoDocumento },
      };
    case "d25":
      return {
        assunto: t.d25.assunto,
        titulo: t.d25.titulo,
        paragrafos: [t.d25.texto(fim), t.d25.continuar(preco), t.d25.parar],
        botao: { href: aderir, texto: t.botaoAderir },
      };
    case "d29":
      return {
        assunto: t.d29.assunto,
        titulo: t.d29.titulo,
        paragrafos: [t.d29.texto(fim), t.d29.continuar(preco), t.d29.parar(MESES_ALERTAS_GUARDADOS)],
        botao: { href: aderir, texto: t.botaoAderir },
      };
    case "d30":
      return {
        assunto: t.d30.assunto,
        titulo: t.d30.titulo,
        paragrafos: [t.d30.texto(fim), t.d30.efeito, t.d30.guardados(MESES_ALERTAS_GUARDADOS)],
        botao: { href: aderir, texto: t.botaoAderir },
      };
  }
}

export function montarEmailProtecaoGratuita(d: DadosEmailProtecaoGratuita): EmailMontado {
  const t = tProtecaoGratuita[d.idioma].emails;
  const tc = tEmails[d.idioma].comum;
  const c = conteudo(d);
  const href = localizarHref(d.idioma, c.botao.href);
  const opcional = marcoOpcional(d.marco) && d.urlLembretes;
  const lembretes = opcional
    ? `<p ${P_NOTA}>${t.lembretes} <a href="${escaparHtml(d.urlLembretes!)}" ${LIGACAO_EMAIL}>${t.lembretesLigacao}</a>.</p>`
    : "";
  const corpo = [
    `<p ${P_EMAIL}>${tc.ola}</p>`,
    ...c.paragrafos.map((p) => `<p ${P_EMAIL}>${escaparHtml(p)}</p>`),
    botaoEmail(escaparHtml(href), c.botao.texto),
    `<p ${P_NOTA}><a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a></p>`,
    lembretes,
  ].join("\n          ");

  const texto = [
    tc.ola,
    "",
    ...c.paragrafos.flatMap((p) => [p, ""]),
    `${c.botao.texto}: ${href}`,
    "",
    CONTACTO_EMAIL,
    ...(opcional ? ["", `${t.lembretes} ${t.lembretesLigacao}: ${d.urlLembretes}`] : []),
  ].join("\n");

  return {
    assunto: c.assunto,
    html: emailV2({ titulo: escaparHtml(c.titulo), corpo, preheader: escaparHtml(c.paragrafos[0]), idioma: d.idioma }),
    texto,
  };
}
