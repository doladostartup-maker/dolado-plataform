import type { Traducao } from "../../dicionario.ts";
import type { conta as pt } from "../pt-PT/conta.ts";

export const conta: Traducao<typeof pt> = {
  moldura: {
    termos: "Terms and Conditions",
    privacidade: "Privacy Policy",
    livroReclamacoes: "Complaints Book",
    livreResolucao: "Right of withdrawal",
  },
  entrar: {
    contexto: "Customer account",
    titulo: "Sign in to your account",
    descricao: "Follow your cases, what DoLado is doing for you and your Protection.",
    temProblema: "Got a problem to sort out? <tratar>Start here</tratar>",
    iniciarSessao: "Sign in",
    criarConta: "Create account",
  },
  login: {
    titulo: "Sign in",
    naoTemConta: "Don't have an account? <registo>Sign up</registo> · To have a case handled, <tratar>start here</tratar>",
    email: "Email",
    palavraPasse: "Password",
    esqueceu: "Forgotten your password?",
    entrar: "Sign in",
    google: "Sign in with Google",
  },
  separadorOu: "or",
  registo: {
    titulo: "Create account",
    jaTemConta: "Already have an account? <login>Sign in</login>",
    nome: "Name",
    email: "Email",
    palavraPasse: "Password",
    criar: "Create account",
  },
  confirmarEmail: {
    metadados: "Confirm your email — DoLado",
    contexto: "Account created",
    titulo: "Confirm your email",
    texto:
      "We have sent you a message. To continue, open the email and click <b>Confirm my email</b>, ideally on this same device and browser: you will carry on exactly where you left off.",
    spam: "Can't find the message? Check your spam or promotions folder.",
    jaConfirmei: "I've confirmed — sign in",
  },
  aSuaConta: {
    titulo: "Your account",
    email: "Email",
    nome: "Name",
    perfil: "Role",
    perfis: { cliente: "customer", admin: "admin" },
    backoffice: "Go to the back office",
    verCasos: "See my cases",
    terminarSessao: "Sign out",
  },
  recuperar: {
    metadados: "Reset your password — DoLado",
    tituloEnviado: "Check your email",
    titulo: "Reset your password",
    descricao: "Enter the email address for your account. We will send you a link to set a new password.",
    lembrou: "Remembered your password? <login>Sign in</login>",
    explicacao:
      "The link is valid for a limited time and can only be used once. The email may take a few minutes to arrive; please also check your spam or promotions folder. Each new request cancels the previous link: always use the one from the most recent email.",
    pedirNova: "Request a new link",
    email: "Email",
    enviar: "Send link",
  },
  redefinir: {
    metadados: "Set a new password — DoLado",
    titulo: "Set a new password",
    descricao: "Choose a new password for your DoLado account.",
    pedirNova: "Request a new link",
    nova: "New password",
    confirmar: "Confirm your new password",
    guardar: "Save new password",
    depois: "Once saved, you can sign in with your new password.",
    voltarLogin: "Back to sign in",
    requisitos: "At least 8 characters, with letters and numbers.",
    ligacao: {
      expirada: {
        titulo: "This link has expired or is no longer valid.",
        texto:
          "For security, each link can only be used once and is valid for a limited time. If you requested more than one, only the link in the most recent email works. Please request a new link.",
      },
      invalida: {
        titulo: "This link is not valid.",
        texto: "Open the link in the most recent email we sent you, or request a new link.",
      },
    },
  },
  criarConta: {
    pagamentoRecebido: "Payment received",
    associarTitulo: "Link your purchase",
    iniciarSessao: "Sign in",
    pagamentoConfirmado: "Payment confirmed",
    pagamentoEmConfirmacao: "Payment being confirmed",
    titulo: "Create your account",
    sepa:
      "Some payment methods, such as SEPA Direct Debit, can take a few working days to be confirmed. You can create your account now and you don't need to pay again: as soon as the payment is confirmed, access is activated automatically and we will let you know by email.",
    nome: "Name",
    email: "Email",
    palavraPasse: "Password",
    criar: "Create account and go to the portal",
  },
  associar: {
    metadados: "Link purchase — DoLado",
    contexto: "Your purchase",
    titulo: "Link the purchase to your account",
    irPortal: "Go to the portal",
    ajuda: "Need help?",
    texto:
      "This purchase was paid with the email address <b>{email}</b>, the same as your account. When you confirm, the purchase will be linked to this account.",
    botao: "Link this purchase to my account",
  },
  mensagens: {
    "E-mail ou palavra-passe incorretos.": "Incorrect email or password.",
    "Confirme o seu e-mail antes de entrar. Procure a mensagem que lhe enviámos na sua caixa de correio.":
      "Please confirm your email before signing in. Look for the message we sent to your inbox.",
    "Já existe uma conta com este e-mail. Inicie sessão com esse e-mail.":
      "There is already an account with this email. Please sign in with that email.",
    "A nova palavra-passe tem de ser diferente da atual.": "Your new password must be different from your current one.",
    "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.":
      "The password doesn't meet the requirements. Use at least 8 characters, with letters and numbers.",
    "Insira um e-mail válido.": "Please enter a valid email address.",
    "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.":
      "Too many attempts. Please wait a few minutes and try again.",
    "Não foi possível concluir. Tente novamente.": "We couldn't complete that. Please try again.",
    "Não foi possível concluir o pedido. Tente novamente dentro de alguns minutos.":
      "We couldn't complete your request. Please try again in a few minutes.",
    "Se existir uma conta associada a este endereço, receberá um e-mail com instruções para definir uma nova palavra-passe.":
      "If there is an account linked to this address, you will receive an email with instructions to set a new password.",
    "Já pediu uma ligação para este endereço há menos de um minuto. Use a ligação desse e-mail ou aguarde um minuto antes de pedir outra.":
      "You requested a link for this address less than a minute ago. Use the link in that email or wait a minute before requesting another.",
    "A sua palavra-passe foi alterada. Inicie sessão com a nova palavra-passe.":
      "Your password has been changed. Please sign in with your new password.",
    "Introduza a nova palavra-passe.": "Please enter your new password.",
    "A palavra-passe tem de ter pelo menos 8 caracteres.": "The password must be at least 8 characters long.",
    "A palavra-passe é demasiado longa. Use no máximo 72 caracteres.":
      "The password is too long. Use no more than 72 characters.",
    "A palavra-passe tem de ter letras e números.": "The password must contain letters and numbers.",
    "As palavras-passe não coincidem.": "The passwords don't match.",
    "Se acabou de confirmar o seu e-mail, inicie sessão para continuar.":
      "If you have just confirmed your email, please sign in to continue.",
    "Não foi possível iniciar sessão.": "We couldn't sign you in.",
    "Erro ao iniciar sessão com Google.": "Something went wrong signing in with Google.",
    "Esta compra já tem uma conta associada. Inicie sessão.": "This purchase is already linked to an account. Please sign in.",
    "Não foi possível criar a conta.": "We couldn't create the account.",
    "Já existe uma conta com este e-mail. Inicie sessão para associar esta compra.":
      "There is already an account with this email. Please sign in to link this purchase.",
    "Não foi possível associar a compra. Tente novamente dentro de alguns minutos.":
      "We couldn't link the purchase. Please try again in a few minutes.",
    "A compra foi associada à sua conta.": "The purchase has been linked to your account.",
    "Esta compra já está associada à sua conta.": "This purchase is already linked to your account.",
    "A sua conta já tem uma subscrição ativa, por isso esta compra não foi somada à conta. A DoLado vai analisar a situação e responder-lhe por e-mail no prazo máximo de 48 horas úteis.":
      "Your account already has an active subscription, so this purchase has not been added to it. DoLado will look into the situation and reply to you by email within 48 working hours at the latest.",
    "Esta compra já está em análise pela DoLado. A DoLado responde-lhe por e-mail no prazo máximo de 48 horas úteis.":
      "DoLado is already looking into this purchase. DoLado will reply to you by email within 48 working hours at the latest.",
    "Esta compra já está associada a outra conta. Se precisar de ajuda, contacte-nos.":
      "This purchase is already linked to another account. If you need help, please contact us.",
    "Ainda estamos a confirmar este pagamento. Tente novamente dentro de alguns minutos.":
      "We are still confirming this payment. Please try again in a few minutes.",
    "O pagamento desta compra ainda não está confirmado. Assim que for confirmado, pode associá-la à sua conta.":
      "Payment for this purchase hasn't been confirmed yet. As soon as it is, you can link it to your account.",
    "Confirme primeiro o e-mail da sua conta e depois volte a esta página.":
      "Please confirm your account's email first and then come back to this page.",
    "O e-mail da sua conta não é o e-mail usado no pagamento. Inicie sessão com a conta que usa o mesmo e-mail.":
      "Your account's email is not the one used for the payment. Please sign in with the account that uses the same email.",
    "Não foi possível confirmar os dados desta compra. Contacte-nos para a associarmos.":
      "We couldn't verify the details of this purchase. Please contact us so we can link it.",
    "Inicie sessão para associar esta compra.": "Please sign in to link this purchase.",
    "Não encontrámos esta compra.": "We couldn't find this purchase.",
    "Esta compra já pertence a uma conta. Inicie sessão para a ver no portal.":
      "This purchase already belongs to an account. Please sign in to see it in the portal.",
  },
};
