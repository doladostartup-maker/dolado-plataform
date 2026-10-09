// Páginas de conta (MolduraConta): entrar, iniciar sessão, registo,
// confirmação do e-mail, recuperar/redefinir a palavra-passe, criar conta
// depois do pagamento, associar compra e "A sua conta".
//
// `mensagens`: tradução das mensagens que as regras sem I/O (src/lib)
// devolvem em português (erros da Supabase Auth, recuperação da palavra-passe,
// associação de compras). A chave é o texto português exato; mensagem
// desconhecida → mostra-se como veio.

import { MSG_ERRO_GUARDAR } from "../../../lib/mensagensErro.ts";

export const conta = {
  moldura: {
    termos: "Termos e Condições",
    privacidade: "Política de Privacidade",
    livroReclamacoes: "Livro de Reclamações",
    livreResolucao: "Livre resolução",
  },
  entrar: {
    contexto: "Área de cliente",
    titulo: "Entre na sua conta",
    descricao: "Acompanhe os seus casos, o que a DoLado está a fazer por si e a sua Proteção.",
    temProblema: "Tem um problema para tratar? <tratar>Comece aqui</tratar>",
    iniciarSessao: "Iniciar sessão",
    criarConta: "Criar conta",
  },
  login: {
    titulo: "Iniciar sessão",
    naoTemConta: "Não tem conta? <registo>Registe-se</registo> · Para tratar um caso, <tratar>comece aqui</tratar>",
    email: "E-mail",
    palavraPasse: "Palavra-passe",
    esqueceu: "Esqueceu-se da palavra-passe?",
    entrar: "Entrar",
    google: "Entrar com Google",
  },
  separadorOu: "ou",
  registo: {
    titulo: "Criar conta",
    jaTemConta: "Já tem conta? <login>Entre</login>",
    nome: "Nome",
    email: "E-mail",
    palavraPasse: "Palavra-passe",
    criar: "Criar conta",
  },
  confirmarEmail: {
    metadados: "Confirme o seu e-mail — DoLado",
    contexto: "Conta criada",
    titulo: "Confirme o seu e-mail",
    texto:
      "Enviámos-lhe uma mensagem. Para continuar, abra o e-mail e carregue em <b>Confirmar o meu e-mail</b>, de preferência neste mesmo dispositivo e navegador: continua exatamente onde estava.",
    spam: "Não encontra a mensagem? Verifique a pasta de spam ou de promoções.",
    jaConfirmei: "Já confirmei — iniciar sessão",
  },
  aSuaConta: {
    titulo: "A sua conta",
    email: "E-mail",
    nome: "Nome",
    perfil: "Perfil",
    perfis: { cliente: "cliente", admin: "admin" },
    backoffice: "Ir para o backoffice",
    verCasos: "Ver os meus casos",
    terminarSessao: "Terminar sessão",
  },
  recuperar: {
    metadados: "Recuperar a palavra-passe — DoLado",
    tituloEnviado: "Verifique o seu e-mail",
    titulo: "Recuperar a palavra-passe",
    descricao: "Indique o e-mail da sua conta. Enviamos-lhe uma ligação para definir uma nova palavra-passe.",
    lembrou: "Lembrou-se da palavra-passe? <login>Iniciar sessão</login>",
    explicacao:
      "A ligação é válida durante um período limitado e só pode ser usada uma vez. O e-mail pode demorar alguns minutos a chegar; verifique também a pasta de spam ou de promoções. Cada novo pedido anula a ligação anterior: use sempre a do e-mail mais recente.",
    pedirNova: "Pedir nova ligação",
    email: "E-mail",
    enviar: "Enviar ligação",
  },
  redefinir: {
    metadados: "Definir nova palavra-passe — DoLado",
    titulo: "Definir nova palavra-passe",
    descricao: "Escolha uma nova palavra-passe para a sua conta na DoLado.",
    pedirNova: "Pedir nova ligação",
    nova: "Nova palavra-passe",
    confirmar: "Confirmar a nova palavra-passe",
    guardar: "Guardar nova palavra-passe",
    depois: "Depois de guardar, pode iniciar sessão com a nova palavra-passe.",
    voltarLogin: "Voltar ao início de sessão",
    requisitos: "Pelo menos 8 caracteres, com letras e números.",
    ligacao: {
      expirada: {
        titulo: "Esta ligação expirou ou já não é válida.",
        texto:
          "Por segurança, cada ligação só pode ser usada uma vez e é válida durante um período limitado. Se pediu mais do que uma, só a do e-mail mais recente funciona. Peça uma nova ligação.",
      },
      invalida: {
        titulo: "Esta ligação não é válida.",
        texto: "Abra a ligação do e-mail mais recente que lhe enviámos ou peça uma nova ligação.",
      },
    },
  },
  criarConta: {
    pagamentoRecebido: "Pagamento recebido",
    associarTitulo: "Associar a compra",
    iniciarSessao: "Iniciar sessão",
    pagamentoConfirmado: "Pagamento confirmado",
    pagamentoEmConfirmacao: "Pagamento em confirmação",
    titulo: "Criar a sua conta",
    sepa:
      "Alguns métodos de pagamento, como o débito direto SEPA, podem demorar alguns dias úteis a ser confirmados. Pode criar já a sua conta e não precisa de voltar a pagar: assim que o pagamento for confirmado, o acesso é ativado automaticamente e avisamos por e-mail.",
    nome: "Nome",
    email: "E-mail",
    palavraPasse: "Palavra-passe",
    criar: "Criar conta e aceder ao portal",
  },
  associar: {
    metadados: "Associar compra — DoLado",
    contexto: "A sua compra",
    titulo: "Associar a compra à sua conta",
    irPortal: "Ir para o portal",
    ajuda: "Precisa de ajuda?",
    texto:
      "Esta compra foi paga com o e-mail <b>{email}</b>, o mesmo da sua conta. Ao confirmar, a compra passa a estar associada a esta conta.",
    botao: "Associar esta compra à minha conta",
  },
  mensagens: {
    "E-mail ou palavra-passe incorretos.": "E-mail ou palavra-passe incorretos.",
    "Confirme o seu e-mail antes de entrar. Procure a mensagem que lhe enviámos na sua caixa de correio.":
      "Confirme o seu e-mail antes de entrar. Procure a mensagem que lhe enviámos na sua caixa de correio.",
    "Já existe uma conta com este e-mail. Inicie sessão com esse e-mail.":
      "Já existe uma conta com este e-mail. Inicie sessão com esse e-mail.",
    "A nova palavra-passe tem de ser diferente da atual.": "A nova palavra-passe tem de ser diferente da atual.",
    "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.":
      "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.",
    "Insira um e-mail válido.": "Insira um e-mail válido.",
    "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.":
      "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.",
    "Não foi possível concluir. Tente novamente.": "Não foi possível concluir. Tente novamente.",
    [MSG_ERRO_GUARDAR]: MSG_ERRO_GUARDAR,
    "Se existir uma conta associada a este endereço, receberá um e-mail com instruções para definir uma nova palavra-passe.":
      "Se existir uma conta associada a este endereço, receberá um e-mail com instruções para definir uma nova palavra-passe.",
    "Já pediu uma ligação para este endereço há menos de um minuto. Use a ligação desse e-mail ou aguarde um minuto antes de pedir outra.":
      "Já pediu uma ligação para este endereço há menos de um minuto. Use a ligação desse e-mail ou aguarde um minuto antes de pedir outra.",
    "A sua palavra-passe foi alterada. Inicie sessão com a nova palavra-passe.":
      "A sua palavra-passe foi alterada. Inicie sessão com a nova palavra-passe.",
    "Introduza a nova palavra-passe.": "Introduza a nova palavra-passe.",
    "A palavra-passe tem de ter pelo menos 8 caracteres.": "A palavra-passe tem de ter pelo menos 8 caracteres.",
    "A palavra-passe é demasiado longa. Use no máximo 72 caracteres.":
      "A palavra-passe é demasiado longa. Use no máximo 72 caracteres.",
    "A palavra-passe tem de ter letras e números.": "A palavra-passe tem de ter letras e números.",
    "As palavras-passe não coincidem.": "As palavras-passe não coincidem.",
    "Se acabou de confirmar o seu e-mail, inicie sessão para continuar.":
      "Se acabou de confirmar o seu e-mail, inicie sessão para continuar.",
    "Não foi possível iniciar sessão.": "Não foi possível iniciar sessão.",
    "Erro ao iniciar sessão com Google.": "Erro ao iniciar sessão com Google.",
    "Esta compra já tem uma conta associada. Inicie sessão.": "Esta compra já tem uma conta associada. Inicie sessão.",
    "Não foi possível criar a conta.": "Não foi possível criar a conta.",
    "Já existe uma conta com este e-mail. Inicie sessão para associar esta compra.":
      "Já existe uma conta com este e-mail. Inicie sessão para associar esta compra.",
    "Não foi possível associar a compra. Tente novamente dentro de alguns minutos.":
      "Não foi possível associar a compra. Tente novamente dentro de alguns minutos.",
    "A compra foi associada à sua conta.": "A compra foi associada à sua conta.",
    "Esta compra já está associada à sua conta.": "Esta compra já está associada à sua conta.",
    "A sua conta já tem uma subscrição ativa, por isso esta compra não foi somada à conta. A DoLado vai analisar a situação e responder-lhe por e-mail no prazo máximo de 48 horas úteis.":
      "A sua conta já tem uma subscrição ativa, por isso esta compra não foi somada à conta. A DoLado vai analisar a situação e responder-lhe por e-mail no prazo máximo de 48 horas úteis.",
    "Esta compra já está em análise pela DoLado. A DoLado responde-lhe por e-mail no prazo máximo de 48 horas úteis.":
      "Esta compra já está em análise pela DoLado. A DoLado responde-lhe por e-mail no prazo máximo de 48 horas úteis.",
    "Esta compra já está associada a outra conta. Se precisar de ajuda, contacte-nos.":
      "Esta compra já está associada a outra conta. Se precisar de ajuda, contacte-nos.",
    "Ainda estamos a confirmar este pagamento. Tente novamente dentro de alguns minutos.":
      "Ainda estamos a confirmar este pagamento. Tente novamente dentro de alguns minutos.",
    "O pagamento desta compra ainda não está confirmado. Assim que for confirmado, pode associá-la à sua conta.":
      "O pagamento desta compra ainda não está confirmado. Assim que for confirmado, pode associá-la à sua conta.",
    "Confirme primeiro o e-mail da sua conta e depois volte a esta página.":
      "Confirme primeiro o e-mail da sua conta e depois volte a esta página.",
    "O e-mail da sua conta não é o e-mail usado no pagamento. Inicie sessão com a conta que usa o mesmo e-mail.":
      "O e-mail da sua conta não é o e-mail usado no pagamento. Inicie sessão com a conta que usa o mesmo e-mail.",
    "Não foi possível confirmar os dados desta compra. Contacte-nos para a associarmos.":
      "Não foi possível confirmar os dados desta compra. Contacte-nos para a associarmos.",
    "Inicie sessão para associar esta compra.": "Inicie sessão para associar esta compra.",
    "Não encontrámos esta compra.": "Não encontrámos esta compra.",
    "Esta compra já pertence a uma conta. Inicie sessão para a ver no portal.":
      "Esta compra já pertence a uma conta. Inicie sessão para a ver no portal.",
  },
};
