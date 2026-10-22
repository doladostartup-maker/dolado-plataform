// Landing /analisar-fatura (campanhas Meta Ads "Sabe mesmo o que está a
// pagar?", 22/10/2026). A promessa é a do diagnóstico gratuito: o que está
// na factura, contas feitas em código e as datas e os valores em destaque —
// só factos: nunca erros, irregularidades, poupanças nem passos a seguir. Sem referências à inteligência
// artificial no texto principal; a privacidade (verdadeira) está no cartão
// de carregamento e em "Como tratamos o seu documento".

export const analisarFatura = {
  metadados: {
    titulo: "Sabe mesmo o que está a pagar? Análise gratuita da sua factura",
    descricao:
      "Carregue a sua factura de electricidade em PDF e veja, sem registo, o que está a pagar e o que vale a pena confirmar. Análise inicial gratuita da DoLado.",
  },
  hero: {
    titulo: "Sabe mesmo o que está a pagar?",
    subtitulo: "Carregue a sua factura de electricidade e veja o que está a pagar e o que vale a pena confirmar.",
  },
  carregar: {
    titulo: "Envie a sua factura",
    arrastar: "Arraste o PDF para aqui ou seleccione o ficheiro.",
    tocar: "Seleccione o PDF da sua factura.",
    botao: "Analisar a minha factura",
    aEnviar: "A enviar a sua factura…",
    largar: "Largue o ficheiro para começar",
    complemento: ["Análise inicial gratuita", "Apenas PDF", "Sem registo para começar"],
    passos: ["Envia a factura", "Lemos o documento", "Vê o resultado"],
    privacidade:
      "A sua factura fica num espaço privado e só é usada para lhe mostrar o resultado. Se não criar conta, é apagada ao fim de 7 dias.",
    detalhesTitulo: "Como tratamos o seu documento",
  },
  exemplo: {
    titulo: "O que pode descobrir na sua factura?",
    texto: "Um exemplo do resultado, com uma factura de electricidade imaginada para esta página.",
    etiqueta: "Exemplo ilustrativo",
    linhas: {
      energia: "Energia consumida",
      potencia: "Potência contratada",
      taxas: "Taxas e impostos",
      acerto: "Acerto de consumos",
    },
    total: "Total da factura",
    todosOsMeses: "todos os meses",
    soEstaVez: "só esta vez",
    cartoes: {
      pagar: {
        titulo: "O que está a pagar",
        texto: "Os principais valores da factura, organizados: de onde vem o total.",
      },
      destaques: {
        titulo: "O que está em destaque",
        texto: "Datas e valores que convém ter presentes, com a indicação de onde vêm.",
        doDocumento: "Do documento",
        pontual: (total: string) => `1 cobrança que não se repete todos os meses (${total}).`,
        promocao: "A promoção termina daqui a 40 dias.",
      },
      contrato: {
        titulo: "O que a factura não diz",
        texto: "O que não é possível confirmar só com a factura.",
        consta: "Consta do contrato",
        condicoes: "O preço acordado, a fidelização e as promoções.",
      },
    },
  },
  limites: {
    titulo: "O que a análise faz — e o que não faz",
    faz: "O que faz",
    fazItens: [
      "Lê os valores, as datas e as linhas da factura.",
      "Separa o que paga todos os meses do que foi cobrado só desta vez.",
      "Confirma se as linhas somam o total e calcula as datas que importam.",
      "Mostra o que não foi possível confirmar.",
    ],
    naoFaz: "O que não faz",
    naoFazItens: [
      "Não diz se uma cobrança é indevida nem o que deve fazer: mostra o que está no documento.",
      "Não substitui o contrato: preço acordado e fidelização só o contrato os confirma.",
      "Não é um parecer jurídico nem contacta a empresa por si.",
    ],
  },
  quem: {
    titulo: "Quem é a DoLado",
    texto:
      "A DoLado é uma empresa portuguesa de bem-estar financeiro especializada no apoio ao consumidor: ajudamos a perceber facturas e contratos de telecomunicações, electricidade, gás e água, a acompanhar alterações e prazos e a tratar reclamações.",
  },
  perguntas: {
    titulo: "Perguntas frequentes",
    itens: [
      {
        pergunta: "A análise é mesmo gratuita?",
        resposta: "Sim. A análise inicial é gratuita, sem registo e sem cartão bancário. Só vê a Protecção DoLado depois do resultado, se quiser.",
      },
      {
        pergunta: "Que facturas posso enviar?",
        resposta:
          "O PDF de uma factura de electricidade, tal como o recebeu da empresa (até 10 MB). Também pode enviar facturas de telecomunicações, gás ou água, ou um contrato.",
      },
      {
        pergunta: "Preciso de criar conta?",
        resposta: "Não para começar. Se quiser guardar o resultado, pode criar uma conta gratuita depois de o ver.",
      },
      {
        pergunta: "O que acontece à minha factura?",
        resposta:
          "Fica num espaço privado e só é usada para lhe mostrar o resultado. Se não criar conta, a factura e o resultado são apagados ao fim de 7 dias. Os detalhes estão na Política de Privacidade.",
      },
      {
        pergunta: "A análise diz-me se estou a pagar demais?",
        resposta:
          "Mostra o que está na factura, faz as contas e destaca as datas e os valores que convém ter presentes. Não conclui que uma cobrança é indevida: para isso é preciso o contrato e, muitas vezes, uma resposta da empresa.",
      },
    ],
  },
  final: {
    titulo: "Veja o que está na sua factura",
    texto: "Gratuito, sem registo e só com o PDF.",
  },
};
