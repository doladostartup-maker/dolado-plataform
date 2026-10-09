// Rótulos de valores fechados que ficam gravados em português (setores,
// tipos de problema, momentos…). O VALOR nunca muda nem é traduzido — é o
// que fica em casos.sector, pedidos_caso.problema, etc. Aqui só se diz como
// cada valor se mostra. Chaves = valores de src/lib/pedidoCaso.ts e
// src/lib/elegibilidade/regras.ts (teste: src/i18n/i18n.test.mjs).

export const rotulos = {
  setores: {
    "Telecomunicações": "Telecomunicações",
    Energia: "Energia",
    "Gás": "Gás",
    "Água": "Água",
    "Compras & Reembolsos": "Compras & Reembolsos",
    "Ginásios": "Ginásios",
    "Outro tipo de empresa": "Outro tipo de empresa",
  },
  problemas: {
    "Aumento de mensalidade": "Aumento de mensalidade",
    "Cobrança indevida": "Cobrança indevida",
    "Fidelização ou penalização": "Fidelização ou penalização",
    "Corte ou falha de serviço": "Corte ou falha de serviço",
    "Cancelamento recusado": "Cancelamento recusado",
    "Mudança de comercializador": "Mudança de comercializador",
    "Tarifa social": "Tarifa social",
    "Produto com defeito": "Produto com defeito",
    "Produto errado ou danificado": "Produto errado ou danificado",
    "Encomenda não entregue": "Encomenda não entregue",
    "Devolução ou reembolso em falta": "Devolução ou reembolso em falta",
    "Garantia recusada": "Garantia recusada",
    "Cobrança após cancelamento": "Cobrança após cancelamento",
    "Serviço diferente do contratado": "Serviço diferente do contratado",
    Outro: "Outro",
  },
  momentos: {
    "Sim, e não me responderam": "Sim, e não me responderam",
    "Sim, mas a resposta não resolveu": "Sim, mas a resposta não resolveu",
    "Ainda não reclamei": "Ainda não reclamei",
    "Sim, e o problema ficou resolvido": "Sim, e o problema ficou resolvido",
  },
  titular: {
    "Sim, é um contrato pessoal ou da minha casa": "Sim, é um contrato pessoal ou da minha casa",
    "Não, é de uma empresa ou atividade profissional": "Não, é de uma empresa ou atividade profissional",
    "Não tenho a certeza": "Não tenho a certeza",
  },
};
