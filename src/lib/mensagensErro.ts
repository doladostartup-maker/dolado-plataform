// Mensagens de erro mostradas ao cliente. Os erros da Supabase (Auth e base
// de dados) vêm em inglês e com detalhes técnicos: nunca são mostrados tal
// como chegam — só uma destas mensagens, em português europeu.

/** Falha ao gravar/apagar dados do próprio cliente no portal. */
export const MSG_ERRO_GUARDAR = "Não foi possível concluir o pedido. Tente novamente dentro de alguns minutos.";

/** Erros da Supabase Auth no login, no registo e na alteração da palavra-passe. */
export function mensagemErroConta(codigo: string | undefined, mensagem: string | undefined) {
  const texto = mensagem ?? "";
  if (codigo === "invalid_credentials" || /invalid login credentials/i.test(texto)) {
    return "E-mail ou palavra-passe incorretos.";
  }
  if (codigo === "email_not_confirmed" || /email not confirmed/i.test(texto)) {
    return "Confirme o seu e-mail antes de entrar. Procure a mensagem que lhe enviámos na sua caixa de correio.";
  }
  if (codigo === "user_already_exists" || /already registered/i.test(texto)) {
    return "Já existe uma conta com este e-mail. Inicie sessão com esse e-mail.";
  }
  if (codigo === "same_password" || /different from the old password/i.test(texto)) {
    return "A nova palavra-passe tem de ser diferente da atual.";
  }
  if (codigo === "weak_password" || /password/i.test(texto)) {
    return "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.";
  }
  if (codigo === "validation_failed" || /invalid.*email|email.*invalid/i.test(texto)) {
    return "Insira um e-mail válido.";
  }
  if (codigo === "over_email_send_rate_limit" || codigo === "over_request_rate_limit" || /rate limit/i.test(texto)) {
    return "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}
