// E-mail do Aviso Sectorial (backoffice → clientes com Proteção que
// subscreveram o setor). Nome do cliente, título e descrição são texto:
// passam sempre por escape. Extensões .ts explícitas: testado com `node --test`.
import { LIGACAO_EMAIL, P_EMAIL, caixaEmail, emailV2 } from "./molduraEmail.ts";
import { escaparHtml } from "./textoRevisao.ts";

export function montarHtmlAvisoSetorial(nome: string, setor: string, titulo: string, descricao: string) {
  return emailV2({
    titulo: "Aviso sobre o seu setor — DoLado",
    corpo: `<p ${P_EMAIL}>Olá ${escaparHtml(nome)},</p>
              <p ${P_EMAIL}>Publicámos um aviso sobre ${escaparHtml(setor)}:</p>
              ${caixaEmail(`<p style="margin:0 0 8px 0; font-weight:700;">${escaparHtml(titulo)}</p>
                    <p style="margin:0;">${escaparHtml(descricao).replace(/\r\n|\r|\n/g, "<br>")}</p>`)}
              <p ${P_EMAIL}>Se tiver perguntas, responda a este e-mail ou visite <a href="https://www.dolado.pt/contacto" ${LIGACAO_EMAIL}>dolado.pt/contacto</a>.</p>`,
    assinatura: "equipa",
  });
}
