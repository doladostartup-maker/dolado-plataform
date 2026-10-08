// E-mails do acompanhamento depois do envio da reclamação. Extensões .ts
// explícitas: testado com `node --test`.
//
// Ao cliente: e-mails simples, sem conteúdo da resposta da empresa (o portal
// é a fonte principal do acompanhamento). Só o nome da empresa reclamada,
// para o cliente reconhecer o caso.
// À equipa: avisos internos em HTML simples, sem conteúdo nem endereços.
import { escaparHtml } from "./textoRevisao.ts";
import { P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";

const sobre = (empresa: string | null) => (empresa ? ` relativa a <strong>${escaparHtml(empresa)}</strong>` : "");

export const ASSUNTO_RESPOSTA_RECEBIDA = "Recebemos uma resposta relacionada com o seu caso";

export function montarHtmlRespostaRecebida({ empresa, urlCaso }: { empresa: string | null; urlCaso: string }) {
  return emailV2({
    titulo: ASSUNTO_RESPOSTA_RECEBIDA,
    preheader: "Estamos a analisá-la. Não precisa de fazer nada neste momento.",
    corpo: `<p ${P_EMAIL}>Olá,</p>
          <p ${P_EMAIL}>Recebemos uma comunicação relacionada com a sua reclamação${sobre(empresa)} e estamos a analisá-la.</p>
          <p ${P_EMAIL}>Não precisa de fazer nada neste momento. Entraremos em contacto consigo se for necessária alguma ação.</p>
          ${botaoEmail(escaparHtml(urlCaso), "Ver o meu caso")}
          <p ${P_NOTA}>Pode acompanhar o caso a qualquer momento na sua área de cliente.</p>`,
  });
}

export const ASSUNTO_PEDIDO_INFORMACAO = "Precisamos de informação sua para continuar o seu caso";

export function montarHtmlPedidoInformacao({ empresa, urlCaso }: { empresa: string | null; urlCaso: string }) {
  return emailV2({
    titulo: ASSUNTO_PEDIDO_INFORMACAO,
    preheader: "Veja no portal o que precisamos e envie-nos a informação.",
    corpo: `<p ${P_EMAIL}>Olá,</p>
          <p ${P_EMAIL}>Para continuarmos a tratar a sua reclamação${sobre(empresa)}, precisamos de informação ou documentos seus.</p>
          <p ${P_EMAIL}>Indicámos no seu caso, no portal, exatamente o que precisamos e como nos pode enviar.</p>
          ${botaoEmail(escaparHtml(urlCaso), "Ver o que precisamos")}`,
  });
}

export const ASSUNTO_SOLUCAO_APRESENTADA = "A empresa apresentou uma solução para o seu caso";

export function montarHtmlSolucaoApresentada({ empresa, urlCaso }: { empresa: string | null; urlCaso: string }) {
  return emailV2({
    titulo: ASSUNTO_SOLUCAO_APRESENTADA,
    preheader: "Diga-nos se o problema ficou resolvido.",
    corpo: `<p ${P_EMAIL}>Olá,</p>
          <p ${P_EMAIL}>A empresa apresentou uma solução para a sua reclamação${sobre(empresa)}. Explicámos o resultado no seu caso, no portal.</p>
          <p ${P_EMAIL}>Só damos o caso por resolvido depois de nos confirmar que o problema ficou mesmo resolvido.</p>
          ${botaoEmail(escaparHtml(urlCaso), "Ver a solução e responder")}`,
  });
}

export const ASSUNTO_CASO_ENCERRADO_EXTERNO = "A DoLado terminou o acompanhamento do seu caso";

export function montarHtmlCasoEncerradoExterno({ empresa, urlCaso }: { empresa: string | null; urlCaso: string }) {
  return emailV2({
    titulo: ASSUNTO_CASO_ENCERRADO_EXTERNO,
    preheader: "Preparámos o dossiê do seu caso e a informação sobre como pode continuar.",
    corpo: `<p ${P_EMAIL}>Olá,</p>
          <p ${P_EMAIL}>A DoLado terminou o acompanhamento da sua reclamação${sobre(empresa)}. Isto não significa necessariamente que o problema esteja resolvido.</p>
          <p ${P_EMAIL}>Preparámos o seu dossiê com o histórico e os documentos do caso. Se pretender continuar, poderá consultar a lista meramente informativa de entidades oficiais de Resolução Alternativa de Litígios de Consumo no portal.</p>
          ${botaoEmail(escaparHtml(urlCaso), "Ver o caso e descarregar o dossiê")}
          <p ${P_NOTA}>A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem, não apresenta pedidos em seu nome e não determina nem indica qual é a entidade competente para este caso. Confirme diretamente junto da entidade se pode apreciar o conflito.</p>`,
  });
}

/** Aviso interno à equipa (sem conteúdo da mensagem, sem endereços). */
export function montarHtmlAvisoEquipa({ texto, urlCaso }: { texto: string; urlCaso: string }) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
<p>${escaparHtml(texto)}</p>
<p><a href="${escaparHtml(urlCaso)}">Abrir o caso no backoffice</a></p>
</body></html>`;
}
