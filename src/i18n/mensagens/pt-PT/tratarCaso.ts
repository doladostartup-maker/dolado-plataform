// Fluxo "Tratar o meu caso" (/tratar-caso → conta → modalidade → recebido)
// e Caso Extra (componente partilhado com o portal).

export const tratarCaso = {
  metadados: {
    titulo: "Tratar o meu caso - DoLado",
    descricao: "Descreva o seu caso, crie a sua conta e escolha como quer que a DoLado o trate.",
  },
  etapas: {
    rotulo: "Etapas",
    nomes: ["O seu caso", "Conta", "Modalidade", "Pagamento"],
    concluida: " (concluída)",
    atual: " (atual)",
  },
  formulario: {
    titulo: "Tratar o meu caso",
    duracao: "Cerca de 5 minutos",
    nomesPasso: ["Empresa", "Problema", "Contexto", "Documentos", "Os seus dados"],
    passoDe: (n: number, nome: string) => `Passo ${n} de 5 · ${nome}`,
    entrada: {
      usarCaso: (casos: string) => `Tem ${casos} na sua conta.`,
      usarCasoTexto: "No final, este pedido usa um deles, sem novo pagamento.",
      casoExtra: "Já utilizou o caso incluído neste mês na sua subscrição.",
      casoExtraTexto: (nome: string, beneficio: string) => `No final, pode tratar este caso como ${nome} (${beneficio}):`,
      casoExtraFim: (iva: string) => `(${iva}). A sua subscrição continua ativa e não é alterada. Só paga depois de rever o pedido.`,
      soAvulso: "A sua subscrição não tem casos disponíveis neste momento.",
      soAvulsoTexto: (nome: string, preco: string, iva: string) =>
        `No final, pode tratar este caso com um caso ${nome}: ${preco} (${iva}). Só paga depois de rever a modalidade.`,
      escolher: "No final, escolhe como quer que a DoLado trate o seu caso.",
      escolherTexto: (iva: string) => `(${iva}). Só paga depois de rever a modalidade escolhida.`,
      verPrecario: "Ver preçário",
    },
    passo1: {
      titulo: "Com que tipo de empresa é o problema?",
      empresa: "Qual é a empresa?",
      empresaExemplo: "Ex.: MEO, NOS, Vodafone, EDP, Galp…",
    },
    passo2: {
      titulo: "O que aconteceu?",
      descricao: "Conte-nos por palavras suas",
      descricaoExemplo: "Por exemplo: em agosto a mensalidade subiu de 35 € para 42 € e não recebi nenhum aviso.",
    },
    passo3: {
      titulo: "Já reclamou junto da empresa?",
      texto: "Isto ajuda-nos a escolher o passo certo. Não há resposta errada.",
    },
    passo4: {
      titulo: "Tem algum documento?",
      texto: "Opcional. Se não tiver agora, pedimos-lho depois.",
      aCarregar: "A carregar…",
      escolher: "Escolher ficheiro",
      tipos: "Fatura, contrato, e-mail ou captura de ecrã · PDF ou imagem",
      remover: "Remover",
    },
    passo5: {
      titulo: "Como falamos consigo?",
      comSessao: "Usamos o e-mail da sua conta para o contactar sobre este caso.",
      semSessao: "A seguir, cria a sua conta com o seu e-mail: é por lá que acompanha o caso.",
      nome: "Nome",
      telefone: "Telemóvel (opcional)",
      autorizacao:
        "Peço à DoLado que analise esta reclamação e confirmo que a informação é verdadeira. Li a <privacidade>Política de Privacidade</privacidade>. Nada é enviado à empresa sem a minha autorização expressa.",
    },
    continuar: "Continuar",
    voltar: "← Voltar",
    aGuardar: "A guardar…",
    erros: {
      setor: "Selecione um tipo de empresa.",
      empresa: "Indique o nome da empresa.",
      problema: "Selecione o que aconteceu.",
      momento: "Selecione uma opção.",
      nome: "Insira um nome válido.",
      telefone: "Telemóvel inválido.",
      autorizacao: "Confirme o pedido para continuar.",
      formato: "Formato não suportado. Envie um PDF, JPG, PNG ou HEIC.",
      tamanho: "O ficheiro excede o limite de 10 MB.",
      carregar: "Não foi possível carregar o ficheiro. Tente novamente.",
    },
  },
  conta: {
    confirmarTitulo: "Confirme o seu e-mail",
    confirmarTexto:
      "Enviámos uma mensagem para <b>{email}</b>. Introduza aqui o código que recebeu ou carregue em “Confirmar o meu e-mail” neste dispositivo. Depois, escolhe a modalidade e conclui o pedido.",
    codigo: "Código de confirmação",
    aConfirmar: "A confirmar…",
    confirmar: "Confirmar e continuar",
    aEnviar: "A enviar…",
    reenviar: "Não recebeu? Enviar de novo",
    crie: "Crie a sua conta",
    entre: "Entre na sua conta",
    guardado:
      "O seu pedido já está guardado. Com a conta, acompanha o caso no portal e não precisa de voltar a introduzir estes dados depois do pagamento.",
    google: "Continuar com Google",
    ouEmail: "ou com e-mail",
    email: "E-mail",
    palavraPasse: "Palavra-passe",
    minimo: "Pelo menos 8 caracteres.",
    aCriar: "A criar a conta…",
    criar: "Criar conta e continuar",
    aEntrar: "A entrar…",
    entrar: "Entrar e continuar",
    jaTem: "Já tem conta? ",
    naoTem: "Ainda não tem conta? ",
    jaTenho: "Já tenho conta",
    criarConta: "Criar conta",
    semCusto:
      "Criar conta não tem custo. O tratamento do caso só começa depois de escolher a modalidade e de o pagamento ser confirmado.",
  },
  modalidade: {
    titulo: "Como quer que a DoLado trate o seu caso?",
    texto: "O seu pedido está guardado. Só começamos a tratar o caso depois de o pagamento ser confirmado.",
    oSeuPedido: "O seu pedido",
    alterar: "Alterar o pedido",
    cancelado:
      "O pagamento não foi concluído e nada foi cobrado. O seu pedido continua guardado: pode escolher a modalidade e pagar quando quiser.",
    semCasos: "Não tem casos disponíveis neste momento. Escolha uma das modalidades abaixo.",
    casoExtraIndisponivel:
      "Não foi possível confirmar o benefício de subscritor neste momento, por isso nada foi cobrado. O seu pedido continua guardado: tente novamente dentro de alguns minutos ou veja abaixo as opções disponíveis.",
    usarCasoTitulo: "Usar um dos seus casos disponíveis",
    usarCasoTexto: (casos: string) => `${casos} na sua conta. Este pedido usa um deles, sem novo pagamento.`,
    usarCaso: "Usar um caso disponível",
    cta: { avulso: "Escolher Avulso", caso_protecao: "Escolher Caso + Proteção" },
    precoNormal: "Preço normal: ",
    descontoNovo: "Desconto de indicação",
    descontoRecompensa: "Com 1 dos seus descontos de indicação",
    casoExtraNota: (plano: string, nome: string) =>
      `A sua subscrição ${plano} continua ativa e não é alterada: o ${nome} só acrescenta o tratamento deste caso.`,
    soAvulsoNota: (nome: string) =>
      `A sua subscrição atual não tem casos disponíveis neste momento. Pode tratar este caso com um caso ${nome}.`,
  },
  recebido: {
    pagamentoConfirmado: "Pagamento confirmado",
    casoUtilizado: "Caso disponível utilizado",
    titulo: "Recebemos o seu caso.",
    texto:
      "Enviámos uma confirmação para o seu e-mail. A DoLado irá analisar as informações enviadas e, antes de qualquer envio, poderá entrar em contacto consigo para confirmar os factos ou solicitar informações adicionais.",
    acompanhar: "Acompanhar o meu caso",
    naoConcluido: "O pagamento não foi concluído",
    naoConcluidoTexto:
      "O seu pedido continua guardado, mas ainda não é um caso. Pode tentar pagar de novo, com o mesmo ou com outro método de pagamento.",
    escolherModalidade: "Escolher a modalidade",
    emConfirmacao: "Pagamento em confirmação",
    emConfirmacaoTexto:
      "O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns métodos, como o débito direto SEPA, podem demorar alguns dias úteis; assim que o pagamento for confirmado, o seu caso é recebido e avisamos por e-mail.",
    irPortal: "Ir para o portal",
    obrigado: "Obrigado. Estamos a confirmar o pagamento.",
    obrigadoTexto: "Assim que o Stripe confirmar o pagamento, o seu caso é recebido e esta página é atualizada.",
    concluir: "Concluir o pedido",
    aConfirmar: "A confirmar o pagamento…",
    demora:
      "A confirmação está a demorar mais do que o habitual. Não precisa de voltar a pagar: assim que o pagamento for confirmado, enviamos-lhe um e-mail e o caso fica disponível no portal.",
  },
  casoExtra: {
    cta: (preco: string) => `Tratar um Caso Extra — ${preco}`,
    precoNormal: "Preço normal: ",
    precoSubscritores: "Preço para subscritores: ",
    proximoCaso: (data: string) => `O seu próximo caso incluído ficará disponível em ${data}.`,
    cancelamentoAgendado: (data: string) =>
      `A sua subscrição tem o cancelamento agendado para ${data}; até lá continua ativa, mas não haverá novo caso incluído.`,
    casosDoMes: "Casos deste mês",
    casoIncluido: "Caso incluído na subscrição",
    utilizacao: (utilizado: boolean) => (utilizado ? "1 de 1 utilizado" : "0 de 1 utilizado"),
    acumulados: (n: number) => ` · mais ${n === 1 ? "1 caso acumulado" : `${n} casos acumulados`}`,
    proximoIncluido: "Próximo caso incluído",
    ativaAte: "Subscrição ativa até",
    compradosPorUsar: "Casos comprados por usar",
    jaUtilizou: "Já utilizou o seu caso incluído neste mês",
    naoPodeEsperar: "Tem um problema que não pode esperar?",
    comoSubscritor: (nome: string, percentagem: number) =>
      `Como subscritor DoLado, pode tratar um ${nome} com ${percentagem}% de desconto.`,
    comoSubscritorEste: (nome: string, percentagem: number) =>
      `Como subscritor DoLado, pode tratar este caso como ${nome}, com ${percentagem}% de desconto.`,
    primeiro: "Primeiro, conte-nos o que aconteceu; só paga no fim. A sua subscrição continua ativa e não é alterada.",
  },
  /** Mensagens das ações (servidor) e das regras de src/lib/pedidoCaso.ts. */
  mensagens: {
    "Demasiados pedidos. Tente novamente dentro de alguns minutos.": "Demasiados pedidos. Tente novamente dentro de alguns minutos.",
    "Não foi possível guardar o seu pedido. Tente novamente.": "Não foi possível guardar o seu pedido. Tente novamente.",
    "Indique o setor e a empresa.": "Indique o setor e a empresa.",
    "Selecione o que aconteceu.": "Selecione o que aconteceu.",
    "Indique se já reclamou junto da empresa.": "Indique se já reclamou junto da empresa.",
    "Insira um nome válido.": "Insira um nome válido.",
    "Telemóvel inválido.": "Telemóvel inválido.",
    "Confirme o pedido para avançar.": "Confirme o pedido para avançar.",
    "Já existe uma conta com este e-mail. Use “Já tenho conta” para entrar.":
      "Já existe uma conta com este e-mail. Use “Já tenho conta” para entrar.",
    "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.":
      "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.",
    "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.":
      "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.",
    "E-mail ou palavra-passe incorretos.": "E-mail ou palavra-passe incorretos.",
    "O código é inválido ou expirou. Peça um novo código.": "O código é inválido ou expirou. Peça um novo código.",
    "Não foi possível concluir. Tente novamente.": "Não foi possível concluir. Tente novamente.",
    "Insira um e-mail válido.": "Insira um e-mail válido.",
    "A palavra-passe tem de ter pelo menos 8 caracteres.": "A palavra-passe tem de ter pelo menos 8 caracteres.",
    "Enviámos-lhe um e-mail para confirmar o endereço.": "Enviámos-lhe um e-mail para confirmar o endereço.",
    "Introduza o código que recebeu por e-mail.": "Introduza o código que recebeu por e-mail.",
    "Enviámos um novo e-mail de confirmação.": "Enviámos um novo e-mail de confirmação.",
    "Indique o e-mail e a palavra-passe.": "Indique o e-mail e a palavra-passe.",
    "Ainda não confirmou o seu e-mail. Enviámos-lhe um novo e-mail de confirmação.":
      "Ainda não confirmou o seu e-mail. Enviámos-lhe um novo e-mail de confirmação.",
    "Tipo de ficheiro não suportado. Envie um PDF ou uma imagem.": "Tipo de ficheiro não suportado. Envie um PDF ou uma imagem.",
    "O ficheiro excede o limite de 10 MB.": "O ficheiro excede o limite de 10 MB.",
    "Não foi possível preparar o envio do ficheiro.": "Não foi possível preparar o envio do ficheiro.",
  },
};
