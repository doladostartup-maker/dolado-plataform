// Diagnóstico gratuito sem registo (src/lib/diagnostico/). Só factos lidos
// do documento e cálculos feitos em código — nunca "pontos de atenção",
// irregularidades, poupanças nem conclusões jurídicas (decisão de Thiago,
// 22/10/2026; regra 2 do "Uso de IA").

type V = string;

export const diagnostico = {
  carregar: {
    botao: "Analisar gratuitamente",
    confianca: "Sem registo inicial. Sem cartão bancário.",
    formatos: "Apenas ficheiros PDF, até 10 MB.",
    // Primeira camada (reposicionamento de 22/10/2026): o benefício e a
    // conservação; quem lê o documento (Anthropic, fornecedor de inteligência
    // artificial) fica na Política e em "Como tratamos o seu documento".
    privacidade: "O seu documento é privado. Se não criar conta, a DoLado elimina o documento e o resultado ao fim de 7 dias.",
    privacidadeLigacao: "Política de Privacidade",
    // Cartão de análise da homepage (CartaoAnalise). Privacidade alinhada com a
    // Política 2026-10-22c: subcontratante de IA, 7 dias do lado da DoLado,
    // até 30 dias do lado da Anthropic, possível transferência para fora da UE.
    // Desde 22/10/2026: no cartão, a privacidade, o prazo e o tratamento; o
    // subcontratante de IA (Anthropic), os 30 dias e a transferência só na
    // Política de Privacidade (decisão de Thiago, 22/10/2026).
    cartao: {
      comeceAqui: "Comece por aqui",
      titulo: "Carregue uma factura ou um contrato",
      setores: "Telecomunicações, electricidade, gás ou água.",
      botao: "Escolher ficheiro PDF",
      arrastar: "ou arraste o ficheiro para esta área",
      gratuita: "Análise inicial gratuita",
      semRegisto: "Sem registo inicial",
      apenasPdf: "Apenas ficheiros PDF",
      privacidadeTitulo: "O seu documento é privado.",
      privacidade: "Se não criar conta, a DoLado elimina o documento e o resultado ao fim de 7 dias.",
      detalhesTitulo: "Como tratamos o seu documento",
      detalhes: [
        "Analisamos o seu documento para identificar valores, datas e condições importantes. O resultado é preparado automaticamente a partir do que está escrito no documento.",
        "A Política de Privacidade explica como é feita a leitura do documento, que fornecedores nos ajudam e por quanto tempo os dados são guardados.",
        "Só deve carregar documentos de que seja titular ou que esteja autorizado a utilizar.",
      ],
    },
    aEnviar: "A enviar o documento…",
    erros: {
      formato: "Só aceitamos ficheiros PDF. Escolha o PDF da factura ou do contrato.",
      tamanho: "O ficheiro tem mais de 10 MB. Carregue um ficheiro mais pequeno.",
      vazio: "O ficheiro está vazio. Escolha outro ficheiro.",
      limite: "Já analisámos vários documentos há pouco. Tente de novo daqui a alguns minutos.",
      temporario: "Não foi possível enviar o documento. Tente novamente.",
      indisponivel: "A análise gratuita não está disponível de momento.",
    },
  },
  pagina: {
    metadados: "O seu diagnóstico gratuito",
    eyebrow: "Diagnóstico gratuito",
    aAnalisar: "Estamos a ler o seu documento",
    aAnalisarTexto: "Demora normalmente menos de um minuto. Não feche esta página.",
    naoEncontrado: "Não encontrámos este diagnóstico",
    naoEncontradoTexto:
      "O diagnóstico só pode ser aberto no mesmo navegador em que carregou o documento e fica disponível durante 7 dias.",
    tentarOutro: "Analisar outro documento",
    falhou: {
      titulo: "Não foi possível concluir a análise",
      ficheiro_invalido: "O ficheiro não parece ser um PDF válido. Experimente outro ficheiro.",
      nao_suportado:
        "Este documento não parece ser uma factura ou um contrato de telecomunicações, electricidade, gás ou água. Por agora, o diagnóstico gratuito só analisa estes documentos.",
      ilegivel: "Não conseguimos ler o documento com segurança. Experimente o PDF original, tal como o recebeu da empresa.",
      indisponivel: "Houve um problema temporário. Tente novamente daqui a pouco.",
      orcamento: "A análise gratuita está temporariamente indisponível. Tente novamente mais tarde.",
    },
  },
  resultado: {
    titulo: {
      fatura: "Analisámos a sua factura",
      contrato: "Analisámos o seu contrato",
    },
    empresa: (e: V) => `Empresa: ${e}`,
    semEmpresa: "Não foi possível confirmar a empresa.",
    setor: (s: V) => `Sector: ${s}`,
    lidoTitulo: "O que lemos no documento",
    lidoNota: "Valores tal como aparecem no documento. Se algum estiver errado, diga-nos depois de criar conta.",
    pagina: (p: V) => `página ${p}`,
    linhasTitulo: "O que está a ser cobrado",
    linhaRecorrente: "todos os meses",
    linhaPontual: "só esta vez",
    calculosTitulo: "O que calculámos",
    calculos: {
      dias_fim_fidelizacao: (data: V, dias: V) => `A fidelização termina a ${data} — faltam ${dias} dias.`,
      dias_fim_fidelizacao_hoje: (data: V) => `A fidelização termina hoje (${data}).`,
      fidelizacao_terminada: (data: V) => `A fidelização indicada terminou a ${data}.`,
      dias_fim_promocao: (data: V, dias: V) => `A promoção termina a ${data} — faltam ${dias} dias.`,
      dias_fim_promocao_hoje: (data: V) => `A promoção termina hoje (${data}).`,
      promocao_terminada: (data: V) => `A promoção indicada terminou a ${data}.`,
      fim_fidelizacao_pela_duracao: (data: V, inicio: V, meses: V) =>
        `Pelo início (${inicio}) e pela duração (${meses} meses), a fidelização termina a ${data}.`,
      soma_linhas_coincide: (total: V) => `A soma das linhas coincide com o total da factura (${total}).`,
      soma_linhas_difere: (soma: V, total: V) =>
        `A soma das linhas que conseguimos ler (${soma}) é diferente do total da factura (${total}). Pode haver linhas que não conseguimos ler.`,
    },
    diferenca: {
      mais: (diferenca: V, mensalidade: V) => `Esta factura tem mais ${diferenca} do que a mensalidade (${mensalidade}).`,
      menos: (diferenca: V, mensalidade: V) => `Esta factura tem menos ${diferenca} do que a mensalidade (${mensalidade}).`,
      notaComLinhas: "Nas linhas abaixo pode ver de onde vem a diferença. Uma diferença não é, por si só, um erro.",
      notaSemLinhas: "Uma diferença não é, por si só, um erro: pode vir de consumos, serviços adicionais, acertos ou descontos.",
    },
    porConfirmarTitulo: "O que não conseguimos confirmar",
    porConfirmar: {
      fornecedor: "A empresa que emitiu o documento.",
      total: "O valor total da factura.",
      periodo: "O período a que a factura diz respeito.",
      fidelizacao: "Se este serviço tem fidelização e quando termina.",
      mensalidade: "O valor da mensalidade.",
      data_ativacao: "A data de activação, de que depende o fim da fidelização.",
    } as Record<string, string>,
    nadaPorConfirmar: "Conseguimos ler a informação principal do documento.",
    aviso:
      "Este diagnóstico descreve o que está no documento. Não é um parecer jurídico nem uma avaliação de que algo está errado.",
    campos: {
      data_emissao: "Data de emissão",
      periodo_inicio: "Início do período",
      periodo_fim: "Fim do período",
      total: "Total da factura",
      mensalidade: "Mensalidade",
      descontos: "Descontos",
      data_fim_fidelizacao: "Fim da fidelização",
      cessacao: "Valor indicado para cancelar",
      data_assinatura: "Data de assinatura",
      data_ativacao: "Data de activação",
      inicio_na_ativacao: "A fidelização começa na activação",
      data_inicio: "Início da fidelização",
      duracao_fidelizacao_meses: "Duração da fidelização",
      data_fim_promocao: "Fim da promoção",
      descricao_promocao: "Promoção",
      mensalidade_cents: "Mensalidade",
      vantagem_cents: "Valor da vantagem",
      desconto_promocao_cents: "Desconto da promoção",
      data_inicio_promocao: "Início da promoção",
      servicos_incluidos: "Serviços incluídos",
    } as Record<string, string>,
    meses: (n: V) => `${n} meses`,
    sim: "Sim",
    nao: "Não",
  },
  conversao: {
    titulo: "Quer continuar a ter a DoLado a acompanhar os seus contratos e facturas?",
    beneficios: [
      "Avisamos antes do fim da fidelização e das promoções.",
      "Comparamos cada factura nova com as anteriores; o que merecer atenção é revisto por uma pessoa da DoLado.",
      "Se houver um problema, pode pedir-nos que o tratemos.",
    ],
    protecao: "Continuar com 30 dias grátis",
    protecaoNota: "Sem cartão bancário. No fim dos 30 dias, nada é cobrado.",
    guardar: "Guardar o meu resultado",
    guardarNota: "Crie uma conta gratuita para guardar este resultado.",
    guardado: "Este resultado já está guardado na sua conta.",
    irPortal: "Abrir a minha conta",
    problema: "Já tem um problema com esta empresa?",
    problemaLigacao: "Peça-nos ajuda",
  },
};
