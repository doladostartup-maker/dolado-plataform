// Landing page das campanhas Meta Ads (/30-dias-gratis). Condições iguais às
// da oferta implementada (src/lib/protecaoGratuita.ts e Termos, secção 5);
// preços sempre de src/lib/planos.ts (passados como argumento — nunca
// escritos aqui). Contratos e facturas aparecem sempre como meio para
// detectar e prevenir problemas, nunca como gestão de contratos.

export const landing30Dias = {
  metadados: {
    titulo: "30 dias de Protecção grátis",
    descricao:
      "Detecte aumentos inesperados nas suas facturas e receba avisos antes do fim das promoções. 30 dias de Protecção grátis, sem cartão bancário e sem cobrança automática.",
  },
  cabecalho: {
    iniciarSessao: "Iniciar sessão",
  },
  topo: {
    eyebrow: "30 dias grátis",
    titulo: "A sua factura aumentou e não sabe porquê?",
    texto:
      "Com a DoLado, os seus contratos e facturas servem para detectar aumentos inesperados e antecipar o fim das promoções, antes de pagar a mais.",
    beneficios: [
      "Detecte aumentos inesperados nas facturas.",
      "Receba avisos antes do fim das promoções.",
      "Acompanhe os seus serviços num só lugar.",
    ],
    cta: "Activar os meus 30 dias grátis",
    confianca: "Sem cartão bancário. Sem compromisso. Sem cobrança automática.",
  },
  problemas: {
    titulo: "Já lhe chegou uma factura mais cara sem explicação?",
    itens: [
      "A promoção terminou e o preço aumentou.",
      "Surgiu um valor inesperado na factura.",
      "O período de fidelização está a terminar e não se recordava da data.",
    ],
    fecho: "A DoLado acompanha estas situações por si, para que possa agir a tempo.",
  },
  comoFunciona: {
    titulo: "Como funciona a Protecção DoLado?",
    passos: [
      {
        titulo: "Adicione os seus contratos e facturas",
        texto:
          "Carregue uma factura ou um contrato dos serviços que quer acompanhar. Lemos as datas e os valores por si, e confirma os dados do contrato antes de serem usados.",
      },
      {
        titulo: "A DoLado acompanha por si",
        texto:
          "Comparamos cada nova factura com o contrato e com as facturas anteriores. Quando algo merece atenção, uma pessoa da DoLado revê a situação antes de o avisar.",
      },
      {
        titulo: "Receba avisos importantes",
        texto:
          "Avisamos por e-mail 60 e 30 dias antes do fim de uma promoção ou de um período de fidelização, e no próprio dia.",
      },
    ],
  },
  fundador: {
    eyebrow: "Quem está por detrás da DoLado?",
    titulo: "Uma empresa criada para estar do lado dos consumidores.",
    paragrafos: [
      "Sou o Thiago Pereira, fundador da DoLado.",
      "Criei a DoLado depois de perceber como tantas pessoas são surpreendidas por valores inesperados nas facturas, condições contratuais que desconheciam e informações que passam despercebidas.",
      "Acredito que compreender os nossos contratos e defender os nossos direitos não devia ser tão complicado.",
      "Foi por isso que nasceu a DoLado.",
    ],
    fotografia: "Thiago Pereira, fundador da DoLado",
    conhecer: "Conhecer melhor a DoLado",
  },
  condicoes: {
    titulo: "Experimente gratuitamente durante 30 dias.",
    itens: (preco: string) => [
      "30 dias de Protecção gratuita, a contar do dia em que a activa.",
      "Sem necessidade de cartão bancário.",
      "Sem cobrança automática.",
      "A oferta termina automaticamente ao fim dos 30 dias.",
      `Para continuar, é necessário aderir à Protecção, por ${preco}/mês.`,
      "Pode ser utilizada apenas uma vez por pessoa, por quem ainda não teve a Protecção.",
      "Não inclui o tratamento de reclamações.",
    ],
    completas: "Ver as condições completas",
    cta: "Activar os meus 30 dias grátis",
  },
  perguntas: {
    titulo: "Perguntas frequentes",
    itens: (preco: string) => [
      {
        id: "cartao",
        pergunta: "Preciso de um cartão bancário?",
        resposta: "Não. A activação gratuita não exige cartão bancário nem outro meio de pagamento.",
      },
      {
        id: "depois",
        pergunta: "Vou pagar alguma coisa depois dos 30 dias?",
        resposta:
          "Não. A Protecção gratuita termina automaticamente, sem qualquer cobrança. Só há cobrança se decidir aderir à Protecção.",
      },
      {
        id: "preco",
        pergunta: "Quanto custa continuar?",
        resposta: `A Protecção custa ${preco}/mês, IVA incluído. Se aderir durante o período gratuito, a primeira cobrança só é feita quando ele terminar.`,
      },
      {
        id: "reclamacao",
        pergunta: "Posso utilizar a DoLado para fazer uma reclamação?",
        resposta:
          "A oferta gratuita é exclusiva da Protecção e não inclui o tratamento de reclamações. Para tratar um caso, a DoLado tem modalidades próprias, que pode ver no preçário.",
      },
      {
        id: "fidelizacao",
        pergunta: "A oferta tem fidelização?",
        resposta: "Não. Não existe obrigação de continuar depois do período gratuito.",
      },
    ],
  },
  barra: {
    cta: "Activar os meus 30 dias grátis",
  },
};
