// E-mails do fluxo de revisão do texto. Extensões .ts explícitas: testado
// diretamente com `node --test`. Sem termos técnicos para o cliente.
import { CONTACTO_EMAIL } from "../site.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2, ligacaoSecundariaEmail } from "./molduraEmail.ts";

export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const ASSUNTO_TEXTO_PARA_REVISAO = "O texto da sua reclamação está pronto para revisão";
/** Nova comunicação à empresa depois de uma resposta (mesmo fluxo de revisão e autorização). */
export const ASSUNTO_NOVA_COMUNICACAO_PARA_REVISAO = "Uma nova comunicação do seu caso está pronta para revisão";

/**
 * Dois botões: rever e autorizar / pedir alterações. Os links só abrem
 * páginas da DoLado — nenhuma ação acontece sem um clique explícito na
 * página (um scanner que abra o link não autoriza nada).
 */
export function montarHtmlTextoParaRevisao({
  urlRever,
  urlAlterar,
  assunto,
  validadeDias,
  novoLink,
  seguimento = false,
}: {
  urlRever: string;
  urlAlterar: string;
  /** Ex.: nome da empresa reclamada ou setor — para o cliente reconhecer o caso. */
  assunto: string | null;
  validadeDias: number;
  /** true quando é um novo link pedido pelo cliente (link anterior expirado). */
  novoLink: boolean;
  /** true quando já houve um envio: é uma nova comunicação à empresa. */
  seguimento?: boolean;
}) {
  const sobre = assunto ? ` relativa a <strong>${escaparHtml(assunto)}</strong>` : "";
  const abertura = novoLink
    ? `Como pediu, enviamos-lhe um novo link para rever o texto${seguimento ? " da nova comunicação" : " da sua reclamação"}${sobre}.`
    : seguimento
      ? `Na sequência da resposta da empresa à sua reclamação${sobre}, preparámos uma nova comunicação. Antes de a enviarmos em seu nome, pedimos-lhe que a reveja.`
      : `O texto da sua reclamação${sobre} está pronto. Antes de o enviarmos em seu nome, pedimos-lhe que o reveja.`;
  const P = P_EMAIL;
  return emailV2({
    titulo: seguimento ? ASSUNTO_NOVA_COMUNICACAO_PARA_REVISAO : ASSUNTO_TEXTO_PARA_REVISAO,
    corpo: `<p ${P}>Olá,</p>
          <p ${P}>${abertura}</p>
          <p ${P}>Nada é enviado sem a sua autorização explícita. Se quiser mudar alguma coisa, pode pedir alterações.</p>
          ${botaoEmail(escaparHtml(urlRever), "Rever e autorizar o envio")}
          ${ligacaoSecundariaEmail(escaparHtml(urlAlterar), "Pedir alterações")}
          <p ${P_NOTA}>Por segurança, estes links são pessoais e válidos durante ${validadeDias} dias. Não os partilhe. Também pode rever o texto na sua área de cliente, se tiver conta.</p>
          <p ${P_NOTA}>Se não reconhece este pedido, ignore este e-mail ou escreva para <a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>.</p>`,
  });
}

/** Aviso interno à equipa: pedido de alterações (sem o conteúdo do pedido — está no backoffice). */
export function montarHtmlAvisoAlteracoes({ urlCaso, versao }: { urlCaso: string; versao: number | null }) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
<p>O cliente pediu alterações ao texto${versao ? ` (versão ${versao})` : ""}.</p>
<p><a href="${escaparHtml(urlCaso)}">Abrir o caso no backoffice</a></p>
</body></html>`;
}
