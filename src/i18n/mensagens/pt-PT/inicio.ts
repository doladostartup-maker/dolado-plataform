// Homepage "/" (HomepageV2).
//
// Simplificação de 17/10/2026: uma ideia por secção e frases curtas.
// Ordem: abertura → situações reais → os dois percursos (tratar / Proteção)
// → benefício (controlo das despesas) → como funciona em 3 passos →
// ferramentas gratuitas → para empresas → fundador → CTA final.
// O detalhe fica nas páginas próprias (/problemas, /protecao, /como-funciona,
// /precario, /perguntas-frequentes, /sobre-nos). Cada afirmação corresponde
// ao que está implementado.

export const inicio = {
  metadados: {
    titulo: "Ajuda com problemas com empresas - DoLado",
    descricao:
      "A DoLado ajuda a tratar problemas com empresas: prepara a reclamação, só a envia com a sua autorização e acompanha a resposta. Com a Protecção, acompanha também as suas facturas e contratos.",
  },
  hero: {
    titulo: "Tem um problema com uma empresa?",
    texto: "Não devia ter de perceber leis, escrever reclamações e andar atrás de respostas sozinho.",
    destaque: "A DoLado ajuda a tratar do problema consigo.",
    tratarCaso: "Tratar do meu caso",
    verSeAjuda: "Ver se a DoLado pode ajudar",
  },
  problemas: {
    titulo: "Já lhe aconteceu alguma destas situações?",
    itens: {
      faturaAlta: "A factura veio mais alta do que esperava.",
      promocao: "A promoção terminou e o preço aumentou.",
      fidelizacao: "Quer cancelar, mas ainda está fidelizado.",
      reembolso: "Está à espera de um reembolso que não chega.",
      naoReconhece: "Cobram-lhe algo que não reconhece.",
      semResposta: "Reclama, mas ninguém resolve.",
    },
    fecho: "É precisamente aqui que a DoLado entra.",
    verTodos: "Ver problemas que tratamos",
  },
  vertentes: {
    titulo1: "Apoio para tratar problemas.",
    titulo2: "Protecção para antecipar surpresas.",
    tratar: {
      titulo: "Preciso de ajuda para tratar um problema",
      texto: "Preparamos a reclamação consigo, só a enviamos com a sua autorização e acompanhamos a resposta da empresa.",
      cta: "Tratar do meu caso",
    },
    protecao: {
      titulo: "Quero acompanhar as minhas facturas e contratos",
      texto:
        "Com a Protecção, comparamos as facturas que nos envia, estamos atentos às datas importantes e avisamos a tempo. O tratamento de reclamações não está incluído na Protecção sozinha.",
      cta: "Conhecer a Protecção",
    },
  },
  beneficio: {
    titulo: "Mais controlo sobre as suas despesas. Mais tranquilidade no dia-a-dia.",
    paragrafos: [
      "Uma cobrança inesperada, um prazo que passou despercebido ou um reembolso que não chega podem pesar no orçamento e ocupar demasiado tempo.",
      "A DoLado acompanha as suas facturas e contratos e ajuda a tratar problemas de consumo, para que saiba o que está a acontecer e possa agir a tempo.",
    ],
    nota: "O acompanhamento de facturas e contratos faz parte da Protecção. O tratamento de reclamações é feito com o Avulso ou com o Caso + Protecção.",
    verPrecario: "Comparar as opções",
  },
  empresas: {
    eyebrow: "Para empresas",
    titulo: "Bem-estar financeiro para a sua equipa.",
    texto:
      "A sua empresa pode oferecer a DoLado aos colaboradores ou aos clientes. Cada pessoa trata do seu caso directamente connosco, e a empresa não vê os casos individuais.",
    cta: "Conhecer a solução para empresas",
  },
  comoFunciona: {
    titulo: "Como funciona",
    passos: [
      "Conte-nos o que aconteceu",
      "Preparamos a reclamação e mostramos-lha antes de enviar",
      "Enviamos com a sua autorização e acompanhamos",
    ],
    verMais: "Ver como funciona",
  },
  ferramentas: {
    titulo: "Ferramentas gratuitas",
    itens: {
      calculadora: { titulo: "Calculadora de fidelização", texto: "Veja quanto poderá pagar para cancelar um contrato de telecomunicações." },
      simulador: { titulo: "A DoLado pode ajudar?", texto: "Descubra em poucas perguntas." },
      mudanca: { titulo: "Vai mudar de casa?", texto: "Veja o que precisa de tratar." },
    },
    verTodas: "Ver todas as ferramentas",
  },
  fundador: {
    titulo: "“Eu próprio já passei por isto.”",
    texto:
      "A minha operadora aumentou o preço e eu estive quase a pagar a penalização da fidelização para sair. Percebi que muitas pessoas pagam sem verificar, porque nem sempre é claro o que fazer. Foi por isso que criei a DoLado.",
    nome: "Thiago Pereira",
    cargo: "Fundador da DoLado",
    cta: "Porque criei a DoLado",
  },
  ctaFinal: {
    titulo: "Tem um problema?",
    acao: "Tratar do meu caso",
    secundaria: "Ver primeiro se podemos ajudar",
  },
  // Homepage com a análise gratuita como entrada principal (HomepageDiagnostico,
  // só com DIAGNOSTICO_GRATUITO_ATIVO). O diagnóstico mostra só o que está no
  // documento e contas simples (decisão de 22/10/2026): nunca prometer que
  // encontramos erros, irregularidades ou poupanças.
  diagnostico: {
    // Hero (22/10/2026): a promessa cobre a DoLado inteira; o cartão diz o
    // que a análise gratuita mostra (só o que está no documento) e o exemplo
    // separa a análise gratuita do que fica para a Protecção (revisto por uma
    // pessoa antes de chegar ao cliente).
    hero: {
      titulo: "Perceba o que está a pagar.",
      tituloSegundo: "E o que merece atenção.",
      texto:
        "Ajudamos a compreender as suas facturas e contratos, a identificar o que merece atenção e a saber o que fazer a seguir.",
      cartaoTexto: "Mostramos os valores, as datas e as condições que estão no documento.",
      problemaTitulo: "Já tem um problema para resolver?",
      problemaTexto: "Preparamos a reclamação consigo e acompanhamos a resposta da empresa.",
      problema: "Tratar do meu caso",
      exemplo: {
        rotulo:
          "Exemplo demonstrativo da análise de uma factura de 62,49 €: mensalidade de 39,99 €, serviços suplementares, comunicações adicionais e uma taxa de atraso, e o que a Protecção acompanha nas facturas seguintes.",
        etiqueta: "Exemplo demonstrativo",
        documento: "Factura de telecomunicações",
        gratuito: "Na análise gratuita",
        resumo: [
          { rotulo: "Total a pagar", valor: "62,49 €" },
          { rotulo: "Mensalidade", valor: "39,99 €" },
        ],
        linhasTitulo: "De onde vem o total",
        linhas: [
          { descricao: "Mensalidade do pacote", valor: "39,99 €", pontual: false },
          { descricao: "Serviços suplementares", valor: "12,00 €", pontual: false },
          { descricao: "Comunicações adicionais", valor: "8,50 €", pontual: true },
          { descricao: "Taxa de atraso", valor: "2,00 €", pontual: true },
        ],
        habitual: "todos os meses",
        pontual: "só esta vez",
        soma: "A soma das linhas coincide com o total da factura.",
        calculo: "Faltam 4 meses para o fim da fidelização.",
        protecao: "Com a Protecção",
        protecaoTitulo: "Não precisa de fazer estas verificações sozinho.",
        protecaoTexto: "Comparamos cada factura que nos envia com as anteriores e com o seu contrato.",
        protecaoPontos: [
          "Uma cobrança nova que se repete (como os serviços suplementares deste exemplo, se aparecerem pela primeira vez), um aumento ou uma possível cobrança em duplicado são revistos por uma pessoa da DoLado antes de lhe dizermos.",
          "Enviamos-lhe um aviso 60 e 30 dias antes do fim da fidelização e das promoções.",
        ],
        cta: "Conhecer a Protecção",
      },
    },
    situacoesTitulo: "Situações em que a DoLado pode ajudar",
    comoFunciona: {
      titulo: "Como funciona",
      passos: [
        "Carregue uma factura ou um contrato",
        "Mostramos o que está no documento: valores, datas e condições",
        "Se quiser, continuamos atentos por si com a Protecção",
      ],
    },
    analisa: {
      titulo: "O que lemos no seu documento",
      setores: "Facturas e contratos de telecomunicações, electricidade, gás e água.",
      itens: [
        "Quanto está a pagar e o que está a ser cobrado.",
        "Quando termina a fidelização ou a promoção.",
        "As condições do contrato: mensalidade, duração e vantagens.",
        "O que não foi possível confirmar no documento.",
      ],
    },
    protecao: {
      titulo: "Com a Protecção, continuamos atentos por si",
      itens: [
        { titulo: "Avisamos a tempo", texto: "60 e 30 dias antes do fim da fidelização e das promoções, e no próprio dia." },
        {
          titulo: "Comparamos as facturas",
          texto: "Cada factura nova é comparada com as anteriores. O que merecer atenção é revisto por uma pessoa da DoLado antes de lhe dizermos.",
        },
        { titulo: "Um resumo todos os meses", texto: "Um e-mail com o que acompanhámos e a próxima data importante." },
      ],
      cta: "Conhecer a Protecção",
    },
    reclamacoes: {
      titulo: "Precisa de ajuda com um problema?",
      texto: "Preparamos a reclamação consigo, só a enviamos com a sua autorização e acompanhamos a resposta da empresa.",
      nota: "O tratamento de reclamações é feito com o Avulso ou com o Caso + Protecção. Não está incluído na Protecção sozinha.",
      cta: "Tratar do meu caso",
    },
    oferta: {
      titulo: "Experimente a Protecção durante 30 dias",
    },
    confianca: {
      titulo: "Sem letras pequenas",
      itens: [
        "Pode ver o resultado sem criar conta e sem cartão bancário.",
        "Quando encontramos algo numa factura, uma pessoa da DoLado revê antes de lhe dizermos.",
        "Nunca enviamos nada a uma empresa sem a sua autorização.",
      ],
      ligacao: "Como trabalhamos",
    },
    perguntas: {
      titulo: "Perguntas frequentes",
      itens: [
        {
          id: "registo",
          pergunta: "Preciso de criar conta para analisar um documento?",
          resposta:
            "Não. Pode carregar a factura ou o contrato e ver o resultado logo a seguir. Só cria conta se quiser guardar o resultado ou continuar com a Protecção.",
        },
        {
          id: "documento",
          pergunta: "O que acontece ao meu documento?",
          resposta:
            "Fica guardado num espaço privado e é lido por um sistema de inteligência artificial só para lhe mostrar o resultado. Se não criar conta, é apagado ao fim de 7 dias.",
        },
        {
          id: "gratuito",
          pergunta: "A análise é mesmo gratuita?",
          resposta: "Sim, e não pedimos cartão bancário. A Protecção também pode ser experimentada durante 30 dias sem custos.",
        },
        {
          id: "parecer",
          pergunta: "O resultado é um parecer jurídico?",
          resposta:
            "Não. Mostramos o que está escrito no documento e fazemos contas simples, como os dias que faltam para o fim da fidelização. Se tiver um problema, podemos ajudar a tratá-lo.",
        },
        {
          id: "documentos",
          pergunta: "Que documentos posso analisar?",
          resposta: "Facturas e contratos de telecomunicações, electricidade, gás e água, em PDF.",
        },
      ],
      todas: "Ver todas as perguntas",
    },
    ctaFinal: {
      titulo: "Veja o que diz a sua factura",
    },
  },
};
