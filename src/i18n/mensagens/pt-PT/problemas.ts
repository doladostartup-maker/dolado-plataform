// Páginas "Problemas que tratamos" (/problemas, /problemas/<categoria>,
// /problemas/<categoria>/<problema>). Estrutura em src/lib/problemas/catalogo.ts:
// uma entrada em `categorias` por categoria e uma em `paginas` por problema.
//
// Regras de conteúdo (12/10/2026): informação geral e prudente, nunca parecer
// jurídico ("pode depender", "pode haver fundamento", "é necessário
// verificar"); sem leis, artigos ou prazos concretos; sem guias "faça você
// mesmo" (cartas, moradas, passos de envio); sem promessas de resultado; sem
// atacar empresas nem nomear marcas. Marcação: <calc>…</calc> (Calculadora de
// Cancelamento).

export const problemas = {
  comum: {
    inicio: "Início",
    problemas: "Problemas",
    trilho: "Localização na página",
    verificarCaso: "Verificar o meu caso gratuitamente",
    tratarCaso: "Tratar o meu caso",
    contestarTitulo: "Esta situação pode ser contestada?",
    verificarTitulo: "O que deve verificar",
    verificarTexto:
      "Estes elementos ajudam a perceber o que aconteceu e a fundamentar o pedido à empresa. Não precisa de ter tudo: indique o que tiver.",
    ajudaTitulo: "Como a DoLado pode ajudar",
    ajudaPassos: [
      "Conte-nos o que aconteceu e envie os documentos que tiver.",
      "A DoLado analisa a situação, verifica as regras aplicáveis e prepara a reclamação.",
      "Revê o texto e autoriza o envio. Nada é enviado sem a sua autorização.",
      "A DoLado envia a reclamação e acompanha a resposta da empresa consigo.",
    ],
    ajudaNota: "A decisão final cabe à empresa. A DoLado trata o processo consigo e acompanha a resposta, dentro do serviço contratado.",
    ctaTitulo: "Não sabe se o seu caso pode ser tratado?",
    ctaTexto: "Responda a quatro perguntas rápidas e veja se a DoLado pode ajudar. É gratuito e não precisa de conta.",
    relacionadosTitulo: "Outros problemas relacionados",
    verTodos: (categoria: string) => `Ver todos os problemas de ${categoria}`,
    aviso:
      "Esta página tem informação geral e não substitui a análise do seu caso concreto. A DoLado não é um escritório de advogados nem uma entidade pública.",
  },
  indice: {
    metadados: {
      titulo: "Problemas de consumo que tratamos - DoLado",
      descricao:
        "Telecomunicações, energia, compras e reembolsos, gás, água e ginásios: veja os problemas de consumo que a DoLado ajuda a perceber e a tratar consigo.",
    },
    eyebrow: "Problemas que tratamos",
    titulo: "Problemas de consumo que a DoLado ajuda a resolver",
    texto:
      "Quando uma factura, um contrato ou uma compra não corre como esperado, a DoLado ajuda a perceber a situação e trata da reclamação consigo, sempre com o texto revisto e autorizado por si antes do envio.",
    categoriasTitulo: "Escolha a área do seu problema",
    exemplos: "Por exemplo:",
    ctaTitulo: "Não encontrou a sua situação?",
    ctaTexto: "Veja gratuitamente se a DoLado pode ajudar ou conte-nos directamente o que aconteceu.",
  },
  categoria: {
    problemasTitulo: "Problemas frequentes",
    saberMais: "Saber mais",
    ctaTitulo: "Não encontrou a sua situação?",
    ctaTexto: "Veja gratuitamente se a DoLado pode ajudar ou conte-nos directamente o que aconteceu.",
    outrasTitulo: "Outras áreas",
  },
  categorias: {
    telecomunicacoes: {
      nome: "Telecomunicações",
      nomeMinusculas: "telecomunicações",
      descricao: "Internet, televisão, telemóvel e telefone fixo.",
      exemplos: ["Aumentos de preço", "Fidelização e cancelamento", "Cobranças que não reconhece", "Serviço que não funciona"],
      ligacao: "Ver problemas de telecomunicações",
      metadados: {
        titulo: "Problemas com telecomunicações - DoLado",
        descricao:
          "Aumento de preço, fidelização, cobranças que não reconhece ou serviço que falha? Veja os problemas de telecomunicações que a DoLado trata consigo.",
      },
      titulo: "Problemas com a operadora de telecomunicações",
      intro:
        "Internet, televisão, telemóvel ou telefone fixo: quando alguma coisa não corresponde ao que contratou, a DoLado ajuda a perceber a situação e trata da reclamação consigo.",
    },
    energia: {
      nome: "Energia",
      nomeMinusculas: "energia",
      descricao: "Electricidade: facturas, leituras, cobranças, contratos e falhas de fornecimento.",
      exemplos: ["Facturas muito altas", "Consumos estimados", "Cobranças que não reconhece", "Mudanças de comercializador que não pediu", "Falhas de electricidade"],
      ligacao: "Ver problemas de energia",
      metadados: {
        titulo: "Problemas com a electricidade: facturas e falhas - DoLado",
        descricao:
          "Factura de electricidade muito alta, consumos estimados, cobranças que não reconhece ou falhas de luz? Veja os problemas de energia que a DoLado trata consigo.",
      },
      titulo: "Problemas com a electricidade",
      intro:
        "Facturas que sobem sem explicação clara, leituras estimadas, valores que não reconhece, mudanças de comercializador que não pediu ou falhas de electricidade: a DoLado ajuda a perceber o que se passa e trata da reclamação consigo.",
    },
    "compras-reembolsos": {
      nome: "Compras e Reembolsos",
      nomeMinusculas: "compras e reembolsos",
      descricao: "Compras em loja e online, devoluções e garantias.",
      exemplos: ["Reembolsos em falta", "Encomendas não entregues", "Produtos com defeito", "Garantias recusadas"],
      ligacao: "Ver problemas de compras e reembolsos",
      metadados: {
        titulo: "Problemas com compras e reembolsos - DoLado",
        descricao:
          "Reembolso em falta, encomenda que não chegou, produto com defeito ou garantia recusada? Veja os problemas de compras que a DoLado trata consigo.",
      },
      titulo: "Problemas com compras e reembolsos",
      intro:
        "Em loja ou online, quando uma compra corre mal e a loja não dá resposta, a DoLado ajuda a perceber a situação e trata da reclamação consigo.",
    },
    gas: {
      nome: "Gás",
      nomeMinusculas: "gás",
      descricao: "Facturas, leituras, cobranças e cortes de fornecimento.",
      exemplos: ["Facturas muito altas", "Cobranças que não reconhece", "Corte de fornecimento", "Mudança de comercializador"],
      ligacao: "Tratar um problema de gás",
      metadados: { titulo: "", descricao: "" },
      titulo: "",
      intro: "",
    },
    agua: {
      nome: "Água",
      nomeMinusculas: "água",
      descricao: "Facturas, leituras e cobranças do serviço de água.",
      exemplos: ["Facturas muito altas", "Consumos estimados", "Cobranças que não reconhece", "Corte de fornecimento"],
      ligacao: "Tratar um problema de água",
      metadados: { titulo: "", descricao: "" },
      titulo: "",
      intro: "",
    },
    ginasios: {
      nome: "Ginásios",
      nomeMinusculas: "ginásios",
      descricao: "Cancelamentos, fidelizações e cobranças de ginásios e estúdios.",
      exemplos: ["Cancelamento recusado", "Cobranças depois de cancelar", "Fidelização ou penalização", "Aumento da mensalidade"],
      ligacao: "Tratar um problema com um ginásio",
      metadados: { titulo: "", descricao: "" },
      titulo: "",
      intro: "",
    },
  },
  paginas: {
    telecomunicacoes: {
      "aumento-preco": {
        metadados: {
          titulo: "A operadora aumentou o preço durante a fidelização? - DoLado",
          descricao:
            "A mensalidade subiu durante a fidelização? Veja o que verificar no contrato e na factura e como a DoLado pode tratar a reclamação consigo.",
        },
        rotulo: "Aumento de preço",
        resumo: "A mensalidade subiu e não sabe se o aumento estava previsto no contrato.",
        titulo: "A operadora aumentou o preço durante a fidelização?",
        subtitulo:
          "Se a sua mensalidade subiu ou recebeu um aviso de actualização de preço, vale a pena confirmar se o que está a ser aplicado corresponde ao contrato e às regras aplicáveis.",
        contestar: [
          "Pode depender do que está no contrato e da forma como a alteração foi comunicada. Alguns contratos preveem actualizações de preço; noutras situações, uma alteração das condições tem de ser comunicada com antecedência e pode permitir ao cliente reagir.",
          "É necessário verificar o seu caso concreto: a mesma subida pode ter enquadramentos diferentes consoante as condições que aceitou e a data em que lhe foi comunicada.",
        ],
        verificar: [
          "O contrato e as condições que aceitou, incluindo o que dizem sobre actualização de preços",
          "A comunicação da operadora sobre a alteração e a data em que a recebeu",
          "As facturas antes e depois do aumento",
          "As datas de início e de fim da fidelização",
          "Promoções ou descontos que tenham terminado entretanto",
        ],
        ajuda:
          "A DoLado analisa o contrato, a comunicação recebida e as facturas, verifica as regras aplicáveis ao seu caso e prepara a reclamação adequada, com um pedido concreto à operadora.",
      },
      "cancelar-fidelizacao": {
        metadados: {
          titulo: "Quer cancelar um contrato durante a fidelização? - DoLado",
          descricao:
            "Quer cancelar antes do fim da fidelização? Perceba o que pode estar em causa, que documentos reunir e como a DoLado pode tratar o caso consigo.",
        },
        rotulo: "Cancelar durante a fidelização",
        resumo: "Quer sair do contrato antes do fim da fidelização e não sabe quanto pode custar.",
        titulo: "Quer cancelar um contrato durante a fidelização?",
        subtitulo:
          "Mudou de casa, o serviço deixou de corresponder ao que precisa ou encontrou uma alternativa melhor? Antes de decidir, é importante perceber o que o contrato prevê e que encargos podem estar em causa.",
        contestar: [
          "Pode depender do motivo do cancelamento. Em determinadas situações, por exemplo quando o serviço não é prestado como contratado ou quando as condições foram alteradas, pode haver fundamento para cancelar sem encargos ou com encargos reduzidos.",
          "Quando o cancelamento é apenas por iniciativa do cliente, os encargos têm limites, mas o valor concreto depende do contrato e do momento em que cancela. Pode estimar o valor máximo com a <calc>Calculadora de Cancelamento</calc>.",
        ],
        verificar: [
          "O contrato, incluindo a duração e a data de início da fidelização",
          "O motivo pelo qual quer cancelar e o registo que tenha dele (avarias, alterações, mudança de casa)",
          "A última factura e o valor da mensalidade",
          "Equipamentos ou benefícios recebidos com a fidelização",
          "As comunicações trocadas com a operadora",
        ],
        ajuda:
          "A DoLado analisa o contrato e o motivo do cancelamento, verifica se há fundamento para pedir o cancelamento sem encargos ou com encargos reduzidos e prepara o pedido à operadora.",
      },
      "cobranca-indevida": {
        metadados: {
          titulo: "Recebeu uma cobrança que não reconhece na factura? - DoLado",
          descricao:
            "Encontrou na factura da operadora um valor que não reconhece? Veja o que verificar e como a DoLado pode preparar e acompanhar a reclamação consigo.",
        },
        rotulo: "Cobrança indevida",
        resumo: "Apareceu na factura um serviço ou valor que não pediu ou não reconhece.",
        titulo: "Recebeu uma cobrança que não reconhece na factura?",
        subtitulo:
          "Serviços adicionais, conteúdos, chamadas ou valores que não reconhece podem aparecer na factura sem que se perceba de onde vêm. Vale a pena esclarecer antes que se repitam nos meses seguintes.",
        contestar: [
          "Pode haver fundamento para contestar quando a cobrança não corresponde a um serviço que pediu ou utilizou, ou não está prevista no contrato.",
          "É necessário verificar a origem do valor: alguns encargos resultam das condições contratuais ou da utilização efectiva, outros podem resultar de um erro ou de um serviço activado sem pedido.",
        ],
        verificar: [
          "A factura em que aparece a cobrança e as facturas anteriores",
          "O detalhe da factura, se estiver disponível (descrição e datas do valor)",
          "O contrato e os serviços que pediu",
          "Se o mesmo valor se repete nos meses seguintes",
          "Contactos que já tenha feito com a operadora sobre o assunto",
        ],
        ajuda:
          "A DoLado analisa as facturas e o contrato, identifica o que está a ser cobrado e com que base, e prepara a reclamação com o pedido concreto, por exemplo a anulação ou a devolução do valor.",
      },
      "cobranca-apos-cancelamento": {
        metadados: {
          titulo: "Continuam a cobrar depois de ter cancelado o serviço? - DoLado",
          descricao:
            "Cancelou o serviço e continua a receber facturas ou débitos? Veja o que reunir e como a DoLado pode tratar a reclamação e acompanhar a resposta.",
        },
        rotulo: "Cobrança após cancelamento",
        resumo: "Pediu o cancelamento, mas continuam a chegar facturas ou débitos.",
        titulo: "Continuam a cobrar depois de ter cancelado o serviço?",
        subtitulo:
          "Pediu o cancelamento e continuam a chegar facturas ou débitos na sua conta? Isto acontece, por exemplo, quando o pedido não ficou registado ou quando há valores finais por acertar.",
        contestar: [
          "Pode depender da data em que o cancelamento produziu efeitos e do que está a ser cobrado. Alguns valores finais podem ser devidos, como dias de serviço até à data efectiva do fim do contrato ou encargos previstos no contrato.",
          "Quando o valor diz respeito a um período posterior ao cancelamento, pode haver fundamento para contestar e pedir a devolução.",
        ],
        verificar: [
          "O comprovativo do pedido de cancelamento e a data em que foi feito",
          "A confirmação da operadora, se a recebeu",
          "As facturas e os débitos posteriores ao pedido",
          "O comprovativo de devolução dos equipamentos, se aplicável",
          "O contrato e a data de fim da fidelização",
        ],
        ajuda:
          "A DoLado analisa o pedido de cancelamento e as cobranças seguintes, separa o que pode ser devido do que não parece ter base e prepara a reclamação com o pedido concreto.",
      },
      "servico-nao-funciona": {
        metadados: {
          titulo: "O serviço contratado não está a funcionar como deveria? - DoLado",
          descricao:
            "Internet lenta, falhas frequentes ou serviço em baixo? Veja o que registar e como a DoLado pode tratar a reclamação junto da operadora consigo.",
        },
        rotulo: "Serviço não funciona",
        resumo: "Falhas, cortes ou velocidades muito abaixo do que foi contratado.",
        titulo: "O serviço contratado não está a funcionar como deveria?",
        subtitulo:
          "Cortes frequentes, internet muito lenta, falta de rede ou avarias que não ficam resolvidas afectam o dia-a-dia, e a mensalidade continua a ser cobrada por inteiro.",
        contestar: [
          "Em determinadas situações, quando o serviço não é prestado nas condições contratadas, pode haver fundamento para pedir a reparação, um acerto no valor pago ou, nos casos mais persistentes, o fim do contrato.",
          "Pode depender da duração e da frequência das falhas, do que o contrato prevê e de as avarias terem sido comunicadas à operadora.",
        ],
        verificar: [
          "As datas e a duração das falhas, mesmo que anotadas por si",
          "Os números dos pedidos de assistência ou de avaria",
          "O contrato e as condições do serviço, como a velocidade anunciada",
          "Testes de velocidade ou capturas de ecrã, se os tiver",
          "As facturas do período em que houve problemas",
        ],
        ajuda:
          "A DoLado organiza o histórico de falhas e de contactos, verifica as regras aplicáveis e prepara a reclamação com um pedido concreto à operadora.",
      },
    },
    energia: {
      "fatura-muito-alta": {
        metadados: {
          titulo: "A sua factura de electricidade aumentou muito? - DoLado",
          descricao:
            "A factura da luz subiu muito sem explicação clara? Veja o que comparar entre facturas e como a DoLado pode analisar e tratar a reclamação consigo.",
        },
        rotulo: "Factura muito alta",
        resumo: "A factura subiu muito em relação aos meses anteriores e não percebe porquê.",
        titulo: "A sua factura de electricidade aumentou muito?",
        subtitulo:
          "Uma subida grande na factura de electricidade pode ter várias explicações: mais consumo, um acerto de leituras, uma mudança de preço ou um erro. Antes de pagar ou contestar, vale a pena perceber de onde vem a diferença.",
        contestar: [
          "Pode depender da origem do aumento. Se resulta de consumo real ou de uma alteração de preço comunicada, pode não haver fundamento para contestar o valor. Se resulta de um erro de leitura ou de facturação, ou de condições diferentes das acordadas, pode haver.",
          "É necessário comparar facturas, leituras e condições para perceber em que situação está.",
        ],
        verificar: [
          "A factura com o valor alto e as facturas dos meses anteriores",
          "Se as leituras indicadas são reais ou estimadas",
          "A leitura actual do contador (uma fotografia com data ajuda)",
          "O preço por kWh e a potência contratada",
          "Comunicações do comercializador sobre alterações de preço",
        ],
        ajuda:
          "A DoLado compara as facturas e as leituras, identifica o que mudou e verifica se há fundamento para reclamar. Se houver, prepara a reclamação com o pedido concreto.",
      },
      "cobranca-indevida": {
        metadados: {
          titulo: "Encontrou uma cobrança que não reconhece na factura de energia? - DoLado",
          descricao:
            "Um valor na factura de electricidade que não reconhece? Veja o que verificar e como a DoLado pode preparar e acompanhar a reclamação consigo.",
        },
        rotulo: "Cobrança indevida",
        resumo: "Um serviço, taxa ou valor na factura que não pediu ou não reconhece.",
        titulo: "Encontrou uma cobrança que não reconhece na factura de energia?",
        subtitulo:
          "Serviços adicionais, acertos ou valores que não reconhece podem aparecer na factura de energia sem explicação clara. Perceber a origem é o primeiro passo para os resolver.",
        contestar: [
          "Pode haver fundamento para contestar quando o valor não corresponde a um serviço que pediu, a um consumo real ou às condições acordadas.",
          "É necessário verificar a descrição do valor: algumas parcelas da factura resultam de regras do sector e não dependem do comercializador; outras resultam do contrato ou de serviços adicionais.",
        ],
        verificar: [
          "A factura onde aparece o valor e a respectiva descrição",
          "O contrato e os serviços adicionais que subscreveu",
          "As facturas anteriores, para ver se o valor se repete",
          "As leituras do contador e as datas de referência",
          "Contactos já feitos com o comercializador",
        ],
        ajuda:
          "A DoLado analisa a factura e o contrato, identifica o que está a ser cobrado e com que base, e prepara a reclamação com o pedido concreto ao comercializador.",
      },
      "consumos-estimados": {
        metadados: {
          titulo: "A sua factura foi calculada com consumos estimados? - DoLado",
          descricao:
            "Factura de electricidade com consumos estimados ou um acerto que não percebe? Veja o que verificar e como a DoLado pode tratar a reclamação consigo.",
        },
        rotulo: "Consumos estimados",
        resumo: "A factura usa estimativas em vez de leituras reais, ou um acerto trouxe um valor elevado.",
        titulo: "A sua factura foi calculada com consumos estimados?",
        subtitulo:
          "Quando não há leituras reais, a factura pode ser calculada com estimativas. Isso pode levar a valores acima ou abaixo do consumo real e, mais tarde, a acertos difíceis de perceber.",
        contestar: [
          "A facturação por estimativa pode acontecer quando não há leitura disponível, e o valor é normalmente acertado mais tarde com base nas leituras reais.",
          "Pode haver fundamento para contestar quando as estimativas se afastam muito do consumo real, quando as leituras que comunicou não foram consideradas ou quando o acerto não é claro. Num acerto que inclua consumos antigos, as datas também contam: a lei prevê limites temporais para a cobrança de alguns valores. Depende do histórico de leituras, das datas e do seu caso concreto.",
        ],
        verificar: [
          "As facturas e a indicação de leitura real ou estimada em cada uma",
          "A leitura actual do contador, com fotografia e data",
          "As leituras que comunicou e quando o fez",
          "A factura de acerto, se a recebeu",
          "O tipo de contador (com ou sem leitura à distância)",
        ],
        ajuda:
          "A DoLado reconstitui o histórico de leituras e de facturas, verifica se o acerto corresponde ao consumo real e prepara a reclamação com o pedido concreto ao comercializador.",
      },
      // Contratação não autorizada (20/10/2026): auditoria de Energia —
      // facturação e contratação, secção E.
      "mudanca-de-comercializador-nao-autorizada": {
        metadados: {
          titulo: "Mudaram o seu comercializador de electricidade sem autorização? - DoLado",
          descricao:
            "Passou a receber facturas de outro comercializador de electricidade sem ter aceitado? Veja o que verificar e como a DoLado trata a reclamação consigo.",
        },
        rotulo: "Mudança de comercializador não autorizada",
        resumo: "Passou a ter outro comercializador de electricidade sem ter aceitado a mudança.",
        titulo: "Mudaram o seu comercializador de electricidade sem a sua autorização?",
        subtitulo:
          "Uma chamada, uma visita a casa ou uma proposta que não chegou a aceitar podem acabar numa mudança de comercializador que não pediu. Muitas vezes só se dá por isso quando chega a primeira factura da nova empresa.",
        contestar: [
          "A mudança de comercializador depende da aceitação do consumidor. Quando essa aceitação não existiu, ou não pode ser demonstrada, pode haver fundamento para contestar o contrato e os valores cobrados.",
          "A forma como o contacto aconteceu também conta: as regras podem ser diferentes num contrato feito por telefone, à distância ou em sua casa. Em alguns destes casos, pode ainda ser possível desistir do contrato dentro de um prazo.",
          "É necessário verificar o que foi dito, assinado ou confirmado, e por quem, para perceber em que situação está.",
        ],
        verificar: [
          "A primeira factura do novo comercializador e a última do anterior",
          "A data, o canal e quem fez o contacto (telefone, visita a casa, e-mail)",
          "O que assinou, recebeu ou confirmou, mesmo que por SMS ou e-mail",
          "As mensagens e os e-mails que recebeu sobre a mudança",
          "Os contactos que já fez com qualquer um dos comercializadores",
        ],
        ajuda:
          "A DoLado reconstitui como a mudança aconteceu, pede à empresa a prova da sua aceitação e prepara a reclamação com o pedido concreto: anular a mudança, corrigir as facturas ou devolver o que pagou a mais.",
      },
      "falta-de-luz": {
        metadados: {
          titulo: "Ficou sem luz ou a electricidade falha muitas vezes? - DoLado",
          descricao:
            "Falhas de electricidade repetidas ou longas? Veja quando pode haver compensação na factura, o que registar e como a DoLado trata a reclamação consigo.",
        },
        rotulo: "Falhas de electricidade",
        resumo: "Ficou sem luz, a electricidade falha muitas vezes ou houve aparelhos danificados.",
        titulo: "Ficou sem luz ou a electricidade falha muitas vezes?",
        subtitulo:
          "Uma falha de electricidade pode ser só um incómodo, mas quando se repete ou se prolonga pode haver uma compensação que deveria aparecer na sua factura. Se houve aparelhos ou outros bens danificados, isso é um pedido diferente.",
        contestar: [
          "Quando as falhas na rede ultrapassam, ao longo de um ano, os limites fixados pelo regulador para a zona onde vive, pode haver uma compensação, que em princípio deve ser creditada na factura sem ter de a pedir. Nem todas as falhas contam: as muito curtas, as avisadas com antecedência e as causadas por acontecimentos excepcionais reconhecidos pelo regulador podem ficar de fora.",
          "Uma falha só em sua casa pode ter origem na sua própria instalação, e não na rede. Por isso, antes de concluir seja o que for, é necessário verificar a causa.",
          "Se a falha ou o regresso da electricidade danificou aparelhos ou outros bens, pode haver fundamento para pedir uma indemnização, à parte de qualquer compensação. Depende da causa, da prova do dano e do seu caso concreto.",
        ],
        verificar: [
          "As datas, as horas e a duração de cada falha, mesmo que anotadas por si",
          "Os avisos de interrupção programada que recebeu, ou a falta deles",
          "O número da ocorrência, se comunicou a avaria, e as respostas que recebeu",
          "As facturas seguintes, para ver se aparece alguma compensação",
          "Fotografias, relatórios ou orçamentos de reparação, se houve aparelhos danificados",
        ],
        ajuda:
          "A DoLado organiza o histórico de falhas e de contactos, pede à empresa os dados que só ela tem e prepara a reclamação com um pedido concreto: o esclarecimento, a compensação em falta ou a reparação dos danos.",
      },
    },
    "compras-reembolsos": {
      "loja-nao-devolve-dinheiro": {
        metadados: {
          titulo: "A loja ainda não lhe devolveu o dinheiro? - DoLado",
          descricao:
            "Devolveu um produto ou cancelou uma compra e o reembolso não chega? Veja o que reunir e como a DoLado pode tratar a reclamação junto da loja.",
        },
        rotulo: "Reembolso em falta",
        resumo: "Devolveu, cancelou ou não recebeu, e o dinheiro ainda não foi devolvido.",
        titulo: "A loja ainda não lhe devolveu o dinheiro?",
        subtitulo:
          "Devolveu o produto, cancelou a encomenda ou a loja aceitou reembolsar, mas o dinheiro ainda não chegou. Quanto mais tempo passa, mais difícil pode ser perceber em que ponto está o pedido.",
        contestar: [
          "Pode depender do motivo do reembolso: uma desistência numa compra à distância, um produto que não foi entregue, um produto com defeito ou a política comercial da própria loja seguem regras diferentes.",
          "Em determinadas situações, a loja tem prazos para devolver o dinheiro. É necessário verificar o seu caso para perceber quais se aplicam.",
        ],
        verificar: [
          "O comprovativo da compra e do pagamento",
          "O comprovativo da devolução do produto ou do cancelamento, com a data",
          "As mensagens trocadas com a loja, incluindo a aceitação do reembolso",
          "As condições de devolução indicadas pela loja",
          "O meio de pagamento usado na compra",
        ],
        ajuda:
          "A DoLado analisa a compra, a devolução e as comunicações com a loja, verifica as regras aplicáveis e prepara a reclamação com o pedido concreto de reembolso.",
      },
      "compra-online": {
        metadados: {
          titulo: "Teve um problema com uma compra online? - DoLado",
          descricao:
            "Encomenda atrasada, produto diferente do anunciado ou devolução recusada numa compra online? Veja o que reunir e como a DoLado pode ajudar.",
        },
        rotulo: "Compra online",
        resumo: "Atraso, produto diferente do anunciado, devolução recusada ou loja que não responde.",
        titulo: "Teve um problema com uma compra online?",
        subtitulo:
          "Comprar online é prático até alguma coisa correr mal: o produto não chega, chega diferente do anunciado, a devolução é recusada ou a loja deixa de responder.",
        contestar: [
          "As compras à distância têm regras próprias de protecção do consumidor, incluindo, em muitas situações, a possibilidade de desistir da compra. Pode depender do tipo de produto, da loja e do que aconteceu.",
          "É necessário verificar onde a loja está estabelecida, as condições aceites na compra e as comunicações trocadas.",
        ],
        verificar: [
          "A confirmação da encomenda e o comprovativo de pagamento",
          "O anúncio ou a descrição do produto (uma captura de ecrã ajuda)",
          "As mensagens trocadas com a loja",
          "Fotografias do produto recebido, se aplicável",
          "Os dados da loja: nome, morada e contactos indicados no site",
        ],
        ajuda:
          "A DoLado analisa a encomenda e as comunicações com a loja, verifica as regras aplicáveis às compras à distância e prepara a reclamação com o pedido concreto.",
      },
      "produto-com-defeito": {
        metadados: {
          titulo: "Comprou um produto com defeito? - DoLado",
          descricao:
            "O produto avariou ou não funciona como devia? Veja o que reunir e como a DoLado pode preparar a reclamação junto da loja e acompanhar a resposta.",
        },
        rotulo: "Produto com defeito",
        resumo: "O produto avariou, não funciona como devia ou não corresponde ao que foi vendido.",
        titulo: "Comprou um produto com defeito?",
        subtitulo:
          "O produto deixou de funcionar, chegou danificado ou não faz o que foi prometido? A forma como o problema é apresentado à loja pode fazer diferença.",
        contestar: [
          "Quando um produto não corresponde ao que foi vendido ou apresenta um defeito, o consumidor pode ter direito, perante o vendedor, à reparação, à substituição, à redução do preço ou, em determinadas situações, à devolução do dinheiro.",
          "Pode depender da data da compra, de quando o defeito apareceu e da forma como o produto foi utilizado.",
        ],
        verificar: [
          "A factura ou o recibo da compra",
          "A data em que o defeito apareceu e uma descrição do que acontece",
          "Fotografias ou vídeos do problema",
          "As comunicações com a loja ou com a assistência técnica",
          "Relatórios de assistência técnica, se o produto já foi avaliado",
        ],
        ajuda:
          "A DoLado analisa a compra e o defeito, verifica as regras aplicáveis e prepara a reclamação ao vendedor com o pedido mais adequado ao seu caso.",
      },
      garantia: {
        metadados: {
          titulo: "Está com dificuldades em acionar a garantia de um produto? - DoLado",
          descricao:
            "A loja recusa a garantia ou a reparação demora demasiado? Veja o que reunir e como a DoLado pode tratar a reclamação junto do vendedor consigo.",
        },
        rotulo: "Garantia",
        resumo: "A loja recusa a garantia, atribui o problema ao mau uso ou a reparação não fica resolvida.",
        titulo: "Está com dificuldades em acionar a garantia de um produto?",
        subtitulo:
          "A loja recusa a garantia, atribui o problema ao mau uso, remete para a marca ou a reparação arrasta-se há semanas? São situações frequentes e merecem ser analisadas.",
        contestar: [
          "A garantia legal é uma responsabilidade do vendedor perante o consumidor e existe independentemente de garantias comerciais adicionais. Ainda assim, pode depender da data da compra, do tipo de defeito e da justificação dada para a recusa.",
          "Em determinadas situações, uma recusa ou uma reparação demorada pode ser contestada. É necessário analisar o seu caso concreto.",
        ],
        verificar: [
          "A factura ou o recibo da compra",
          "A resposta da loja com o motivo da recusa",
          "O relatório da assistência técnica, se existir",
          "As datas em que entregou e levantou o produto",
          "Fotografias do defeito",
        ],
        ajuda:
          "A DoLado analisa a compra, o defeito e a resposta da loja, verifica as regras aplicáveis à garantia e prepara a reclamação ao vendedor com o pedido concreto.",
      },
      "encomenda-nao-entregue": {
        metadados: {
          titulo: "A sua encomenda não foi entregue? - DoLado",
          descricao:
            "A encomenda não chegou, está parada ou aparece como entregue sem a ter recebido? Veja o que reunir e como a DoLado pode tratar o caso consigo.",
        },
        rotulo: "Encomenda não entregue",
        resumo: "A encomenda não chegou, está parada ou aparece como entregue sem a ter recebido.",
        titulo: "A sua encomenda não foi entregue?",
        subtitulo:
          "Pagou, esperou e a encomenda não chegou, ou o seguimento diz que foi entregue e não recebeu nada. Antes de dar o dinheiro como perdido, vale a pena perceber quem deve responder pela entrega.",
        contestar: [
          "Numa compra à distância, a entrega é, em regra, da responsabilidade do vendedor até o produto chegar ao consumidor. Ainda assim, pode depender da forma como a entrega foi combinada e do que aconteceu.",
          "Em determinadas situações, pode haver fundamento para pedir a entrega, um novo envio ou a devolução do dinheiro.",
        ],
        verificar: [
          "A confirmação da encomenda e o prazo de entrega indicado",
          "O comprovativo de pagamento",
          "O número e o histórico de seguimento",
          "As mensagens trocadas com a loja e com a transportadora",
          "Se o envio era para a sua morada ou para um ponto de recolha",
        ],
        ajuda:
          "A DoLado analisa a encomenda, o seguimento e as comunicações, verifica as regras aplicáveis e prepara a reclamação à loja com o pedido concreto.",
      },
    },
  },
};
