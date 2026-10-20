// E-mails da Protecção oferecida por um parceiro (activação, 15 dias antes
// do fim, fim). Extensões .ts explícitas: testado com `node --test`.
//
// Comunicações do serviço oferecido: confirmam o início, lembram o fim e
// dizem sempre que não há cobrança automática. Só datas, o nome comercial do
// parceiro e o preço (planos.ts) — nunca dados de documentos nem do caso.
import { CONTACTO_EMAIL } from "../site.ts";
import { PLANOS } from "../planos.ts";
import { MESES_ALERTAS_GUARDADOS } from "../acesso.ts";
import type { MarcoAcesso } from "../acessoPatrocinado.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { localizarHref, type Idioma } from "../../i18n/config.ts";
import { formatarData } from "../../i18n/formatar.ts";
import { precoNoIdioma } from "../../i18n/mensagens/planos.ts";
import { tAcessoPatrocinado } from "../../i18n/mensagens/acessoPatrocinado.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

export type DadosEmailAcessoPatrocinado = {
  marco: MarcoAcesso;
  idioma: Idioma;
  inicio: string;
  fim: string;
  /** Nome comercial do parceiro (texto do backoffice — escapado). */
  parceiro: string;
  /** https://portal.dolado.pt */
  portalUrl: string;
};

export type EmailMontado = { assunto: string; html: string; texto: string };

const data = (idioma: Idioma, iso: string) =>
  formatarData(idioma, iso, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

function conteudo(d: DadosEmailAcessoPatrocinado) {
  const t = tAcessoPatrocinado[d.idioma].emails;
  const preco = precoNoIdioma(d.idioma, PLANOS.protecao.precoCentimos);
  const contratos = `${d.portalUrl}/portal/contratos`;
  const aderir = `${d.portalUrl}/portal/subscricao`;
  switch (d.marco) {
    case "ativacao":
      return {
        assunto: t.ativacao.assunto,
        titulo: t.ativacao.titulo,
        paragrafos: [t.ativacao.texto(d.parceiro, data(d.idioma, d.inicio), data(d.idioma, d.fim)), t.ativacao.passo, t.ativacao.condicoes],
        botao: { href: `${contratos}/novo`, texto: t.botaoDocumento },
      };
    case "d15":
      return {
        assunto: t.d15.assunto,
        titulo: t.d15.titulo,
        paragrafos: [t.d15.texto(data(d.idioma, d.fim)), t.d15.continuar(preco), t.d15.parar],
        botao: { href: aderir, texto: t.botaoAderir },
      };
    case "fim":
      return {
        assunto: t.fim.assunto,
        titulo: t.fim.titulo,
        paragrafos: [t.fim.texto(data(d.idioma, d.fim)), t.fim.efeito, t.fim.guardados(MESES_ALERTAS_GUARDADOS)],
        botao: { href: aderir, texto: t.botaoAderir },
      };
  }
}

export function montarEmailAcessoPatrocinado(d: DadosEmailAcessoPatrocinado): EmailMontado {
  const tc = tEmails[d.idioma].comum;
  const c = conteudo(d);
  const href = localizarHref(d.idioma, c.botao.href);
  const corpo = [
    `<p ${P_EMAIL}>${tc.ola}</p>`,
    ...c.paragrafos.map((p) => `<p ${P_EMAIL}>${escaparHtml(p)}</p>`),
    botaoEmail(escaparHtml(href), c.botao.texto),
    `<p ${P_NOTA}><a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a></p>`,
  ].join("\n          ");

  const texto = [tc.ola, "", ...c.paragrafos.flatMap((p) => [p, ""]), `${c.botao.texto}: ${href}`, "", CONTACTO_EMAIL].join("\n");

  return {
    assunto: c.assunto,
    html: emailV2({ titulo: escaparHtml(c.titulo), corpo, preheader: escaparHtml(c.paragrafos[0]), idioma: d.idioma }),
    texto,
  };
}
