// E-mail ao cliente quando a DoLado comunica uma situação detetada nas
// faturas (Monitor de Proteção), depois de revista por uma pessoa.
// Extensões .ts explícitas: testado com `node --test`.
//
// Linguagem: "merece ser verificada" — nunca uma conclusão sobre a lei ou o
// contrato. O texto vem do backoffice e é tratado como texto (escape).
import { CONTACTO_EMAIL } from "../site.ts";
import { escaparHtml } from "./textoRevisao.ts";
import { LIGACAO_EMAIL, P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";

export const ASSUNTO_ACHADO_MONITOR = "Detetámos uma alteração na sua fatura que merece ser verificada";

export function montarHtmlAchadoMonitor({ fornecedor, texto, url }: { fornecedor: string | null; texto: string; url: string }) {
  const P = P_EMAIL;
  const sobre = fornecedor ? ` do seu contrato com <strong>${escaparHtml(fornecedor)}</strong>` : "";
  const paragrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p ${P}>${escaparHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return emailV2({
    titulo: ASSUNTO_ACHADO_MONITOR,
    corpo: `<p ${P}>Olá,</p>
          <p ${P}>Ao comparar as faturas${sobre}, detetámos uma alteração que merece ser verificada:</p>
          ${paragrafos}
          ${botaoEmail(escaparHtml(url), "Ver no portal")}
          <p ${P_NOTA}>Se quiser que a DoLado trate do assunto junto do fornecedor, pode pedir no portal em "Tratar o meu caso". Para qualquer dúvida, escreva para <a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>.</p>`,
  });
}
