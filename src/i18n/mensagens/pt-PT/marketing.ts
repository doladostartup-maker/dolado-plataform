// Componentes partilhados das páginas públicas V2: ferramentas gratuitas,
// mockups ilustrativos e "A nossa origem".

export const marketing = {
  ferramentas: {
    calculadora: {
      titulo: "Quanto custa cancelar antes do fim da fidelização?",
      texto:
        "Para contratos de telecomunicações: com as datas e os valores do contrato, estime o valor máximo que pode ter de pagar para cancelar antes do fim da fidelização.",
      cta: "Calcular quanto pode pagar",
    },
    simulador: {
      titulo: "A DoLado pode tratar do meu caso?",
      texto: "Responda a 4 perguntas e veja, de forma indicativa, se a DoLado pode ajudar com a sua situação.",
      cta: "Ver se a DoLado pode ajudar",
    },
    mudanca: {
      titulo: "Vai mudar de casa?",
      texto: "Veja o que deve tratar antes, durante e depois da mudança: telecomunicações, electricidade, gás e água.",
      cta: "Ver Guia de Mudança",
    },
  },
  mockups: {
    exemplo: "Exemplo",
    hero: {
      rotulo:
        "Exemplo ilustrativo: um caso no portal da DoLado, com o texto da reclamação à espera da aprovação do cliente",
      oSeuCaso: "O seu caso",
      titulo: "Cobrança depois do cancelamento",
      subtitulo: "Operadora · Telecomunicações",
      textoReclamacao: "Texto da reclamação",
      autorizar: "Autorizar o envio",
      pedirAlteracoes: "Pedir alterações",
      enviada: "Reclamação enviada",
      comprovativo: "Comprovativo na sua área de cliente",
      lema1: "Menos burocracia.",
      lema2: "Mais tempo para si.",
    },
    fidelizacao: {
      calculada: "Calculada com os dados do contrato",
      encargo: "Valor máximo para cancelar",
    },
    simulador: ["Parece enquadrar-se no serviço", "Por confirmar", "Pode não se enquadrar"],
    mudanca: ["Antes da mudança", "No dia da saída", "Na casa nova", "Depois da mudança"],
    caso: {
      rotulo: "Exemplo ilustrativo das etapas de um caso tratado pela DoLado",
      titulo: "Um caso tratado pela DoLado",
      etapas: [
        { titulo: "Caso recebido", texto: "Recebemos a sua descrição e os documentos." },
        { titulo: "Análise", texto: "Analisamos a sua situação." },
        { titulo: "Texto preparado", texto: "Mostramos-lhe o texto para aprovação." },
        { titulo: "Aprovação", texto: "Só enviamos com a sua autorização." },
        { titulo: "Reclamação enviada", texto: "O comprovativo fica no seu caso." },
        { titulo: "Acompanhamento", texto: "Acompanhamos o processo consigo." },
      ],
    },
    protecao: {
      rotulo: "Exemplo ilustrativo do estado de protecção, com dados fictícios",
      titulo: "O seu estado de protecção",
      operadora: "Operadora",
      fidelizacao: "Fidelização termina em 14/03/2027",
      faturaAtual: "Factura actual",
      valorFatura: "54,90 €",
      promocao: "Promoção identificada",
      condicoes: "Condições importantes identificadas",
      semSituacoes: "Neste momento não detectámos nenhuma situação que exija intervenção.",
    },
  },
  exemplos: {
    etiqueta: "Exemplo fictício",
    reclamacao: {
      titulo: "Como é um texto preparado pela DoLado",
      aviso: "Exemplo fictício: empresa, datas, referências e valores inventados.",
      assunto: "Assunto: Cobrança da mensalidade depois do cancelamento",
      paragrafos: [
        "No dia 3 de Março, pedi o cancelamento do serviço de internet (cliente n.º 000000). A empresa confirmou o pedido por e-mail no mesmo dia.",
        "Nas facturas de Abril e de Maio continua a ser cobrada a mensalidade de 32,90 €, num total de 65,80 €.",
        "Peço que estas cobranças sejam anuladas e que me seja devolvido o valor de 65,80 €, para a mesma conta de onde foi pago.",
      ],
      nota:
        "Num caso real, o texto é escrito a partir dos factos e dos documentos do seu caso, inclui as regras aplicáveis quando existam e só é enviado depois da sua autorização.",
    },
    avisoPromocao: {
      titulo: "Exemplo de aviso",
      assunto: "A promoção do seu serviço termina daqui a 30 dias",
      linhas: [
        { rotulo: "Serviço", valor: "Internet e televisão" },
        { rotulo: "Fim da promoção", valor: "15/12/2026" },
        { rotulo: "Mensalidade com promoção", valor: "29,90 €" },
      ],
      texto: "Ainda tem tempo para confirmar quanto vai pagar depois desta data e decidir o que quer fazer.",
    },
    alteracaoFatura: {
      titulo: "Exemplo de alteração na factura",
      antes: "Factura de Outubro",
      agora: "Factura de Novembro",
      valorAntes: "32,90 €",
      valorAgora: "39,90 €",
      diferenca: "Diferença: +7,00 €",
      texto:
        "A mensalidade aumentou e não encontrámos nos dados do seu contrato uma explicação para esta diferença. Pode valer a pena confirmar com a empresa.",
      nota: "Antes de o avisarmos, uma pessoa da DoLado revê cada situação.",
    },
  },
  origem: {
    fotografia: "Thiago Pereira, fundador da DoLado",
    eyebrow: "A nossa origem",
    titulo: "“Eu próprio já passei por isto.”",
    paragrafos: [
      "A minha operadora aumentou o preço do serviço que eu tinha e eu quis sair. Estive quase a pagar a penalização da fidelização. Foi então que reparei que o aviso do aumento me tinha chegado apenas 28 dias antes da alteração — e foi com base nisso que consegui que a cobrança da fidelização fosse anulada.",
      "Percebi que muitas pessoas acabam por pagar sem verificar. Não por falta de vontade, mas porque nem sempre é claro o que verificar, a quem escrever ou que passo dar a seguir.",
      "Foi por isso que criei a DoLado: para ajudar a pôr cada problema por escrito, com calma e com cuidado, e para que ninguém tenha de o tratar sozinho.",
    ],
    assinatura: "— Thiago Pereira, fundador da DoLado",
  },
};
