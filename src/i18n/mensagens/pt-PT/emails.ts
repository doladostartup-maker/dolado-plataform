// E-mails transacionais ao cliente (Brevo). Português: o texto de sempre —
// alterar aqui muda os e-mails enviados. Os avisos internos à equipa
// (backoffice) ficam fora deste dicionário: são sempre em português.
//
// Os argumentos `html` já vêm escapados por quem chama (src/lib/email/*).

export const emails = {
  comum: {
    ola: "Olá,",
    olaNome: (nomeHtml: string) => `Olá ${nomeHtml},`,
    /** " relativa a <strong>X</strong>" (X já escapado). */
    sobre: (html: string) => ` relativa a <strong>${html}</strong>`,
    /** Nota no fim dos e-mails em inglês sobre os documentos legais (vazia em português). */
    notaDocumentosPortugues: "",
  },

  pagamento: {
    titulo: "Pagamento confirmado — DoLado",
    assuntoContaExiste: "Pagamento confirmado — o seu acesso está activo ✓",
    assuntoAssociar: "Pagamento confirmado — Associe esta compra à sua conta ✓",
    assuntoCriarConta: "Pagamento confirmado — Falta criar a sua palavra-passe ✓",
    introducao: "O seu pagamento foi confirmado. Obrigado por confiar na DoLado. Guarde este e-mail como confirmação da sua contratação.",
    passoCasoExtra:
      "Tem 1 Caso Extra na sua conta. Se pagou um caso que já tinha descrito, esse caso segue para tratamento; acompanhe-o em Os meus casos.",
    passoContaExiste: "Já pode iniciar sessão no portal: o seu acesso já está activo.",
    passoAssociar: "Já existe uma conta na DoLado com este e-mail. Falta só um passo: inicie sessão e associe esta compra à sua conta.",
    passoCriarProtecao: "Falta só um passo: crie a sua palavra-passe para aceder ao portal.",
    passoCriarCaso: "Falta só um passo: crie a sua palavra-passe para aceder ao portal e abrir o seu caso.",
    botaoCasoExtra: "Ver os meus casos",
    botaoIniciarSessao: "Iniciar sessão",
    botaoAssociar: "Associar a compra",
    botaoCriarConta: "Criar a minha conta",
    rotuloProduto: "Produto",
    rotuloValorPago: "Valor pago",
    rotuloTipo: "Tipo",
    rotuloPrecoPlano: "Preço do plano",
    rotuloRenovacao: "Próxima renovação",
    rotuloSubscricao: "A sua subscrição",
    tipoSubscricao: "Subscrição mensal com renovação automática",
    tipoUnico: "Pagamento único",
    subscricaoInalterada: "Continua activa e não foi alterada",
    /** `gestaoHtml`: ligação "Gestão de Subscrição" já montada. */
    renovacao: (comDesconto: boolean, gestaoHtml: (texto: string) => string) =>
      `<strong>Renovação e cancelamento.</strong> A subscrição renova-se automaticamente todos os meses${
        comDesconto ? ", com os descontos aplicados nas condições do código usado no pagamento" : ""
      }, até a cancelar. Pode cancelar a qualquer momento em ${gestaoHtml("Gestão de Subscrição")}, na sua área de cliente; o cancelamento produz efeitos no fim do período já pago.`,
    inicioImediato:
      "<strong>Início imediato.</strong> Antes do pagamento, pediu expressamente que a DoLado iniciasse a prestação do serviço de imediato, antes do fim do prazo de 14 dias de livre resolução.",
    livreResolucao: "Direito de livre resolução.",
    saibaMais: "Saiba mais",
    documentos: "Documentos:",
    termos: "Termos e Condições",
    versao: (v: string) => ` (versão ${v})`,
    privacidade: "Política de Privacidade",
    questoes: "Para qualquer questão:",
  },

  lembreteCompra: {
    assunto1d: "Falta concluir o acesso à sua compra na DoLado",
    assunto3d: "Último lembrete: conclua o acesso à sua compra na DoLado",
    pagamentoConfirmado: (plano: string) =>
      `O pagamento da sua compra (${plano}) foi confirmado, mas a compra ainda não está ligada a uma conta na DoLado.`,
    passoAssociar: "Já existe uma conta na DoLado com este e-mail. Inicie sessão e associe esta compra à sua conta.",
    passoCriar: "Crie a sua conta para aceder ao portal e usar o que comprou.",
    botaoAssociar: "Associar a compra",
    botaoCriar: "Criar a minha conta",
    ultimo: (contactoHtml: string) => `Este é o último lembrete. Se precisar de ajuda, contacte-nos em ${contactoHtml}.`,
  },

  textoRevisao: {
    assunto: "O texto da sua reclamação está pronto para revisão",
    assuntoNovaComunicacao: "Uma nova comunicação do seu caso está pronta para revisão",
    novoLink: (seguimento: boolean, sobreHtml: string) =>
      `Como pediu, enviamos-lhe um novo link para rever o texto${seguimento ? " da nova comunicação" : " da sua reclamação"}${sobreHtml}.`,
    seguimento: (sobreHtml: string) =>
      `Na sequência da resposta da empresa à sua reclamação${sobreHtml}, preparámos uma nova comunicação. Antes de a enviarmos em seu nome, pedimos-lhe que a reveja.`,
    primeiro: (sobreHtml: string) =>
      `O texto da sua reclamação${sobreHtml} está pronto. Antes de o enviarmos em seu nome, pedimos-lhe que o reveja.`,
    nadaSemAutorizacao: "Nada é enviado sem a sua autorização explícita. Se quiser mudar alguma coisa, pode pedir alterações.",
    botaoRever: "Rever e autorizar o envio",
    pedirAlteracoes: "Pedir alterações",
    seguranca: (dias: number) =>
      `Por segurança, estes links são pessoais e válidos durante ${dias} dias. Não os partilhe. Também pode rever o texto na sua área de cliente, se tiver conta.`,
    naoReconhece: (contactoHtml: string) => `Se não reconhece este pedido, ignore este e-mail ou escreva para ${contactoHtml}.`,
  },

  acompanhamento: {
    respostaRecebida: {
      assunto: "Recebemos uma resposta relacionada com o seu caso",
      preheader: "Estamos a analisá-la. Não precisa de fazer nada neste momento.",
      p1: (sobreHtml: string) => `Recebemos uma comunicação relacionada com a sua reclamação${sobreHtml} e estamos a analisá-la.`,
      p2: "Não precisa de fazer nada neste momento. Entraremos em contacto consigo se for necessária alguma acção.",
      botao: "Ver o meu caso",
      nota: "Pode acompanhar o caso a qualquer momento na sua área de cliente.",
    },
    pedidoInformacao: {
      assunto: "Precisamos de informação sua para continuar o seu caso",
      preheader: "Veja no portal o que precisamos e envie-nos a informação.",
      p1: (sobreHtml: string) => `Para continuarmos a tratar a sua reclamação${sobreHtml}, precisamos de informação ou documentos seus.`,
      p2: "Indicámos no seu caso, no portal, exactamente o que precisamos e como nos pode enviar.",
      botao: "Ver o que precisamos",
    },
    solucaoApresentada: {
      assunto: "A empresa apresentou uma solução para o seu caso",
      preheader: "Diga-nos se o problema ficou resolvido.",
      p1: (sobreHtml: string) => `A empresa apresentou uma solução para a sua reclamação${sobreHtml}. Explicámos o resultado no seu caso, no portal.`,
      p2: "Só damos o caso por resolvido depois de nos confirmar que o problema ficou mesmo resolvido.",
      botao: "Ver a solução e responder",
    },
    casoEncerradoExterno: {
      assunto: "A DoLado terminou o acompanhamento do seu caso",
      preheader: "Preparámos o dossiê do seu caso e a informação sobre como pode continuar.",
      p1: (sobreHtml: string) =>
        `A DoLado terminou o acompanhamento da sua reclamação${sobreHtml}. Isto não significa necessariamente que o problema esteja resolvido.`,
      p2: "Preparámos o seu dossiê com o histórico e os documentos do caso. Se pretender continuar, poderá consultar a lista meramente informativa de entidades oficiais de Resolução Alternativa de Litígios de Consumo no portal.",
      botao: "Ver o caso e descarregar o dossiê",
      nota: "A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem, não apresenta pedidos em seu nome e não determina nem indica qual é a entidade competente para este caso. Confirme directamente junto da entidade se pode apreciar o conflito.",
    },
  },

  achadoMonitor: {
    assunto: "Detectámos uma alteração na sua factura que merece ser verificada",
    sobre: (fornecedorHtml: string) => ` do seu contrato com <strong>${fornecedorHtml}</strong>`,
    introducao: (sobreHtml: string) => `Ao comparar as facturas${sobreHtml}, detectámos uma alteração que merece ser verificada:`,
    botao: "Ver no portal",
    nota: (contactoHtml: string) =>
      `Se quiser que a DoLado trate do assunto junto do fornecedor, pode pedir no portal em "Tratar o meu caso". Para qualquer dúvida, escreva para ${contactoHtml}.`,
  },

  boasVindas: {
    assunto: "Recebemos o seu caso",
    titulo: "Recebemos o seu caso — DoLado",
    obrigado: "Obrigado por confiar na DoLado para tratar da sua reclamação.",
    recebemos:
      "Recebemos o seu caso e vamos agora rever os elementos e documentos que nos enviou, para preparar os próximos passos.",
    aSeguir: "O que acontece a seguir:",
    passos: [
      "1. Revemos os dados e documentos associados ao seu caso.",
      "2. Verificamos a situação e a fundamentação aplicável.",
      "3. Se for necessário algum esclarecimento ou documento adicional, receberá um e-mail nosso com essa indicação.",
      "4. Poderá acrescentar os documentos em falta directamente na sua área DoLado.",
      "5. Quando a reclamação estiver preparada, receberá um aviso para a rever e autorizar o envio.",
    ],
    autorizacao: "A DoLado só enviará a reclamação depois de receber a sua autorização.",
    depoisEnvio:
      "Após o envio, poderá acompanhar a evolução do caso na sua área DoLado, onde ficará disponível o texto enviado, o comprovativo de submissão e a restante informação do processo.",
    porAgora:
      "Por agora, não precisa de fazer mais nada. Se precisarmos de algum elemento adicional, entraremos em contacto consigo por e-mail.",
    duvidas: "Se tiver alguma dúvida, pode responder a este e-mail.",
    lema: "Estamos do seu lado.",
    equipa: "Equipa DoLado",
  },

  livreResolucao: {
    assunto: "Recebemos o seu pedido de livre resolução",
    rotuloReferencia: "Referência",
    rotuloRecebido: "Recebido em",
    rotuloEmail: "E-mail",
    rotuloPlano: "Plano",
    rotuloDataCompra: "Data da compra",
    planoNaoSei: "Não sei / mais do que um",
    p1: "Confirmamos que recebemos o seu pedido de livre resolução, feito através do formulário em dolado.pt/livre-resolucao.",
    p2: "A DoLado vai analisar o pedido e responder-lhe por e-mail. Se houver lugar a reembolso, este é feito pelo mesmo meio de pagamento que utilizou, no prazo máximo de 14 dias a contar da data em que fomos informados da sua decisão, nos termos da lei.",
    naoFez: (contactoHtml: string) => `Se não fez este pedido, responda a este e-mail ou escreva para ${contactoHtml}.`,
  },

  avisoSetorial: {
    assunto: (setor: string) => `[Aviso DoLado] Novidade no sector de ${setor}`,
    titulo: (setorHtml: string) => `Aviso sectorial: ${setorHtml} — DoLado`,
    rotulo: (setorHtml: string) => `Aviso sectorial · ${setorHtml}`,
    enviadoA: (data: string) => `Enviado a ${data}`,
    publicamos: (setorHtml: string) => `Publicámos um aviso sobre o sector de ${setorHtml}, um dos sectores que escolheu acompanhar na DoLado.`,
    nota: "A DoLado acompanha novidades que possam afectar os seus serviços e avisa quando há algo relevante no sector que escolheu.",
    rodape: (setorHtml: string, ligacaoHtml: (texto: string) => string) =>
      `Recebe este e-mail porque escolheu receber avisos sobre o sector de ${setorHtml}. Pode alterar os sectores em ${ligacaoHtml("Perfil e avisos")}, no portal.`,
  },

  resumoMensal: {
    assunto: (mes: string) => `A sua Protecção em ${mes}`,
    acompanhamosEm: (mes: string) => `O que acompanhámos em ${mes}`,
    alteracoes: "Alterações detectadas",
    continuaAtiva: "A sua Protecção continua activa",
    proximaData: "Próxima data relevante",
    botaoAdicionar: "Adicionar um documento",
    botaoVer: "Ver a minha Protecção",
    verTexto: (url: string) => `Ver a sua Protecção: ${url}`,
    baseiaSe: "Este resumo baseia-se nos documentos e nas datas que nos indicou. Se algum serviço mudou, adicione a factura mais recente no portal.",
    duvidas: (contacto: string) => `Para qualquer dúvida, escreva para ${contacto}.`,
    rodape: "Recebe este resumo uma vez por mês porque tem a Protecção activa na DoLado.",
  },
  /** Conteúdo do resumo mensal (src/lib/resumoMensal/resumo.ts). */
  resumoConteudo: {
    meses: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    mesAno: (mes: string, ano: string) => `${mes} de ${ano}`,
    e: "e",
    fimDe: (servico: string, promocao: boolean, data: string) => `${servico} — fim da ${promocao ? "promoção" : "fidelização"} a ${data}`,
    comparacaoFaturas: (servicos: string) => `Comparação de facturas — ${servicos}`,
    situacao: (servico: string, curto: string, data: string) => `${servico}: ${curto} (comunicado a ${data})`,
    estados: {
      tudo_acompanhado: [
        "Tudo acompanhado",
        "Com base nos documentos e nas datas que nos indicou, não há nada que exija a sua atenção neste momento. Continuamos atentos por si.",
      ],
      atencaoUma: [
        "Há algo que merece a sua atenção",
        "A DoLado reviu esta situação antes de lha comunicar. Veja os detalhes no portal.",
      ],
      atencaoVarias: [
        "Há algo que merece a sua atenção",
        "A DoLado reviu estas situações antes de lhas comunicar. Veja os detalhes no portal.",
      ],
      por_confirmar: ["Falta a sua confirmação", "Lemos as condições de um documento. Confirme-as no portal para começarmos a acompanhá-las."],
      em_verificacao: [
        "Estamos a verificar uma alteração",
        "Encontrámos uma diferença numa factura e a DoLado está a revê-la. Se merecer a sua atenção, avisamos por e-mail. Não precisa de fazer nada por agora.",
      ],
      sem_servicos: [
        "A sua Protecção está activa",
        "Adicione uma factura ou um contrato no portal: verificamos a sua situação actual e, a partir daí, ficamos atentos por si.",
      ],
    },
    faturas: (n: number) => (n === 1 ? "1 factura" : `${n} facturas`),
    contratos: (n: number) => (n === 1 ? "1 contrato" : `${n} contratos`),
    alertasDatas: (n: number) => (n === 1 ? "1 alerta de datas" : `${n} alertas de datas`),
    ativos: (n: number) => (n === 1 ? "activo" : "activos"),
    introSemServicos: (mes: string) => `Em ${mes}, a sua Protecção esteve activa, mas ainda não nos indicou nenhum serviço para acompanhar.`,
    introDocumentos: (mes: string, documentos: string, alertas: string | null) =>
      `Em ${mes}, a DoLado verificou ${documentos}${alertas ? ` e manteve ${alertas}` : ""}.`,
    introSemDocumentos: (mes: string, servicos: number, alertas: string | null) =>
      `Em ${mes} não recebemos documentos novos, mas a DoLado continuou a acompanhar ${
        servicos === 1 ? "o seu serviço" : servicos > 1 ? `os seus ${servicos} serviços` : "os seus serviços"
      }${alertas ? ` e manteve ${alertas}` : ""}.`,
    introTudoAcompanhado: " Não detectámos nenhuma alteração que exija a sua atenção.",
    introAtencao: (n: number) => ` Detectámos ${n === 1 ? "1 situação que merece" : `${n} situações que merecem`} a sua atenção.`,
    atividadeFaturas: (n: number) => (n === 1 ? "1 factura verificada" : `${n} facturas verificadas`),
    atividadeContratos: (n: number) => (n === 1 ? "1 contrato lido" : `${n} contratos lidos`),
    atividadeAvisos: (n: number) => `${n === 1 ? "1 aviso de data enviado" : `${n} avisos de datas enviados`} por e-mail`,
    atividadeServicos: (n: number) => (n === 1 ? "1 serviço acompanhado" : `${n} serviços acompanhados`),
    atividadeAlertas: (n: number) => (n === 1 ? "1 alerta de datas activo" : `${n} alertas de datas activos`),
    semAlteracoesVerificacao: "Estamos a verificar uma alteração numa factura. Se merecer a sua atenção, avisamos por e-mail.",
    semAlteracoes: (mes: string) => `Não detectámos alterações que exijam a sua atenção em ${mes}.`,
    semProximaData: "Neste momento não há nenhuma data que exija a sua atenção.",
    terminaHoje: (servico: string, promocao: boolean) => `${servico}: ${promocao ? "a promoção" : "a fidelização"} termina hoje.`,
    terminaA: (servico: string, promocao: boolean, data: string, antes: boolean) =>
      `${servico}: ${promocao ? "a promoção" : "a fidelização"} termina a ${data}. ${antes ? "Avisamos por e-mail antes dessa data." : "Avisamos por e-mail nessa data."}`,
  },
  guiaFacturas: {
    assunto: "O seu guia gratuito da DoLado",
    titulo: "O seu guia está pronto",
    preheader: "Está a pagar mais do que devia? 10 coisas a verificar nas suas facturas e contratos.",
    ola: "Olá,",
    obrigado: "Obrigado pelo seu interesse no guia «Está a pagar mais do que devia?». Pode descarregá-lo aqui:",
    botao: "Descarregar o guia",
    dica: "Uma sugestão: tenha à mão uma factura recente e a do mês anterior do mesmo serviço. As primeiras verificações demoram poucos minutos.",
    rodape: "Recebe este e-mail porque pediu o guia gratuito em dolado.pt. Não é uma subscrição: não lhe enviaremos outras mensagens por causa deste pedido.",
  },
};
