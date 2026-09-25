const NOME_PLANO: Record<"avulso" | "assinatura", string> = {
  avulso: "Avulso",
  assinatura: "Assinatura Mensal",
};

export function montarHtmlBoasVindasPagamento(plano: "avulso" | "assinatura") {
  const nomePlano = NOME_PLANO[plano];

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pagamento confirmado — DoLado</title>
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
              <p style="margin:0 0 16px 0;">Olá,</p>
              <p style="margin:0 0 16px 0;">O seu pagamento do plano <strong>${nomePlano}</strong> foi confirmado. Obrigado por confiar na DoLado.</p>
              <p style="margin:0 0 16px 0;">Falta só um passo: crie a sua palavra-passe para aceder ao portal e abrir o seu caso.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
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

export function montarHtmlNotificacaoNovoPagamento(email: string, plano: "avulso" | "assinatura") {
  const nomePlano = NOME_PLANO[plano];

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
  <p>Novo pagamento recebido.</p>
  <p><strong>E-mail:</strong> ${email}<br>
  <strong>Plano:</strong> ${nomePlano}</p>
</body>
</html>`;
}
