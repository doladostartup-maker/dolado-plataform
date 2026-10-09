import type { Traducao } from "../../dicionario.ts";
import type { rotulos as pt } from "../pt-PT/rotulos.ts";

export const rotulos: Traducao<typeof pt> = {
  setores: {
    "Telecomunicações": "Telecoms",
    Energia: "Energy",
    "Gás": "Gas",
    "Água": "Water",
    "Compras & Reembolsos": "Purchases & Refunds",
    "Ginásios": "Gyms",
    "Outro tipo de empresa": "Another type of company",
  },
  problemas: {
    "Aumento de mensalidade": "Monthly price increase",
    "Cobrança indevida": "Incorrect charge",
    "Fidelização ou penalização": "Minimum term or early exit charge",
    "Corte ou falha de serviço": "Service cut-off or outage",
    "Cancelamento recusado": "Cancellation refused",
    "Mudança de comercializador": "Switching supplier",
    "Tarifa social": "Social tariff",
    "Produto com defeito": "Faulty product",
    "Produto errado ou danificado": "Wrong or damaged product",
    "Encomenda não entregue": "Order not delivered",
    "Devolução ou reembolso em falta": "Missing return or refund",
    "Garantia recusada": "Guarantee claim refused",
    "Cobrança após cancelamento": "Charged after cancelling",
    "Serviço diferente do contratado": "Service different from what was agreed",
    Outro: "Other",
  },
  momentos: {
    "Sim, e não me responderam": "Yes, and they didn't reply",
    "Sim, mas a resposta não resolveu": "Yes, but the reply didn't solve it",
    "Ainda não reclamei": "I haven't complained yet",
    "Sim, e o problema ficou resolvido": "Yes, and the problem was solved",
  },
  titular: {
    "Sim, é um contrato pessoal ou da minha casa": "Yes, it's a personal or household contract",
    "Não, é de uma empresa ou atividade profissional": "No, it's for a business or professional activity",
    "Não tenho a certeza": "I'm not sure",
  },
};
