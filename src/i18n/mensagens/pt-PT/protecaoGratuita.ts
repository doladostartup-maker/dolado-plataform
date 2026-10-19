// Proteção gratuita durante 30 dias: oferta nas páginas públicas, página de
// ativação, estado no portal, e-mails do período e lembretes. Regras em
// src/lib/protecaoGratuita.ts; preços sempre de src/lib/planos.ts (passados
// como argumento — nunca escritos aqui).

export const protecaoGratuita = {
  oferta: {
    destaque: "30 dias de Protecção grátis",
    texto:
      "Detecte alterações nas suas facturas e receba avisos antes do fim de promoções e fidelizações, para agir antes de pagar a mais.",
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
      titulo: "Protecção gratuita durante 30 dias",
      texto: (preco: string) =>
        `Quem nunca teve a Protecção pode experimentá-la durante 30 dias, uma vez, sem cartão bancário. O período começa quando a activa e termina sozinho, sem cobrança. Para continuar, adere expressamente à Protecção por ${preco}/mês; se aderir durante o período gratuito, a primeira cobrança só é feita quando ele terminar. Não se aplica ao Caso + Protecção nem ao Avulso.`,
    },
  },

  ativar: {
    metadados: "Experimentar a Protecção gratuitamente",
    eyebrow: "Protecção · 30 dias grátis",
    titulo: "Experimente a Protecção durante 30 dias",
    texto:
      "A Protecção verifica se as suas facturas correspondem às condições que contratou: compara cada factura com o contrato que adicionar e com as facturas anteriores, para detectar aumentos de preço ou cobranças que não esperava. Envia também avisos antes do fim de promoções e de períodos de fidelização, para poder agir antes de o problema crescer.",
    resumoTitulo: "Como funciona",
    resumo: {
      inicio: "Começa hoje, quando confirmar.",
      fim: (data: string) => `Termina a ${data}.`,
      semCartao: "Não pedimos cartão bancário nem outro meio de pagamento.",
      semCobranca: (preco: string) =>
        `No fim dos 30 dias, a Protecção gratuita termina sem qualquer cobrança. Para continuar, terá de escolher aderir por ${preco}/mês.`,
      semCasos: "Não inclui o tratamento de casos.",
      umaVez: "Só pode ser usada uma vez por pessoa.",
    },
    aceitar: " Compreendo que a Protecção gratuita termina ao fim de 30 dias sem qualquer cobrança.",
    botao: "Activar a Protecção gratuita",
    aAtivar: "A activar…",
    semSessao: "Para activar a Protecção gratuita, crie uma conta ou inicie sessão. Não pedimos cartão bancário.",
    criarConta: "Criar conta",
    iniciarSessao: "Iniciar sessão",
    irParaProtecao: "Ir para a Protecção",
    verPlanos: "Ver os planos",
    subscrever: (preco: string) => `Subscrever a Protecção por ${preco}/mês`,
    motivos: {
      ativa: "A sua Protecção gratuita já está activa.",
      ja_utilizada: "A Protecção gratuita só pode ser usada uma vez. Pode continuar com a Protecção quando quiser.",
      ja_teve_protecao: "A Protecção gratuita é para quem ainda não teve a Protecção. Pode voltar a subscrevê-la quando quiser.",
      protecao_ativa: "Já tem a Protecção activa na sua subscrição.",
      email_nao_confirmado:
        "Confirme primeiro o seu e-mail: enviámos-lhe uma ligação quando criou a conta. Depois, volte a esta página.",
      conta_invalida: "Esta conta não pode activar a Protecção gratuita.",
      indisponivel: "A Protecção gratuita não está disponível de momento.",
      erro: "Não foi possível activar a Protecção gratuita. Tente novamente dentro de alguns minutos.",
      aceitarTermos: "Para continuar, aceite os Termos e Condições.",
    },
  },

  portal: {
    titulo: "A sua Protecção gratuita está activa.",
    faltam: (n: number) => (n === 1 ? "Falta 1 dia para terminar." : `Faltam ${n} dias para terminar.`),
    inicio: "Início",
    fim: "Fim",
    diasRestantes: "Dias restantes",
    continuar: (preco: string) => `Continue com a Protecção por ${preco}/mês.`,
    cobrancaNoFim: (data: string) => `Se aderir agora, a primeira cobrança só é feita a ${data}, quando terminar o período gratuito.`,
    cobrancaHoje: "Se aderir agora, a primeira cobrança é feita no dia da adesão.",
    semCobranca: "Se não fizer nada, a Protecção gratuita termina sem qualquer cobrança.",
    cta: "Continuar com a Protecção",
    terminouTitulo: "A sua Protecção gratuita terminou.",
    terminou: (data: string, meses: number) =>
      `Terminou a ${data}, sem qualquer cobrança. Os seus serviços e documentos ficam guardados durante ${meses} meses e voltam a ficar activos se aderir à Protecção nesse prazo.`,
    aderir: "Aderir à Protecção",
    estadoPlano: "Protecção gratuita",
    estadoAtiva: "Activa",
    valor: {
      titulo: "O que a Protecção já fez por si",
      ultimaFatura: "Última factura analisada",
      ultimaVerificacao: "Última verificação",
      alertas: "Avisos de datas activos",
      proximaData: "Próxima data relevante",
      diferencas: "Alterações identificadas",
      nenhuma: "Nenhuma até agora",
      semDocumentos:
        "Ainda não adicionou documentos. Adicione uma factura ou um contrato para a DoLado verificar a sua situação actual e passar a acompanhar as datas que importam.",
      adicionar: "Adicionar um documento",
    },
    banner: {
      titulo: "Experimente a Protecção durante 30 dias, sem cartão bancário.",
      texto: "Sem compromisso e sem cobrança automática no fim.",
      cta: "Experimentar 30 dias grátis",
    },
  },

  confirmarCompra: {
    cobrancaNoFim: (data: string) =>
      `Está na Protecção gratuita: não é cobrado nada agora. A primeira cobrança é feita a ${data}, quando terminar o período gratuito. Pode cancelar antes dessa data sem qualquer cobrança.`,
    cobrancaHoje: "Está na Protecção gratuita: como faltam menos de 2 dias para terminar, a primeira cobrança é feita hoje.",
    casoProtecao: "A Protecção gratuita termina quando esta subscrição começar.",
  },

  pagamento: {
    rotuloPrimeiraCobranca: "Primeira cobrança",
    primeiraCobranca: (preco: string, data: string) => `${preco} a ${data}`,
    nota: "Aderiu durante a Protecção gratuita: não foi cobrado nada agora. A primeira cobrança é feita no fim do período gratuito e, a partir daí, todos os meses até cancelar.",
  },

  emails: {
    botaoPortal: "Abrir a Protecção",
    botaoDocumento: "Adicionar um documento",
    botaoAderir: "Continuar com a Protecção",
    semCobranca: "Não haverá nenhuma cobrança automática.",
    lembretes: "Não quer receber estes lembretes?",
    lembretesLigacao: "Deixar de receber",
    d0: {
      assunto: "A sua Protecção gratuita está activa",
      titulo: "A sua Protecção gratuita está activa",
      texto: (inicio: string, fim: string) => `A sua Protecção gratuita da DoLado está activa de ${inicio} a ${fim}.`,
      passo:
        "Para começarmos, adicione uma factura ou um contrato no portal: verificamos a sua situação actual e passamos a enviar avisos antes do fim de promoções e períodos de fidelização.",
      condicoes: (preco: string) =>
        `Não pedimos cartão bancário. No fim dos 30 dias, a Protecção gratuita termina sem qualquer cobrança; só continua se decidir aderir por ${preco}/mês.`,
    },
    d7: {
      assunto: "A sua Protecção: o que pode fazer esta semana",
      titulo: "A sua Protecção gratuita",
      semDocumentos:
        "Ainda não adicionou nenhum documento. Com uma factura ou um contrato, a DoLado verifica a sua situação actual e passa a acompanhar as datas e os valores que importam.",
      comDocumentos: (n: number) =>
        `${n === 1 ? "Já tem 1 documento" : `Já tem ${n} documentos`} na Protecção. Pode adicionar outros serviços, como electricidade, gás ou telecomunicações, para acompanharmos mais situações.`,
      fim: (fim: string) => `A sua Protecção gratuita está activa até ${fim}.`,
    },
    d25: {
      assunto: "Faltam 5 dias para terminar a sua Protecção gratuita",
      titulo: "Faltam 5 dias",
      texto: (fim: string) => `A sua Protecção gratuita termina a ${fim}.`,
      continuar: (preco: string) =>
        `Se quiser continuar, pode aderir à Protecção por ${preco}/mês no portal. A primeira cobrança só é feita quando terminar o período gratuito.`,
      parar: "Se não fizer nada, a Protecção gratuita termina sem qualquer cobrança.",
    },
    d29: {
      assunto: "Último aviso: a sua Protecção gratuita está a terminar",
      titulo: "A sua Protecção gratuita está a terminar",
      texto: (fim: string) => `A sua Protecção gratuita termina a ${fim}.`,
      continuar: (preco: string) =>
        `Para continuar, adira à Protecção por ${preco}/mês no portal. A primeira cobrança é feita no dia da adesão.`,
      parar: (meses: number) =>
        `Se não fizer nada, termina sem qualquer cobrança. Os seus serviços e documentos ficam guardados durante ${meses} meses.`,
    },
    d30: {
      assunto: "A sua Protecção gratuita terminou",
      titulo: "A sua Protecção gratuita terminou",
      texto: (fim: string) => `A sua Protecção gratuita terminou a ${fim}, sem qualquer cobrança.`,
      efeito:
        "Deixámos de verificar os seus documentos e de enviar avisos de datas. Não foi criada nenhuma subscrição.",
      guardados: (meses: number) =>
        `Os seus serviços e documentos ficam guardados durante ${meses} meses: se aderir à Protecção nesse prazo, voltam a ficar activos.`,
    },
  },

  faq: {
    experimentar: {
      pergunta: "Posso experimentar a Protecção sem pagar?",
      resposta:
        "Sim. Quem nunca teve a Protecção pode experimentá-la gratuitamente durante 30 dias, uma vez, sem cartão bancário. O período começa quando a activa e dá acesso às funcionalidades da Protecção. Não inclui o tratamento de casos.",
    },
    fim: {
      pergunta: "O que acontece no fim dos 30 dias grátis?",
      resposta: (preco: string, meses: number) =>
        `A Protecção gratuita termina sozinha, sem qualquer cobrança e sem criar uma subscrição. Para continuar, pode aderir à Protecção por ${preco}/mês; se aderir antes do fim, a primeira cobrança só é feita quando o período gratuito terminar. Se não aderir, os seus serviços e documentos ficam guardados durante ${meses} meses e voltam a ficar activos se aderir nesse prazo.`,
    },
  },

  lembretes: {
    metadados: "Lembretes da Protecção gratuita",
    titulo: "Lembretes da Protecção gratuita",
    texto:
      "Confirme que não quer receber os lembretes opcionais da Protecção gratuita. Continuará a receber os avisos de início e de fim do período gratuito.",
    botao: "Deixar de receber",
    feito: "Não voltará a receber estes lembretes.",
    invalida: "Esta ligação não é válida.",
  },
};
