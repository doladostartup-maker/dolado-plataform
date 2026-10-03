// E-mails de lembrete de uma compra paga sem conta associada (1 e 3 dias).
// Só textos fixos, nomes de planos de planos.ts e uma ligação montada no
// servidor — nenhum texto do cliente entra no HTML.
// Extensões .ts explícitas: o módulo é testado diretamente com `node --test`.
import { PLANOS } from "../planos.ts";
import { CONTACTO_EMAIL } from "../site.ts";

export type MarcoLembrete = "1d" | "3d";

export function assuntoLembreteCompra(marco: MarcoLembrete) {
  return marco === "3d"
    ? "Último lembrete: conclua o acesso à sua compra na DoLado"
    : "Falta concluir o acesso à sua compra na DoLado";
}

export function montarHtmlLembreteCompra(dados: {
  plano: keyof typeof PLANOS;
  marco: MarcoLembrete;
  /** /associar-compra?session_id=… (já há conta com o e-mail) ou /criar-conta?session_id=… */
  ligacao: string;
  associarCompra: boolean;
}) {
  const nomePlano = PLANOS[dados.plano].nome;
  const passo = dados.associarCompra
    ? "Já existe uma conta na DoLado com este e-mail. Inicie sessão e associe esta compra à sua conta."
    : "Crie a sua conta para aceder ao portal e usar o que comprou.";
  const botao = dados.associarCompra ? "Associar a compra" : "Criar a minha conta";
  const ultimo =
    dados.marco === "3d"
      ? `<p style="margin:0 0 16px 0;">Este é o último lembrete. Se precisar de ajuda, contacte-nos em <a href="mailto:${CONTACTO_EMAIL}" style="color:#0E6B5C;">${CONTACTO_EMAIL}</a>.</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${assuntoLembreteCompra(dados.marco)}</title>
</head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family: 'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <span style="font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 24px 32px; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá,</p>
              <p style="margin:0 0 16px 0;">O pagamento da sua compra (${nomePlano}) foi confirmado, mas a compra ainda não está ligada a uma conta na DoLado.</p>
              <p style="margin:0 0 16px 0;">${passo}</p>
              <p style="margin:0 0 16px 0;"><a href="${dados.ligacao}" style="display:inline-block; background-color:#0E6B5C; color:#FFFFFF; text-decoration:none; font-weight:600; padding:10px 18px; border-radius:8px;">${botao}</a></p>
              ${ultimo}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color:#EFEDE7; font-size:13px; color:#5B6270;">
              <a href="https://www.dolado.pt" style="color:#0E6B5C; text-decoration:none;">www.dolado.pt</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
