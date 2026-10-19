// Calculadora de Cancelamento pública (/calculadora-cancelamento). As regras
// e a validação estão em src/lib/calculadoraCancelamento/regras.ts; as
// mensagens de validação que lá estão são as chaves de `erros`.

export const calculadora = {
  metadados: {
    titulo: "Calculadora de Cancelamento - DoLado",
    descricao:
      "Estime o valor máximo que pode ter de pagar para cancelar um contrato de telecomunicações antes do fim da fidelização. Grátis, sem criar conta e sem deixar o seu e-mail.",
  },
  eyebrow: "Grátis · sem conta · telecomunicações",
  titulo: "Calculadora de Cancelamento",
  texto:
    "Estime quanto lhe pode ser cobrado se cancelar antecipadamente um contrato de telecomunicações com fidelização. O resultado aparece logo, sem pedir e-mail nem criar conta.",
  notaAmbito:
    "Esta calculadora estima o encargo máximo de um cancelamento antecipado por iniciativa do cliente, quando não exista um motivo legal ou contratual que permita cancelar sem encargos.",
  duracao: {
    meses: (n: number) => (n === 1 ? "1 mês" : `${n} meses`),
    dias: (n: number) => (n === 1 ? "1 dia" : `${n} dias`),
    e: " e ",
  },
  campos: {
    dataInicio: "Data de início da fidelização",
    dataInicioAjuda: "Numa refidelização, indique a data em que começou o novo período de fidelização.",
    duracao: "Duração total da fidelização (meses)",
    duracaoAjuda: "Normalmente 12 ou 24 meses.",
    primeiraVez: "Esta fidelização começou quando contratou este serviço pela primeira vez?",
    primeiraVezAjuda:
      "Responda “Não” se a fidelização foi renovada mais tarde no mesmo serviço, por exemplo ao mudar de tarifário ou ao aceitar uma nova oferta.",
    novaInstalacao:
      "Quando renovou a fidelização, foi necessária uma nova instalação ou uma alteração física da ligação do serviço na sua casa?",
    novaInstalacaoAjuda: "Por exemplo, a visita de um técnico para instalar ou mudar a ligação em sua casa.",
    sim: "Sim",
    nao: "Não",
    naoSei: "Não sei",
    mensalidade: "Valor actual da mensalidade (€)",
    mensalidadeExemplo: "Ex.: 29,99",
    conheceVantagem: "Conhece o valor total da vantagem que recebeu por aceitar a fidelização?",
    conheceVantagemAjuda:
      "Pode incluir, por exemplo, descontos na mensalidade, instalação ou activação gratuitas ou outras vantagens identificadas no contrato.",
    ajudeMe: "Ajude-me a encontrar",
    vantagem: "Valor total da vantagem associada à fidelização (€)",
    vantagemExemplo: "Ex.: 120,00",
    ajudaTitulo: "Onde posso encontrar este valor?",
    ajudaTexto: [
      "Consulte o resumo do contrato ou o contrato e procure referências a vantagens associadas à fidelização, ofertas, descontos, instalação, activação ou benefícios concedidos em troca do período de fidelização.",
      "Se tiver uma factura recente, procure a informação relativa ao período de fidelização e ao valor associado à denúncia antecipada do contrato.",
    ],
    naoEncontro: "Não encontro este valor",
    naoSeiVantagem:
      "Sem problema: calculamos o limite com base nas mensalidades que ainda faltam pagar. O resultado indica o que falta para um cálculo completo.",
    valorOperador: "Valor indicado pela operadora para a denúncia antecipada (€) — opcional",
    valorOperadorAjuda:
      "Se a operadora já lhe indicou quanto teria de pagar (numa factura, no contrato ou numa resposta), escreva-o aqui para o compararmos com o limite calculado.",
    valorOperadorExemplo: "Ex.: 125,00",
    equipamento: "Recebeu equipamento subsidiado associado ao contrato?",
    equipamentoAjuda: "Por exemplo, um telemóvel ou outro equipamento oferecido ou com desconto por causa da fidelização.",
  },
  reveja: "Reveja os campos assinalados.",
  calcular: "Calcular",
  erros: {
    "Indique uma data válida.": "Indique uma data válida.",
    "A data de início não pode ser no futuro.": "A data de início não pode ser no futuro.",
    "Indique uma data a partir de 2000.": "Indique uma data a partir de 2000.",
    "Indique a duração em meses (número inteiro positivo).": "Indique a duração em meses (número inteiro positivo).",
    "Escolha uma opção.": "Escolha uma opção.",
    "Indique um valor em euros, sem valores negativos (ex.: 29,99).": "Indique um valor em euros, sem valores negativos (ex.: 29,99).",
    "Confirme o valor: a mensalidade parece demasiado alta.": "Confirme o valor: a mensalidade parece demasiado alta.",
    "Indique um valor em euros, sem valores negativos (ex.: 120,00).": "Indique um valor em euros, sem valores negativos (ex.: 120,00).",
    "Confirme o valor: a vantagem parece demasiado alta.": "Confirme o valor: a vantagem parece demasiado alta.",
    "Indique o valor ou escolha “Não encontro este valor”.": "Indique o valor ou escolha “Não encontro este valor”.",
    "Indique um valor em euros, sem valores negativos (ex.: 125,00).": "Indique um valor em euros, sem valores negativos (ex.: 125,00).",
    "Confirme o valor: o valor indicado parece demasiado alto.": "Confirme o valor: o valor indicado parece demasiado alto.",
  },
  resultado: {
    rotulo: "Resultado",
    seloCompleto: "Resultado completo",
    seloParcial: "Resultado parcial",
    // "Encargo por denúncia antecipada" é o termo do regime legal; no título,
    // linguagem corrente (revisão de 17/10/2026). As notas mantêm o termo.
    tituloCompleto: "Valor máximo estimado a pagar por cancelar antes do fim da fidelização:",
    tituloParcial: "Limite calculado: até",
    tituloTerminada: "Valor a pagar por cancelar antes do fim da fidelização:",
    tituloSemLimite: "Ainda não é possível calcular um limite com os dados que indicou.",
    terminada: (data: string) =>
      `Com base nas datas introduzidas, a fidelização terminou a ${data}: já não existe período de fidelização em curso.`,
    parcialVantagem:
      "Com os dados que indicou, este é o limite calculado com base nas mensalidades que ainda faltam pagar. O valor efectivamente aplicável poderá ser inferior, porque também deve ser considerada a parte da vantagem associada à fidelização que ainda não foi recuperada.",
    parcialTipo:
      "O valor poderá variar consoante o tipo de fidelização. Mostramos o limite mais alto dos casos possíveis com as suas respostas; se a fidelização for uma renovação sem nova instalação, o limite poderá ser inferior.",
    semLimite:
      "Num contrato com fidelização iniciada antes de 14 de Novembro de 2022, o encargo corresponde, em regra, à parte da vantagem associada à fidelização ainda não recuperada. Sem conhecer essa vantagem, não conseguimos indicar um limite.",
    semLimiteTipo:
      "Se a fidelização tiver sido renovada sem nova instalação, aplica-se também um limite de 30% das mensalidades em falta — mas sem conhecer o tipo de fidelização e a vantagem não conseguimos indicar um valor.",
    faltaTitulo: "Para um cálculo completo falta:",
    falta: {
      vantagem: "o valor total da vantagem associada à fidelização",
      tipo: "saber se é a primeira fidelização deste serviço e, numa renovação, se houve nova instalação",
    },
    vantagem: "Vantagem proporcional ainda não recuperada:",
    limite: (meses: number, mensalidade: string, percentagem: number) =>
      `Limite pelas mensalidades (${meses} × ${mensalidade} × ${percentagem}%):`,
    cenario: {
      geral: "se for a primeira fidelização ou tiver havido nova instalação",
      refidelizacao_sem_instalacao: "se for uma renovação sem nova instalação",
    },
    aplicavel: "Menor valor considerado:",
    menor: ", por ser o menor dos dois",
    iguais: ", por os dois valores serem iguais",
    soVantagem:
      ". Num contrato iniciado antes de 14 de Novembro de 2022, só se aplica a vantagem proporcional, excepto numa renovação sem nova instalação",
    operadorSuperior: (operador: string, limite: string) =>
      `A operadora indica ${operador}. O valor indicado pela operadora parece ser superior ao limite calculado com os dados que forneceu (${limite}). Isto não significa, por si só, que a cobrança seja indevida: podem existir dados ou condições que esta calculadora não considera.`,
    operadorProximo: (operador: string, limite: string) =>
      `A operadora indica ${operador}, um valor próximo do limite calculado com os dados que forneceu (${limite}).`,
    operadorInferior: (operador: string, limite: string) =>
      `A operadora indica ${operador}, um valor que não ultrapassa o limite calculado com os dados que forneceu (${limite}).`,
    operadorSemLimite: (operador: string) =>
      `A operadora indica ${operador}. Sem o valor da vantagem não conseguimos compará-lo com um limite.`,
    ate: (valor: string) => `até ${valor}`,
    analisar: "Pedir à DoLado para analisar a situação",
    decorrido: "Tempo já decorrido",
    emFalta: "Tempo de fidelização em falta",
    mensalidadesEmFalta: "Mensalidades em falta (estimativa)",
    fim: "Fim da fidelização",
    equipamento:
      "Indicou que recebeu equipamento subsidiado. Podem existir regras e encargos específicos relacionados com o equipamento, que não estão incluídos neste valor: o resultado não corresponde ao custo total do cancelamento.",
    tratarCaso: "Tratar o meu caso",
    calcularDeNovo: "Calcular de novo",
    notas: [
      "Este valor é uma estimativa e depende dos dados que introduziu.",
      "Um resultado parcial é apenas um limite: não é o valor que terá de pagar.",
      "Podem existir outras condições contratuais ou legais que esta calculadora não considera.",
      "O equipamento subsidiado pode ter regras próprias, não incluídas neste cálculo.",
      "Não é uma avaliação jurídica do seu caso.",
    ],
  },
  comoFunciona: {
    eyebrow: "Como funciona",
    titulo: "O que precisa de saber sobre a calculadora.",
    itens: [
      {
        titulo: "Como é feito o cálculo.",
        texto:
          "Nos contratos com fidelização iniciada ou renovada a partir de 14 de Novembro de 2022, o encargo corresponde ao menor de dois valores: a parte da vantagem ainda por recuperar, proporcional ao tempo de fidelização em falta, e uma percentagem das mensalidades em falta (50% no primeiro ano e 30% no segundo; 30% numa refidelização sem nova instalação). Nos contratos anteriores, conta a vantagem proporcional ao tempo em falta e, numa refidelização sem nova instalação, também o limite de 30% das mensalidades em falta.",
      },
      {
        titulo: "Se não souber algum dado.",
        texto:
          "Pode responder “Não sei”. Calculamos o que for possível — por exemplo, o limite pelas mensalidades em falta — e indicamos que o resultado é parcial e o que falta para um cálculo completo.",
      },
      {
        titulo: "O que não é.",
        texto:
          "Não avalia se pode cancelar sem encargos, não inclui encargos com equipamento e não é uma avaliação jurídica do seu caso.",
      },
      {
        titulo: "Os seus dados.",
        texto: "O cálculo é feito apenas no seu navegador: não guardamos os valores que introduz nem os associamos a si.",
      },
      {
        titulo: "Se decidir avançar.",
        texto: "Em “Tratar o meu caso” descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Só paga no fim.",
      },
    ],
  },
};
