// Área do parceiro (/portal/parceiro). Só números agregados e os pagamentos
// feitos ao próprio parceiro — nunca quem são as pessoas indicadas nem o que
// contrataram. Regras em src/lib/parceiros/area.ts.

export const areaParceiro = {
  metadados: { titulo: "Área de parceiro | DoLado" },
  navegacao: "Área de parceiro",
  titulo: "Área de parceiro",
  descricao:
    "Acompanhe as recomendações que fez e as suas comissões. Por privacidade, mostramos só números: nunca nomes, contactos, casos, facturas nem contratos.",
  semAcesso: {
    titulo: "Esta conta não está ligada a um parceiro",
    texto: (email: string) =>
      `Se é parceiro da DoLado e quer acompanhar as suas recomendações aqui, escreva para ${email} a partir do e-mail desta conta.`,
  },
  estado: {
    suspenso: "A parceria está suspensa. A sua ligação e o seu código não associam novas pessoas; as comissões já constituídas continuam a ser acompanhadas.",
    encerrado: "A parceria terminou. A sua ligação e o seu código já não associam novas pessoas; as comissões já constituídas continuam a ser acompanhadas.",
  },
  ligacao: {
    titulo: "A sua ligação de recomendação",
    texto: "Partilhe a ligação ou o código com quem precisa de ajuda. A pessoa conhece todos os serviços da DoLado e escolhe o que lhe faz falta.",
    codigo: "Código de parceiro",
    codigoTexto: "Quem não usar a ligação pode escrever este código ao criar conta ou antes de pagar.",
    transparencia:
      "Ao recomendar, diga que é parceiro da DoLado e que recebe uma comissão. Quem chega pela sua recomendação paga o preço normal e não tem desconto.",
    textoPartilha: "A DoLado ajuda a resolver problemas com facturas, contratos e compras. Veja aqui:",
  },
  resultados: {
    titulo: "Resultados",
    contas: "Contas associadas a si",
    contasNota: "Pessoas que criaram conta pela sua ligação ou com o seu código.",
    protecao: "Subscreveram a Protecção",
    casoProtecao: "Subscreveram o Caso + Protecção",
    nota: "Conta a partir do primeiro pagamento de uma subscrição. O Caso Avulso e o Caso Extra não dão comissão.",
  },
  comissoes: {
    titulo: "Comissões",
    porReceber: "Por receber",
    porReceberNota: "Comissões elegíveis e aprovadas que ainda não foram pagas.",
    quantidade: "Quantidade",
    valor: "Valor (sem IVA)",
    estado: "Estado",
    grupos: {
      pendente: { nome: "Pendente", texto: (n: number) => `À espera de completar ${n} mensalidades pagas.` },
      em_verificacao: { nome: "Em verificação", texto: (_n: number) => "A DoLado está a confirmar um pagamento." },
      elegivel: { nome: "Elegível", texto: (_n: number) => "Condições cumpridas; à espera de aprovação." },
      aprovada: { nome: "Aprovada", texto: (_n: number) => "Será incluída no próximo pagamento." },
      paga: { nome: "Paga", texto: (_n: number) => "Já transferida." },
      anulada: {
        nome: "Anulada",
        texto: (_n: number) => "Subscrição terminada antes do prazo, pagamento reembolsado ou contestado.",
      },
    },
  },
  regras: {
    titulo: "Como são calculadas",
    protecao: (valor: string) => `Protecção: ${valor} por cliente.`,
    casoProtecao: (valor: string) => `Caso + Protecção: ${valor} por cliente.`,
    mensalidades: (n: number) =>
      `A comissão fica elegível quando a primeira subscrição do cliente tem ${n} mensalidades pagas. Períodos gratuitos e mensalidades a 0 € não contam.`,
    unica: "Uma comissão por cliente, mesmo que compre outros serviços ou mude de plano.",
    iva: "Valores sem IVA. Se cobrar IVA, acresce à taxa legal em vigor.",
    pagamento: (minimo: string) =>
      `A DoLado aprova as comissões e paga por transferência, normalmente a partir de ${minimo} acumulados.`,
    acordo: "As condições completas constam do seu acordo de parceria.",
  },
  oportunidades: {
    titulo: "Empresas apresentadas",
    emCurso: "Em curso",
    ganhas: "Com contrato",
    perdidas: "Sem contrato",
  },
  pagamentos: {
    titulo: "Pagamentos recebidos",
    vazio: "Ainda não há pagamentos.",
    data: "Data",
    referencia: "Referência",
    comissoes: "Comissões",
    semIva: "Sem IVA",
    iva: "IVA",
    transferido: "Transferido",
    documento: "O seu documento",
  },
  privacidade:
    "Não mostramos nomes, e-mails, casos, facturas nem contratos das pessoas que recomendou. As dúvidas sobre um caso são tratadas pela DoLado directamente com o cliente.",
};
