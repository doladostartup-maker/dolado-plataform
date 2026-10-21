// WhatsApp como canal secundário de apoio (src/lib/whatsapp.ts). Só mensagem
// escrita: nunca "Ligue-nos", "Telefonar" nem "Chamada". As mensagens
// pré-preenchidas são genéricas e identificam apenas a página de origem —
// nunca dados pessoais, respostas de formulários nem resultados.

export const whatsapp = {
  /** Texto acessível do ícone (o botão já tem texto visível). */
  rotuloAcessivel: "Falar com a DoLado pelo WhatsApp",
  abreNovaJanela: "(abre o WhatsApp numa nova janela)",
  soMensagem: "Atendimento exclusivamente por mensagem.",
  falarConnosco: "Falar connosco no WhatsApp",
  contextos: {
    homepage: {
      pergunta: "Precisa de ajuda para começar?",
      mensagem: "Olá. Estou no site da DoLado e precisava de ajuda para perceber por onde começar.",
    },
    precario: {
      pergunta: "Não sabe qual a opção mais indicada?",
      mensagem: "Olá. Estou a consultar os planos da DoLado e tenho uma dúvida sobre qual a opção mais indicada para mim.",
    },
    calculadora: {
      pergunta: "Ficou com dúvidas sobre este resultado?",
      acao: "Esclarecer uma dúvida no WhatsApp",
      mensagem: "Olá. Utilizei a calculadora de fidelização da DoLado e fiquei com uma dúvida sobre o resultado.",
    },
    simulador: {
      pergunta: "Ficou com alguma dúvida?",
      mensagem: "Olá. Utilizei o simulador da DoLado e gostaria de esclarecer uma dúvida sobre o resultado.",
    },
    ajuda: {
      pergunta: "Não encontrou a resposta que procurava?",
      mensagem: "Olá. Consultei a área de ajuda da DoLado, mas ainda tenho uma dúvida.",
    },
    setor: {
      pergunta: "Não sabe como começar?",
      mensagens: {
        telecomunicacoes:
          "Olá. Estou a consultar a informação da DoLado sobre problemas com operadoras de telecomunicações e precisava de ajuda para perceber como começar.",
        energia:
          "Olá. Estou a consultar a informação da DoLado sobre problemas com fornecedores de electricidade e precisava de ajuda para perceber como começar.",
        gas: "Olá. Estou a consultar a informação da DoLado sobre problemas com fornecedores de gás e precisava de ajuda para perceber como começar.",
        agua: "Olá. Estou a consultar a informação da DoLado sobre problemas com o fornecimento de água e precisava de ajuda para perceber como começar.",
        "compras-reembolsos":
          "Olá. Estou a consultar a informação da DoLado sobre problemas com compras e reembolsos e precisava de ajuda para perceber como começar.",
      },
    },
    protecaoGratuita: {
      pergunta: "Tem dúvidas?",
      acao: "Fale connosco por WhatsApp",
      mensagem: "Olá. Estou a ver a experiência gratuita da Protecção DoLado e tenho uma dúvida.",
    },
    contacto: {
      titulo: "WhatsApp",
      texto:
        "Ajudamos a perceber por onde começar, a esclarecer dúvidas sobre o serviço e a escolher a opção mais adequada. Atendimento exclusivamente por mensagem. Não analisamos casos nem recebemos documentos por WhatsApp: o pedido faz-se no formulário passo a passo.",
      acao: "Enviar mensagem",
      mensagem: "Olá. Estou no site da DoLado e precisava de ajuda.",
    },
  },
};
