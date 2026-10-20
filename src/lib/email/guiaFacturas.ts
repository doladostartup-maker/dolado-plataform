// E-mail transaccional com a ligação para o guia gratuito (/guia-facturas).
// Não é comunicação comercial: só entrega o que a pessoa pediu, uma vez
// (no máximo um por 24 h por e-mail — guia_registar_pedido). Sem dados de
// quem pediu no conteúdo (nem o e-mail): nada a escapar além dos textos fixos.
// Sem promoção de serviços: um e-mail com publicidade deixaria de ser só
// transaccional e exigiria a autorização comercial.
import { P_EMAIL, botaoEmail, emailV2 } from "./molduraEmail.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { URL_GUIA_FACTURAS } from "../guiaFacturas.ts";

export function assuntoGuiaFacturas(idioma: Idioma = IDIOMA_PADRAO) {
  return tEmails[idioma].guiaFacturas.assunto;
}

export function montarHtmlGuiaFacturas(idioma: Idioma = IDIOMA_PADRAO) {
  const t = tEmails[idioma].guiaFacturas;
  return emailV2({
    titulo: t.titulo,
    idioma,
    assinatura: "equipa",
    preheader: t.preheader,
    rodape: t.rodape,
    corpo: `<p ${P_EMAIL}>${t.ola}</p>
              <p ${P_EMAIL}>${t.obrigado}</p>
              ${botaoEmail(URL_GUIA_FACTURAS, t.botao)}
              <p ${P_EMAIL}>${t.dica}</p>`,
  });
}

export function montarTextoGuiaFacturas(idioma: Idioma = IDIOMA_PADRAO) {
  const t = tEmails[idioma].guiaFacturas;
  return [t.ola, "", t.obrigado, URL_GUIA_FACTURAS, "", t.dica, "", t.rodape].join("\n");
}
