// Páginas das ligações dos e-mails de comunicações comerciais
// (/comunicacoes/confirmar e /comunicacoes/deixar-de-receber).

export const comunicacoes = {
  confirmar: {
    metadados: "Confirmar o e-mail",
    titulo: "Confirme o seu e-mail",
    texto: "Confirme que quer receber dicas, novidades e comunicações da DoLado por e-mail. Pode deixar de as receber a qualquer momento, pela ligação incluída em cada e-mail.",
    botao: "Confirmar o meu e-mail",
    confirmado: "Obrigado. O seu e-mail está confirmado.",
    jaConfirmado: "Este e-mail já estava confirmado.",
    expirado: "Esta ligação já expirou. Se ainda quiser receber as nossas comunicações, peça de novo o guia e marque a caixa.",
    retirado: "Este e-mail deixou de receber as nossas comunicações. Nada foi alterado.",
    invalida: "Esta ligação não é válida. Abra-a de novo a partir do e-mail que recebeu.",
  },
  deixar: {
    metadados: "Deixar de receber e-mails",
    titulo: "Deixar de receber e-mails da DoLado",
    texto: "Deixa de receber as nossas dicas, novidades e ofertas. Os e-mails sobre os seus casos, pagamentos e serviços continuam a chegar.",
    botao: "Deixar de receber",
    feito: "Pronto. Não lhe voltamos a enviar estas comunicações.",
    jaFeito: "Este e-mail já não recebia as nossas comunicações.",
    invalida: (email: string) => `Esta ligação não é válida. Abra-a de novo a partir do e-mail que recebeu ou escreva para ${email}.`,
  },
};
