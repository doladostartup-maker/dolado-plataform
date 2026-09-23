export function montarHtmlBoasVindas(nome: string) {
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recebemos a sua submissão — DoLado</title>
</head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family: 'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <span style="font-family:'Inter', Arial, Helvetica, sans-serif; font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 8px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá ${nome},</p>
              <p style="margin:0 0 16px 0;">Obrigado por confiar na DoLado com a sua reclamação.</p>
              <p style="margin:0 0 16px 0;">Já recebemos a sua submissão e está aqui comigo para ser tratada pessoalmente. Não é um formulário que desaparece numa caixa infinita. Eu vou rever o seu caso, contactar o operador com a sua autorização e acompanhar até à resolução.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFEDE7; border-left:3px solid #0E6B5C; border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:14px; line-height:1.6;">
                    <p style="margin:0 0 8px 0; font-weight:600; font-size:14px;">O que acontece agora:</p>
                    <p style="margin:0 0 4px 0;">1. Leio os detalhes que forneceu</p>
                    <p style="margin:0 0 4px 0;">2. Contacto-o(a) nos próximos dias para confirmar tudo</p>
                    <p style="margin:0 0 4px 0;">3. Contacto o operador e faço a fundamentação necessária</p>
                    <p style="margin:0;">4. Acompanho até ao final</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 8px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 8px 0; font-weight:600;">O que preciso de si:</p>
              <p style="margin:0 0 4px 0; color:#5B6270; font-size:15px;">Quando eu contactar, tenha à mão:</p>
              <p style="margin:0 0 4px 0; color:#5B6270; font-size:15px;">— Fatura ou comprovativo do problema</p>
              <p style="margin:0 0 4px 0; color:#5B6270; font-size:15px;">— Qualquer e-mail/SMS da empresa em questão</p>
              <p style="margin:0; color:#5B6270; font-size:15px;">— Disponibilidade para uma breve chamada (5-10 minutos), caso ainda falte esclarecer algum ponto para além do que já enviou</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Espere por um contacto meu nos próximos 1-2 dias úteis. Se tiver dúvidas entretanto, responda a este e-mail.</p>
              <p style="margin:0 0 4px 0;">Estamos juntos nisto.</p>
              <p style="margin:0; font-weight:600;">Thiago<br><span style="font-weight:400; color:#5B6270; font-size:14px;">DoLado</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color:#EFEDE7; font-family:'Inter', Arial, Helvetica, sans-serif; font-size:13px; color:#5B6270;">
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
