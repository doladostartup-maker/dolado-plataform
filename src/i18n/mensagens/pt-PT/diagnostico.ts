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
      "O diagnóstico abre-se no navegador em que carregou o documento ou, se o guardou, com a sessão iniciada na sua conta. Fica disponível durante 7 dias (30 dias depois de guardado).",
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
    },
    // Resultado em três níveis (src/lib/diagnostico/apresentacao.ts, revisão
    // de 23/10/2026): o que encontrámos agora (com "o que isto significa"),
    // o que vale a pena confirmar e a Protecção como continuação. Os
    // significados são explicações gerais e condicionais do tipo de facto —
    // nunca uma conclusão de que algo está errado nem um conselho para o caso
    // da pessoa (regras 2 e 4 do "Uso de IA").
    encontrou: {
      titulo: "O que encontrámos agora",
      texto: { fatura: "Datas e valores desta factura que provavelmente quer conhecer.", contrato: "Datas e valores deste contrato que provavelmente quer conhecer." },
      semDestaques: {
        fatura: "Nesta factura não encontrámos datas a terminar em breve nem cobranças fora da mensalidade.",
        contrato: "Neste contrato não encontrámos datas a terminar nos próximos 3 meses.",
      },
      semDestaquesDepois: "Isso pode mudar nas próximas facturas: preços, promoções, fidelização e cobranças novas.",
      significado: "O que isto significa",
    },
    descobertas: {
      faltam: (dias: number) => (dias === 0 ? "Termina hoje" : dias === 1 ? "Falta 1 dia" : `Faltam ${dias} dias`),
      daquiA: (meses: number) => (meses <= 1 ? "Daqui a cerca de 1 mês" : `Daqui a cerca de ${meses} meses`),
      jaTerminou: "Já terminou",
      porAno: (v: V) => `${v} por ano`,
      data_proxima: {
        fidelizacao: (data: V) => `A sua fidelização termina a ${data}.`,
        promocao: (data: V) => `A sua promoção termina a ${data}.`,
      },
      data_futura: {
        fidelizacao: (data: V) => `Tem fidelização até ${data}.`,
        promocao: (data: V) => `A sua promoção dura até ${data}.`,
      },
      data_passada: {
        fidelizacao: (data: V) => `Segundo o documento, a fidelização terminou a ${data}.`,
        promocao: (data: V) => `Segundo o documento, a promoção terminou a ${data}.`,
      },
      acima_mensalidade: (diferenca: V, mensalidade: V) => `Esta factura tem mais ${diferenca} do que a mensalidade (${mensalidade}).`,
      cobrancas_pontuais: (n: number, total: V) =>
        n === 1 ? `Há 1 cobrança que não se repete todos os meses: ${total}.` : `Há ${n} cobranças que não se repetem todos os meses: ${total} no total.`,
      descontos: (v: V) => `Este documento tem ${v} de descontos.`,
      cessacao: (v: V) => `A factura indica ${v} como valor para cancelar.`,
      soma_difere: (soma: V, total: V) => `As linhas que conseguimos ler somam ${soma}, mas o total da factura é ${total}.`,
      custo_anual: (mensal: V, anual: V) => `A mensalidade de ${mensal} representa cerca de ${anual} por ano.`,
      recorrentes_anual: (n: number, mensal: V, anual: V) =>
        n === 1
          ? `A cobrança que se repete todos os meses (${mensal}) representa cerca de ${anual} por ano.`
          : `As ${n} cobranças que se repetem todos os meses somam ${mensal}: cerca de ${anual} por ano.`,
      significados: {
        fidelizacao_ativa: "Até essa data, cancelar ou mudar de empresa pode ter encargos. Depois, os encargos da fidelização deixam de se aplicar.",
        promocao_ativa: "Quando uma promoção termina, o preço pode subir. O preço que passa a aplicar-se consta do contrato.",
        fidelizacao_passada:
          "Os encargos de cancelamento de uma fidelização só se aplicam durante o período de fidelização. Uma nova oferta pode trazer uma nova fidelização.",
        promocao_passada: "Depois de uma promoção, o preço pode ser diferente do que pagava antes. As próximas facturas mostram o preço actual.",
        acima_mensalidade: "A diferença pode vir de consumos extra, serviços pontuais, acertos ou impostos. Nas linhas da factura pode ver de onde vem.",
        cobrancas_pontuais: "Não fazem parte da mensalidade. Por isso, a próxima factura pode ter um valor diferente.",
        descontos: "Se o desconto vier de uma promoção, pode deixar de se aplicar quando ela terminar.",
        cessacao: "É o valor que a empresa indica nesta data. Durante a fidelização, este valor pode mudar de mês para mês.",
        soma_difere: "Pode haver linhas que não conseguimos ler. O valor a pagar é o total indicado na factura.",
        custo_anual: "É um custo fixo: repete-se todos os meses enquanto as condições se mantiverem.",
      },
    },
    porConfirmarTitulo: "Vale a pena confirmar",
    porConfirmarTexto: "Não conseguimos ler estes pontos com segurança. Vale a pena confirmá-los no documento original.",
    detalheTitulo: "Ver tudo o que lemos no documento",
    linhaPorAno: (v: V) => `cerca de ${v} por ano`,
    porConfirmar: {
      fornecedor: "A empresa que emitiu o documento.",
      total: "O valor total da factura.",
      periodo: "O período a que a factura diz respeito.",
      fidelizacao: "Se este serviço tem fidelização e quando termina.",
      mensalidade: "O valor da mensalidade.",
      data_ativacao: "A data de activação, de que depende o fim da fidelização.",
    } as Record<string, string>,
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
    // A Protecção como continuação do resultado (23/10/2026): "Já fizemos
    // isto por si uma vez. Podemos continuar a fazê-lo." Só o que o Monitor
    // faz (comparação das facturas, avisos 30 dias antes e na data, revisão
    // por uma pessoa, resumo mensal). Vindo de /analisar-fatura: 4,99 €/mês;
    // das outras páginas: 30 dias grátis.
    continuidade: {
      titulo: {
        fatura: "A sua factura já está analisada. Agora podemos continuar atentos por si.",
        contrato: "O seu contrato já está analisado. Agora podemos continuar atentos por si.",
      },
      texto:
        "Com a Protecção, a DoLado acompanha as suas próximas facturas e diz-lhe quando houver alterações de preço, fim de promoção ou de fidelização, ou cobranças que mereçam atenção.",
      comOQueEncontramos: "Com o que encontrámos hoje:",
      aviso30: {
        fidelizacao: (data: V) => `Enviamos-lhe um aviso 30 dias antes de ${data}, quando termina a fidelização.`,
        promocao: (data: V) => `Enviamos-lhe um aviso 30 dias antes de ${data}, quando termina a promoção.`,
      },
      avisoNoDia: {
        fidelizacao: (data: V) => `Enviamos-lhe um aviso a ${data}, o dia em que termina a fidelização.`,
        promocao: (data: V) => `Enviamos-lhe um aviso a ${data}, o dia em que termina a promoção.`,
      },
      comparar_proxima: "Comparamos a próxima factura com esta e explicamos-lhe o que mudou.",
      juntar_contrato: "Se juntar o contrato, comparamos cada factura com as condições que aceitou.",
      gerais: [
        "Comparamos cada factura nova com as anteriores.",
        "Enviamos-lhe um aviso antes do fim da fidelização e das promoções.",
        "Todos os meses, recebe por e-mail um resumo do que acompanhámos.",
      ],
      revisao: "O que merecer atenção é revisto por uma pessoa da DoLado antes de lhe dizermos.",
      porMes: "/mês",
      precoNota: "IVA incluído. Pode cancelar quando quiser, no portal.",
      botao: "Quero que a DoLado continue a verificar",
      notaSemConta: "Primeiro cria a sua conta; depois escolhe a forma de pagamento.",
      documento: "Depois de aderir, pode começar pelo documento que acabámos de analisar.",
      gratuita: "Esta análise continua gratuita, com ou sem Protecção.",
      // Outras origens (homepage): a mesma continuação, com os 30 dias grátis.
      gratisPreco: "30 dias grátis",
      gratisDepois: (preco: V) => `Depois, ${preco}/mês, só se decidir aderir.`,
    },
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
