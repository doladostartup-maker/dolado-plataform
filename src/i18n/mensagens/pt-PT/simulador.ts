// Simulador de Elegibilidade público (/simulador-elegibilidade). As opções
// (valores) vêm de src/lib/elegibilidade/regras.ts; os rótulos, de rotulos.ts.

export const simulador = {
  metadados: {
    titulo: "Simulador de Elegibilidade - DoLado",
    descricao:
      "Veja se a DoLado pode ajudar com o seu caso de telecomunicações, energia, gás, água, compras e reembolsos ou ginásios. 4 perguntas, grátis, sem criar conta e sem deixar o seu e-mail.",
  },
  eyebrow: "Grátis · sem conta · 4 perguntas",
  titulo: "Veja se a DoLado pode ajudar com o seu caso",
  texto:
    "Responda a 4 perguntas rápidas sobre a sua situação com uma empresa de telecomunicações, energia, gás ou água, com uma compra ou com um ginásio. O resultado aparece logo, sem pedir e-mail nem criar conta.",
  perguntas: {
    setor: { titulo: "Com que tipo de empresa é o problema?" },
    titular: {
      titulo: "O contrato é pessoal?",
      ajuda: "Por exemplo, o telemóvel, a internet ou a eletricidade da sua casa.",
    },
    problema: { titulo: "O que aconteceu?" },
    momento: { titulo: "Já reclamou junto da empresa?" },
  },
  progresso: "Progresso do simulador",
  perguntaDe: (n: number, total: number) => `Pergunta ${n} de ${total}`,
  voltar: "← Voltar",
  resultado: "Resultado",
  resultados: {
    positivo: {
      titulo: "Pelas suas respostas, o seu caso parece enquadrar-se no tipo de situações que a DoLado trata.",
      texto: "Conte-nos o que aconteceu. A DoLado organiza o caso, prepara a reclamação e acompanha o processo consigo.",
      cta: "Tratar do meu caso",
    },
    incerto: {
      titulo: "Pelas suas respostas, não conseguimos determinar com segurança se este caso se enquadra no serviço da DoLado.",
      texto: "Se quiser avançar, conte-nos o que aconteceu no formulário do caso. No fim, escolhe a modalidade antes de pagar.",
      cta: "Tratar do meu caso",
    },
    negativo: {
      titulo: "Pelas suas respostas, este caso pode não se enquadrar no serviço atual da DoLado.",
      texto: "",
      cta: "",
    },
  },
  motivos: {
    setor: "Neste momento, a DoLado trata apenas situações de telecomunicações, energia, gás, água, compras e reembolsos e ginásios.",
    empresa: "O serviço atual da DoLado é dirigido a consumidores particulares, não a contratos de empresas ou atividades profissionais.",
    resolvido: "Pelas suas respostas, a situação parece já ter sido resolvida com a empresa.",
    titular: "Não é claro se o contrato é pessoal ou de uma empresa ou atividade profissional.",
    problema: "O tipo de situação não está entre os que a DoLado trata com mais frequência.",
  },
  responderDeNovo: "Responder de novo",
  indicativo: "Este resultado é apenas indicativo e baseia-se nas respostas fornecidas.",
  comoFunciona: {
    eyebrow: "Como funciona",
    titulo: "O que precisa de saber sobre o simulador.",
    itens: [
      {
        titulo: "Para que serve.",
        texto:
          "Ajuda a perceber se a sua situação é do tipo que a DoLado trata: problemas de consumidores particulares com empresas de telecomunicações, energia, gás e água, com compras e reembolsos e com ginásios, como aumentos de mensalidade, cobranças indevidas, fidelizações, falhas de serviço ou cancelamentos recusados.",
      },
      {
        titulo: "O que não é.",
        texto: "Não é uma avaliação jurídica do seu caso nem uma previsão do resultado da reclamação.",
      },
      {
        titulo: "As suas respostas.",
        texto: "Ficam apenas no seu navegador: não as guardamos nem as associamos a si.",
      },
      {
        titulo: "Se decidir avançar.",
        texto: "Em “Tratar o meu caso” descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Só paga no fim.",
      },
    ],
  },
};
