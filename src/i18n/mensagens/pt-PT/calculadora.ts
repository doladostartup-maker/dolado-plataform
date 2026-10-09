// Calculadora de Cancelamento pública (/calculadora-cancelamento). As regras
// e a validação estão em src/lib/calculadoraCancelamento/regras.ts; as
// mensagens de validação que lá estão são as chaves de `erros`.

export const calculadora = {
  metadados: {
    titulo: "Calculadora de Cancelamento - DoLado",
    descricao:
      "Estime o encargo máximo de cancelar antecipadamente um contrato de telecomunicações com fidelização. Grátis, sem criar conta e sem deixar o seu e-mail.",
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
    tipo: "É a primeira fidelização ou uma refidelização?",
    tipoAjuda:
      "Refidelização: um novo período de fidelização no mesmo contrato, por exemplo ao mudar de tarifário ou ao receber uma nova oferta.",
    primeira: "Primeira fidelização",
    refidelizacao: "Refidelização",
    novaInstalacao: "Na refidelização, houve nova instalação ou alteração do lacete local?",
    novaInstalacaoAjuda: "Por exemplo, uma nova instalação física da ligação em sua casa.",
    sim: "Sim",
    nao: "Não",
    mensalidade: "Valor atual da mensalidade (€)",
    mensalidadeExemplo: "Ex.: 29,99",
    vantagem: "Valor total da vantagem associada à fidelização (€)",
    vantagemAjuda:
      "O valor indicado no contrato como vantagem ou benefício por aceitar a fidelização (por exemplo, descontos ou instalação gratuita).",
    vantagemExemplo: "Ex.: 120,00",
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
  },
  resultado: {
    rotulo: "Resultado",
    titulo: "Estimativa máxima do encargo de cancelamento:",
    terminada: (data: string) =>
      `Com base nas datas introduzidas, a fidelização terminou a ${data}: já não existe período de fidelização em curso.`,
    vantagem: "Vantagem proporcional ainda por recuperar:",
    limite: (meses: number, mensalidade: string, percentagem: number) =>
      `Limite pelas mensalidades restantes (${meses} × ${mensalidade} × ${percentagem}%):`,
    aplicavel: "Valor aplicável:",
    menor: ", por ser o menor dos dois",
    iguais: ", por os dois valores serem iguais",
    soVantagem:
      ". Num contrato iniciado antes de 14 de novembro de 2022, só se aplica a vantagem proporcional, exceto numa refidelização sem nova instalação",
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
          "Nos contratos com fidelização iniciada ou renovada a partir de 14 de novembro de 2022, o encargo corresponde ao menor de dois valores: a parte da vantagem ainda por recuperar, proporcional ao tempo de fidelização em falta, e uma percentagem das mensalidades em falta (50% no primeiro ano e 30% no segundo; 30% numa refidelização sem nova instalação). Nos contratos anteriores, conta a vantagem proporcional ao tempo em falta e, numa refidelização sem nova instalação, também o limite de 30% das mensalidades em falta.",
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
