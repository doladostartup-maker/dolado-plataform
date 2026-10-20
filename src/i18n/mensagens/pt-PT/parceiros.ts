// Programa de Parceiros: página pública /parceiros, candidatura, campo
// "Código de parceiro" (registo e confirmação da compra) e e-mails aos
// candidatos e parceiros. Sem promessas de rendimento; as condições
// comerciais constam do acordo de parceria. Regras em src/lib/parceiros/.

export const parceiros = {
  pagina: {
    metadados: {
      titulo: "Programa de Parceiros",
      descricao:
        "Seja parceiro da DoLado: recomende a DoLado aos seus clientes ou ofereça a Protecção aos seus clientes e colaboradores, para os ajudar a prevenir e resolver problemas de consumo.",
    },
    eyebrow: "Programa de Parceiros",
    titulo: "Ajude as pessoas com quem trabalha a resolver problemas de consumo.",
    texto:
      "Para profissionais e empresas que estão perto dos consumidores — e que querem ter uma resposta quando uma factura, um contrato ou uma compra corre mal. A DoLado trata do problema; o parceiro aproxima a DoLado de quem precisa.",
    cta: "Candidatar-me",
    verModelos: "Ver as formas de colaborar",
    garantias: {
      titulo: "Em qualquer parceria",
      itens: [
        "A DoLado trata do problema do consumidor, do primeiro contacto ao desfecho.",
        "O parceiro nunca tem acesso a casos, facturas ou contratos de ninguém.",
        "As condições ficam num acordo escrito, antes de começar.",
      ],
    },
    modelosEyebrow: "Modelos de parceria",
    modelosTitulo: "Duas formas de colaborar",
    indicacao: {
      titulo: "Parceiro de Indicação",
      texto:
        "Recomenda a DoLado aos seus clientes ou apresenta-nos empresas interessadas. A DoLado trata de tudo o resto: contratação, cobrança, tratamento dos casos e acompanhamento.",
      itens: [
        "Ligação e código próprios para partilhar.",
        "Comissão por cada nova subscrição elegível, depois de confirmados os pagamentos do cliente.",
        "Não tem acesso aos casos, facturas ou contratos das pessoas que indicar.",
        "Cada comissão fica registada e é paga por transferência.",
      ],
    },
    distribuicao: {
      titulo: "Parceiro de Distribuição",
      texto:
        "A sua empresa oferece a Protecção da DoLado aos seus clientes ou colaboradores, como benefício — por exemplo, a quem acabou de comprar casa ou a toda a equipa.",
      itens: [
        "Acessos pré-pagos, com a duração acordada.",
        "Um código individual para entregar a cada pessoa.",
        "Sem cobrança automática a quem recebe o benefício, no fim da oferta.",
        "Relatórios só com números agregados — nunca dados pessoais.",
      ],
    },
    passosEyebrow: "Do contacto ao acordo",
    passosTitulo: "Como funciona",
    passos: [
      { titulo: "Candidata-se", texto: "Conte-nos quem é e como gostaria de colaborar." },
      { titulo: "Analisamos", texto: "Respondemos por e-mail no prazo máximo de 2 dias úteis." },
      { titulo: "Acordamos as condições", texto: "As condições de cada parceria constam de um acordo escrito." },
    ],
    nota:
      "Os contratos, as facturas e as datas são contexto: o que a DoLado faz é ajudar a prevenir, detectar e resolver o problema do consumidor. As condições comerciais são acordadas com cada parceiro; não há rendimentos garantidos.",
  },

  candidatura: {
    eyebrow: "Candidatura",
    titulo: "Conte-nos quem é",
    texto: "Leva poucos minutos. Respondemos por e-mail no prazo máximo de 2 dias úteis.",
    nome: "Nome",
    email: "E-mail",
    empresa: "Empresa (opcional)",
    tipo: "Que tipo de parceria procura?",
    tipos: {
      indicacao: "Parceiro de Indicação",
      distribuicao: "Parceiro de Distribuição",
      ambos: "As duas",
    },
    descricao: "Conte-nos um pouco sobre a sua actividade e o motivo do seu interesse",
    aceitar:
      "Li a informação sobre privacidade e aceito que a DoLado use estes dados para analisar a minha candidatura e entrar em contacto comigo sobre ela.",
    privacidade: "Política de Privacidade",
    botao: "Enviar candidatura",
    aEnviar: "A enviar…",
    enviada: {
      titulo: "Recebemos a sua candidatura.",
      texto: "Respondemos por e-mail no prazo máximo de 2 dias úteis.",
    },
    erros: {
      nome: "Indique o seu nome.",
      email: "Indique um e-mail válido.",
      tipo: "Escolha o tipo de parceria.",
      descricao: "Conte-nos um pouco mais (pelo menos 10 caracteres).",
      aceitar: "Para continuar, aceite o tratamento dos dados da candidatura.",
      limite: "Já recebemos várias candidaturas deste e-mail hoje. Tente novamente amanhã ou escreva-nos.",
      indisponivel: "As candidaturas não estão abertas de momento.",
      erro: "Não foi possível enviar a candidatura. Tente novamente dentro de alguns minutos.",
    },
  },

  codigo: {
    campo: "Código de parceiro (opcional)",
    ajuda: "Se um parceiro da DoLado lhe deu um código, escreva-o aqui.",
    invalido: "Este código de parceiro não é válido. Confirme-o ou deixe o campo vazio.",
  },

  emails: {
    recebida: {
      assunto: "Recebemos a sua candidatura ao Programa de Parceiros",
      titulo: "Recebemos a sua candidatura",
      texto: "Obrigado pelo seu interesse no Programa de Parceiros da DoLado.",
      prazo: "Vamos analisá-la e respondemos por e-mail no prazo máximo de 2 dias úteis.",
    },
    aprovada: {
      assunto: "A sua candidatura ao Programa de Parceiros foi aprovada",
      titulo: "Boas-vindas ao Programa de Parceiros",
      texto: "A sua candidatura foi aprovada.",
      codigo: (codigo: string) => `O seu código de parceiro é ${codigo}.`,
      ligacao: "Pode partilhar esta ligação com quem quiser recomendar a DoLado:",
      comoFunciona:
        "Quem chegar pela sua ligação, ou escrever o seu código ao criar conta ou antes de pagar, fica associado a si. Não tem acesso aos casos, facturas nem contratos dessas pessoas.",
      condicoes: "As condições comerciais constam do acordo de parceria. Se tiver dúvidas, responda a este e-mail.",
      distribuicao: "Vamos entrar em contacto consigo para acordar os pacotes de Protecção para os seus clientes ou colaboradores.",
    },
    pagamento: {
      assunto: "Registámos o pagamento das suas comissões",
      titulo: "Pagamento de comissões",
      texto: (comissoes: number) =>
        comissoes === 1 ? "Registámos o pagamento de 1 comissão." : `Registámos o pagamento de ${comissoes} comissões.`,
      valor: "Comissões (sem IVA)",
      iva: "IVA",
      transferido: "Valor transferido",
      referencia: "Referência",
      data: "Data",
    },
  },
};
