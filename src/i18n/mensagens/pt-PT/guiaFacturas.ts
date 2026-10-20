// Página do e-book gratuito (/guia-facturas). O guia em si (PDF) só existe
// em português; a fonte editável está em conteudos/guia-facturas/. Sem
// promessas de poupança: o guia ajuda a perceber e a verificar.
// O texto da autorização comercial vem de src/lib/legal.ts (juridico.comunicacoesGuia).

export const guiaFacturas = {
  metadados: {
    titulo: "Guia gratuito: está a pagar mais do que devia?",
    descricao:
      "Guia gratuito da DoLado com 10 coisas a verificar nas suas facturas e contratos de telecomunicações, electricidade, gás e água. Checklist incluída.",
  },
  topo: {
    eyebrow: "Guia gratuito",
    titulo: "Está a pagar mais do que devia?",
    subtitulo:
      "Descubra 10 coisas que deve verificar nas suas facturas e contratos para identificar cobranças inesperadas, compreender descontos e acompanhar datas importantes.",
    destaques: [
      "Guia gratuito, em PDF",
      "Informação prática para consumidores em Portugal",
      "Exemplos simples",
      "Checklist incluída",
      "Download imediato",
    ],
    capaAlt: "Capa do guia «Está a pagar mais do que devia?», da DoLado",
    paginas: "16 páginas · PDF",
  },
  formulario: {
    titulo: "Receba o guia gratuito",
    rotulo: "O seu e-mail",
    botao: "Receber o guia gratuito",
    aEnviar: "A preparar o seu guia…",
    ajudaComunicacoes: "Opcional. Não é preciso para descarregar o guia e pode retirar esta autorização a qualquer momento.",
    privacidade:
      "Usamos o seu e-mail para lhe disponibilizar o guia e enviar-lhe a ligação. Não criamos nenhuma conta. Saiba mais na <privacidade>Política de Privacidade</privacidade>.",
    armadilha: "Não preencha este campo",
  },
  erros: {
    email: "Indique um endereço de e-mail válido (por exemplo, com «@» e um domínio como «.pt»).",
    limite: "Recebemos vários pedidos seguidos. Aguarde alguns minutos e tente de novo.",
    temporario: "Não foi possível concluir o pedido neste momento. Tente de novo dentro de instantes.",
    indisponivel: "O guia não está disponível neste momento.",
  },
  sucesso: {
    titulo: "O seu guia está pronto!",
    texto: "Obrigado pelo seu interesse. Já pode descarregar gratuitamente o guia da DoLado.",
    botao: "Descarregar o e-book",
    emailEnviado: "Vai receber também a ligação no seu e-mail.",
    emailRecente: "Já lhe enviámos a ligação por e-mail recentemente — pode descarregar o guia aqui.",
    ingles: "",
    protecaoTitulo: "Prefere não fazer este acompanhamento sozinho?",
    protecaoTexto:
      "Com a Protecção DoLado, mantém os seus serviços organizados, cada nova factura é comparada com as anteriores e recebe avisos antes do fim das promoções e da fidelização.",
    protecaoCta: "Conhecer a Protecção DoLado",
  },
  conteudo: {
    titulo: "O que vai encontrar no guia",
    itens: [
      "Como comparar a factura deste mês com a anterior",
      "Porque é que o valor mudou: justificado ou a esclarecer",
      "Quando terminam os seus descontos e promoções",
      "Como consultar o período de fidelização",
      "Serviços e equipamentos que não utiliza",
      "Consumos, leituras, estimativas e acertos",
      "Quando e como os preços podem mudar",
      "As condições actuais face às contratadas",
      "O que fazer perante uma cobrança inesperada, com um modelo de pedido de esclarecimento",
      "Como criar o seu calendário de contratos",
    ],
    ferramentas: "E ainda: uma checklist das 10 verificações e um mapa de contratos para imprimir.",
  },
  paraQuem: {
    titulo: "Para quem é este guia",
    texto:
      "Para quem tem contratos de telecomunicações, electricidade, gás ou água e quer perceber o que está a pagar, reparar a tempo no que muda e saber o que fazer quando algo não bate certo. Sem linguagem técnica e sem conhecimentos jurídicos.",
    nota: "Informação geral, revista a 20 de Outubro de 2026, com as fontes oficiais indicadas no guia. Não substitui a análise do seu caso concreto.",
  },
};
