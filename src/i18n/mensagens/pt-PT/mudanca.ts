// Guia público de Mudança de Casa (/mudanca-de-casa). Marcação nas listas:
// <b>…</b> (destaque), <calc>…</calc> (Calculadora de Cancelamento),
// <sim>…</sim> (Simulador de Elegibilidade).

export const mudanca = {
  metadados: {
    titulo: "Mudança de casa: o que precisa de tratar - DoLado",
    descricao:
      "Guia gratuito para mudar de casa: telecomunicações, eletricidade, gás e água. O que preparar, o que guardar, o que é o CPE e o CUI e o que verificar na última fatura.",
  },
  tratarCaso: "Tratar o meu caso",
  eyebrow: "Guia DoLado · grátis",
  titulo: "Mudança de casa: o que precisa de tratar",
  texto:
    "Mudar de casa implica tratar de vários contratos e serviços. Use este guia para perceber o que deve preparar, o que deve guardar e quando pode existir um problema que justifique uma reclamação.",
  nestaPagina: "Nesta página",
  indice: {
    antes: "Antes da mudança",
    diaDaSaida: "No dia da saída",
    casaNova: "Na casa nova",
    depois: "Depois da mudança",
    dolado: "Quando a DoLado pode ajudar",
    perguntas: "Perguntas frequentes",
  },
  antes: {
    intro: "Quanto mais cedo tratar destes pontos, menos surpresas terá na casa nova e na última fatura da casa antiga.",
    telecom: {
      titulo: "Telecomunicações (internet, televisão, telefone)",
      itens: [
        "Confirme se o seu operador tem cobertura na nova morada.",
        "Pergunte se o serviço atual pode ser transferido e em que condições.",
        "Veja até quando vai a fidelização: costuma aparecer na fatura mensal.",
        "Se pensa cancelar, peça ao operador o valor dos encargos. Pode também fazer uma estimativa na <calc>Calculadora de Cancelamento</calc>.",
        "Pergunte o que deve fazer aos equipamentos (router, box, cartões) e até quando.",
        "Peça as respostas por escrito e guarde-as.",
      ],
      cta: "Está a ter dificuldades com a transferência ou o cancelamento?",
    },
    eletricidade: {
      titulo: "Eletricidade",
      itens: [
        "Identifique o contrato atual: comercializador, titular e CPE (está na fatura).",
        "Decida a data de saída e informe o comercializador com antecedência.",
        "Perceba como vai ficar o contrato da casa nova: se a instalação já está ligada ou se precisa de ligação.",
        "Guarde as leituras e os comprovativos dos pedidos que fizer.",
      ],
    },
    gas: {
      titulo: "Gás",
      itens: [
        "Localize o CUI na fatura de gás.",
        "Prepare a leitura do contador para o dia da saída.",
        "Confirme a situação da instalação na casa nova: se tem gás natural, gás de garrafa ou nenhum.",
        "Guarde os documentos e os comprovativos dos pedidos.",
      ],
    },
    agua: {
      titulo: "Água",
      itens: [
        "Identifique a entidade gestora: normalmente a câmara municipal, os serviços municipalizados ou uma empresa concessionária.",
        "Veja o procedimento local para terminar o contrato da casa antiga e abrir o da casa nova.",
        "Prepare a leitura do contador para o dia da saída.",
      ],
    },
  },
  diaDaSaida: {
    intro: "Fotografias e comprovativos tirados neste dia são muitas vezes o que permite esclarecer uma divergência mais tarde.",
    titulo: "Lista para o dia da saída",
    itens: [
      "Fotografe os contadores de eletricidade, gás e água.",
      "Registe as leituras, com a data e a hora.",
      "Guarde os comprovativos de entrega dos equipamentos.",
      "Guarde os pedidos de cancelamento ou de alteração que enviou e as respostas que recebeu.",
      "Não deite fora a documentação da casa antiga antes de receber a fatura final de cada serviço.",
    ],
  },
  casaNova: {
    intro: "Cada casa tem os seus próprios identificadores de instalação. Não são transportados da casa antiga.",
    cpe: {
      titulo: "CPE: Código de Ponto de Entrega",
      texto:
        'Identifica a instalação elétrica da casa. É um código que começa por "PT" e aparece nas faturas de eletricidade. A casa nova tem o seu próprio CPE: é esse que deve indicar ao contratar a eletricidade.',
    },
    cui: {
      titulo: "CUI: Código Universal de Instalação",
      texto:
        "Identifica a instalação de gás natural da casa e aparece nas faturas de gás. Tal como o CPE, pertence à instalação e não ao cliente. Não confunda com CUR (comercializador de último recurso), que é uma entidade.",
    },
    tratar: {
      titulo: "O que tratar na casa nova",
      itens: [
        "<b>Telecomunicações:</b> confirme a cobertura e a data de instalação antes de terminar o serviço na casa antiga.",
        "<b>Eletricidade e gás:</b> escolha o comercializador e indique o CPE e o CUI da casa nova.",
        "<b>Água:</b> abra contrato com a entidade gestora do novo município ou da nova zona.",
        "<b>Titularidade:</b> confirme que os contratos ficam em nome de quem vai pagar.",
        "<b>Documentação:</b> alguns fornecedores pedem um documento que comprove a ocupação da casa, como o contrato de arrendamento ou a escritura. Tenha-o à mão.",
      ],
    },
  },
  depois: {
    intro:
      "Nas semanas seguintes chegam as últimas faturas da casa antiga e as primeiras da casa nova. Vale a pena lê-las com atenção.",
    titulo: "O que verificar",
    itens: [
      "A fatura final de cada serviço da casa antiga.",
      "Consumos faturados depois da data de saída.",
      "A leitura usada, comparada com a que fotografou.",
      "Encargos de cancelamento.",
      "Equipamentos cobrados que já foram devolvidos.",
      "Contratos que continuam ativos quando já deviam ter terminado.",
      "Cobranças que continuam a chegar depois da saída.",
      "Se os serviços da casa nova começaram a ser faturados na data certa.",
    ],
    cta: "Encontrou uma cobrança, uma recusa ou outro problema depois da mudança?",
  },
  dolado: {
    titulo: "A DoLado entra quando surge um problema",
    naoConnosco: {
      titulo: "Não é connosco",
      intro: "Estes pedidos fazem-se diretamente junto do fornecedor:",
      itens: ["pedir uma nova ligação;", "escolher um fornecedor;", "comunicar leituras;", "mudar a titularidade de um contrato."],
    },
    ajuda: {
      titulo: "Aqui a DoLado ajuda",
      itens: [
        "o fornecedor recusa o seu pedido;",
        "não obtém resposta;",
        "aparece uma cobrança inesperada;",
        "o cancelamento não foi feito;",
        "a leitura faturada não corresponde à real;",
        "discorda de uma penalização;",
        "devolveu o equipamento e foi cobrado na mesma;",
        "outro problema com o fornecedor.",
      ],
    },
    fecho:
      'Em "Tratar o meu caso" descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Se ainda não sabe se a DoLado pode ajudar, experimente o <sim>Simulador de Elegibilidade</sim>.',
  },
  perguntas: {
    eyebrow: "Perguntas frequentes",
    titulo: "Dúvidas comuns sobre a mudança.",
    lista: [
      {
        pergunta: "O CPE muda quando mudo de casa?",
        resposta:
          "Sim. O CPE identifica a instalação elétrica, não a pessoa nem o contrato. A casa nova tem o seu próprio CPE, que se mantém mesmo quando muda o titular ou o comercializador. O CPE da casa antiga fica com a casa antiga.",
      },
      {
        pergunta: "E o CUI do gás?",
        resposta:
          "Funciona da mesma forma: o CUI identifica a instalação de gás natural da casa. Na casa nova, use o CUI dessa instalação. Não confunda CUI com CUR, que é o comercializador de último recurso, uma entidade e não um código.",
      },
      {
        pergunta: "Posso levar o contrato de internet e televisão para a casa nova?",
        resposta:
          "Depende de o operador ter cobertura e conseguir prestar o mesmo serviço na nova morada. Peça ao operador, por escrito, a confirmação da cobertura e das condições da transferência, incluindo o que acontece à fidelização e aos equipamentos. Se o serviço não puder ser prestado na nova morada, pergunte quais são as condições de cessação e guarde a resposta.",
      },
      {
        pergunta: "O que devo fazer com a leitura dos contadores?",
        resposta:
          "No dia em que sai, fotografe os contadores de eletricidade, gás e água, com a data visível sempre que possível, e comunique as leituras ao fornecedor. Faça o mesmo quando entra na casa nova. Se a fatura final usar um valor diferente, estas fotografias ajudam a esclarecer a diferença.",
      },
      {
        pergunta: "Como provo que devolvi o router ou a box?",
        resposta:
          "Peça sempre um comprovativo de entrega, seja numa loja ou por envio, com a data e a identificação dos equipamentos (de preferência o número de série). Guarde-o até receber a fatura final sem cobranças de equipamento.",
      },
      {
        pergunta: "O que devo verificar na última fatura?",
        resposta:
          "Se o período faturado termina na data de saída, se a leitura usada corresponde à que comunicou, se aparecem encargos de cancelamento ou de equipamento e se continuam a existir cobranças depois da data em que o contrato devia ter terminado.",
      },
    ],
    aviso:
      "Este guia tem informação geral e não substitui as condições do seu contrato nem uma avaliação jurídica do seu caso. Os procedimentos podem variar de fornecedor para fornecedor.",
  },
  ctaFinal: {
    titulo: "Surgiu um problema com a mudança?",
    texto: "Conte-nos o que aconteceu. A DoLado trata da reclamação junto do fornecedor e acompanha o seu caso.",
  },
};
