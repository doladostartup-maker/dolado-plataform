// Proteção gratuita durante 30 dias: oferta nas páginas públicas, página de
// ativação, estado no portal, e-mails do período e lembretes. Regras em
// src/lib/protecaoGratuita.ts; preços sempre de src/lib/planos.ts (passados
// como argumento — nunca escritos aqui).

export const protecaoGratuita = {
  oferta: {
    destaque: "30 dias de Proteção grátis",
    texto:
      "Detete alterações nas suas faturas e receba avisos antes do fim de promoções e fidelizações, para agir antes de pagar a mais.",
    micro: "Sem cartão bancário. Sem compromisso.",
    cta: "Experimentar 30 dias grátis",
    depois: (preco: string) => `Depois, ${preco}/mês, apenas se decidir continuar.`,
  },

  precario: {
    selo: "30 dias grátis",
    preco: "0 €",
    unidade: "nos primeiros 30 dias",
    depois: (preco: string) => `Depois, ${preco}/mês, se decidir continuar`,
    garantias: ["Sem cartão bancário", "Sem compromisso", "Sem cobrança automática no fim dos 30 dias"],
    subscreverJa: (preco: string) => `Subscrever já por ${preco}/mês`,
    condicao: {
      titulo: "Proteção gratuita durante 30 dias",
      texto: (preco: string) =>
        `Quem nunca teve a Proteção pode experimentá-la durante 30 dias, uma vez, sem cartão bancário. O período começa quando a ativa e termina sozinho, sem cobrança. Para continuar, adere expressamente à Proteção por ${preco}/mês; se aderir durante o período gratuito, a primeira cobrança só é feita quando ele terminar. Não se aplica ao Caso + Proteção nem ao Avulso.`,
    },
  },

  ativar: {
    metadados: "Experimentar a Proteção gratuitamente",
    eyebrow: "Proteção · 30 dias grátis",
    titulo: "Experimente a Proteção durante 30 dias",
    texto:
      "A Proteção compara as suas faturas para detetar alterações e envia avisos antes do fim de promoções e períodos de fidelização, para poder agir antes de o problema crescer.",
    resumoTitulo: "Como funciona",
    resumo: {
      inicio: "Começa hoje, quando confirmar.",
      fim: (data: string) => `Termina a ${data}.`,
      semCartao: "Não pedimos cartão bancário nem outro meio de pagamento.",
      semCobranca: (preco: string) =>
        `No fim dos 30 dias, a Proteção gratuita termina sem qualquer cobrança. Para continuar, terá de escolher aderir por ${preco}/mês.`,
      semCasos: "Não inclui o tratamento de casos.",
      umaVez: "Só pode ser usada uma vez por pessoa.",
    },
    aceitar: " Compreendo que a Proteção gratuita termina ao fim de 30 dias sem qualquer cobrança.",
    botao: "Ativar a Proteção gratuita",
    aAtivar: "A ativar…",
    semSessao: "Para ativar a Proteção gratuita, crie uma conta ou inicie sessão. Não pedimos cartão bancário.",
    criarConta: "Criar conta",
    iniciarSessao: "Iniciar sessão",
    irParaProtecao: "Ir para a Proteção",
    verPlanos: "Ver os planos",
    subscrever: (preco: string) => `Subscrever a Proteção por ${preco}/mês`,
    motivos: {
      ativa: "A sua Proteção gratuita já está ativa.",
      ja_utilizada: "A Proteção gratuita só pode ser usada uma vez. Pode continuar com a Proteção quando quiser.",
      ja_teve_protecao: "A Proteção gratuita é para quem ainda não teve a Proteção. Pode voltar a subscrevê-la quando quiser.",
      protecao_ativa: "Já tem a Proteção ativa na sua subscrição.",
      email_nao_confirmado:
        "Confirme primeiro o seu e-mail: enviámos-lhe uma ligação quando criou a conta. Depois, volte a esta página.",
      conta_invalida: "Esta conta não pode ativar a Proteção gratuita.",
      indisponivel: "A Proteção gratuita não está disponível de momento.",
      erro: "Não foi possível ativar a Proteção gratuita. Tente novamente dentro de alguns minutos.",
      aceitarTermos: "Para continuar, aceite os Termos e Condições.",
    },
  },

  portal: {
    titulo: "A sua Proteção gratuita está ativa.",
    faltam: (n: number) => (n === 1 ? "Falta 1 dia para terminar." : `Faltam ${n} dias para terminar.`),
    inicio: "Início",
    fim: "Fim",
    diasRestantes: "Dias restantes",
    continuar: (preco: string) => `Continue com a Proteção por ${preco}/mês.`,
    cobrancaNoFim: (data: string) => `Se aderir agora, a primeira cobrança só é feita a ${data}, quando terminar o período gratuito.`,
    cobrancaHoje: "Se aderir agora, a primeira cobrança é feita no dia da adesão.",
    semCobranca: "Se não fizer nada, a Proteção gratuita termina sem qualquer cobrança.",
    cta: "Continuar com a Proteção",
    terminouTitulo: "A sua Proteção gratuita terminou.",
    terminou: (data: string, meses: number) =>
      `Terminou a ${data}, sem qualquer cobrança. Os seus serviços e documentos ficam guardados durante ${meses} meses e voltam a ficar ativos se aderir à Proteção nesse prazo.`,
    aderir: "Aderir à Proteção",
    estadoPlano: "Proteção gratuita",
    estadoAtiva: "Ativa",
    valor: {
      titulo: "O que a Proteção já fez por si",
      ultimaFatura: "Última fatura analisada",
      ultimaVerificacao: "Última verificação",
      alertas: "Avisos de datas ativos",
      proximaData: "Próxima data relevante",
      diferencas: "Alterações identificadas",
      nenhuma: "Nenhuma até agora",
      semDocumentos:
        "Ainda não adicionou documentos. Adicione uma fatura ou um contrato para a DoLado verificar a sua situação atual e passar a acompanhar as datas que importam.",
      adicionar: "Adicionar um documento",
    },
    banner: {
      titulo: "Experimente a Proteção durante 30 dias, sem cartão bancário.",
      texto: "Sem compromisso e sem cobrança automática no fim.",
      cta: "Experimentar 30 dias grátis",
    },
  },

  confirmarCompra: {
    cobrancaNoFim: (data: string) =>
      `Está na Proteção gratuita: não é cobrado nada agora. A primeira cobrança é feita a ${data}, quando terminar o período gratuito. Pode cancelar antes dessa data sem qualquer cobrança.`,
    cobrancaHoje: "Está na Proteção gratuita: como faltam menos de 2 dias para terminar, a primeira cobrança é feita hoje.",
    casoProtecao: "A Proteção gratuita termina quando esta subscrição começar.",
  },

  pagamento: {
    rotuloPrimeiraCobranca: "Primeira cobrança",
    primeiraCobranca: (preco: string, data: string) => `${preco} a ${data}`,
    nota: "Aderiu durante a Proteção gratuita: não foi cobrado nada agora. A primeira cobrança é feita no fim do período gratuito e, a partir daí, todos os meses até cancelar.",
  },

  emails: {
    botaoPortal: "Abrir a Proteção",
    botaoDocumento: "Adicionar um documento",
    botaoAderir: "Continuar com a Proteção",
    semCobranca: "Não haverá nenhuma cobrança automática.",
    lembretes: "Não quer receber estes lembretes?",
    lembretesLigacao: "Deixar de receber",
    d0: {
      assunto: "A sua Proteção gratuita está ativa",
      titulo: "A sua Proteção gratuita está ativa",
      texto: (inicio: string, fim: string) => `A sua Proteção gratuita da DoLado está ativa de ${inicio} a ${fim}.`,
      passo:
        "Para começarmos, adicione uma fatura ou um contrato no portal: verificamos a sua situação atual e passamos a enviar avisos antes do fim de promoções e períodos de fidelização.",
      condicoes: (preco: string) =>
        `Não pedimos cartão bancário. No fim dos 30 dias, a Proteção gratuita termina sem qualquer cobrança; só continua se decidir aderir por ${preco}/mês.`,
    },
    d7: {
      assunto: "A sua Proteção: o que pode fazer esta semana",
      titulo: "A sua Proteção gratuita",
      semDocumentos:
        "Ainda não adicionou nenhum documento. Com uma fatura ou um contrato, a DoLado verifica a sua situação atual e passa a acompanhar as datas e os valores que importam.",
      comDocumentos: (n: number) =>
        `${n === 1 ? "Já tem 1 documento" : `Já tem ${n} documentos`} na Proteção. Pode adicionar outros serviços, como eletricidade, gás ou telecomunicações, para acompanharmos mais situações.`,
      fim: (fim: string) => `A sua Proteção gratuita está ativa até ${fim}.`,
    },
    d25: {
      assunto: "Faltam 5 dias para terminar a sua Proteção gratuita",
      titulo: "Faltam 5 dias",
      texto: (fim: string) => `A sua Proteção gratuita termina a ${fim}.`,
      continuar: (preco: string) =>
        `Se quiser continuar, pode aderir à Proteção por ${preco}/mês no portal. A primeira cobrança só é feita quando terminar o período gratuito.`,
      parar: "Se não fizer nada, a Proteção gratuita termina sem qualquer cobrança.",
    },
    d29: {
      assunto: "Último aviso: a sua Proteção gratuita está a terminar",
      titulo: "A sua Proteção gratuita está a terminar",
      texto: (fim: string) => `A sua Proteção gratuita termina a ${fim}.`,
      continuar: (preco: string) =>
        `Para continuar, adira à Proteção por ${preco}/mês no portal. A primeira cobrança é feita no dia da adesão.`,
      parar: (meses: number) =>
        `Se não fizer nada, termina sem qualquer cobrança. Os seus serviços e documentos ficam guardados durante ${meses} meses.`,
    },
    d30: {
      assunto: "A sua Proteção gratuita terminou",
      titulo: "A sua Proteção gratuita terminou",
      texto: (fim: string) => `A sua Proteção gratuita terminou a ${fim}, sem qualquer cobrança.`,
      efeito:
        "Deixámos de verificar os seus documentos e de enviar avisos de datas. Não foi criada nenhuma subscrição.",
      guardados: (meses: number) =>
        `Os seus serviços e documentos ficam guardados durante ${meses} meses: se aderir à Proteção nesse prazo, voltam a ficar ativos.`,
    },
  },

  faq: {
    experimentar: {
      pergunta: "Posso experimentar a Proteção sem pagar?",
      resposta:
        "Sim. Quem nunca teve a Proteção pode experimentá-la gratuitamente durante 30 dias, uma vez, sem cartão bancário. O período começa quando a ativa e dá acesso às funcionalidades da Proteção. Não inclui o tratamento de casos.",
    },
    fim: {
      pergunta: "O que acontece no fim dos 30 dias grátis?",
      resposta: (preco: string, meses: number) =>
        `A Proteção gratuita termina sozinha, sem qualquer cobrança e sem criar uma subscrição. Para continuar, pode aderir à Proteção por ${preco}/mês; se aderir antes do fim, a primeira cobrança só é feita quando o período gratuito terminar. Se não aderir, os seus serviços e documentos ficam guardados durante ${meses} meses e voltam a ficar ativos se aderir nesse prazo.`,
    },
  },

  lembretes: {
    metadados: "Lembretes da Proteção gratuita",
    titulo: "Lembretes da Proteção gratuita",
    texto:
      "Confirme que não quer receber os lembretes opcionais da Proteção gratuita. Continuará a receber os avisos de início e de fim do período gratuito.",
    botao: "Deixar de receber",
    feito: "Não voltará a receber estes lembretes.",
    invalida: "Esta ligação não é válida.",
  },
};
