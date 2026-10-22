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
      "A DoLado ajuda os consumidores a compreender as suas facturas e contratos, a acompanhar o que merece atenção e a tratar problemas com empresas — de telecomunicações, energia, gás e água, e também com compras, reembolsos e ginásios. Com a Protecção, acompanhamos as facturas e as datas importantes dos seus contratos e avisamos a tempo. Quando é necessário reclamar, preparamos a reclamação consigo e acompanhamos o processo." as Resposta,
  },
  comoFunciona: {
    pergunta: "Como funciona a DoLado?",
    resposta:
      "Se tiver um problema com uma empresa, pode abrir um caso: analisamos o que aconteceu, preparamos a reclamação e só a enviamos depois da sua autorização. Depois do envio, acompanhamos o que acontece a seguir. Com a Protecção, a DoLado usa as informações das suas facturas e contratos para identificar alterações ou datas que possam tornar-se num problema e envia-lhe um aviso a tempo de agir." as Resposta,
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
      `Avulso: ${p.avulso} por caso, com pagamento único e sem subscrição. Caso + Protecção: ${p.casoProtecao}, com 1 caso por mês e a Protecção. Protecção: ${p.protecao}, só para acompanhar facturas e contratos, sem tratamento de casos. Todos os preços incluem IVA.`,
      "Para tratar um caso, o formulário vem primeiro: a modalidade e o pagamento só se escolhem no fim. O caso só começa a ser tratado depois de o pagamento ser confirmado.",
    ],
  },
  diferencaPlanos: {
    pergunta: "Qual é a diferença entre Protecção, Caso + Protecção e Avulso?",
    resposta:
      "A Protecção ajuda a identificar alterações nas suas facturas, datas importantes e alterações relevantes no seu sector que possam tornar-se num problema, sem tratamento de casos. O Caso + Protecção junta essa prevenção ao tratamento de problemas, com 1 novo caso por mês. O Avulso serve para tratar um único problema, com pagamento único, sem subscrição nem funcionalidades da Protecção." as Resposta,
    complementoLimite: (p: Precos) => `No Caso + Protecção, os casos não utilizados acumulam até ao limite de ${p.limite}.`,
  },
  prazo: {
    pergunta: "Quanto tempo demora?",
    resposta: [
      "Depois de o caso ser aberto (ou seja, depois de o pagamento ser confirmado), entramos em contacto consigo no prazo máximo de 2 dias úteis para confirmar os factos. A reclamação é preparada a partir dessa confirmação.",
      "O tempo de preparação depende da informação disponível e de eventuais esclarecimentos. O tempo de resposta da empresa não depende da DoLado: varia conforme o sector, a empresa e o canal usado.",
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
      "Sim. Antes do envio, recebe o texto preparado pela DoLado para rever. Só depois da sua autorização explícita submetemos a reclamação em seu nome, pelo canal adequado ao caso — por exemplo, o Livro de Reclamações Electrónico, o e-mail ou o formulário de reclamações da empresa." as Resposta,
  },
  naoConcordo: {
    pergunta: "E se eu não concordar com o texto preparado?",
    resposta:
      "Antes do envio, pode rever o texto preparado pela DoLado através do link que lhe enviamos por e-mail. Se pretender alguma alteração, seleccione “Pedir alterações” e indique-nos o que gostaria de rever. A DoLado só procede ao envio depois de receber a sua autorização explícita." as Resposta,
  },
  documentos: {
    pergunta: "Que informações ou documentos posso precisar de enviar?",
    resposta:
      "Depende do caso. Os mais úteis costumam ser a factura em causa, o contrato, e-mails ou mensagens trocados com a empresa, o número do pedido ou da reclamação anterior e capturas de ecrã. Também ajudam datas e valores. Não precisa de ter tudo: indique o que tiver e, se faltar alguma coisa, pedimos-lha." as Resposta,
  },
  precisaEscrever: {
    pergunta: "Preciso de saber escrever a reclamação?",
    resposta:
      "Não. Basta contar-nos o que aconteceu, por palavras suas, como contaria a um amigo. A DoLado escreve o texto da reclamação e mostra-lho antes de qualquer envio." as Resposta,
  },
  informacaoComecar: {
    pergunta: "Que informação preciso de ter para começar?",
    resposta:
      "O tipo de empresa e o nome dela, o que aconteceu, se já reclamou e o seu nome. Se tiver uma factura, um contrato, um e-mail ou uma captura de ecrã, pode juntá-la logo, mas não é obrigatório. Demora cerca de 5 minutos." as Resposta,
  },
  documentosInicio: {
    pergunta: "Tenho de enviar todos os documentos logo no início?",
    resposta:
      "Não. No formulário, os documentos são opcionais. Se precisarmos de mais alguma coisa, pedimos-lha por e-mail e pode responder e juntar ficheiros na área de cliente." as Resposta,
  },
  atualizacoes: {
    pergunta: "Como recebo as actualizações do meu caso?",
    resposta:
      "Por e-mail, nos momentos em que há novidades ou precisamos de si — por exemplo, quando o texto está pronto para rever, quando estamos a analisar a resposta da empresa, quando precisamos de mais informação e quando o caso é encerrado. Na área de cliente pode consultar, quando quiser, o estado do caso, o próximo passo e o histórico." as Resposta,
  },
  entrarRegularmente: {
    pergunta: "Preciso de entrar regularmente na área de cliente?",
    resposta:
      "Não. Quando precisarmos de uma acção sua — rever o texto, responder a um pedido de informação ou confirmar uma solução —, avisamos por e-mail. A área de cliente serve para consultar o caso, o texto enviado, os comprovativos e o histórico quando lhe der jeito." as Resposta,
  },
  oQueIncluiProtecao: {
    pergunta: "O que inclui o plano Protecção?",
    resposta:
      "A Protecção ajuda a identificar situações que possam tornar-se num problema. Comparamos as suas facturas com as anteriores para identificar alterações, estamos atentos a datas importantes, como o fim de promoções e de períodos de fidelização, e avisamos antes dessas datas. Também o avisamos de alterações relevantes nos sectores que escolher, como subidas de preços anunciadas, e, no início de cada mês, enviamos-lhe um resumo do que acompanhámos. A Protecção não inclui o tratamento de reclamações." as Resposta,
  },
  // Fluxo real: /portal/contratos (carregar fatura ou contrato, ou
  // /portal/contratos/novo sem documento) e setores no /portal/perfil.
  comecarProtecao: {
    pergunta: "Como começo a usar a Protecção?",
    resposta:
      "Depois de subscrever, entre na sua área de cliente e abra “Os meus serviços”. Basta carregar uma factura, em PDF ou imagem: a DoLado começa a acompanhar a evolução desse serviço mês a mês. Se tiver o contrato, pode adicioná-lo para verificarmos também os preços contratados, as promoções e a fidelização. Se não tiver o documento à mão, pode indicar os dados manualmente — basta o fornecedor e uma data, como o fim da fidelização ou da promoção. Para receber alertas sobre alterações no seu sector, escolha os sectores que lhe interessam em “Gestão de Perfil”." as Resposta,
  },
  oQueIncluiCasoProtecao: {
    pergunta: "O que inclui o plano Caso + Protecção?",
    resposta: (p: Precos): Resposta =>
      `Inclui as funcionalidades do plano Protecção e 1 novo caso por mês. Os casos não utilizados acumulam até ao limite de ${p.limite}.`,
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
    pergunta: "Posso cancelar a Protecção?",
    resposta: [
      "Sim. Pode cancelar a sua subscrição a qualquer momento na área <b>Gestão de Subscrição</b>. Depois de cancelar, continua a beneficiar da Protecção até ao fim do período que já pagou e não serão feitas novas cobranças. Quando esse período terminar, os alertas da Protecção ficam desactivados e deixam de ser enviados.",
      "O cancelamento normal não dá direito ao reembolso proporcional da mensalidade já paga, sem prejuízo dos direitos que a lei lhe atribui, nomeadamente o direito de livre resolução quando aplicável.",
      "Os casos que já criou continuam disponíveis na sua conta. Se tiver casos acumulados no plano Caso + Protecção, estes ficam guardados durante 90 dias após o fim da subscrição. Se voltar a subscrever o Caso + Protecção dentro desse período, recupera os casos disponíveis que tinha.",
      "Se tiver um caso da subscrição ainda em acompanhamento, mostramos-lhe a escolha antes de cancelar: pode manter a subscrição até o caso terminar ou cancelar e, nesse caso, o acompanhamento desse caso termina também no fim do período já pago. Os casos tratados com Avulso ou Caso Extra não são afectados.",
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
      "A DoLado fica à espera da resposta da empresa e analisa-a quando chega. Avisamos por e-mail quando estamos a analisar uma resposta, quando precisamos de mais informação sua e quando a empresa apresenta uma solução que precisa de confirmar.",
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
      "Sim. Depois do envio, pode consultar no seu caso, na área de cliente, o texto exacto da reclamação submetida e, quando disponível, o respectivo comprovativo de submissão, juntamente com o histórico do caso. Se o caso for encerrado sem solução da empresa, disponibilizamos também um dossiê com o que foi feito." as Resposta,
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
  // Análise gratuita de documentos e acompanhamento (reposicionamento de
  // 22/10/2026; só aparecem com DIAGNOSTICO_GRATUITO_ATIVO). O diagnóstico só
  // mostra o que está no documento e contas simples: nunca prometer que
  // encontra erros. Prazos de conservação: Política 2026-10-22c.
  oQueDescobrir: {
    pergunta: "O que posso descobrir numa análise?",
    resposta:
      "Mostramos o que está escrito na factura ou no contrato: o total e de onde vem, o que paga todos os meses e o que foi cobrado só desta vez, as datas de fim da fidelização ou da promoção e as condições do contrato. Fazemos contas simples com esses valores, como os dias que faltam para uma data, e dizemos-lhe o que não foi possível confirmar no documento." as Resposta,
  },
  analiseGratuita: {
    pergunta: "A análise inicial é gratuita?",
    resposta:
      "Sim. Analisar um documento não exige conta, e-mail nem cartão bancário e não dá início a nenhuma subscrição. A Protecção, que acompanha as suas facturas e contratos ao longo do tempo, é um serviço à parte." as Resposta,
  },
  analiseConta: {
    pergunta: "Preciso de criar conta?",
    resposta:
      "Não para ver o resultado: carrega o documento e vê-o logo a seguir. Só cria conta se quiser guardar o resultado ou continuar com a Protecção." as Resposta,
  },
  analiseDocumentos: {
    pergunta: "Que documentos posso enviar?",
    resposta:
      "Facturas e contratos de telecomunicações, electricidade, gás e água. Na análise gratuita, em PDF, até 10 MB. Na Protecção, também pode enviar facturas em imagem. Só deve enviar documentos de que seja titular ou que esteja autorizado a utilizar." as Resposta,
  },
  analiseDados: {
    pergunta: "Que dados são retirados do documento?",
    resposta:
      "A empresa, o sector, o total, a mensalidade, as linhas cobradas, as datas importantes e as condições do contrato. O NIF e o nome do titular não ficam guardados em texto: são substituídos por um código antes de serem guardados." as Resposta,
  },
  analiseDocumento: {
    pergunta: "O que acontece ao meu documento?",
    resposta:
      "O seu documento é privado: só o lemos para lhe mostrar o resultado. Se não criar conta, a DoLado elimina o documento e o resultado ao fim de 7 dias; se criar conta, 30 dias depois, a não ser que peça para continuar a acompanhá-lo com a Protecção. A <privacidade>Política de Privacidade</privacidade> explica como é feita a leitura e que fornecedores nos ajudam." as Resposta,
  },
  analiseProblemas: {
    pergunta: "A análise identifica automaticamente problemas?",
    resposta:
      "Não. A análise gratuita mostra o que está no documento e faz contas simples; não avalia se uma cobrança é devida nem tira conclusões sobre a empresa. Na Protecção, quando a comparação das facturas encontra uma alteração que merece atenção, uma pessoa da DoLado revê-a antes de o avisarmos." as Resposta,
  },
  novasFacturas: {
    pergunta: "Preciso de enviar novas facturas?",
    resposta:
      "Sim, para a Protecção se manter actualizada. A DoLado não acede às suas contas nos fornecedores: compara cada factura que nos envia com as anteriores e com o contrato. Os avisos de datas funcionam com as datas que já conhecemos, mas a comparação só inclui as facturas que nos envia." as Resposta,
  },
  ajudaReclamacoes: {
    pergunta: "Posso continuar a pedir ajuda com reclamações?",
    resposta:
      "Sim. Se tiver um problema com uma empresa, a DoLado prepara a reclamação consigo, só a envia com a sua autorização e acompanha a resposta. O tratamento de casos é feito com o Avulso ou com o Caso + Protecção; não está incluído na Protecção sozinha." as Resposta,
  },
  categorias: {
    sobre: "Sobre a DoLado",
    comoFunciona: "Como funciona",
    analise: "Análise gratuita",
    reclamacoes: "Tratar um problema",
    planos: "Protecção e planos",
    depoisEnvio: "Depois do envio",
    privacidade: "Privacidade e segurança",
  },
};
