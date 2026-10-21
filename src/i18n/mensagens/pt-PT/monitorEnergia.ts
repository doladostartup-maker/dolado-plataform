// Textos da comparação de facturas de electricidade e gás (src/lib/monitor/
// comparacaoEnergia.ts): explicação da diferença entre facturas e situações
// detectadas. Linguagem simples, sem termos técnicos desnecessários, sem
// conclusões sobre a lei. Valores (euros, preços, consumos, datas) chegam já
// formatados.

type V = string;

export const monitorEnergia = {
  fornecimento: {
    eletricidade: "electricidade",
    gas: "gás",
  },
  /** Com o artigo: "da electricidade" / "do gás". */
  doFornecimento: {
    eletricidade: "da electricidade",
    gas: "do gás",
  },
  aFatura: (tipo: V) => `A factura de ${tipo}`,
  componentes: {
    consumo: "Consumo de energia",
    preco_energia: "Preço da energia (por kWh)",
    preco_medio_energia: "Preço médio da energia (por kWh)",
    energia: "Energia (consumo e preço juntos)",
    dias: "Número de dias facturados",
    preco_termo_fixo_eletricidade: "Preço diário da potência",
    preco_termo_fixo_gas: "Termo fixo diário",
    potencia: "Mudança da potência contratada",
    termo_fixo_eletricidade: "Potência contratada",
    termo_fixo_gas: "Termo fixo",
    redes: "Tarifas de acesso às redes",
    impostos: "Impostos e taxas",
    descontos: "Descontos",
    acertos: "Acertos de períodos anteriores",
    servicos_adicionais: "Serviços adicionais",
    outros: "Outros valores que não conseguimos identificar",
  },
  periodos: {
    simples: "tarifa simples",
    vazio: "horas de vazio",
    fora_vazio: "horas fora de vazio",
    cheias: "horas cheias",
    ponta: "horas de ponta",
    outro: "outro período",
  },
  certeza: {
    alta: "Com base nos valores escritos nas duas facturas.",
    media: "Com base nos valores das facturas, mas com dados estimados ou incompletos — o valor pode não ser exacto.",
    baixa: "Explicação parcial: a factura não tem todos os dados necessários.",
  },
  explicacao: {
    titulo: "Porque mudou o valor",
    pagou: "Pagou",
    anterior: "Factura anterior",
    diferenca: "Diferença",
    superior: (tipo: V, v: V) => `A factura de ${tipo} foi ${v} mais alta do que a anterior.`,
    inferior: (tipo: V, v: V) => `A factura de ${tipo} foi ${v} mais baixa do que a anterior.`,
    igual: (tipo: V) => `A factura de ${tipo} teve o mesmo valor da anterior.`,
    doConsumo: "Do consumo",
    dosPrecos: "Dos preços e de outros valores",
    arredondamento: (v: V) => `Inclui ${v} de arredondamentos.`,
    naoExplicado: (v: V) => `Não conseguimos explicar ${v} com os dados das facturas.`,
    consumoDia: (atual: V, anterior: V) => `Consumo médio por dia: ${atual} (antes: ${anterior}).`,
    dias: (atual: V, anterior: V) => `Dias facturados: ${atual} (antes: ${anterior}).`,
    estimada: "Esta factura usa leituras estimadas: o consumo real pode ser diferente.",
    estruturaDiferente: "A forma de contar a energia mudou (por exemplo, de tarifa simples para bi-horária): comparámos o preço médio por kWh.",
    proximoPasso: "Próximo passo",
    semNada: "Não há nada a fazer. Continuamos a acompanhar as próximas facturas.",
    verSituacao: "Veja acima a situação que a DoLado encontrou nesta factura.",
    comunicarLeitura: "Se puder, comunique a leitura do contador ao comercializador: a próxima factura passa a basear-se no consumo real.",
    rever: "A DoLado está a verificar uma alteração nesta factura antes de lha mostrar.",
  },
  eventos: {
    variacaoComCausas: (aFatura: V, v: V, sentido: V, causas: V) => `${aFatura} foi ${v} ${sentido} do que a anterior: ${causas}.`,
    variacaoSemCausas: (aFatura: V, v: V, sentido: V) => `${aFatura} foi ${v} ${sentido} do que a anterior.`,
    variacaoIgual: (aFatura: V) => `${aFatura} teve o mesmo valor da anterior.`,
    maisAlta: "mais alta",
    maisBaixa: "mais baixa",
    causa: (rotulo: V, v: V) => `${rotulo.toLowerCase()} ${v}`,
    eOutros: "e outros valores mais pequenos",
    lista: (causas: string[]) => (causas.length === 1 ? causas[0] : `${causas.slice(0, -1).join("; ")} e ${causas.at(-1)}`),
    precoAlterado: (tipo: V, periodos: V, v: V) =>
      `O preço ${tipo} por kWh subiu face à factura anterior (${periodos}). Com o consumo desta factura, a diferença é de cerca de ${v}. Confirme se recebeu uma comunicação do comercializador sobre esta alteração.`,
    precoDesceu: (tipo: V, periodos: V) => `O preço ${tipo} por kWh desceu face à factura anterior (${periodos}).`,
    precoPeriodo: (periodo: V, de: V, para: V) => `${periodo}: de ${de} para ${para}`,
    precoIndexado: (tipo: V, periodos: V) =>
      `O preço ${tipo} por kWh mudou (${periodos}). Num tarifário indexado, o preço pode variar de factura para factura, de acordo com a fórmula prevista no contrato.`,
    termoFixoAlterado: (rotulo: V, de: V, para: V, v: V) =>
      `O ${rotulo.toLowerCase()} subiu de ${de} para ${para}. Nesta factura, a diferença é de cerca de ${v}. Confirme se recebeu uma comunicação do comercializador sobre esta alteração.`,
    termoFixoDesceu: (rotulo: V, de: V, para: V) => `O ${rotulo.toLowerCase()} desceu de ${de} para ${para}.`,
    potenciaSubiu: (de: V, para: V) =>
      `A potência contratada passou de ${de} para ${para}. Se não pediu esta alteração, vale a pena confirmar com o comercializador.`,
    potenciaDesceu: (de: V, para: V) => `A potência contratada passou de ${de} para ${para}.`,
    tarifarioAlterado: (de: V, para: V) =>
      `A forma de facturação mudou (de ${de} para ${para}). Se não pediu esta alteração, vale a pena confirmar com o comercializador.`,
    consumoSuperior: (tipo: V, atual: V, anterior: V, base: V, estimada: boolean) =>
      `Gastou mais ${tipo} por dia do que ${base}: ${atual} por dia (antes: ${anterior}).${estimada ? " Atenção: o consumo desta factura é estimado." : ""}`,
    basePeriodoAnterior: "na factura anterior",
    baseAnoAnterior: "no mesmo período do ano passado",
    leituraEstimada: (tipo: V) =>
      `A factura de ${tipo} usa leituras estimadas. Se puder, comunique a leitura do contador ao comercializador: a factura passa a basear-se no consumo real.`,
    leituraMista: (tipo: V) => `A factura de ${tipo} junta leituras reais e estimadas.`,
    acerto: (tipo: V, v: V, cobranca: boolean, periodo: V) =>
      cobranca
        ? `A factura de ${tipo} inclui um acerto de ${v} de períodos anteriores${periodo}. Confirme se as leituras indicadas coincidem com as do seu contador.`
        : `A factura de ${tipo} inclui uma devolução de ${v} de acertos de períodos anteriores${periodo}.`,
    acertoPeriodo: (de: V, ate: V) => ` (${de} a ${ate})`,
    servicoNovo: (descricao: V, v: V) =>
      `Apareceu um serviço adicional na factura: “${descricao}” (${v}). Se não pediu este serviço, vale a pena confirmar com o comercializador.`,
    servicoAlterado: (descricao: V, de: V, para: V) => `O serviço adicional “${descricao}” passou de ${de} para ${para}.`,
    semComparavel: (tipo: V) => `Ainda não temos uma factura anterior de ${tipo} comparável com esta.`,
    periodoSobreposto: (tipo: V) =>
      `Esta factura de ${tipo} cobre dias que já estavam noutra factura (por exemplo, uma factura de acerto): não a comparámos com a anterior.`,
    semTotais: (tipo: V) => `Não conseguimos ler o total da factura de ${tipo} para a comparar com a anterior.`,
  },
  unidades: {
    porKwh: (v: V) => `${v}/kWh`,
    porDia: (v: V) => `${v}/dia`,
    kwh: (v: V) => `${v} kWh`,
    kva: (v: V) => `${v} kVA`,
  },
  opcoes: {
    simples: "tarifa simples",
    bi_horaria: "bi-horária",
    tri_horaria: "tri-horária",
    fixo: "preço fixo",
    indexado: "preço indexado",
    dinamico: "preço dinâmico",
  },
  servico: {
    ultimaFatura: "Última factura",
    consumoDia: (tipo: V) => `Consumo médio por dia (${tipo})`,
    precoEnergia: (tipo: V) => `Preço da energia (${tipo})`,
    potencia: "Potência contratada",
    termoFixo: (rotulo: V) => rotulo,
    estimada: "leitura estimada",
    atentoPrecos: "Alterações dos preços da energia, da potência ou do termo fixo",
    atentoConsumo: "O seu consumo e os acertos de leituras",
    atentoServicos: "Descontos e serviços adicionais nas próximas facturas",
  },
  situacao: {
    curtoPreco: "uma subida do preço da energia",
    curtoTermoFixo: "uma subida do valor diário fixo",
    curtoPotencia: "uma mudança da potência contratada",
    curtoTarifario: "uma mudança na forma de facturação",
    curtoAcerto: (v: V) => `um acerto de ${v}`,
    curtoServico: "um serviço adicional novo",
    causas: {
      preco:
        "O preço da energia pode mudar por uma actualização de preços comunicada pelo comercializador, pelo fim de um desconto ou por uma alteração das tarifas reguladas. Nem sempre é um erro, mas vale a pena confirmar.",
      acerto:
        "Um acerto acontece quando o comercializador passa a ter a leitura real do contador e corrige o que tinha facturado com estimativas. Vale a pena confirmar as leituras e as datas.",
      servico:
        "Um serviço adicional pode corresponder a um seguro, assistência técnica ou manutenção acrescentados ao contrato — ou a um serviço que não pediu.",
    },
    antes: "Antes",
    agora: "Agora",
    diferenca: "Diferença nesta factura",
  },
};
