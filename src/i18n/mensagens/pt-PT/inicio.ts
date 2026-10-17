// Homepage "/" (HomepageV2).
//
// Ordem (revisão da comunicação de 17/10/2026): abertura → situações
// concretas → duas formas de ajudar (tratar / acompanhar) → como funciona,
// com um exemplo fictício → preços → ferramentas gratuitas → origem →
// dúvidas práticas → CTA final. Cada afirmação sobre o serviço corresponde ao
// que está implementado (ver docs/comunicacao/revisao-comunicacao-2026-10-17.md).

export const inicio = {
  metadados: {
    titulo: "Ajuda com problemas com empresas - DoLado",
    descricao:
      "A DoLado ajuda a tratar problemas com empresas: prepara a reclamação, só a envia com a sua autorização e acompanha a resposta. Com a Proteção, acompanha também as suas faturas e contratos.",
  },
  hero: {
    eyebrow: "Do seu lado com as empresas",
    titulo1: "Tem um problema",
    titulo2: "com uma empresa?",
    titulo3: "A DoLado ajuda a tratar dele consigo.",
    texto:
      "Conte-nos o que aconteceu. Preparamos a reclamação, mostramos-lhe o texto para rever e autorizar, enviamos pelo canal adequado e acompanhamos a resposta da empresa. Não podemos garantir o resultado, mas não fica a tratar disto sozinho.",
    tratarCaso: "Tratar do meu caso",
    verSeAjuda: "Ver se a DoLado pode ajudar",
    explicacaoBotoes:
      "“Tratar do meu caso” abre um formulário passo a passo, com cerca de 5 minutos, e só paga no fim. Se ainda tem dúvidas, comece por 4 perguntas rápidas, sem conta nem e-mail.",
    garantias: ["Revê o texto antes do envio", "Nada é enviado sem a sua autorização", "Preço à vista antes de pagar"],
    resposta: "Depois de o caso ser aberto, entramos em contacto consigo no prazo máximo de 48 horas úteis.",
  },
  problemas: {
    eyebrow: "Situações frequentes",
    titulo: "Reconhece alguma destas situações?",
    texto: "Escolha a que se parece mais com a sua e veja como a DoLado pode ajudar.",
    itens: {
      cobrancaCancelamento: {
        pergunta: "Continua a receber cobranças depois de cancelar?",
        texto: "Internet, televisão, telemóvel ou outro serviço que já pediu para terminar.",
      },
      faturaLuz: {
        pergunta: "A fatura da luz veio mais alta e não percebe porquê?",
        texto: "Pode haver uma explicação, mas vale a pena verificar as leituras e os valores.",
      },
      reembolso: {
        pergunta: "Devolveu uma compra e o reembolso não chegou?",
        texto: "A loja aceitou a devolução, mas o dinheiro continua por chegar.",
      },
      fidelizacao: {
        pergunta: "Quer cancelar o contrato e tem dúvidas sobre a fidelização?",
        texto: "Em telecomunicações, estime gratuitamente quanto pode ter de pagar para cancelar.",
      },
      servicoNaoPedido: {
        pergunta: "Está a pagar um serviço que não pediu?",
        texto: "Um valor na fatura que não reconhece ou um serviço que nunca contratou.",
      },
      semResposta: {
        pergunta: "Já reclamou e continua sem uma resposta útil?",
        texto: "Veja em 4 perguntas se a DoLado pode ajudar a dar o passo seguinte.",
      },
    },
    saberMais: "Ver como podemos ajudar",
    verTodos: "Ver todos os problemas que tratamos",
  },
  servicos: {
    eyebrow: "Duas formas de ajudar",
    titulo: "Tem um problema agora ou quer evitar surpresas?",
    tratar: {
      titulo: "Tratar um problema que já existe",
      texto: "Para uma cobrança, um cancelamento, um reembolso ou outra situação que já aconteceu.",
      itens: [
        "Conte-nos o que aconteceu, por palavras suas",
        "Preparamos a reclamação e mostramos-lha antes do envio",
        "Enviamos com a sua autorização e acompanhamos a resposta",
      ],
      cta: "Tratar do meu caso",
    },
    protecao: {
      titulo: "Acompanhar faturas e contratos",
      texto: "Para quem quer ser avisado a tempo, mesmo sem ter um problema agora. Não precisa de abrir um caso.",
      itens: [
        "Comparamos as faturas que nos envia com as anteriores",
        "Avisamos antes do fim de uma promoção ou da fidelização",
        "Assinalamos alterações que merecem ser verificadas",
      ],
      cta: "Conhecer a Proteção",
    },
    nota:
      "A DoLado presta apoio administrativo: organiza a informação, prepara a reclamação e acompanha a resposta. Não é um escritório de advogados e não garante o resultado, que depende da empresa.",
  },
  comoFunciona: {
    eyebrow: "Como funciona",
    titulo: "Quatro passos, do princípio ao fim.",
    passos: [
      {
        titulo: "Conte o que aconteceu",
        texto: "Responda a 5 perguntas simples. Os documentos são opcionais: se faltar alguma coisa, pedimos-lha depois.",
      },
      {
        titulo: "Preparamos a reclamação",
        texto: "Confirmamos os factos consigo e escrevemos um texto claro, com um pedido concreto à empresa.",
      },
      {
        titulo: "Reveja e autorize",
        texto: "Leia o texto com calma e, se quiser, peça alterações. Só enviamos depois da sua autorização.",
      },
      {
        titulo: "Enviamos e acompanhamos",
        texto: "Enviamos pelo canal adequado e avisamo-lo por e-mail quando há novidades ou precisamos de si.",
      },
    ],
    verTodos: "Ver o processo em detalhe",
  },
  precos: {
    eyebrow: "Preços",
    titulo: "Quanto custa.",
    texto: "Preços com IVA incluído. O valor aparece sempre antes de pagar.",
    planos: {
      avulso: { necessidade: "Tenho um problema agora", detalhe: "Trata 1 caso. Sem subscrição." },
      caso_protecao: {
        necessidade: "Tenho um problema e quero acompanhamento contínuo",
        detalhe: "1 caso por mês e a Proteção.",
      },
      protecao: {
        necessidade: "Quero acompanhar as minhas faturas e contratos",
        detalhe: "Faturas e datas. Não inclui o tratamento de casos.",
      },
    },
    verPrecario: "Ver preçário e condições",
    conhecerProtecao: "O que é a Proteção?",
  },
  ferramentas: {
    eyebrow: "Ferramentas gratuitas",
    titulo: "Ainda não sabe se existe um problema?",
    texto: "Antes de contratar qualquer serviço, pode usar gratuitamente estas ferramentas para perceber melhor a sua situação.",
    semConta: "Sem conta e sem e-mail. O resultado aparece logo no ecrã.",
    verTodas: "Ver todas as ferramentas gratuitas",
  },
  origem: {
    titulo: "Do lado de quem consome.",
    texto:
      "A DoLado existe para ajudar os consumidores a tratar problemas com empresas e a reparar a tempo no que pode vir a ser um problema.",
    saberMais: "Saber mais sobre nós",
  },
  perguntas: {
    eyebrow: "Perguntas frequentes",
    titulo: "Dúvidas práticas antes de começar.",
    verTodas: "Ver todas as perguntas",
  },
  ctaFinal: {
    eyebrow: "Ainda não sabe por onde começar?",
    titulo: "Veja primeiro se a DoLado pode ajudar.",
    texto: "São 4 perguntas rápidas, gratuitas e sem conta. No fim, mostramos-lhe o passo seguinte.",
    acao: "Ver se a DoLado pode ajudar",
  },
};
