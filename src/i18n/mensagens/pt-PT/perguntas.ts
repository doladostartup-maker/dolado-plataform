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
    resposta: (p: Precos): Resposta =>
      `A DoLado tem três opções: Proteção por ${p.protecao}, Caso + Proteção por ${p.casoProtecao} e o serviço Avulso por ${p.avulso} por caso. Todos os preços incluem IVA.`,
  },
  diferencaPlanos: {
    pergunta: "Qual é a diferença entre Proteção, Caso + Proteção e Avulso?",
    resposta:
      "A Proteção ajuda a identificar alterações nas suas faturas, datas importantes e alterações relevantes no seu setor que possam tornar-se num problema, sem tratamento de casos. O Caso + Proteção junta essa prevenção ao tratamento de problemas, com 1 novo caso por mês. O Avulso serve para tratar um único problema, com pagamento único, sem subscrição nem funcionalidades da Proteção." as Resposta,
    complementoLimite: (p: Precos) => `No Caso + Proteção, os casos não utilizados acumulam até ao limite de ${p.limite}.`,
  },
  prazo: {
    pergunta: "Quanto tempo demora?",
    resposta:
      "Depois de abrir o seu caso, respondemos-lhe no prazo máximo de 48 horas úteis para confirmar os factos consigo. A reclamação é preparada a partir dessa confirmação." as Resposta,
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
      "Sim. Antes do envio, recebe o conteúdo preparado pela DoLado para rever. Só depois da sua autorização explícita submetemos a reclamação em seu nome, pelo canal adequado ao caso — por exemplo, o Livro de Reclamações Eletrónico ou o canal de reclamações da empresa." as Resposta,
  },
  naoConcordo: {
    pergunta: "E se eu não concordar com o texto preparado?",
    resposta:
      "Antes do envio, pode rever o texto preparado pela DoLado através do link que lhe enviamos por e-mail. Se pretender alguma alteração, selecione “Pedir alterações” e indique-nos o que gostaria de rever. A DoLado só procede ao envio depois de receber a sua autorização explícita." as Resposta,
  },
  documentos: {
    pergunta: "Que informações ou documentos posso precisar de enviar?",
    resposta:
      "Depende do caso. Podemos pedir informações como datas, valores, comunicações com a empresa, faturas, contratos ou outros documentos que ajudem a compreender e fundamentar a reclamação." as Resposta,
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
    resposta:
      "A DoLado acompanha o andamento do caso e a resposta recebida. Dependendo do resultado e do serviço aplicável ao seu caso, ajudamos a perceber quais são os próximos passos disponíveis." as Resposta,
  },
  empresaNaoResolve: {
    pergunta: "E se a empresa não resolver o problema?",
    resposta:
      "Uma reclamação nem sempre termina com a primeira resposta. Quando o caso permitir e estiver dentro do serviço contratado, a DoLado ajuda a analisar a resposta e a identificar os próximos mecanismos disponíveis." as Resposta,
  },
  copia: {
    pergunta: "Recebo uma cópia da reclamação enviada?",
    resposta:
      "Sim. Depois do envio, pode consultar no seu caso o texto exato da reclamação submetida e, quando disponível, o respetivo comprovativo de submissão. Estes elementos ficam disponíveis no seu portal, juntamente com o histórico do caso. No final do acompanhamento, disponibilizamos também o dossiê do caso." as Resposta,
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
