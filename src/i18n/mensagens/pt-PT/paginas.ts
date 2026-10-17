// Páginas públicas: Preçário, Como funciona, Ferramentas gratuitas e Ajuda.

export const paginas = {
  precario: {
    metadados: {
      titulo: "Preçário - DoLado",
      descricao:
        "Avulso, Caso + Proteção ou Proteção: escolha a ajuda de que precisa para tratar um problema com uma empresa ou continuar protegido. Preços com IVA incluído.",
    },
    eyebrow: "Preçário",
    titulo: "De que tipo de ajuda precisa?",
    texto: (iva: string) =>
      `Escolha conforme a sua situação. O Avulso é um pagamento único para um caso; as subscrições são mensais. Todos os preços têm ${iva}.`,
    necessidades: {
      avulso: { necessidade: "Tenho um problema agora.", cta: "Tratar do meu caso" },
      caso_protecao: { necessidade: "Tenho um problema e quero acompanhamento contínuo.", cta: "Escolher Caso + Proteção" },
      protecao: { necessidade: "Quero acompanhar as minhas faturas e contratos.", cta: "Aderir à Proteção" },
    },
    saberProtecao: "O que é a Proteção?",
    condicoes: {
      eyebrow: "Pagamentos e condições",
      titulo: "Como funcionam os pagamentos.",
      itens: {
        casoOuSubscricao: {
          titulo: "Um caso isolado ou uma subscrição?",
          texto: (avulso: string, casoProtecao: string) =>
            `O Avulso (${avulso}) é um pagamento único para tratar um caso, sem renovação. O Caso + Proteção (${casoProtecao}) é uma subscrição: paga todos os meses enquanto a mantiver, recebe 1 caso por mês e tem a Proteção. Se só tem um problema e não quer um pagamento mensal, o Avulso é a opção mais simples.`,
        },
        renovacao: {
          titulo: "Renovação e cancelamento",
          texto:
            "As subscrições renovam-se automaticamente todos os meses. Pode cancelar a qualquer momento na área de cliente: não há novas cobranças e o serviço mantém-se até ao fim do período já pago, sem reembolso proporcional desse período.",
        },
        casoPorMes: {
          titulo: "O que significa “1 caso por mês”",
          texto: (limite: number) =>
            `No Caso + Proteção, recebe 1 caso disponível sempre que o pagamento do mês é confirmado, incluindo o primeiro. Cada caso disponível permite pedir à DoLado que trate um novo problema. Os casos que não usar acumulam até ${limite}; a partir daí, a renovação desse mês não acrescenta outro.`,
        },
        fimSubscricao: {
          titulo: "Quando a subscrição termina",
          texto: (dias: number) =>
            `Os casos já abertos, o texto enviado, os comprovativos e o histórico continuam acessíveis na área de cliente. A Proteção deixa de funcionar e os avisos param. Os casos disponíveis que vieram da subscrição ficam guardados ${dias} dias e só voltam a poder ser usados se subscrever de novo o Caso + Proteção nesse prazo. Casos Avulso e Caso Extra por usar continuam disponíveis.`,
        },
        casoExtra: {
          titulo: "Caso Extra",
          texto: (preco: string, precoAvulso: string, desconto: number) =>
            `Se tem o Caso + Proteção e já usou todos os casos disponíveis, pode tratar mais um caso por ${preco} em vez de ${precoAvulso} (${desconto}% de desconto), com pagamento único. A subscrição não muda.`,
        },
        conversao: {
          titulo: "Passar de Avulso para uma subscrição",
          texto: (reembolsoProtecao: string, reembolsoCasoProtecao: string) =>
            `Se comprou um Avulso e ainda não usou o caso, pode aderir a uma subscrição na área de cliente: parte do valor pago cobre o primeiro mês e o restante é reembolsado para o método de pagamento original (${reembolsoProtecao} na Proteção, ${reembolsoCasoProtecao} no Caso + Proteção). Se já usou o caso, a adesão é uma compra nova.`,
        },
      },
    },
    precosLancamento: "Preços de lançamento — sujeitos a alteração.",
    antesDeDecidir: {
      eyebrow: "Antes de decidir",
      titulo: "O que precisa de saber.",
      reve: { titulo: "Revê antes do envio", texto: "Nada é enviado em seu nome sem que reveja o texto preparado e autorize o envio." },
      cancela: {
        titulo: "Cancela quando quiser",
        texto:
          "Pode cancelar a subscrição a qualquer momento na sua área de cliente. O serviço mantém-se até ao fim do período já pago.",
      },
      livre: {
        titulo: "Livre resolução",
        texto: (dias: number) =>
          `Nos casos legalmente aplicáveis, dispõe de ${dias} dias para exercer o direito de livre resolução. <saber>Saber mais</saber>`,
      },
    },
    perguntas: { eyebrow: "Perguntas frequentes", titulo: "Planos e pagamentos.", verTodas: "Ver todas as perguntas" },
    ctaFinal: {
      eyebrow: "Ainda não sabe qual escolher?",
      titulo: "Veja primeiro se a DoLado pode ajudar.",
      texto: "É gratuito, sem conta e sem e-mail.",
      acao: "Ver se a DoLado pode ajudar",
    },
  },
  protecao: {
    metadados: {
      titulo: "Proteção: acompanhamento de faturas e contratos - DoLado",
      descricao:
        "Com a Proteção, a DoLado compara as faturas que nos envia, avisa antes do fim de promoções e da fidelização e assinala alterações que merecem ser verificadas.",
    },
    eyebrow: "Proteção",
    titulo: "Acompanhamos as suas faturas e contratos e avisamo-lo a tempo.",
    texto:
      "A Proteção é para quem quer evitar surpresas, mesmo sem ter um problema agora. Envie-nos as faturas e, se tiver, o contrato dos serviços que quer acompanhar. Comparamos cada fatura com as anteriores e com o contrato, estamos atentos às datas importantes e avisamo-lo por e-mail quando alguma coisa merece a sua atenção.",
    aderir: "Aderir à Proteção",
    verPrecario: "Ver preçário",
    tresPerguntas: {
      eyebrow: "Como funciona",
      titulo: "A Proteção em três perguntas.",
      blocos: [
        {
          titulo: "O que acompanhamos?",
          itens: [
            "As faturas dos serviços que nos envia — por exemplo, internet e telemóvel, eletricidade, gás ou água —, comparadas com as anteriores.",
            "As condições do contrato, quando nos envia o contrato: mensalidade, promoções e fidelização.",
            "As datas importantes, como o fim de uma promoção e o fim da fidelização.",
            "Nos contratos de telecomunicações, uma estimativa do valor máximo a pagar se cancelar antes do fim da fidelização.",
          ],
        },
        {
          titulo: "Que informação e avisos recebe?",
          itens: [
            "Na área de cliente, logo depois do primeiro documento: o que verificámos, o que encontrámos e o que vamos acompanhar.",
            "Avisos por e-mail 60 e 30 dias antes do fim de uma promoção ou da fidelização, e no próprio dia.",
            "Um aviso quando uma fatura tem uma alteração que merece ser verificada, depois de revista por uma pessoa da DoLado.",
            "Se quiser, avisos de alterações relevantes nos setores que escolher, como subidas de preços anunciadas.",
          ],
        },
        {
          titulo: "O que precisa de nos disponibilizar?",
          itens: [
            "Uma fatura de cada serviço, em PDF ou imagem. É o suficiente para começar.",
            "O contrato, se o tiver, para compararmos as faturas com o que foi contratado.",
            "Se não tiver documentos à mão, o nome do fornecedor e uma data, como o fim da fidelização.",
            "As faturas seguintes, à medida que chegam: a comparação depende dos documentos que nos envia.",
          ],
        },
      ],
    },
    exemplos: {
      eyebrow: "Exemplos",
      titulo: "O tipo de informação que recebe.",
      texto: "Dois exemplos fictícios. Os textos reais dependem dos seus documentos e podem ser diferentes.",
    },
    limites: {
      eyebrow: "Com clareza",
      titulo: "O que a Proteção não é.",
      itens: [
        "Não é um seguro: não paga prejuízos nem reembolsa valores.",
        "Não acede às suas contas nos fornecedores: só analisamos os documentos e as informações que nos dá.",
        "Não acompanha em tempo real nem deteta todas as cobranças incorretas: a análise depende de nos enviar as faturas e de as manter atualizadas.",
        "Não renegocia contratos nem muda de fornecedor por si.",
        "Não inclui o tratamento de reclamações. Se encontrarmos algo e quiser que a DoLado trate do problema, pode fazê-lo com o Avulso ou com o Caso + Proteção.",
      ],
    },
    comparar: {
      titulo: "Proteção ou Caso + Proteção?",
      protecao: (preco: string) => `<b>Proteção (${preco})</b>: acompanhamento de faturas e contratos. Não inclui o tratamento de casos.`,
      casoProtecao: (preco: string, limite: number) =>
        `<b>Caso + Proteção (${preco})</b>: tudo o que a Proteção inclui e 1 caso por mês para tratar problemas, acumulável até ${limite}.`,
    },
    perguntas: { eyebrow: "Perguntas frequentes", titulo: "Sobre a Proteção.", verTodas: "Ver todas as perguntas" },
    ctaFinal: {
      titulo: "Quer começar a acompanhar as suas faturas?",
      texto: "Adira à Proteção e carregue a primeira fatura na sua área de cliente.",
      acao: "Aderir à Proteção",
    },
  },
  comoFunciona: {
    metadados: {
      titulo: "Como funciona - DoLado",
      descricao:
        "Do problema à reclamação enviada, passo a passo: conte o que aconteceu, a DoLado prepara a reclamação, só a envia com a sua autorização e acompanha a resposta da empresa.",
    },
    eyebrow: "Como funciona",
    titulo: "Do problema à reclamação enviada, passo a passo.",
    texto:
      "Conte-nos o que aconteceu. A DoLado prepara a reclamação, mostra-lhe o texto e só o envia, pelo canal adequado, depois da sua autorização. Depois, acompanha a resposta da empresa consigo.",
    tratarCaso: "Tratar do meu caso",
    verSeAjuda: "Ver se a DoLado pode ajudar",
    seuPasso: "O seu passo",
    dolado: "A DoLado",
    passos: [
      {
        titulo: "Conte o que aconteceu",
        texto:
          "Um formulário passo a passo, com 5 perguntas simples: a empresa, o que aconteceu, se já reclamou e como falamos consigo. Se tiver uma fatura, um contrato ou um e-mail, pode juntá-lo; não é obrigatório.",
      },
      {
        titulo: "Crie a conta e escolha a modalidade",
        texto:
          "É na sua conta que acompanha o caso. Escolha o Avulso ou o Caso + Proteção e só então pague. Começamos a tratar do caso depois de o pagamento ser confirmado.",
      },
      {
        titulo: "Confirmamos os factos consigo",
        texto:
          "No prazo máximo de 48 horas úteis, entramos em contacto para confirmar o que aconteceu. Se faltar alguma informação ou documento, pedimos-lho por e-mail.",
      },
      {
        titulo: "Preparamos a reclamação",
        texto:
          "Escrevemos um texto claro: descrevemos os factos, indicamos as regras aplicáveis quando existam e fazemos um pedido concreto à empresa.",
      },
      {
        titulo: "Reveja e autorize o envio",
        texto:
          "Recebe o texto por e-mail e na área de cliente. Leia-o com calma e, se quiser, peça alterações. Sem a sua autorização, nada é enviado.",
      },
      {
        titulo: "Enviamos pelo canal adequado",
        texto:
          "Por exemplo, o Livro de Reclamações Eletrónico, o e-mail ou o formulário de reclamações da empresa. O texto enviado e o comprovativo, quando existe, ficam no seu caso.",
      },
      {
        titulo: "Acompanhamos a resposta",
        texto:
          "Analisamos a resposta da empresa e avisamo-lo por e-mail. Se houver uma solução, confirma connosco se o problema ficou resolvido. Se não houver, preparamos uma nova comunicação, quando faz sentido, ou encerramos o caso do nosso lado com um dossiê e a indicação de entidades que pode consultar.",
      },
    ],
    passoAPasso: {
      eyebrow: "Passo a passo",
      titulo: "O que acontece em cada passo.",
      texto: "Em cada passo, indicamos quem age: o cliente ou a DoLado.",
    },
    autorizacao: {
      eyebrow: "Com a sua autorização",
      titulo: "Só agimos em seu nome quando autoriza.",
      texto:
        "Até à sua autorização, a DoLado organiza a informação e prepara o texto. O envio da reclamação (passo 6) é o momento em que agimos em seu nome, e só acontece depois de autorizar essa versão do texto. Quando houver opções a escolher, explicamos-lhas: a decisão é sempre sua.",
    },
    perguntas: { eyebrow: "Perguntas frequentes", titulo: "Antes e depois do envio.", verTodas: "Ver todas as perguntas" },
    ctaFinal: {
      titulo: "Pronto para começar?",
      texto: "Conte-nos o que aconteceu. Recebe o texto da reclamação antes de qualquer envio.",
      acao: "Tratar do meu caso",
    },
  },
  ferramentas: {
    metadados: {
      titulo: "Ferramentas gratuitas - DoLado",
      descricao:
        "Ferramentas gratuitas da DoLado, sem criar conta: estime o encargo de cancelar um contrato de telecomunicações, veja se a DoLado pode ajudar com o seu caso e prepare a mudança de casa.",
    },
    eyebrow: "Ferramentas gratuitas",
    titulo: "Perceba a sua situação antes de decidir.",
    texto:
      "Antes de contratar qualquer serviço, use estas ferramentas da DoLado para perceber melhor o que se passa e qual pode ser o próximo passo.",
    factos: ["Gratuitas", "Sem criar conta", "Sem deixar o seu e-mail"],
    ctaFinal: {
      eyebrow: "Encontrou um problema?",
      titulo: "A DoLado trata dele por si.",
      texto: "Preparamos a reclamação, mostramos-lhe o texto antes do envio e acompanhamos o processo consigo.",
      acao: "Tratar do meu caso",
    },
  },
  ajuda: {
    metadados: {
      titulo: "Perguntas Frequentes - DoLado",
      descricao:
        "Encontre respostas sobre como funciona a DoLado, reclamações de consumo, planos, proteção e acompanhamento do seu caso.",
    },
    eyebrow: "Perguntas frequentes",
    titulo: "Como podemos ajudar?",
    texto:
      "Encontre respostas sobre como funciona a DoLado, a Proteção, os nossos planos, o envio da reclamação e o que acontece depois.",
    pesquisar: "Pesquisar nas perguntas",
    exemplo: "Ex.: cancelar, fatura, autorização",
    encontradas: (n: number) => (n === 1 ? "1 pergunta encontrada." : `${n} perguntas encontradas.`),
    categorias: "Categorias",
    semResultados: "Não encontrámos perguntas com estes termos.",
    experimente: "Experimente outras palavras ou <contacto>fale connosco</contacto>.",
    apoio: {
      eyebrow: "Outros caminhos",
      titulo: "Precisa de outra ajuda?",
      contacto: {
        titulo: "Não encontrou a resposta?",
        texto: "Fale connosco sobre o seu caso, a sua conta ou outros assuntos.",
        cta: "Contacto",
      },
      privacidade: {
        titulo: "Privacidade e dados pessoais",
        texto: "Como tratamos os seus dados e como exercer os seus direitos.",
        cta: "Política de Privacidade",
      },
      reclamacoes: {
        titulo: "Reclamações sobre a DoLado",
        texto: "Livro de Reclamações e entidades de resolução alternativa de litígios.",
        cta: "Resolução de litígios",
      },
    },
    ctaFinal: {
      titulo: "Pronto para começar?",
      texto: "Conte-nos o que aconteceu. Recebe o texto da reclamação antes de qualquer envio.",
      acao: "Tratar do meu caso",
    },
  },
};
