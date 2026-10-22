// Páginas públicas: Preçário, Como funciona, Ferramentas gratuitas e Ajuda.

export const paginas = {
  precario: {
    metadados: {
      titulo: "Preços: Protecção, Caso + Protecção e Avulso - DoLado",
      descricao:
        "Protecção para acompanhar facturas e contratos, Caso + Protecção para também tratar problemas ou Avulso para um caso sem subscrição. Preços com IVA incluído.",
    },
    eyebrow: "Preçário",
    titulo: "De que tipo de ajuda precisa?",
    texto: (iva: string) =>
      `A Protecção acompanha as suas facturas e contratos; o Caso + Protecção junta o tratamento de problemas; o Avulso trata um caso, com pagamento único. As subscrições são mensais. Todos os preços têm ${iva}.`,
    necessidades: {
      avulso: { necessidade: "Tenho um problema agora.", cta: "Tratar do meu caso" },
      caso_protecao: { necessidade: "Tenho um problema e quero acompanhamento contínuo.", cta: "Escolher Caso + Protecção" },
      protecao: { necessidade: "Quero acompanhar as minhas facturas e contratos.", cta: "Aderir à Protecção" },
    },
    seCancelar: {
      avulso: "Sem subscrição para cancelar: o caso é acompanhado até ao fim do processo.",
      caso_protecao:
        "Se cancelar: a Protecção mantém-se até ao fim do período pago. Um caso da subscrição em acompanhamento só continua se mantiver a subscrição até esse caso terminar.",
      protecao: "Se cancelar: o acompanhamento e os avisos mantêm-se até ao fim do período pago e depois param.",
    },
    seCancelarRotulo: "Cancelamento",
    comparacao: {
      eyebrow: "Comparar as opções",
      titulo: "As três opções lado a lado.",
      criterio: "O que precisa de saber",
      linhas: {
        indicado: "Indicado para",
        pagamento: "Pagamento",
        acompanhamento: "Acompanhamento de facturas e contratos",
        casos: "Tratamento de casos",
        casoEmCurso: "Caso em curso quando a subscrição termina",
      },
      valores: (limite: number) => ({
        avulso: {
          indicado: "Tratar um único problema, sem subscrição",
          pagamento: "Pagamento único, sem renovação",
          acompanhamento: "Não incluído",
          casos: "1 caso",
          casoEmCurso: "Não se aplica: o caso Avulso é acompanhado até ao fim",
        },
        caso_protecao: {
          indicado: "Tratar um problema agora e manter as facturas e os contratos acompanhados",
          pagamento: "Mensal, com renovação automática",
          acompanhamento: "Incluído",
          casos: `1 caso por mês, acumulável até ${limite}`,
          casoEmCurso:
            "Pode manter a subscrição até o caso terminar. Se cancelar, o acompanhamento desse caso termina no fim do período pago",
        },
        protecao: {
          indicado: "Acompanhar facturas e contratos, sem ter um problema agora",
          pagamento: "Mensal, com renovação automática",
          acompanhamento: "Incluído",
          casos: "Não incluído",
          casoEmCurso: "Não se aplica: não inclui casos",
        },
      }),
      nota: "Pode cancelar uma subscrição a qualquer momento na área de cliente, sem novas cobranças. As condições completas estão abaixo e nos Termos.",
    },
    saberProtecao: "O que é a Protecção?",
    condicoes: {
      eyebrow: "Pagamentos e condições",
      titulo: "Como funcionam os pagamentos.",
      itens: {
        casoOuSubscricao: {
          titulo: "Um caso isolado ou uma subscrição?",
          texto: (avulso: string, casoProtecao: string) =>
            `O Avulso (${avulso}) é um pagamento único para tratar um caso, sem renovação. O Caso + Protecção (${casoProtecao}) é uma subscrição: paga todos os meses enquanto a mantiver, recebe 1 caso por mês e tem a Protecção. Se só tem um problema e não quer um pagamento mensal, o Avulso é a opção mais simples.`,
        },
        renovacao: {
          titulo: "Renovação e cancelamento",
          texto:
            "As subscrições renovam-se automaticamente todos os meses. Pode cancelar a qualquer momento na área de cliente: não há novas cobranças e o serviço mantém-se até ao fim do período já pago, sem reembolso proporcional desse período.",
        },
        casoPorMes: {
          titulo: "O que significa “1 caso por mês”",
          texto: (limite: number) =>
            `No Caso + Protecção, recebe 1 caso disponível sempre que o pagamento do mês é confirmado, incluindo o primeiro. Cada caso disponível permite pedir à DoLado que trate um novo problema. Os casos que não usar acumulam até ${limite}; a partir daí, a renovação desse mês não acrescenta outro.`,
        },
        fimSubscricao: {
          titulo: "Quando a subscrição termina",
          texto: (dias: number) =>
            `Os casos já abertos, o texto enviado, os comprovativos e o histórico continuam acessíveis na área de cliente. A Protecção deixa de funcionar e os avisos param. Se tiver um caso da subscrição em acompanhamento, pode manter a subscrição até o caso terminar; se cancelar, o acompanhamento desse caso termina no fim do período pago (casos Avulso e Caso Extra não são afectados). Os casos disponíveis que vieram da subscrição ficam guardados ${dias} dias e só voltam a poder ser usados se subscrever de novo o Caso + Protecção nesse prazo. Casos Avulso e Caso Extra por usar continuam disponíveis.`,
        },
        casoExtra: {
          titulo: "Caso Extra",
          texto: (preco: string, precoAvulso: string, desconto: number) =>
            `Se tem o Caso + Protecção e já usou todos os casos disponíveis, pode tratar mais um caso por ${preco} em vez de ${precoAvulso} (${desconto}% de desconto), com pagamento único. A subscrição não muda.`,
        },
        conversao: {
          titulo: "Passar de Avulso para uma subscrição",
          texto: (reembolsoProtecao: string, reembolsoCasoProtecao: string) =>
            `Se comprou um Avulso e ainda não usou o caso, pode aderir a uma subscrição na área de cliente: parte do valor pago cobre o primeiro mês e o restante é reembolsado para o método de pagamento original (${reembolsoProtecao} na Protecção, ${reembolsoCasoProtecao} no Caso + Protecção). Se já usou o caso, a adesão é uma compra nova.`,
        },
      },
    },
    precosLancamento: "Preços de lançamento — sujeitos a alteração.",
    // O que é gratuito e o que é pago (reposicionamento de 22/10/2026): a
    // análise gratuita não é um período experimental nem uma subscrição.
    gratuitoPago: {
      eyebrow: "Gratuito e pago",
      titulo: "O que é gratuito e o que é pago.",
      analise: {
        titulo: "Análise inicial gratuita",
        texto: "Analisa uma factura ou um contrato, sem conta e sem cartão bancário. Não é uma subscrição nem um período experimental, e não dá início a nenhum pagamento.",
      },
      protecaoGratuita: {
        titulo: "30 dias de Protecção gratuita",
        texto: "Para quem nunca teve a Protecção: activa-a na sua conta, sem cartão bancário, e o período termina sozinho, sem cobrança. Para continuar, adere expressamente à Protecção.",
      },
      subscricao: {
        titulo: "Subscrição mensal",
        texto: "Protecção e Caso + Protecção: pagamento mensal, com renovação automática. Pode cancelar a qualquer momento na área de cliente.",
      },
      pontual: {
        titulo: "Pagamento único",
        texto: "Avulso (e Caso Extra, para subscritores do Caso + Protecção): paga uma vez para tratar um caso, sem subscrição.",
      },
      analisar: "Analisar documento",
    },
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
    ctaFinalAnalise: {
      eyebrow: "Ainda não sabe qual escolher?",
      titulo: "Comece pela análise gratuita do seu documento.",
      texto: "Veja o que diz a sua factura ou o seu contrato antes de decidir. Sem conta e sem cartão bancário.",
      acao: "Analisar documento",
    },
  },
  protecao: {
    metadados: {
      titulo: "Protecção: acompanhamento de facturas e contratos - DoLado",
      descricao:
        "Com a Protecção, a DoLado compara as facturas que nos envia, avisa antes do fim de promoções e da fidelização, assinala alterações a verificar e envia um resumo mensal.",
    },
    // Com a análise gratuita ligada (reposicionamento de 22/10/2026).
    analise: {
      comecar: "Ou comece por analisar um documento gratuitamente",
      eyebrow: "Análise gratuita ou Protecção?",
      titulo: "A análise mostra um documento. A Protecção acompanha-o ao longo do tempo.",
      gratuita: {
        titulo: "Análise gratuita",
        itens: [
          "Um documento de cada vez, sem conta e sem cartão bancário.",
          "Mostra os valores, as datas e as condições que estão no documento.",
          "Não compara com facturas anteriores nem envia avisos.",
          "Se não criar conta, o documento e o resultado são eliminados ao fim de 7 dias.",
        ],
      },
      protecao: {
        titulo: "Protecção",
        itens: [
          "Acompanha os seus serviços mês a mês.",
          "Compara cada factura nova com as anteriores e com o contrato.",
          "Avisa antes do fim da fidelização e das promoções e envia um resumo mensal.",
          "O que merecer atenção é revisto por uma pessoa da DoLado antes de o avisarmos.",
        ],
      },
      encontramos: {
        titulo: "Quando encontramos algo",
        texto:
          "Se uma pessoa da DoLado confirmar que uma alteração merece atenção, avisamos por e-mail e mostramos na área de cliente o valor anterior, o actual e a diferença. Pode confirmar com a empresa ou, se quiser que a DoLado trate do problema, abrir um caso com o Avulso ou com o Caso + Protecção.",
      },
      analisar: "Analisar documento",
    },
    eyebrow: "Protecção",
    titulo: "Acompanhamos as suas facturas e contratos e avisamos a tempo.",
    texto:
      "A Protecção é para quem quer evitar surpresas, mesmo sem ter um problema agora. Envie-nos as facturas e, se tiver, o contrato dos serviços que quer acompanhar. Comparamos cada factura com as anteriores e com o contrato, estamos atentos às datas importantes e avisamos quando alguma coisa merece a sua atenção.",
    aderir: "Aderir à Protecção",
    verPrecario: "Ver preçário",
    dependeDocumentos: "A análise depende dos documentos e das informações que nos envia.",
    recebe: {
      eyebrow: "O que recebe",
      titulo: "O que a Protecção lhe dá.",
      itens: [
        {
          titulo: "Informação sobre alterações nas facturas",
          texto: "Sabe o que mudou de uma factura para a outra: a mensalidade, uma cobrança nova ou uma promoção que deixou de aparecer.",
          como:
            "Comparamos cada factura que nos envia com as anteriores e, se nos enviar o contrato, com as condições contratadas. Logo depois do primeiro documento, mostramos na área de cliente o que verificámos, o que encontrámos e o que vamos acompanhar.",
        },
        {
          titulo: "Avisos sobre situações que merecem atenção",
          texto: "É avisado por e-mail quando uma alteração merece ser verificada — por exemplo, um aumento que os dados do contrato não explicam ou uma possível cobrança em duplicado.",
          como:
            "Uma pessoa da DoLado revê cada situação antes de o avisarmos. Se quiser, também recebe avisos de alterações relevantes nos sectores que escolher, como subidas de preços anunciadas.",
        },
        {
          titulo: "Lembretes de datas importantes dos contratos",
          texto: "Não deixa passar o fim de uma promoção nem o fim da fidelização.",
          como:
            "Enviamos lembretes 60 e 30 dias antes e no próprio dia. Nos contratos de telecomunicações, mostramos também uma estimativa do valor máximo a pagar se cancelar antes do fim da fidelização.",
        },
        {
          titulo: "Resumo mensal do acompanhamento",
          texto: "No início de cada mês, recebe um resumo do que acompanhámos — mesmo quando está tudo certo.",
          como:
            "O resumo indica as facturas verificadas, as alterações comunicadas, o que continua em acompanhamento e a próxima data importante.",
        },
      ],
      comoRotulo: "Como funciona",
    },
    resumo: {
      eyebrow: "Resumo mensal",
      titulo: "Mesmo quando não há nada a resolver, sabe o que verificámos.",
      paragrafos: [
        "A maior parte dos meses não traz problemas. O resumo mensal mostra-lhe, ainda assim, o trabalho feito: que facturas comparámos, que datas estamos a acompanhar e qual é a próxima.",
        "Quando há algo que merece a sua atenção, o resumo também o indica — depois de a situação ter sido revista por uma pessoa da DoLado.",
      ],
    },
    precisa: {
      titulo: "O que precisa de nos disponibilizar?",
      itens: [
        "Uma factura de cada serviço, em PDF ou imagem. É o suficiente para começar.",
        "O contrato, se o tiver, para compararmos as facturas com o que foi contratado.",
        "Se não tiver documentos à mão, o nome do fornecedor e uma data, como o fim da fidelização.",
        "As facturas seguintes, à medida que chegam: a comparação depende dos documentos que nos envia.",
      ],
    },
    exemplos: {
      eyebrow: "Exemplos",
      titulo: "O tipo de informação que recebe.",
      texto: "Dois exemplos fictícios. Os textos reais dependem dos seus documentos e podem ser diferentes.",
    },
    limites: {
      eyebrow: "Com clareza",
      titulo: "O que a Protecção não é.",
      itens: [
        "Não é um seguro: não paga prejuízos nem reembolsa valores.",
        "Não acede às suas contas nos fornecedores: só analisamos os documentos e as informações que nos dá.",
        "Não acompanha em tempo real nem detecta todas as cobranças incorrectas: a análise depende de nos enviar as facturas e de as manter actualizadas.",
        "Não renegocia contratos nem muda de fornecedor por si.",
        "Não inclui o tratamento de reclamações. Se encontrarmos algo e quiser que a DoLado trate do problema, pode fazê-lo com o Avulso ou com o Caso + Protecção.",
      ],
    },
    comparar: {
      titulo: "Protecção ou Caso + Protecção?",
      protecao: (preco: string) => `<b>Protecção (${preco})</b>: acompanhamento de facturas e contratos. Não inclui o tratamento de casos.`,
      casoProtecao: (preco: string, limite: number) =>
        `<b>Caso + Protecção (${preco})</b>: tudo o que a Protecção inclui e 1 caso por mês para tratar problemas, acumulável até ${limite}.`,
    },
    perguntas: { eyebrow: "Perguntas frequentes", titulo: "Sobre a Protecção.", verTodas: "Ver todas as perguntas" },
    ctaFinal: {
      titulo: "Quer começar a acompanhar as suas facturas?",
      texto: "Adira à Protecção e carregue a primeira factura na sua área de cliente.",
      acao: "Aderir à Protecção",
    },
  },
  comoFunciona: {
    // Com a análise gratuita ligada (reposicionamento de 22/10/2026): dois
    // percursos — analisar e proteger (principal) e resolver um problema
    // (complementar, os passos de sempre). Só descreve o que existe: o
    // diagnóstico mostra o que está no documento; o que merece atenção só
    // chega pela Protecção, depois de revisto por uma pessoa.
    analise: {
      metadados: {
        titulo: "Como funciona: análise, Protecção e reclamações - DoLado",
        descricao:
          "Analise gratuitamente uma factura ou contrato, acompanhe os seus serviços com a Protecção e, se surgir um problema, a DoLado trata da reclamação consigo.",
      },
      titulo: "Comece pelo seu documento. Conte connosco quando surge um problema.",
      texto:
        "A DoLado ajuda-o a perceber as suas facturas e contratos, acompanha o que merece atenção com a Protecção e, se já tem um problema com uma empresa, prepara a reclamação consigo.",
      analisar: "Analisar documento",
      principal: {
        eyebrow: "Percurso principal",
        titulo: "Analisar e proteger.",
        texto: "Para perceber o que está a pagar e não deixar passar as datas e as alterações que importam.",
        gratuito: "Gratuito",
        comProtecao: "Com a Protecção",
        passos: [
          {
            titulo: "Envie o seu documento",
            texto:
              "Carregue uma factura ou um contrato em PDF, de telecomunicações, electricidade, gás ou água. Não precisa de criar conta nem de deixar o seu e-mail.",
          },
          {
            titulo: "Compreenda o resultado",
            texto:
              "Mostramos os valores, as datas e as condições que estão no documento: de onde vem o total, o que paga todos os meses e quanto falta para o fim da fidelização ou da promoção. Também lhe dizemos o que não foi possível confirmar.",
          },
          {
            titulo: "Continue protegido",
            texto:
              "Com a Protecção, comparamos cada factura nova com as anteriores e com o seu contrato, avisamos 60 e 30 dias antes do fim da fidelização e das promoções e enviamos um resumo todos os meses.",
          },
        ],
        quemFazTitulo: "O que acontece sozinho e o que depende de si",
        quemFaz: [
          "<b>Sem nada a fazer:</b> a leitura do documento que carrega, os avisos de datas e o resumo mensal da Protecção.",
          "<b>Depende de si:</b> enviar as facturas seguintes, à medida que chegam. A DoLado não acede às suas contas nos fornecedores, por isso só compara os documentos que nos envia.",
          "<b>Revisto por uma pessoa:</b> uma alteração que mereça atenção é revista por uma pessoa da DoLado antes de o avisarmos.",
        ],
        conhecerProtecao: "Conhecer a Protecção",
      },
      complementar: {
        eyebrow: "Percurso complementar",
        titulo: "Resolver um problema.",
        texto: "Para quem já tem uma situação concreta com uma empresa. Em cada passo, indicamos quem age: o cliente ou a DoLado.",
      },
      ctaFinal: {
        titulo: "Por onde quer começar?",
        texto: "Analise um documento gratuitamente ou conte-nos o problema que tem com uma empresa.",
      },
    },
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
          "Um formulário passo a passo, com 5 perguntas simples: a empresa, o que aconteceu, se já reclamou e como falamos consigo. Se tiver uma factura, um contrato ou um e-mail, pode juntá-lo; não é obrigatório.",
      },
      {
        titulo: "Crie a conta e escolha a modalidade",
        texto:
          "É na sua conta que acompanha o caso. Escolha o Avulso ou o Caso + Protecção e só então pague. Começamos a tratar do caso depois de o pagamento ser confirmado.",
      },
      {
        titulo: "Confirmamos os factos consigo",
        texto:
          "No prazo máximo de 2 dias úteis, entramos em contacto para confirmar o que aconteceu. Se faltar alguma informação ou documento, pedimos-lho por e-mail.",
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
          "Por exemplo, o Livro de Reclamações Electrónico, o e-mail ou o formulário de reclamações da empresa. O texto enviado e o comprovativo, quando existe, ficam no seu caso.",
      },
      {
        titulo: "Acompanhamos a resposta",
        texto:
          "Analisamos a resposta da empresa e avisamos por e-mail. Se houver uma solução, confirma connosco se o problema ficou resolvido. Se não houver, preparamos uma nova comunicação, quando faz sentido, ou encerramos o caso do nosso lado com um dossiê e a indicação de entidades que pode consultar.",
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
      "Perceba melhor as fidelizações, os encargos de cancelamento e as mudanças nos seus contratos antes de decidir. Use estas ferramentas da DoLado para saber o que se passa e qual pode ser o próximo passo.",
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
        "Respostas sobre a Protecção e o acompanhamento de facturas e contratos, os planos, as reclamações de consumo e a forma como a DoLado trata os seus documentos.",
    },
    // Com a análise gratuita ligada (reposicionamento de 22/10/2026).
    analise: {
      texto:
        "Encontre respostas sobre a análise gratuita de documentos, a Protecção, os planos e a ajuda para tratar um problema com uma empresa.",
      ctaTitulo: "Por onde quer começar?",
      ctaTexto: "Analise um documento gratuitamente ou conte-nos o problema que tem com uma empresa.",
      analisar: "Analisar documento",
    },
    eyebrow: "Perguntas frequentes",
    titulo: "Como podemos ajudar?",
    texto:
      "Encontre respostas sobre como funciona a DoLado, a Protecção, os nossos planos, o envio da reclamação e o que acontece depois.",
    pesquisar: "Pesquisar nas perguntas",
    exemplo: "Ex.: cancelar, factura, autorização",
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
