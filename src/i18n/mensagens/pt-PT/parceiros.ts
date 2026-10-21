// Programa de Parceiros: página pública /parceiros, candidatura, campo
// "Código de parceiro" (registo e confirmação da compra) e e-mails aos
// candidatos e parceiros. Sem promessas de rendimento; as condições
// comerciais constam do acordo de parceria. Regras em src/lib/parceiros/.

export const parceiros = {
  pagina: {
    metadados: {
      titulo: "Programa de Parceiros: indicar clientes e distribuir a Protecção | DoLado",
      descricao:
        "Indique clientes à DoLado ou distribua a Protecção DoLado através da sua actividade. As condições de cada parceria constam de um acordo escrito. Proponha uma parceria.",
    },
    eyebrow: "Programa de Parceiros",
    titulo: "Ajude as pessoas com quem trabalha a resolver problemas de consumo.",
    texto:
      "Para profissionais e empresas que estão perto dos consumidores — e que querem ter uma resposta quando uma factura, um contrato ou uma compra corre mal. A DoLado trata do problema; o parceiro aproxima a DoLado de quem precisa.",
    cta: "Propor parceria",
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
    modelosTexto:
      "O serviço é o mesmo: a DoLado trata o problema do consumidor e a Protecção acompanha as facturas e as datas dos contratos. Muda só a forma de o levar a quem precisa.",
    indicacao: {
      titulo: "Parceiro de Indicação",
      texto:
        "Recomenda a DoLado aos seus clientes ou apresenta-nos empresas interessadas. A DoLado trata de tudo o resto: contratação, cobrança, tratamento dos casos e acompanhamento.",
      itens: [
        "Ligação e código próprios para partilhar.",
        "Comissão nos termos do acordo de parceria, só depois de confirmados os pagamentos do cliente.",
        "Não tem acesso aos casos, facturas ou contratos das pessoas que indicar.",
        "Cada comissão fica registada e é paga como previsto no acordo.",
      ],
    },
    distribuicao: {
      titulo: "Parceiro de Distribuição",
      texto:
        "Leva a Protecção DoLado a quem acompanha na sua actividade: adquire acessos pré-pagos e entrega um código a cada pessoa — por exemplo, a quem acabou de comprar casa consigo.",
      itens: [
        "Acessos pré-pagos, com a duração acordada.",
        "Um código individual para entregar a cada pessoa.",
        "Sem cobrança automática a quem recebe o benefício, no fim da oferta.",
        "Relatórios só com números agregados — nunca dados pessoais.",
      ],
    },
    // Ligação para /empresas.
    empresas: {
      texto: "Pretende disponibilizar a DoLado como benefício aos seus colaboradores ou clientes?",
      ligacao: "Conheça as nossas soluções para empresas.",
    },
    sectorImobiliario: {
      texto: "Trabalha no sector imobiliário?",
      ligacao: "Veja como pode recomendar a DoLado aos seus clientes.",
    },
    passosEyebrow: "Do contacto ao acordo",
    passosTitulo: "Como funciona",
    passos: [
      { titulo: "Propõe a parceria", texto: "Conte-nos quem é e como gostaria de colaborar." },
      { titulo: "Analisamos", texto: "Respondemos por e-mail no prazo máximo de 2 dias úteis." },
      { titulo: "Acordamos as condições", texto: "As condições de cada parceria constam de um acordo escrito." },
    ],
    nota:
      "Os contratos, as facturas e as datas são contexto: o que a DoLado faz é ajudar a prevenir, detectar e resolver o problema do consumidor. As condições comerciais são acordadas com cada parceiro; não há rendimentos garantidos.",
  },

  imobiliario: {
    metadados: {
      titulo: "Parceiros do sector imobiliário: recomende a DoLado aos seus clientes | DoLado",
      descricao:
        "Para consultores e agências imobiliárias: recomende a DoLado a quem muda de casa e ajude a resolver problemas com telecomunicações, luz, gás e água.",
    },
    eyebrow: "Parceiros · Imobiliário",
    titulo: "Cuide dos seus clientes, mesmo depois da entrega das chaves.",
    texto:
      "Recomende a DoLado aos seus clientes e ajude-os a resolver problemas com serviços essenciais e a evitar surpresas nas facturas e nos contratos. Por cada novo cliente elegível, recebe uma comissão.",
    cta: "Propor parceria",
    verComoFunciona: "Como funciona",
    quemSomos: {
      titulo: "O que é a DoLado",
      texto:
        "A DoLado é uma empresa de bem-estar financeiro especializada no apoio ao consumidor. Trata reclamações com operadoras de telecomunicações, electricidade, gás e água, cobranças indevidas, cancelamentos e reembolsos — e acompanha as facturas e as datas dos contratos para detectar um problema antes de ele crescer.",
    },
    situacoesEyebrow: "Depois da mudança",
    situacoesTitulo: "Situações em que a sua recomendação ajuda",
    situacoesTexto: "Uma mudança de casa mexe em vários contratos ao mesmo tempo. É nessas semanas que aparecem muitos problemas.",
    situacoes: [
      {
        titulo: "A casa antiga continua a ser cobrada",
        texto: "O cliente pediu o cancelamento, mas a operadora continua a enviar facturas da morada antiga.",
      },
      {
        titulo: "Uma penalização por sair antes do tempo",
        texto: "A operadora pede um valor para cancelar por causa da mudança, e o cliente não sabe se está certo.",
      },
      {
        titulo: "A primeira factura da casa nova",
        texto: "A factura de electricidade, gás ou água chega muito acima do esperado, ou com consumos estimados.",
      },
      {
        titulo: "Uma promoção que termina",
        texto: "Meses depois da mudança, o preço sobe porque uma promoção chegou ao fim sem que o cliente desse por isso.",
      },
    ],
    servicosEyebrow: "O que pode recomendar",
    servicosTitulo: "Qualquer serviço da DoLado",
    servicosTexto: "A pessoa conhece todos os serviços e escolhe o que lhe faz falta. Não precisa de escolher por ela.",
    servicos: [
      {
        titulo: "Tratar um caso",
        texto: "Quando já existe um problema: a DoLado prepara a reclamação, envia-a e acompanha-a até haver um desfecho.",
      },
      {
        titulo: "Protecção",
        texto: "Para prevenir: a DoLado acompanha as facturas e as datas dos contratos e avisa quando algo muda ou está a chegar ao fim.",
      },
      {
        titulo: "Caso + Protecção",
        texto: "As duas coisas juntas: acompanhamento contínuo e um caso tratado por mês.",
      },
    ],
    verPrecario: "Ver serviços e preços",
    passosEyebrow: "A parceria",
    passosTitulo: "Como funciona",
    passos: [
      { titulo: "Propõe a parceria", texto: "Preencha o formulário. Respondemos por e-mail no prazo máximo de 2 dias úteis." },
      { titulo: "Acordamos as condições", texto: "As condições ficam num acordo escrito, antes de começar." },
      { titulo: "Recebe a sua ligação", texto: "Uma ligação e um código só seus, para partilhar com quem precisa." },
      { titulo: "Acompanha os resultados", texto: "Na área de parceiro vê quantas pessoas chegaram por si e o estado das comissões." },
    ],
    comissoesEyebrow: "Comissões",
    comissoesTitulo: "Como são calculadas e pagas",
    comissoes: [
      "Recebe uma comissão por cada novo cliente que subscreva a Protecção ou o Caso + Protecção pela sua recomendação.",
      "A comissão fica elegível quando a primeira subscrição do cliente tem as mensalidades pagas previstas no acordo. Períodos gratuitos não contam.",
      "Uma comissão por cliente, mesmo que ele compre outros serviços ou mude de plano. O Caso Avulso não dá comissão.",
      "Se a subscrição terminar antes do prazo, ou o pagamento for reembolsado, a comissão é anulada.",
      "A DoLado aprova as comissões e paga por transferência. Os valores constam do acordo de parceria.",
    ],
    comissoesNota:
      "O cliente paga o preço normal e não tem desconto. Ao recomendar, diga que é parceiro da DoLado e que recebe uma comissão.",
    perguntasEyebrow: "Perguntas frequentes",
    perguntasTitulo: "Antes de propor a parceria",
    perguntas: [
      {
        id: "ver-casos",
        pergunta: "Vou ver os casos ou as facturas dos meus clientes?",
        resposta:
          "Não. Na área de parceiro vê só números: quantas pessoas chegaram por si e o estado das comissões. Nunca nomes, casos, facturas nem contratos.",
      },
      {
        id: "desconto",
        pergunta: "O meu cliente tem desconto?",
        resposta: "Não. Quem chega pela sua recomendação paga o preço normal. A comissão é paga pela DoLado e não é cobrada ao cliente.",
      },
      {
        id: "como-recomendar",
        pergunta: "Como devo recomendar a DoLado?",
        resposta:
          "Pessoalmente, a quem conhece e pode precisar. Não envie mensagens em massa nem use listas de contactos sem autorização, e diga sempre que recebe uma comissão.",
      },
      {
        id: "conta",
        pergunta: "Preciso de uma conta na DoLado?",
        resposta: "Sim, para entrar na área de parceiro. A conta é gratuita e não o obriga a comprar nenhum serviço.",
      },
      {
        id: "quanto",
        pergunta: "Quanto vou receber?",
        resposta: "Os valores e as condições constam do acordo de parceria. Não há rendimentos garantidos: depende de quem escolhe a DoLado.",
      },
    ],
    ctaFinalTitulo: "Quer recomendar a DoLado aos seus clientes?",
    ctaFinalTexto: "Conte-nos quem é. Respondemos no prazo máximo de 2 dias úteis.",
  },

  candidatura: {
    eyebrow: "Propor parceria",
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
    resumo: "Tem um código de parceiro?",
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
    acessoArea: {
      assunto: "A sua área de parceiro na DoLado",
      titulo: "A sua área de parceiro",
      texto: "Já pode acompanhar as suas recomendações e comissões na área de parceiro.",
      entrar: "Inicie sessão com a conta deste e-mail e abra “Área de parceiro”:",
      privacidade: "Por privacidade, a área mostra só números: nunca nomes, contactos, casos, facturas nem contratos das pessoas que recomendou.",
    },
  },
};
