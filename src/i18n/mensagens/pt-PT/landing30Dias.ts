// Landing page das campanhas Meta Ads (/30-dias-gratis). Condições iguais às
// da oferta implementada (src/lib/protecaoGratuita.ts e Termos, secção 5);
// preços sempre de src/lib/planos.ts e valores dos exemplos de
// src/lib/landing30Dias.ts (passados como argumento — nunca escritos aqui).
// Contratos e facturas aparecem sempre como meio para prevenir e detectar
// problemas, nunca como gestão de contratos. Revista a 21/10/2026 para o
// público dos anúncios (sobretudo 55+): frases curtas, condições junto do
// botão, dois exemplos concretos e o fundador mais visível.

export const landing30Dias = {
  metadados: {
    titulo: "30 dias de Protecção grátis",
    descricao:
      "Evite surpresas nas suas facturas: avisos antes do fim das promoções e verificação de cada nova factura. 30 dias de Protecção grátis, sem cartão bancário.",
  },
  cabecalho: {
    iniciarSessao: "Iniciar sessão",
  },
  topo: {
    eyebrow: "Protecção DoLado · 30 dias grátis",
    titulo: "Evite surpresas nas suas facturas.",
    texto:
      "A DoLado ajuda a acompanhar os seus contratos e facturas, a identificar as datas importantes e a perceber quando deve agir, para evitar surpresas.",
    oferta: "Experimente a Protecção DoLado gratuitamente durante 30 dias.",
    cta: "Começar os meus 30 dias gratuitos",
    condicoes: (preco: string) => [
      "Sem cartão bancário e sem cobrança automática.",
      `No fim, só continua se quiser: ${preco}/mês.`,
      "O tratamento de reclamações não está incluído.",
    ],
  },
  exemplos: {
    titulo: "O que a Protecção faz por si",
    texto: "Dois exemplos simples. Os valores e as datas são fictícios.",
    ficticio: "Exemplo fictício",
    promocao: {
      titulo: "Fim de uma promoção",
      servico: "Internet e televisão",
      mensalidade: "Mensalidade actual",
      fim: "Fim da promoção",
      avisoRotulo: "Aviso por e-mail",
      aviso:
        "A sua promoção termina dentro de 30 dias. Vale a pena confirmar as condições do contrato antes de começar a pagar mais.",
      explicacao:
        "Com a data registada, avisamos por e-mail 60 e 30 dias antes do fim da promoção e no próprio dia. Tem tempo para decidir o que fazer.",
    },
    factura: {
      titulo: "Alteração numa factura",
      servico: "Internet e televisão",
      anterior: "Factura anterior",
      actual: "Factura actual",
      diferenca: "Diferença",
      nota: "Revisto por uma pessoa da DoLado antes de lhe enviarmos o aviso.",
      explicacao:
        "Comparamos cada nova factura com o contrato e com as facturas anteriores. Se um valor aumentar sem explicação, mostramos-lhe a diferença no portal e por e-mail.",
    },
  },
  passos: {
    titulo: "Começar é simples",
    itens: [
      {
        titulo: "Crie a sua conta",
        texto: "Active a Protecção gratuita durante 30 dias. Não pedimos cartão bancário.",
      },
      {
        titulo: "Adicione uma factura ou um contrato",
        texto:
          "Carregue um PDF ou uma fotografia. Se não tiver o documento à mão, pode indicar os dados do serviço manualmente.",
      },
      {
        titulo: "Veja o que é importante",
        texto:
          "No portal, vê os dados que identificámos, o que verificámos e a próxima data a ter em conta. O resultado aparece logo depois do primeiro documento.",
      },
    ],
  },
  fundador: {
    eyebrow: "Quem está por detrás da DoLado",
    citacao:
      "Criei a DoLado porque demasiadas pessoas são surpreendidas por alterações nas facturas e por condições que desconheciam quando contrataram um serviço. Quero ajudar os consumidores a terem mais informação e maior controlo sobre os seus contratos.",
    nome: "Thiago Pereira",
    cargo: "Fundador da DoLado",
    fotografia: "Thiago Pereira, fundador da DoLado",
    conhecer: "Conhecer melhor a DoLado",
  },
  condicoes: {
    titulo: "As condições, sem letras pequenas",
    itens: (preco: string) => [
      "30 dias de Protecção gratuita, a contar do dia em que a activa.",
      "Não pedimos cartão bancário nem outro meio de pagamento.",
      "No fim dos 30 dias, a Protecção gratuita termina sozinha, sem qualquer cobrança.",
      `Para continuar, adere à Protecção por ${preco}/mês (IVA incluído). Só se o decidir.`,
      "Só pode ser usada uma vez por pessoa, por quem ainda não teve a Protecção.",
      "Não inclui o tratamento de reclamações, que tem modalidades próprias.",
    ],
    completas: "Ver as condições completas",
  },
  perguntas: {
    titulo: "Perguntas frequentes",
    itens: (preco: string, meses: number) => [
      {
        id: "recebo",
        pergunta: "O que recebo durante os 30 dias gratuitos?",
        resposta:
          "Tem acesso à Protecção: adiciona facturas e contratos, a DoLado verifica a sua situação actual, envia-lhe avisos por e-mail antes do fim de promoções e de períodos de fidelização e compara cada nova factura com o contrato e com as anteriores. O tratamento de reclamações não está incluído.",
      },
      {
        id: "cartao",
        pergunta: "Preciso de indicar um cartão bancário?",
        resposta: "Não. A Protecção gratuita não pede cartão bancário nem outro meio de pagamento.",
      },
      {
        id: "fim",
        pergunta: "O que acontece quando terminam os 30 dias?",
        resposta: `A Protecção gratuita termina sozinha, sem qualquer cobrança e sem criar uma subscrição. Se quiser continuar, adere à Protecção por ${preco}/mês: se aderir antes do fim, a primeira cobrança é feita no dia em que o período gratuito terminaria (se faltarem menos de 2 dias, é feita no dia da adesão). Se não aderir, os seus serviços e documentos ficam guardados durante ${meses} meses.`,
      },
      {
        id: "documentos",
        pergunta: "Como adiciono as minhas facturas e contratos?",
        resposta:
          "No portal, na área «Protecção», carregue o documento em PDF ou uma fotografia (JPG, PNG ou WebP, até 10 MB). A DoLado lê as datas e os valores; os dados do contrato só são usados depois de os confirmar. Se não tiver o documento, pode indicar os dados do serviço manualmente.",
      },
      {
        id: "cancelar",
        pergunta: "Posso cancelar ou deixar de usar o serviço?",
        resposta:
          "Sim. Durante os 30 dias não há nada para cancelar: se não fizer nada, a Protecção gratuita termina sem cobrança. Se aderir depois, pode cancelar a subscrição no portal a qualquer momento; mantém a Protecção até ao fim do período já pago.",
      },
    ],
  },
  final: {
    titulo: "Comece hoje os seus 30 dias gratuitos.",
    texto: "Crie a sua conta em poucos minutos. Sem cartão bancário.",
  },
  barra: {
    cta: "Começar os 30 dias gratuitos",
  },
};
