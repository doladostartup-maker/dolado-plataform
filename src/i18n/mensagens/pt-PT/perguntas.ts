// Perguntas frequentes — partilhadas entre a homepage (versão curta),
// /perguntas-frequentes (completa), o preçário e "Como funciona", para as
// respostas não divergirem. Antes de acrescentar perguntas sobre planos,
// prazos ou envio, confirmar a regra no CLAUDE.md e na implementação.
//
// Respostas: um texto ou uma lista de parágrafos. Marcação: <b>…</b>,
// <livre>…</livre> (página Livre resolução), <privacidade>…</privacidade>
// (Política de Privacidade), <email/> (e-mail de privacidade).
// Preços: recebidos já formatados (src/lib/planos.ts).

type Precos = { protecao: string; casoProtecao: string; avulso: string; limite: number };

export type Resposta = string | string[];

export const perguntas = {
  oQueE: {
    pergunta: "O que é a DoLado?",
    resposta:
      "A DoLado ajuda os consumidores a tratar problemas com empresas de serviços como as telecomunicações, a energia, o gás e a água, e também com compras, reembolsos e ginásios. Quando é necessário reclamar, analisamos o caso, identificamos a informação relevante, preparamos a reclamação e acompanhamos o processo. Com a Proteção, também ajudamos a identificar situações que possam tornar-se num problema, antes que seja tarde para agir." as Resposta,
  },
  comoFunciona: {
    pergunta: "Como funciona a DoLado?",
    resposta:
      "Se tiver um problema com uma empresa, pode abrir um caso: analisamos o que aconteceu, preparamos a reclamação e só a enviamos depois da sua autorização. Depois do envio, acompanhamos o que acontece a seguir. Com a Proteção, a DoLado usa as informações das suas faturas e contratos para identificar alterações ou datas que possam tornar-se num problema e avisa-o a tempo de agir." as Resposta,
  },
  semAutorizacao: {
    pergunta: "A DoLado envia alguma coisa sem a minha autorização?",
    resposta:
      "Não. Recebe sempre o conteúdo da reclamação primeiro para poder rever. O envio só é feito depois da sua confirmação explícita." as Resposta,
    respostaCompleta:
      "Não. Nada é enviado em seu nome sem que tenha primeiro acesso ao conteúdo e confirme que autoriza o envio." as Resposta,
  },
  quantoCusta: {
    pergunta: "Quanto custa a DoLado?",
    resposta: (p: Precos): Resposta => [
      `Avulso: ${p.avulso} por caso, com pagamento único e sem subscrição. Caso + Proteção: ${p.casoProtecao}, com 1 caso por mês e a Proteção. Proteção: ${p.protecao}, só para acompanhar faturas e contratos, sem tratamento de casos. Todos os preços incluem IVA.`,
      "Para tratar um caso, o formulário vem primeiro: a modalidade e o pagamento só se escolhem no fim. O caso só começa a ser tratado depois de o pagamento ser confirmado.",
    ],
  },
  diferencaPlanos: {
    pergunta: "Qual é a diferença entre Proteção, Caso + Proteção e Avulso?",
    resposta:
      "A Proteção ajuda a identificar alterações nas suas faturas, datas importantes e alterações relevantes no seu setor que possam tornar-se num problema, sem tratamento de casos. O Caso + Proteção junta essa prevenção ao tratamento de problemas, com 1 novo caso por mês. O Avulso serve para tratar um único problema, com pagamento único, sem subscrição nem funcionalidades da Proteção." as Resposta,
    complementoLimite: (p: Precos) => `No Caso + Proteção, os casos não utilizados acumulam até ao limite de ${p.limite}.`,
  },
  prazo: {
    pergunta: "Quanto tempo demora?",
    resposta: [
      "Depois de o caso ser aberto (ou seja, depois de o pagamento ser confirmado), entramos em contacto consigo no prazo máximo de 48 horas úteis para confirmar os factos. A reclamação é preparada a partir dessa confirmação.",
      "O tempo de preparação depende da informação disponível e de eventuais esclarecimentos. O tempo de resposta da empresa não depende da DoLado: varia conforme o setor, a empresa e o canal usado.",
    ] as Resposta,
  },
  substituiAdvogado: {
    pergunta: "A DoLado substitui um advogado?",
    resposta:
      "Não. A DoLado ajuda na preparação e acompanhamento de reclamações de consumo, mas não substitui aconselhamento ou representação jurídica quando estes forem necessários." as Resposta,
  },
  garanteResultado: {
    pergunta: "A DoLado garante que o meu problema será resolvido?",
    resposta:
      "Não é possível garantir o resultado de uma reclamação. A DoLado ajuda a apresentar o caso de forma clara e fundamentada, acompanha a resposta e ajuda a perceber os próximos passos disponíveis." as Resposta,
  },
  escritorioAdvogados: {
    pergunta: "A DoLado é um escritório de advogados?",
    resposta:
      "Não. A DoLado é um serviço de apoio ao consumidor e não um escritório de advogados. Não substituímos aconselhamento ou representação jurídica quando estes forem necessários." as Resposta,
  },
  garanteGanhar: {
    pergunta: "A DoLado garante que vou ganhar a reclamação?",
    resposta:
      "Não. Nenhuma reclamação pode ter o resultado garantido. A DoLado ajuda a apresentar o caso de forma clara e fundamentada e acompanha os passos seguintes, mas a decisão ou resposta depende das entidades envolvidas e das circunstâncias de cada caso." as Resposta,
  },
  comoFuncionaReclamacao: {
    pergunta: "Como funciona uma reclamação com a DoLado?",
    resposta:
      "Conte-nos o que aconteceu e envie as informações necessárias para analisarmos o caso. A DoLado prepara a reclamação e apresenta-lhe o conteúdo antes de qualquer envio. Depois de rever e autorizar, tratamos do envio e acompanhamos os próximos passos." as Resposta,
  },
  enviamPorMim: {
    pergunta: "A DoLado envia a reclamação por mim?",
    resposta:
      "Sim. Antes do envio, recebe o texto preparado pela DoLado para rever. Só depois da sua autorização explícita submetemos a reclamação em seu nome, pelo canal adequado ao caso — por exemplo, o Livro de Reclamações Eletrónico, o e-mail ou o formulário de reclamações da empresa." as Resposta,
  },
  naoConcordo: {
    pergunta: "E se eu não concordar com o texto preparado?",
    resposta:
      "Antes do envio, pode rever o texto preparado pela DoLado através do link que lhe enviamos por e-mail. Se pretender alguma alteração, selecione “Pedir alterações” e indique-nos o que gostaria de rever. A DoLado só procede ao envio depois de receber a sua autorização explícita." as Resposta,
  },
  documentos: {
    pergunta: "Que informações ou documentos posso precisar de enviar?",
    resposta:
      "Depende do caso. Os mais úteis costumam ser a fatura em causa, o contrato, e-mails ou mensagens trocados com a empresa, o número do pedido ou da reclamação anterior e capturas de ecrã. Também ajudam datas e valores. Não precisa de ter tudo: indique o que tiver e, se faltar alguma coisa, pedimos-lha." as Resposta,
  },
  precisaEscrever: {
    pergunta: "Preciso de saber escrever a reclamação?",
    resposta:
      "Não. Basta contar-nos o que aconteceu, por palavras suas, como contaria a um amigo. A DoLado escreve o texto da reclamação e mostra-lho antes de qualquer envio." as Resposta,
  },
  informacaoComecar: {
    pergunta: "Que informação preciso de ter para começar?",
    resposta:
      "O tipo de empresa e o nome dela, o que aconteceu, se já reclamou e o seu nome. Se tiver uma fatura, um contrato, um e-mail ou uma captura de ecrã, pode juntá-la logo, mas não é obrigatório. Demora cerca de 5 minutos." as Resposta,
  },
  documentosInicio: {
    pergunta: "Tenho de enviar todos os documentos logo no início?",
    resposta:
      "Não. No formulário, os documentos são opcionais. Se precisarmos de mais alguma coisa, pedimos-lha por e-mail e pode responder e juntar ficheiros na área de cliente." as Resposta,
  },
  atualizacoes: {
    pergunta: "Como recebo as atualizações do meu caso?",
    resposta:
      "Por e-mail, nos momentos em que há novidades ou precisamos de si — por exemplo, quando o texto está pronto para rever, quando estamos a analisar a resposta da empresa, quando precisamos de mais informação e quando o caso é encerrado. Na área de cliente pode consultar, quando quiser, o estado do caso, o próximo passo e o histórico." as Resposta,
  },
  entrarRegularmente: {
    pergunta: "Preciso de entrar regularmente na área de cliente?",
    resposta:
      "Não. Quando precisarmos de uma ação sua — rever o texto, responder a um pedido de informação ou confirmar uma solução —, avisamo-lo por e-mail. A área de cliente serve para consultar o caso, o texto enviado, os comprovativos e o histórico quando lhe der jeito." as Resposta,
  },
  oQueIncluiProtecao: {
    pergunta: "O que inclui o plano Proteção?",
    resposta:
      "A Proteção ajuda a identificar situações que possam tornar-se num problema. Comparamos as suas faturas com as anteriores para identificar alterações, estamos atentos a datas importantes, como o fim de promoções e de períodos de fidelização, e avisamo-lo por e-mail antes dessas datas. Também o avisamos de alterações relevantes nos setores que escolher, como subidas de preços anunciadas. A Proteção não inclui o tratamento de reclamações." as Resposta,
  },
  // Fluxo real: /portal/contratos (carregar fatura ou contrato, ou
  // /portal/contratos/novo sem documento) e setores no /portal/perfil.
  comecarProtecao: {
    pergunta: "Como começo a usar a Proteção?",
    resposta:
      "Depois de subscrever, entre na sua área de cliente e abra “Os meus serviços”. Basta carregar uma fatura, em PDF ou imagem: a DoLado começa a acompanhar a evolução desse serviço mês a mês. Se tiver o contrato, pode adicioná-lo para verificarmos também os preços contratados, as promoções e a fidelização. Se não tiver o documento à mão, pode indicar os dados manualmente — basta o fornecedor e uma data, como o fim da fidelização ou da promoção. Para receber alertas sobre alterações no seu setor, escolha os setores que lhe interessam em “Gestão de Perfil”." as Resposta,
  },
  oQueIncluiCasoProtecao: {
    pergunta: "O que inclui o plano Caso + Proteção?",
    resposta: (p: Precos): Resposta =>
      `Inclui as funcionalidades do plano Proteção e 1 novo caso por mês. Os casos não utilizados acumulam até ao limite de ${p.limite}.`,
  },
  semSubscricao: {
    pergunta: "Preciso de uma subscrição para tratar um caso?",
    resposta: (p: Precos): Resposta =>
      `Não. Pode utilizar o serviço Avulso por ${p.avulso} para tratar um caso sem aderir a uma subscrição.`,
  },
  avulsoDepoisSubscricao: {
    pergunta: "Já comprei um Avulso. Posso aderir depois a uma subscrição?",
    resposta:
      "Sim, a partir da sua área de cliente. Se ainda não tiver usado o caso do Avulso, parte do valor já pago cobre o primeiro mês da subscrição e o restante é reembolsado para o método de pagamento original. Se já o tiver usado, a adesão é feita como uma nova compra." as Resposta,
  },
  cancelarProtecao: {
    pergunta: "Posso cancelar a Proteção?",
    resposta: [
      "Sim. Pode cancelar a sua subscrição a qualquer momento na área <b>Gestão de Subscrição</b>. Depois de cancelar, continua a beneficiar da Proteção até ao fim do período que já pagou e não serão feitas novas cobranças. Quando esse período terminar, os alertas da Proteção ficam desativados e deixam de ser enviados.",
      "O cancelamento normal não dá direito ao reembolso proporcional da mensalidade já paga, sem prejuízo dos direitos que a lei lhe atribui, nomeadamente o direito de livre resolução quando aplicável.",
      "Os casos que já criou continuam disponíveis na sua conta. Se tiver casos acumulados no plano Caso + Proteção, estes ficam guardados durante 90 dias após o fim da subscrição. Se voltar a subscrever o Caso + Proteção dentro desse período, recupera os casos disponíveis que tinha.",
    ] as Resposta,
  },
  livreResolucao: {
    pergunta: "Qual é a diferença entre cancelar e o direito de livre resolução?",
    resposta: [
      "Cancelar a subscrição impede as renovações seguintes e mantém o serviço até ao fim do período já pago. O direito de livre resolução é um direito legal de resolver o contrato nos 14 dias seguintes à compra, nas condições previstas na lei — incluindo quando pediu que o serviço começasse de imediato.",
      "Pode exercê-lo online, na página <livre>Livre resolução</livre>, onde encontra também o modelo de formulário e a explicação completa.",
    ] as Resposta,
  },
  depoisEnviada: {
    pergunta: "O que acontece depois de a reclamação ser enviada?",
    resposta: [
      "A DoLado fica à espera da resposta da empresa e analisa-a quando chega. Avisamo-lo por e-mail quando estamos a analisar uma resposta, quando precisamos de mais informação sua e quando a empresa apresenta uma solução que precisa de confirmar.",
      "O caso só fica “Resolvido” quando nos confirma que o problema ficou resolvido. Na área de cliente vê sempre o estado do caso, o próximo passo e o histórico.",
    ] as Resposta,
  },
  empresaNaoResolve: {
    pergunta: "E se a empresa não resolver o problema?",
    resposta: [
      "Uma reclamação nem sempre termina com a primeira resposta. Quando faz sentido e está dentro do serviço contratado, preparamos uma nova comunicação à empresa, que também revê e autoriza antes do envio.",
      "Quando a DoLado já fez o que o serviço prevê e o problema continua, encerramos o caso do nosso lado — o que não significa que ficou resolvido. Nesse momento entregamos-lhe um dossiê com o que foi feito e uma lista de entidades de resolução de conflitos de consumo que pode consultar. A DoLado não o representa junto dessas entidades.",
    ] as Resposta,
  },
  copia: {
    pergunta: "Recebo uma cópia da reclamação enviada?",
    resposta:
      "Sim. Depois do envio, pode consultar no seu caso, na área de cliente, o texto exato da reclamação submetida e, quando disponível, o respetivo comprovativo de submissão, juntamente com o histórico do caso. Se o caso for encerrado sem solução da empresa, disponibilizamos também um dossiê com o que foi feito." as Resposta,
  },
  dadosSeguros: {
    pergunta: "Os meus dados estão seguros?",
    resposta:
      "Os seus dados são guardados em sistemas com acesso restrito à equipa DoLado, com a base de dados alojada na União Europeia. Documentos e informação do caso só são partilhados no estritamente necessário. Para questões sobre os seus dados ou para exercer os seus direitos, escreva para <email/>. Saiba mais na <privacidade>Política de Privacidade</privacidade>." as Resposta,
  },
  partilhaDados: {
    pergunta: "A DoLado partilha os meus dados com outras entidades?",
    resposta:
      "Apenas o necessário para prestar o serviço. Recorremos a prestadores que tratam dados por nossa conta — por exemplo, para o alojamento da plataforma e o envio de e-mails — e, com a sua autorização, a reclamação inclui os dados estritamente necessários para a formalizar junto da empresa visada. Não vendemos nem partilhamos dados para fins de marketing de terceiros. A lista completa está na <privacidade>Política de Privacidade</privacidade>." as Resposta,
  },
  categorias: {
    sobre: "Sobre a DoLado",
    comoFunciona: "Como funciona",
    planos: "Planos e proteção",
    depoisEnvio: "Depois do envio",
    privacidade: "Privacidade e segurança",
  },
};
