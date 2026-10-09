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
      `Escolha conforme a sua situação: tratar um problema agora, tratar e continuar protegido, ou só acompanhamento. Todos os preços têm ${iva}.`,
    necessidades: {
      avulso: { necessidade: "Tenho um problema agora.", cta: "Tratar do meu caso" },
      caso_protecao: { necessidade: "Tenho um problema e quero continuar protegido.", cta: "Escolher Caso + Proteção" },
      protecao: { necessidade: "Não tenho um problema agora, mas quero acompanhamento.", cta: "Aderir à Proteção" },
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
  comoFunciona: {
    metadados: {
      titulo: "Como funciona - DoLado",
      descricao:
        "Do problema à reclamação enviada, passo a passo: veja como a DoLado prepara a reclamação com a legislação aplicável, pede a sua autorização antes do envio e acompanha o prazo de resposta até ao desfecho.",
    },
    eyebrow: "Como funciona",
    titulo: "Do problema à reclamação enviada, passo a passo.",
    texto:
      "A DoLado prepara a reclamação com a lei do seu lado. Recebe o texto primeiro e só com a sua autorização explícita fazemos o envio para o Livro de Reclamações.",
    tratarCaso: "Tratar do meu caso",
    verSeAjuda: "Ver se a DoLado pode ajudar",
    seuPasso: "O seu passo",
    dolado: "A DoLado",
    passos: [
      {
        titulo: "Conte o que aconteceu",
        texto:
          "Descreva o problema e anexe a fatura ou o contrato. Sem formulários intermináveis — perguntas guiadas, uma de cada vez.",
      },
      {
        titulo: "Analisamos o mérito do caso",
        texto: "Verificamos se há fundamento legal e identificamos a legislação aplicável ao seu setor.",
      },
      {
        titulo: "Preparamos a reclamação",
        texto:
          "Reclamação formal, com a legislação aplicável e o pedido claro. Mostramos-lhe o texto que pretendemos enviar para o Livro de Reclamações antes de qualquer envio.",
      },
      {
        titulo: "Reveja e autorize o envio",
        texto:
          "Leia o texto com calma e confirme explicitamente se autoriza o envio. Sem a sua confirmação, nada é enviado.",
      },
      {
        titulo: "Enviamos para o Livro de Reclamações",
        texto:
          "Só depois da sua autorização submetemos a reclamação ao Livro de Reclamações em seu nome — esta é a única etapa em que agimos diretamente por si.",
      },
      {
        titulo: "Acompanhamos o prazo de resposta",
        texto:
          "Telecom: 15 dias úteis sem resposta substantiva. Energia e água seguem os prazos regulatórios próprios de cada setor.",
      },
      {
        titulo: "Acompanhamos até ao fim",
        texto:
          "Seguimos os passos seguintes e uma eventual escalada, até haver desfecho — correção, reembolso ou resposta formal da empresa.",
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
        "Nos passos 1 a 4, apenas organizamos factos e citamos a lei — nunca decidimos a sua estratégia legal. A submissão ao Livro de Reclamações (passo 5) é a única ação que fazemos diretamente em seu nome, e só com autorização explícita.",
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
