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
    assuntoContaExiste: "Pagamento confirmado — o seu acesso está ativo ✓",
    assuntoAssociar: "Pagamento confirmado — Associe esta compra à sua conta ✓",
    assuntoCriarConta: "Pagamento confirmado — Falta criar a sua palavra-passe ✓",
    introducao: "O seu pagamento foi confirmado. Obrigado por confiar na DoLado. Guarde este e-mail como confirmação da sua contratação.",
    passoCasoExtra:
      "Tem 1 Caso Extra na sua conta. Se pagou um caso que já tinha descrito, esse caso segue para tratamento; acompanhe-o em Os meus casos.",
    passoContaExiste: "Já pode iniciar sessão no portal: o seu acesso já está ativo.",
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
    subscricaoInalterada: "Continua ativa e não foi alterada",
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
      p2: "Não precisa de fazer nada neste momento. Entraremos em contacto consigo se for necessária alguma ação.",
      botao: "Ver o meu caso",
      nota: "Pode acompanhar o caso a qualquer momento na sua área de cliente.",
    },
    pedidoInformacao: {
      assunto: "Precisamos de informação sua para continuar o seu caso",
      preheader: "Veja no portal o que precisamos e envie-nos a informação.",
      p1: (sobreHtml: string) => `Para continuarmos a tratar a sua reclamação${sobreHtml}, precisamos de informação ou documentos seus.`,
      p2: "Indicámos no seu caso, no portal, exatamente o que precisamos e como nos pode enviar.",
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
      nota: "A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem, não apresenta pedidos em seu nome e não determina nem indica qual é a entidade competente para este caso. Confirme diretamente junto da entidade se pode apreciar o conflito.",
    },
  },

  achadoMonitor: {
    assunto: "Detetámos uma alteração na sua fatura que merece ser verificada",
    sobre: (fornecedorHtml: string) => ` do seu contrato com <strong>${fornecedorHtml}</strong>`,
    introducao: (sobreHtml: string) => `Ao comparar as faturas${sobreHtml}, detetámos uma alteração que merece ser verificada:`,
    botao: "Ver no portal",
    nota: (contactoHtml: string) =>
      `Se quiser que a DoLado trate do assunto junto do fornecedor, pode pedir no portal em "Tratar o meu caso". Para qualquer dúvida, escreva para ${contactoHtml}.`,
  },

  boasVindas: {
    assunto: "Recebemos a sua submissão — Vamos tratar pessoalmente ✓",
    titulo: "Recebemos a sua submissão — DoLado",
    obrigado: "Obrigado por confiar na DoLado com a sua reclamação.",
    pessoal:
      "Já recebemos a sua submissão e está aqui comigo para ser tratada pessoalmente. Não é um formulário que desaparece numa caixa infinita. Eu vou rever o seu caso, contactar o operador com a sua autorização e acompanhar até à resolução.",
    agora: "O que acontece agora:",
    passos: [
      "1. Leio os detalhes que forneceu",
      "2. Contacto-o(a) nos próximos dias para confirmar tudo",
      "3. Contacto o operador e faço a fundamentação necessária",
      "4. Acompanho até ao final",
    ],
    preciso: "O que preciso de si:",
    tenhaAMao: "Quando eu contactar, tenha à mão:",
    itens: [
      "— Fatura ou comprovativo do problema",
      "— Qualquer e-mail/SMS da empresa em questão",
      "— Disponibilidade para uma breve chamada (5-10 minutos), caso ainda falte esclarecer algum ponto para além do que já enviou",
    ],
    espere: "Espere por um contacto meu nos próximos 1-2 dias úteis. Se tiver dúvidas entretanto, responda a este e-mail.",
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
    assunto: (setor: string) => `[Aviso DoLado] Novidade no setor de ${setor}`,
    titulo: (setorHtml: string) => `Aviso setorial: ${setorHtml} — DoLado`,
    rotulo: (setorHtml: string) => `Aviso setorial · ${setorHtml}`,
    enviadoA: (data: string) => `Enviado a ${data}`,
    publicamos: (setorHtml: string) => `Publicámos um aviso sobre o setor de ${setorHtml}, um dos setores que escolheu acompanhar na DoLado.`,
    nota: "A DoLado acompanha novidades que possam afetar os seus serviços e avisa quando há algo relevante no setor que escolheu.",
    rodape: (setorHtml: string, ligacaoHtml: (texto: string) => string) =>
      `Recebe este e-mail porque escolheu receber avisos sobre o setor de ${setorHtml}. Pode alterar os setores em ${ligacaoHtml("Perfil e avisos")}, no portal.`,
  },

  resumoMensal: {
    assunto: (mes: string) => `A sua Proteção em ${mes}`,
    acompanhamosEm: (mes: string) => `O que acompanhámos em ${mes}`,
    alteracoes: "Alterações detetadas",
    continuaAtiva: "A sua Proteção continua ativa",
    proximaData: "Próxima data relevante",
    botaoAdicionar: "Adicionar um documento",
    botaoVer: "Ver a minha Proteção",
    verTexto: (url: string) => `Ver a sua Proteção: ${url}`,
    baseiaSe: "Este resumo baseia-se nos documentos e nas datas que nos indicou. Se algum serviço mudou, adicione a fatura mais recente no portal.",
    duvidas: (contacto: string) => `Para qualquer dúvida, escreva para ${contacto}.`,
    rodape: "Recebe este resumo uma vez por mês porque tem a Proteção ativa na DoLado.",
  },
  /** Conteúdo do resumo mensal (src/lib/resumoMensal/resumo.ts). */
  resumoConteudo: {
    meses: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
    mesAno: (mes: string, ano: string) => `${mes} de ${ano}`,
    e: "e",
    fimDe: (servico: string, promocao: boolean, data: string) => `${servico} — fim da ${promocao ? "promoção" : "fidelização"} a ${data}`,
    comparacaoFaturas: (servicos: string) => `Comparação de faturas — ${servicos}`,
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
        "Encontrámos uma diferença numa fatura e a DoLado está a revê-la. Se merecer a sua atenção, avisamo-lo por e-mail. Não precisa de fazer nada por agora.",
      ],
      sem_servicos: [
        "A sua Proteção está ativa",
        "Adicione uma fatura ou um contrato no portal: verificamos a sua situação atual e, a partir daí, ficamos atentos por si.",
      ],
    },
    faturas: (n: number) => (n === 1 ? "1 fatura" : `${n} faturas`),
    contratos: (n: number) => (n === 1 ? "1 contrato" : `${n} contratos`),
    alertasDatas: (n: number) => (n === 1 ? "1 alerta de datas" : `${n} alertas de datas`),
    ativos: (n: number) => (n === 1 ? "ativo" : "ativos"),
    introSemServicos: (mes: string) => `Em ${mes}, a sua Proteção esteve ativa, mas ainda não nos indicou nenhum serviço para acompanhar.`,
    introDocumentos: (mes: string, documentos: string, alertas: string | null) =>
      `Em ${mes}, a DoLado verificou ${documentos}${alertas ? ` e manteve ${alertas}` : ""}.`,
    introSemDocumentos: (mes: string, servicos: number, alertas: string | null) =>
      `Em ${mes} não recebemos documentos novos, mas a DoLado continuou a acompanhar ${
        servicos === 1 ? "o seu serviço" : servicos > 1 ? `os seus ${servicos} serviços` : "os seus serviços"
      }${alertas ? ` e manteve ${alertas}` : ""}.`,
    introTudoAcompanhado: " Não detetámos nenhuma alteração que exija a sua atenção.",
    introAtencao: (n: number) => ` Detetámos ${n === 1 ? "1 situação que merece" : `${n} situações que merecem`} a sua atenção.`,
    atividadeFaturas: (n: number) => (n === 1 ? "1 fatura verificada" : `${n} faturas verificadas`),
    atividadeContratos: (n: number) => (n === 1 ? "1 contrato lido" : `${n} contratos lidos`),
    atividadeAvisos: (n: number) => `${n === 1 ? "1 aviso de data enviado" : `${n} avisos de datas enviados`} por e-mail`,
    atividadeServicos: (n: number) => (n === 1 ? "1 serviço acompanhado" : `${n} serviços acompanhados`),
    atividadeAlertas: (n: number) => (n === 1 ? "1 alerta de datas ativo" : `${n} alertas de datas ativos`),
    semAlteracoesVerificacao: "Estamos a verificar uma alteração numa fatura. Se merecer a sua atenção, avisamo-lo por e-mail.",
    semAlteracoes: (mes: string) => `Não detetámos alterações que exijam a sua atenção em ${mes}.`,
    semProximaData: "Neste momento não há nenhuma data que exija a sua atenção.",
    terminaHoje: (servico: string, promocao: boolean) => `${servico}: ${promocao ? "a promoção" : "a fidelização"} termina hoje.`,
    terminaA: (servico: string, promocao: boolean, data: string, antes: boolean) =>
      `${servico}: ${promocao ? "a promoção" : "a fidelização"} termina a ${data}. ${antes ? "Avisamo-lo por e-mail antes dessa data." : "Avisamo-lo por e-mail nessa data."}`,
  },
};
