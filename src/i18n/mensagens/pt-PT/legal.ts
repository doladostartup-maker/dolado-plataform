// Moldura das páginas legais. O CONTEÚDO dos Termos, da Política de
// Privacidade, da Livre resolução e da Resolução de litígios não é traduzido
// aqui: são textos jurídicos versionados e validados em português (a versão
// vinculativa). Em inglês, a página mostra o aviso `avisoSoPortugues`.

export const legal = {
  titulos: {
    termos: "Termos e Condições — DoLado",
    termosVersao: "Termos e Condições (versão) — DoLado",
    privacidade: "Política de Privacidade — DoLado",
    privacidadeVersao: "Política de Privacidade (versão) — DoLado",
    livreResolucao: "Livre resolução — DoLado",
    resolucaoLitigios: "Reclamações e resolução de litígios — DoLado",
  },
  descricoes: {
    livreResolucao:
      "Como exercer o direito de livre resolução nos serviços da DoLado: prazo, início imediato, formulário online e modelo de formulário.",
    resolucaoLitigios:
      "Como apresentar uma reclamação sobre o serviço da DoLado: contacto, Livro de Reclamações Eletrónico e entidades de resolução alternativa de litígios de consumo.",
  },
  /** Só mostrado nas páginas em inglês. */
  avisoSoPortugues: "",
  versaoAntigaTermos: (versao: string) =>
    `Está a consultar a versão de ${versao} dos Termos e Condições, que já não está em vigor. <atual>Ver a versão em vigor</atual>.`,
  versaoAntigaPrivacidade: (versao: string) =>
    `Está a consultar a versão de ${versao} da Política de Privacidade, que já não está em vigor. <atual>Ver a versão em vigor</atual>.`,
};
