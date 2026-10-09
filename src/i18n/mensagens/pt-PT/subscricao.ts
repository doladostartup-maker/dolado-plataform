// Subscrição no portal: Gestão de Subscrição, cartão "O seu plano" do
// painel, estado da subscrição e do reembolso, próxima cobrança e conversão
// Avulso → subscrição. As regras ficam em src/lib (acesso.ts,
// proximaCobranca.ts, gestaoSubscricao.ts, stripe/conversao.ts).

export const subscricao = {
  estados: {
    active: "Ativa",
    trialing: "Ativa",
    past_due: "Pagamento em atraso",
    incomplete: "Pagamento em confirmação",
    unpaid: "Suspensa por falta de pagamento",
    paused: "Suspensa",
  },
  cancelamentoAgendado: "Cancelamento agendado",
  reembolso: {
    efetuado: { titulo: "Reembolso efetuado", texto: "O reembolso foi processado para o método de pagamento original." },
    verificar: {
      titulo: "Estamos a verificar o reembolso",
      texto: "Houve um problema no processamento do reembolso. Não precisa de fazer nada neste momento.",
    },
    emProcessamento: { titulo: "Reembolso em processamento", texto: "O reembolso foi iniciado para o método de pagamento original." },
  },
  cobranca: {
    vitalicio: (quanto: string) => `${quanto} vitalício`,
    proximaCobranca: (quanto: string) => `${quanto} na próxima cobrança`,
    ate: (quanto: string, data: string) => `${quanto} até ${data}`,
    semCobrancaVitalicio: (valor: string) => `${valor} — sem cobrança prevista, desconto de 100% vitalício ativo`,
    semCobranca: (valor: string) => `${valor} — sem cobrança prevista`,
    desconto: "Desconto",
    descontos: "Descontos",
    proxima: "Próxima cobrança",
    depoisDesconto: "Depois do desconto",
    depoisValor: (preco: string, data: string) => `${preco}/mês a partir de ${data}`,
  },
  conversao: (valor: string, plano: string) =>
    `Utilizámos ${valor} do valor do seu pagamento Avulso para cobrir o primeiro mês do plano ${plano}.`,
  conversaoReembolso: (valor: string) => ` Os restantes ${valor} serão reembolsados para o método de pagamento original.`,
  pagina: {
    titulo: "Subscrição",
    descricao: "O seu plano, a próxima renovação e os casos disponíveis.",
    erros: {
      indisponivel: "Não encontrámos uma subscrição ativa que possa ser alterada. Atualize a página.",
      falha: "Não foi possível concluir o pedido. Tente novamente dentro de alguns minutos.",
    },
    planoAtual: "Plano atual",
    estado: "Estado da subscrição",
    precoPlano: "Preço do plano",
    precoMes: (preco: string, iva: string) => `${preco}/mês (${iva})`,
    proximaRenovacao: "Próxima renovação",
    terminaEm: "A Proteção termina em",
    subscricao: "Subscrição",
    semSubscricao: "Sem subscrição ativa",
    casosDisponiveis: "Casos disponíveis",
    canceladaTitulo: "Cancelamento agendado",
    cancelada: (data: string) => `A sua Proteção continua ativa até ${data}. Depois dessa data não haverá novas cobranças.`,
    mantidaTitulo: "Subscrição mantida",
    mantida: (data: string) => `O cancelamento foi retirado. A sua subscrição renova-se normalmente a ${data}.`,
    protecaoAtiva: "Proteção ativa",
    inativa: "Inativa",
    agendadoTexto: (data: string) =>
      `<b>Cancelamento agendado.</b> A sua Proteção está ativa até ${data}. Até lá, tudo continua a funcionar normalmente. Nessa data, deixamos de acompanhar os seus contratos e de enviar alertas.`,
    guardados: (n: number, data: string) =>
      `Tem ${n === 1 ? "1 caso disponível guardado" : `${n} casos disponíveis guardados`} até ${data}. Se voltar a subscrever o Caso + Proteção até essa data, recupera-os.`,
    verSubscricoes: "Ver subscrições",
    naoApaga:
      "Cancelar a subscrição não apaga os casos que já abriu, os documentos nem o histórico — continuam disponíveis em <casos>Os meus casos</casos>. Para questões sobre cobranças, contacte-nos através de <email/>.",
    livreResolucao: (dias: number) =>
      `O cancelamento é diferente do direito de livre resolução, que pode ser exercido nos ${dias} dias seguintes à compra, nas condições previstas na lei. <saber>Saber mais sobre a livre resolução</saber>.`,
  },
  cancelar: {
    aCancelar: "A cancelar…",
    confirmar: "Confirmar cancelamento",
    cancelar: "Cancelar subscrição",
    porque: "Pode dizer-nos porque pretende cancelar?",
    opcional: "A resposta é opcional e não afeta o cancelamento.",
    motivos: {
      ja_nao_preciso: "Já não preciso do serviço",
      preco: "O preço não se ajusta ao que procuro",
      pouco_uso: "Utilizei pouco as funcionalidades",
      problema_resolvido: "O meu problema ficou resolvido",
      outro: "Outro motivo",
    },
    comentario: "Comentário (opcional)",
    continuar: "Continuar",
    manter: "Manter subscrição",
    titulo: "Cancelar a subscrição?",
    ativaAte: (data: string) => `A sua Proteção continuará ativa até ${data}. `,
    ativaAteFim: "A sua Proteção continuará ativa até ao fim do período já pago. ",
    naoRenovada: "Depois dessa data, a subscrição não será renovada e não haverá novas cobranças.",
    alertas: (meses: number) =>
      `Ao cancelar a subscrição, deixamos de acompanhar os seus contratos e de enviar alertas quando a Proteção terminar. Conservaremos os contratos, os documentos e os dados associados durante ${meses} meses, caso decida voltar à DoLado. Após esse período, serão eliminados ou anonimizados.`,
    casosGuardados: (dias: number) =>
      `Os seus casos disponíveis ficam guardados durante ${dias} dias depois dessa data. Se voltar a subscrever o Caso + Proteção nesse período, recupera-os.`,
    naoApagados: "Os casos que já abriu, os documentos e o histórico não são apagados.",
    aGuardar: "A guardar…",
  },
};
