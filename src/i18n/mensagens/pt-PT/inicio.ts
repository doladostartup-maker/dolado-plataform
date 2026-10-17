// Homepage "/" (HomepageV2).
//
// Simplificação de 17/10/2026: uma ideia por secção e frases curtas.
// Ordem: abertura → situações reais → as duas vertentes (tratar / Proteção)
// → como funciona em 3 passos → ferramentas gratuitas → fundador → CTA final.
// O detalhe fica nas páginas próprias (/problemas, /protecao, /como-funciona,
// /precario, /perguntas-frequentes, /sobre-nos). Cada afirmação corresponde
// ao que está implementado.

export const inicio = {
  metadados: {
    titulo: "Ajuda com problemas com empresas - DoLado",
    descricao:
      "A DoLado ajuda a tratar problemas com empresas: prepara a reclamação, só a envia com a sua autorização e acompanha a resposta. Com a Proteção, acompanha também as suas faturas e contratos.",
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
      faturaAlta: "A fatura veio mais alta do que esperava.",
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
    titulo2: "Proteção para antecipar surpresas.",
    tratar: {
      titulo: "Tenho um problema",
      texto: "Tratamos a reclamação consigo.",
      cta: "Tratar do meu caso",
    },
    protecao: {
      titulo: "Quero evitar surpresas",
      texto: "Acompanhamos faturas, contratos e datas importantes, para o avisar a tempo.",
      cta: "Conhecer a Proteção",
    },
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
};
