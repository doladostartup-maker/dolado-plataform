// Protecção oferecida por um Parceiro de Distribuição (acesso patrocinado):
// página de activação do código, estado no portal e e-mails ao
// beneficiário. Regras em src/lib/acessoPatrocinado.ts; preços sempre de
// src/lib/planos.ts (passados como argumento — nunca escritos aqui). O nome
// do parceiro é o nome comercial registado no backoffice.

export const acessoPatrocinado = {
  ativar: {
    metadados: "Activar a Protecção oferecida",
    eyebrow: "Protecção oferecida",
    titulo: "Active a sua Protecção oferecida",
    texto:
      "Recebeu um código de uma empresa parceira da DoLado. Com ele, tem a Protecção sem qualquer custo durante o período da oferta: a DoLado compara as suas facturas com o contrato e com as facturas anteriores, para detectar aumentos de preço ou cobranças que não esperava, e envia avisos antes do fim de promoções e de períodos de fidelização.",
    resumoTitulo: "Como funciona",
    resumo: {
      inicio: "Começa hoje, quando confirmar o código.",
      semCartao: "Não pedimos cartão bancário nem outro meio de pagamento.",
      semCobranca: (preco: string) =>
        `No fim do período oferecido, a Protecção termina sem qualquer cobrança. Para continuar, terá de escolher aderir por ${preco}/mês.`,
      semCasos: "Não inclui o tratamento de casos.",
      privacidade: "A empresa que lhe deu o código não tem acesso às suas facturas, contratos nem casos.",
    },
    campoCodigo: "Código da oferta",
    ajudaCodigo: "São 12 letras e números, por exemplo ABCD-EFGH-JKLM.",
    aceitar:
      " Compreendo que a Protecção oferecida termina automaticamente no fim do período indicado, sem qualquer cobrança, e que não inclui o tratamento de casos.",
    botao: "Activar a Protecção",
    aAtivar: "A activar…",
    semSessao: "Para activar o código, crie uma conta ou inicie sessão. Não pedimos cartão bancário.",
    criarConta: "Criar conta",
    iniciarSessao: "Iniciar sessão",
    verPlanos: "Ver os planos",
    irParaProtecao: "Ir para a Protecção",
    motivos: {
      ja_ativado: "Este código já está activo na sua conta.",
      demasiadas_tentativas: "Fez demasiadas tentativas. Tente novamente dentro de uma hora.",
      codigo_invalido: "Este código não é válido. Confirme as letras e os números e tente novamente.",
      codigo_expirado: "O prazo para activar este código terminou. Fale com a empresa que lho deu.",
      protecao_ativa:
        "Já tem a Protecção activa na sua subscrição, por isso o código não foi usado. Pode guardá-lo ou devolvê-lo à empresa que lho deu.",
      acesso_ativo: "Já tem uma Protecção oferecida activa. Só pode activar outro código depois de esta terminar.",
      email_nao_confirmado:
        "Confirme primeiro o seu e-mail: enviámos-lhe uma ligação quando criou a conta. Depois, volte a esta página.",
      conta_invalida: "Esta conta não pode activar códigos de oferta.",
      indisponivel: "A activação de códigos não está disponível de momento.",
      erro: "Não foi possível activar o código. Tente novamente dentro de alguns minutos.",
      aceitarTermos: "Para continuar, aceite os Termos e Condições.",
      semCodigo: "Escreva o código que recebeu.",
    },
  },

  portal: {
    titulo: "A sua Protecção oferecida está activa.",
    oferecidaPor: (parceiro: string) => `Oferecida por ${parceiro}.`,
    faltam: (n: number) => (n === 1 ? "Falta 1 dia para terminar." : `Faltam ${n} dias para terminar.`),
    inicio: "Início",
    fim: "Fim",
    estadoPlano: "Protecção oferecida",
    continuar: (preco: string) => `Para continuar depois, pode aderir à Protecção por ${preco}/mês.`,
    cobrancaNoFim: (data: string) => `Se aderir agora, a primeira cobrança só é feita a ${data}, quando terminar a oferta.`,
    cobrancaHoje: "Se aderir agora, a primeira cobrança é feita no dia da adesão.",
    semCobranca: "Se não fizer nada, a Protecção oferecida termina sem qualquer cobrança.",
    cta: "Continuar com a Protecção",
    ativada: "Código activado. A sua Protecção está activa.",
  },

  confirmarCompra: {
    cobrancaNoFim: (data: string) =>
      `Tem a Protecção oferecida: não é cobrado nada agora. A primeira cobrança é feita a ${data}, quando terminar a oferta. Pode cancelar antes dessa data sem qualquer cobrança.`,
    cobrancaHoje: "Tem a Protecção oferecida: como faltam menos de 2 dias para terminar, a primeira cobrança é feita hoje.",
    casoProtecao: "A Protecção oferecida continua até ao fim; o Caso + Protecção é cobrado a partir de hoje.",
  },

  emails: {
    botaoPortal: "Abrir a Protecção",
    botaoDocumento: "Adicionar um documento",
    botaoAderir: "Continuar com a Protecção",
    ativacao: {
      assunto: "A sua Protecção oferecida está activa",
      titulo: "A sua Protecção oferecida está activa",
      texto: (parceiro: string, inicio: string, fim: string) =>
        `A Protecção da DoLado, oferecida por ${parceiro}, está activa de ${inicio} a ${fim}.`,
      passo:
        "Para começarmos, adicione uma factura ou um contrato no portal: verificamos a sua situação actual e passamos a enviar avisos antes do fim de promoções e períodos de fidelização.",
      condicoes:
        "Não pedimos cartão bancário. No fim do período oferecido, a Protecção termina sem qualquer cobrança. A empresa que lhe deu o código não tem acesso às suas facturas, contratos nem casos.",
    },
    d15: {
      assunto: "A sua Protecção oferecida termina dentro de 15 dias",
      titulo: "A sua Protecção oferecida está a terminar",
      texto: (fim: string) => `A sua Protecção oferecida termina a ${fim}.`,
      continuar: (preco: string) =>
        `Se quiser continuar, pode aderir à Protecção por ${preco}/mês. Se aderir antes do fim da oferta, a primeira cobrança só é feita quando ela terminar.`,
      parar: "Se não fizer nada, a Protecção termina sem qualquer cobrança.",
    },
    fim: {
      assunto: "A sua Protecção oferecida terminou",
      titulo: "A sua Protecção oferecida terminou",
      texto: (fim: string) => `A sua Protecção oferecida terminou a ${fim}, sem qualquer cobrança.`,
      efeito: "Deixámos de verificar as suas facturas e de enviar avisos de datas.",
      guardados: (meses: number) =>
        `Os seus serviços e documentos ficam guardados durante ${meses} meses e voltam a ficar activos se aderir à Protecção nesse prazo.`,
    },
  },
};
