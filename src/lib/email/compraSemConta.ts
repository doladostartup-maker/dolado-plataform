// E-mails de lembrete de uma compra paga sem conta associada (1 e 3 dias).
// Só textos fixos, nomes de planos e uma ligação montada no servidor —
// nenhum texto do cliente entra no HTML.
// Extensões .ts explícitas: o módulo é testado diretamente com `node --test`.
import type { PLANOS } from "../planos.ts";
import { CONTACTO_EMAIL } from "../site.ts";
import { LIGACAO_EMAIL, P_EMAIL, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, localizarHref, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { tPlanos } from "../../i18n/mensagens/planos.ts";

export type MarcoLembrete = "1d" | "3d";

export function assuntoLembreteCompra(marco: MarcoLembrete, idioma: Idioma = IDIOMA_PADRAO) {
  const t = tEmails[idioma].lembreteCompra;
  return marco === "3d" ? t.assunto3d : t.assunto1d;
}

export function montarHtmlLembreteCompra(
  dados: {
    plano: keyof typeof PLANOS;
    marco: MarcoLembrete;
    /** /associar-compra?session_id=… (já há conta com o e-mail) ou /criar-conta?session_id=… */
    ligacao: string;
    associarCompra: boolean;
  },
  idioma: Idioma = IDIOMA_PADRAO,
) {
  const t = tEmails[idioma];
  const tl = t.lembreteCompra;
  const nomePlano = tPlanos[idioma].nome[dados.plano];
  const passo = dados.associarCompra ? tl.passoAssociar : tl.passoCriar;
  const botao = dados.associarCompra ? tl.botaoAssociar : tl.botaoCriar;
  const ultimo =
    dados.marco === "3d"
      ? `<p ${P_EMAIL}>${tl.ultimo(`<a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>`)}</p>`
      : "";

  return emailV2({
    titulo: assuntoLembreteCompra(dados.marco, idioma),
    idioma,
    corpo: `<p ${P_EMAIL}>${t.comum.ola}</p>
              <p ${P_EMAIL}>${tl.pagamentoConfirmado(nomePlano)}</p>
              <p ${P_EMAIL}>${passo}</p>
              ${botaoEmail(localizarHref(idioma, dados.ligacao), botao)}
              ${ultimo}`,
    assinatura: null,
  });
}
